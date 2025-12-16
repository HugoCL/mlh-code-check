import { convexTest } from "convex-test";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
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

// Valid item statuses
const itemStatusArbitrary = fc.constantFrom(
    "pending",
    "processing",
    "completed",
    "failed",
);

/**
 * **Feature: ai-code-review, Property 15: Progress tracking accuracy**
 * *For any* in-progress analysis, the progress data SHALL accurately reflect:
 * - totalItems matching rubric item count
 * - completedItems matching count of items with status="completed"
 * - failedItems matching count of items with status="failed"
 * - each item having a valid status (pending, processing, completed, or failed)
 * **Validates: Requirements 6.1, 6.3, 6.4**
 */
describe("Property 15: Progress tracking accuracy", () => {
    it("should accurately track progress with totalItems matching rubric item count", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 10 }),
                async (userData, repoData, rubricData, rubricItems) => {
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
                    for (const item of rubricItems) {
                        await t.withIdentity({ subject: userData.clerkId }).mutation(
                            api.rubrics.addRubricItem,
                            {
                                rubricId,
                                name: item.name,
                                description: item.description,
                                evaluationType: item.evaluationType,
                                config: item.config,
                                order: item.order,
                            },
                        );
                    }

                    // Create analysis with authentication
                    const analysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createAnalysis, {
                            repositoryId,
                            rubricId,
                        });

                    // Get the analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Property: totalItems matches rubric item count
                    expect(analysis).not.toBeNull();
                    expect(analysis?.totalItems).toBe(rubricItems.length);
                    expect(analysis?.results).toHaveLength(rubricItems.length);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should accurately count completedItems and failedItems based on item statuses", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 2, maxLength: 8 }),
                fc.array(itemStatusArbitrary, { minLength: 2, maxLength: 8 }),
                async (userData, repoData, rubricData, rubricItems, itemStatuses) => {
                    // Ensure arrays have same length
                    const items = rubricItems.slice(0, itemStatuses.length);
                    const statuses = itemStatuses.slice(0, items.length);

                    if (items.length === 0) return;

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
                    const rubricItemIds: Id<"rubricItems">[] = [];
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

                    // Update item statuses with authentication
                    for (let i = 0; i < rubricItemIds.length; i++) {
                        const status = statuses[i];
                        await t
                            .withIdentity({ subject: userData.clerkId })
                            .mutation(api.analyses.updateItemResult, {
                                analysisId,
                                rubricItemId: rubricItemIds[i],
                                status,
                                result:
                                    status === "completed" ? { value: true } : undefined,
                                error: status === "failed" ? "Test error" : undefined,
                            });
                    }

                    // Get the analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Calculate expected counts
                    const expectedCompleted = statuses.filter(
                        (s) => s === "completed",
                    ).length;
                    const expectedFailed = statuses.filter((s) => s === "failed").length;

                    // Property: completedItems and failedItems match actual counts
                    expect(analysis).not.toBeNull();
                    expect(analysis?.completedItems).toBe(expectedCompleted);
                    expect(analysis?.failedItems).toBe(expectedFailed);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should ensure each item has a valid status", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 5 }),
                fc.array(itemStatusArbitrary, { minLength: 1, maxLength: 5 }),
                async (userData, repoData, rubricData, rubricItems, itemStatuses) => {
                    // Ensure arrays have same length
                    const items = rubricItems.slice(0, itemStatuses.length);
                    const statuses = itemStatuses.slice(0, items.length);

                    if (items.length === 0) return;

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
                    const rubricItemIds: Id<"rubricItems">[] = [];
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

                    // Update item statuses with authentication
                    for (let i = 0; i < rubricItemIds.length; i++) {
                        const status = statuses[i];
                        await t
                            .withIdentity({ subject: userData.clerkId })
                            .mutation(api.analyses.updateItemResult, {
                                analysisId,
                                rubricItemId: rubricItemIds[i],
                                status,
                                result:
                                    status === "completed" ? { value: true } : undefined,
                                error: status === "failed" ? "Test error" : undefined,
                            });
                    }

                    // Get the analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Valid statuses
                    const validStatuses = [
                        "pending",
                        "processing",
                        "completed",
                        "failed",
                    ];

                    // Property: Each item has a valid status
                    expect(analysis).not.toBeNull();
                    expect(analysis?.results).toHaveLength(items.length);

                    for (const result of analysis?.results ?? []) {
                        expect(validStatuses).toContain(result.status);
                    }

                    // Verify each item has the expected status
                    for (let i = 0; i < rubricItemIds.length; i++) {
                        const result = analysis?.results.find(
                            (r) => r.rubricItemId === rubricItemIds[i],
                        );
                        expect(result).toBeDefined();
                        expect(result?.status).toBe(statuses[i]);
                    }
                },
            ),
            { numRuns: 100 },
        );
    });
});
