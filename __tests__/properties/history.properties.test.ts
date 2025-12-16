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
 * **Feature: ai-code-review, Property 17: History sorting**
 * *For any* user's analysis history list, the analyses SHALL be sorted by
 * createdAt in descending order (most recent first).
 * **Validates: Requirements 8.1**
 */
describe("Property 17: History sorting", () => {
	it("should return analyses sorted by createdAt in descending order", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				repositoryDataArbitrary,
				rubricDataArbitrary,
				fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 3 }),
				fc.integer({ min: 2, max: 5 }), // Number of analyses to create
				async (userData, repoData, rubricData, rubricItems, numAnalyses) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repository
					const repositoryId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.repositories.connectRepository, {
							owner: repoData.owner,
							name: repoData.name,
							fullName: `${repoData.owner}/${repoData.name}`,
							defaultBranch: repoData.defaultBranch,
						});

					// Create rubric
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric items
					for (const item of rubricItems) {
						await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.addRubricItem, {
								rubricId,
								name: item.name,
								description: item.description,
								evaluationType: item.evaluationType,
								config: item.config,
								order: item.order,
							});
					}

					// Create multiple analyses with small delays to ensure different timestamps
					const analysisIds = [];
					for (let i = 0; i < numAnalyses; i++) {
						const analysisId = await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.analyses.createAnalysis, {
								repositoryId,
								rubricId,
							});
						analysisIds.push(analysisId);
					}

					// Get the analysis history
					const history = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, { limit: 20 });

					// Property: History should be sorted by createdAt descending
					expect(history.length).toBe(numAnalyses);

					for (let i = 0; i < history.length - 1; i++) {
						expect(history[i].createdAt).toBeGreaterThanOrEqual(
							history[i + 1].createdAt,
						);
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * **Feature: ai-code-review, Property 18: Historical data immutability**
 * *For any* historical analysis retrieval, the returned results SHALL exactly
 * match the data stored at completion time, regardless of subsequent rubric
 * modifications.
 * **Validates: Requirements 8.2**
 */
describe("Property 18: Historical data immutability", () => {
	it("should preserve analysis results even after rubric modification", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				repositoryDataArbitrary,
				rubricDataArbitrary,
				rubricItemArbitrary,
				fc.record({
					value: fc.boolean(),
					justification: fc.string({ minLength: 1, maxLength: 200 }),
				}),
				fc
					.string({ minLength: 1, maxLength: 100 })
					.filter((s) => s.trim().length > 0), // New rubric name
				async (
					userData,
					repoData,
					rubricData,
					rubricItem,
					evaluationResult,
					newRubricName,
				) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repository
					const repositoryId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.repositories.connectRepository, {
							owner: repoData.owner,
							name: repoData.name,
							fullName: `${repoData.owner}/${repoData.name}`,
							defaultBranch: repoData.defaultBranch,
						});

					// Create rubric
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric item
					const rubricItemId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.addRubricItem, {
							rubricId,
							name: rubricItem.name,
							description: rubricItem.description,
							evaluationType: "yes_no",
							config: { requireJustification: true },
							order: 0,
						});

					// Create analysis
					const analysisId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId,
							rubricId,
						});

					// Store the evaluation result
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.updateItemResult, {
							analysisId,
							rubricItemId,
							status: "completed",
							result: evaluationResult,
						});

					// Complete the analysis
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.completeAnalysis, {
							analysisId,
						});

					// Get the analysis results before modification
					const analysisBefore = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.getAnalysisWithResults, {
							analysisId,
						});

					// Modify the rubric (change name)
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.updateRubric, {
							rubricId,
							name: newRubricName,
						});

					// Get the analysis results after modification
					const analysisAfter = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.getAnalysisWithResults, {
							analysisId,
						});

					// Property: Historical analysis results should be immutable
					expect(analysisAfter).not.toBeNull();
					expect(analysisAfter!._id).toBe(analysisBefore!._id);
					expect(analysisAfter!.status).toBe("completed");
					expect(analysisAfter!.results).toHaveLength(1);

					// The stored result should be exactly the same
					const resultBefore = analysisBefore!.results[0];
					const resultAfter = analysisAfter!.results[0];

					expect(resultAfter.result).toEqual(resultBefore.result);
					expect(resultAfter.result).toEqual(evaluationResult);
					expect(resultAfter.status).toBe("completed");
					expect(resultAfter.completedAt).toBe(resultBefore.completedAt);
				},
			),
			{ numRuns: 100 },
		);
	});
});

/**
 * **Feature: ai-code-review, Property 19: Filter correctness**
 * *For any* filtered analysis history query, all returned analyses SHALL match
 * all specified filter criteria (repository, rubric, date range, status).
 * **Validates: Requirements 8.3**
 */
describe("Property 19: Filter correctness", () => {
	it("should return only analyses matching repository filter", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				fc.array(repositoryDataArbitrary, { minLength: 2, maxLength: 3 }),
				rubricDataArbitrary,
				fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 2 }),
				async (userData, repoDataList, rubricData, rubricItems) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create multiple repositories
					const repositoryIds = [];
					for (let i = 0; i < repoDataList.length; i++) {
						const repoData = repoDataList[i];
						const repositoryId = await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.repositories.connectRepository, {
								owner: `${repoData.owner}${i}`,
								name: `${repoData.name}${i}`,
								fullName: `${repoData.owner}${i}/${repoData.name}${i}`,
								defaultBranch: repoData.defaultBranch,
							});
						repositoryIds.push(repositoryId);
					}

					// Create rubric
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric items
					for (const item of rubricItems) {
						await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.addRubricItem, {
								rubricId,
								name: item.name,
								description: item.description,
								evaluationType: item.evaluationType,
								config: item.config,
								order: item.order,
							});
					}

					// Create analyses for each repository
					for (const repositoryId of repositoryIds) {
						await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.analyses.createAnalysis, {
								repositoryId,
								rubricId,
							});
					}

					// Filter by first repository
					const filteredHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							repositoryId: repositoryIds[0],
						});

					// Property: All returned analyses should match the repository filter
					expect(filteredHistory.length).toBeGreaterThan(0);
					for (const analysis of filteredHistory) {
						expect(analysis.repositoryId).toBe(repositoryIds[0]);
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should return only analyses matching status filter", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				repositoryDataArbitrary,
				rubricDataArbitrary,
				fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 2 }),
				async (userData, repoData, rubricData, rubricItems) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repository
					const repositoryId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.repositories.connectRepository, {
							owner: repoData.owner,
							name: repoData.name,
							fullName: `${repoData.owner}/${repoData.name}`,
							defaultBranch: repoData.defaultBranch,
						});

					// Create rubric
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric items
					for (const item of rubricItems) {
						await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.addRubricItem, {
								rubricId,
								name: item.name,
								description: item.description,
								evaluationType: item.evaluationType,
								config: item.config,
								order: item.order,
							});
					}

					// Create analysis and complete it
					const analysisId1 = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId,
							rubricId,
						});

					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.completeAnalysis, {
							analysisId: analysisId1,
						});

					// Create another analysis and leave it pending
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId,
							rubricId,
						});

					// Filter by completed status
					const completedHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							status: "completed",
						});

					// Property: All returned analyses should have completed status
					expect(completedHistory.length).toBe(1);
					for (const analysis of completedHistory) {
						expect(analysis.status).toBe("completed");
					}

					// Filter by pending status
					const pendingHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							status: "pending",
						});

					// Property: All returned analyses should have pending status
					expect(pendingHistory.length).toBe(1);
					for (const analysis of pendingHistory) {
						expect(analysis.status).toBe("pending");
					}
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should return only analyses matching date range filter", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				repositoryDataArbitrary,
				rubricDataArbitrary,
				fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 2 }),
				async (userData, repoData, rubricData, rubricItems) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repository
					const repositoryId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.repositories.connectRepository, {
							owner: repoData.owner,
							name: repoData.name,
							fullName: `${repoData.owner}/${repoData.name}`,
							defaultBranch: repoData.defaultBranch,
						});

					// Create rubric
					const rubricId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.rubrics.createRubric, {
							name: rubricData.name,
							description: rubricData.description,
						});

					// Add rubric items
					for (const item of rubricItems) {
						await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.addRubricItem, {
								rubricId,
								name: item.name,
								description: item.description,
								evaluationType: item.evaluationType,
								config: item.config,
								order: item.order,
							});
					}

					// Create analysis
					const analysisId = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId,
							rubricId,
						});

					// Get the analysis to know its createdAt
					const analysis = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.getAnalysis, { analysisId });

					const createdAt = analysis!.createdAt;

					// Filter with date range that includes the analysis
					const includedHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							dateFrom: createdAt - 1000,
							dateTo: createdAt + 1000,
						});

					// Property: Analysis should be included in matching date range
					expect(includedHistory.length).toBe(1);
					expect(includedHistory[0]._id).toBe(analysisId);

					// Filter with date range that excludes the analysis (future dates)
					const excludedHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							dateFrom: createdAt + 10000,
							dateTo: createdAt + 20000,
						});

					// Property: Analysis should be excluded from non-matching date range
					expect(excludedHistory.length).toBe(0);
				},
			),
			{ numRuns: 100 },
		);
	});

	it("should return only analyses matching combined filters", async () => {
		await fc.assert(
			fc.asyncProperty(
				userDataArbitrary,
				fc.array(repositoryDataArbitrary, { minLength: 2, maxLength: 2 }),
				fc.array(rubricDataArbitrary, { minLength: 2, maxLength: 2 }),
				fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 2 }),
				async (userData, repoDataList, rubricDataList, rubricItems) => {
					const t = convexTest(schema, modules);

					// Create user
					await t.mutation(api.users.syncUser, userData);

					// Create repositories
					const repositoryIds = [];
					for (let i = 0; i < repoDataList.length; i++) {
						const repoData = repoDataList[i];
						const repositoryId = await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.repositories.connectRepository, {
								owner: `${repoData.owner}${i}`,
								name: `${repoData.name}${i}`,
								fullName: `${repoData.owner}${i}/${repoData.name}${i}`,
								defaultBranch: repoData.defaultBranch,
							});
						repositoryIds.push(repositoryId);
					}

					// Create rubrics
					const rubricIds = [];
					for (let i = 0; i < rubricDataList.length; i++) {
						const rubricData = rubricDataList[i];
						const rubricId = await t
							.withIdentity({ subject: userData.clerkId })
							.mutation(api.rubrics.createRubric, {
								name: `${rubricData.name}${i}`,
								description: rubricData.description,
							});

						// Add rubric items
						for (const item of rubricItems) {
							await t
								.withIdentity({ subject: userData.clerkId })
								.mutation(api.rubrics.addRubricItem, {
									rubricId,
									name: item.name,
									description: item.description,
									evaluationType: item.evaluationType,
									config: item.config,
									order: item.order,
								});
						}

						rubricIds.push(rubricId);
					}

					// Create analyses with different combinations
					// Analysis 1: repo1 + rubric1 (completed)
					const analysisId1 = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId: repositoryIds[0],
							rubricId: rubricIds[0],
						});
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.completeAnalysis, {
							analysisId: analysisId1,
						});

					// Analysis 2: repo1 + rubric2 (pending)
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId: repositoryIds[0],
							rubricId: rubricIds[1],
						});

					// Analysis 3: repo2 + rubric1 (completed)
					const analysisId3 = await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.createAnalysis, {
							repositoryId: repositoryIds[1],
							rubricId: rubricIds[0],
						});
					await t
						.withIdentity({ subject: userData.clerkId })
						.mutation(api.analyses.completeAnalysis, {
							analysisId: analysisId3,
						});

					// Filter by repo1 + completed status
					const filteredHistory = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							repositoryId: repositoryIds[0],
							status: "completed",
						});

					// Property: All returned analyses should match ALL filter criteria
					expect(filteredHistory.length).toBe(1);
					expect(filteredHistory[0].repositoryId).toBe(repositoryIds[0]);
					expect(filteredHistory[0].status).toBe("completed");

					// Filter by rubric1 + completed status
					const filteredByRubric = await t
						.withIdentity({ subject: userData.clerkId })
						.query(api.analyses.listAnalyses, {
							rubricId: rubricIds[0],
							status: "completed",
						});

					// Property: Should return 2 completed analyses with rubric1
					expect(filteredByRubric.length).toBe(2);
					for (const analysis of filteredByRubric) {
						expect(analysis.rubricId).toBe(rubricIds[0]);
						expect(analysis.status).toBe("completed");
					}
				},
			),
			{ numRuns: 100 },
		);
	});
});
