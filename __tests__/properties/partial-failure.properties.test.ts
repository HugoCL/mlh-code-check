import { convexTest } from "convex-test";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../../convex/test.setup";

// Shared arbitraries
const userDataArbitrary = fc.record({
	clerkId: fc
		.string({ minLength: 1, maxLength: 50 })
		.filter((s) => s.trim().length > 0),
	email: fc.emailAddress(),
	name: fc
		.string({ minLength: 1, maxLength: 100 })
		.filter((s) => s.trim().length > 0),
});

const repositoryDataArbitrary = fc.record({
	owner: fc
		.string({ minLength: 1, maxLength: 50 })
		.filter((s) => s.trim().length > 0),
	name: fc
		.string({ minLength: 1, maxLength: 50 })
		.filter((s) => s.trim().length > 0),
	defaultBranch: fc.constantFrom("main", "master", "develop"),
});

const rubricDataArbitrary = fc.record({
	name: fc
		.string({ minLength: 1, maxLength: 100 })
		.filter((s) => s.trim().length > 0),
	description: fc
		.string({ minLength: 1, maxLength: 500 })
		.filter((s) => s.trim().length > 0),
});

const rubricItemArbitrary = fc.record({
	name: fc
		.string({ minLength: 1, maxLength: 100 })
		.filter((s) => s.trim().length > 0),
	description: fc
		.string({ minLength: 1, maxLength: 500 })
		.filter((s) => s.trim().length > 0),
	evaluationType: fc.constantFrom("yes_no", "comments", "code_examples"),
	config: fc.record({
		requireJustification: fc.option(fc.boolean(), { nil: undefined }),
		maxExamples: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
	}),
	order: fc.integer({ min: 0, max: 100 }),
});

/**
 * **Feature: ai-code-review, Property 14: Partial failure isolation**
 * *For any* analysis where some items fail, the failed items SHALL have status="failed"
 * with error details, while other items SHALL continue processing independently and
 * store their results.
 * **Validates: Requirements 5.6**
 */
describe("Property 14: Partial failure isolation", () => {
	it("should isolate failures and continue processing other items", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				repositoryDataArbitrary,
				rubricDataArbitrary,
				fc.array(rubricItemArbitrary, { minLength: 3, maxLength: 6 }),
				fc.array(fc.constantFrom("completed", "failed"), {
					minLength: 3,
					maxLength: 6,
				}),
				async (userData, repoData, rubricData, rubricItems, itemStatuses) => {
					// Ensure arrays have same length and at least one failure and one success
					const items = rubricItems.slice(0, itemStatuses.length);
					const statuses = itemStatuses.slice(0, items.length);

					// Ensure we have both successes and failures for meaningful test
					const hasSuccess = statuses.includes("completed");
					const hasFailure = statuses.includes("failed");
					fc.pre(hasSuccess && hasFailure);

					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repository with authentication
					const repositoryId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.repositories.connectRepository, {
							owner: repoData.owner,
							name: repoData.name,
							fullName: `${repoData.owner}/${repoData.name}`,
							defaultBranch: repoData.defaultBranch,
						});

					// Create rubric with authentication
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric items with authentication
					const rubricItemIds = [];
					for (const item of items) {
						const itemId = await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.addRubricItem, {
								rubricId,
								name: item.name,
								description: item.description,
								evaluationType: item.evaluationType,
								config: item.config,
								order: item.order,
							});
						rubricItemIds.push(itemId);
					}

					// Create analysis with authentication
					const analysisId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId,
							rubricId,
						});

					// Process items with mixed success/failure
					for (let i = 0; i < rubricItemIds.length; i++) {
						if (statuses[i] === "completed") {
							await t
								.withIdentity({ subject: userData.clerkId })
								.mutation(api.analyses.updateItemResult, {
									analysisId,
									rubricItemId: rubricItemIds[i],
									status: "completed",
									result: { value: true, justification: "Test success" },
								});
						} else {
							await t
								.withIdentity({ subject: userData.clerkId })
								.mutation(api.analyses.updateItemResult, {
									analysisId,
									rubricItemId: rubricItemIds[i],
									status: "failed",
									error: `Test error for item ${i}`,
								});
						}
					}

					// Get the analysis with results
					const analysis = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.getAnalysis, {
							analysisId,
						});

					// Property: Partial failure isolation
					expect(analysis).not.toBeNull();
					expect(analysis?.results).toHaveLength(items.length);

					const expectedCompleted = statuses.filter(
						(s) => s === "completed",
					).length;
					const expectedFailed = statuses.filter((s) => s === "failed").length;

					expect(analysis?.completedItems).toBe(expectedCompleted);
					expect(analysis?.failedItems).toBe(expectedFailed);

					// Verify each result has correct status and data
					for (let i = 0; i < analysis!.results.length; i++) {
						const result = analysis!.results[i];
						const expectedStatus = statuses[i];

						expect(result.status).toBe(expectedStatus);

						if (expectedStatus === "completed") {
							// Successful items should have results and no error
							expect(result.result).toBeDefined();
							expect(result.error).toBeUndefined();
							expect(result.completedAt).toBeDefined();
						} else {
							// Failed items should have error details and no result
							expect(result.error).toBeDefined();
							expect(result.error).toContain("Test error");
							expect(result.completedAt).toBeDefined();
						}
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});
