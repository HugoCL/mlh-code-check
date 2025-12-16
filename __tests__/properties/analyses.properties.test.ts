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

// Fixed rubric item arbitrary - only generate valid configurations
const rubricItemArbitrary = fc.record({
    name: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
    description: fc
        .string({ minLength: 1, maxLength: 500 })
        .filter((s) => s.trim().length > 0),
    evaluationType: fc.constantFrom("yes_no", "comments", "code_examples"), // Exclude range for now
    config: fc.record({
        requireJustification: fc.option(fc.boolean(), { nil: undefined }),
        maxExamples: fc.option(fc.integer({ min: 1, max: 10 }), { nil: undefined }),
    }),
    order: fc.integer({ min: 0, max: 100 }),
});

// Arbitrary for generating evaluation results based on type
const evaluationResultArbitrary = fc.oneof(
    // yes_no result
    fc.record({
        type: fc.constant("yes_no"),
        result: fc.record({
            value: fc.boolean(),
            justification: fc.string({ minLength: 1, maxLength: 500 }),
        }),
    }),
    // comments result
    fc.record({
        type: fc.constant("comments"),
        result: fc.record({
            feedback: fc.string({ minLength: 1, maxLength: 1000 }),
        }),
    }),
    // code_examples result
    fc.record({
        type: fc.constant("code_examples"),
        result: fc.record({
            examples: fc.array(
                fc.record({
                    filePath: fc.string({ minLength: 1, maxLength: 200 }),
                    lineStart: fc.integer({ min: 1, max: 1000 }),
                    lineEnd: fc.integer({ min: 1, max: 1000 }),
                    code: fc.string({ minLength: 1, maxLength: 500 }),
                    explanation: fc.string({ minLength: 1, maxLength: 500 }),
                }),
                { minLength: 1, maxLength: 5 },
            ),
        }),
    }),
);

/**
 * **Feature: ai-code-review, Property 11: Analysis creation with pending status**
 * *For any* newly created analysis, the initial status SHALL be "pending",
 * totalItems SHALL equal the rubric's item count, and completedItems and
 * failedItems SHALL both be 0.
 * **Validates: Requirements 5.1**
 */
describe("Property 11: Analysis creation with pending status", () => {
    it("should create analysis with pending status and correct item counts", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 10 }),
                async (userData, repoData, rubricData, rubricItems) => {
                    const t = convexTest(schema, modules);

                    // Create user first
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

                    // Create analysis with authentication
                    const analysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createAnalysis, {
                            repositoryId,
                            rubricId,
                        });

                    // Get the created analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Property: Analysis has correct initial state
                    expect(analysis).not.toBeNull();
                    expect(analysis?.status).toBe("pending");
                    expect(analysis?.totalItems).toBe(rubricItems.length);
                    expect(analysis?.completedItems).toBe(0);
                    expect(analysis?.failedItems).toBe(0);
                    expect(analysis?.createdAt).toBeDefined();
                    expect(analysis?.completedAt).toBeUndefined();
                },
            ),
            { numRuns: 100 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 12: Result storage completeness**
 * *For any* completed rubric item evaluation, the analysisResults record SHALL
 * contain the analysisId, rubricItemId, status="completed", and a result object
 * matching the item's evaluation type structure.
 * **Validates: Requirements 5.4**
 */
describe("Property 12: Result storage completeness", () => {
    it("should store complete result data for any evaluation type", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                rubricItemArbitrary,
                evaluationResultArbitrary,
                async (
                    userData,
                    repoData,
                    rubricData,
                    rubricItem,
                    evaluationResult,
                ) => {
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

                    // Add rubric item with authentication
                    const rubricItemId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name: rubricItem.name,
                            description: rubricItem.description,
                            evaluationType: rubricItem.evaluationType,
                            config: rubricItem.config,
                            order: rubricItem.order,
                        });

                    // Create analysis with authentication
                    const analysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createAnalysis, {
                            repositoryId,
                            rubricId,
                        });

                    // Update item result with authentication
                    await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.updateItemResult, {
                            analysisId,
                            rubricItemId,
                            status: "completed",
                            result: evaluationResult.result,
                        });

                    // Get the analysis with results with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Property: Result is stored completely
                    expect(analysis).not.toBeNull();
                    expect(analysis?.results).toHaveLength(1);

                    const result = analysis?.results[0];
                    expect(result?.analysisId).toBe(analysisId);
                    expect(result?.rubricItemId).toBe(rubricItemId);
                    expect(result?.status).toBe("completed");
                    expect(result?.result).toEqual(evaluationResult.result);
                    expect(result?.completedAt).toBeDefined();
                },
            ),
            { numRuns: 100 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 13: Analysis completion status**
 * *For any* analysis where all rubric items have been processed (completed or failed),
 * the analysis status SHALL be "completed", and completedItems + failedItems SHALL
 * equal totalItems.
 * **Validates: Requirements 5.5**
 */
describe("Property 13: Analysis completion status", () => {
    it("should mark analysis as completed when all items are processed", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 2, maxLength: 5 }),
                fc.array(fc.constantFrom("completed", "failed"), {
                    minLength: 2,
                    maxLength: 5,
                }),
                async (userData, repoData, rubricData, rubricItems, itemStatuses) => {
                    // Ensure arrays have same length
                    const items = rubricItems.slice(0, itemStatuses.length);
                    const statuses = itemStatuses.slice(0, items.length);

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

                    // Process all items with authentication
                    for (let i = 0; i < rubricItemIds.length; i++) {
                        await t
                            .withIdentity({ subject: userData.clerkId })
                            .mutation(api.analyses.updateItemResult, {
                                analysisId,
                                rubricItemId: rubricItemIds[i],
                                status: statuses[i],
                                result:
                                    statuses[i] === "completed" ? { value: true } : undefined,
                                error: statuses[i] === "failed" ? "Test error" : undefined,
                            });
                    }

                    // Complete the analysis with authentication
                    await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.completeAnalysis, {
                            analysisId,
                        });

                    // Get the analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Property: Analysis completion status is correct
                    expect(analysis).not.toBeNull();
                    expect(analysis!.status).toBe("completed");
                    expect(analysis!.totalItems).toBe(items.length);
                    expect(analysis!.completedItems + analysis!.failedItems).toBe(
                        items.length,
                    );

                    const expectedCompleted = statuses.filter(
                        (s) => s === "completed",
                    ).length;
                    const expectedFailed = statuses.filter((s) => s === "failed").length;
                    expect(analysis!.completedItems).toBe(expectedCompleted);
                    expect(analysis!.failedItems).toBe(expectedFailed);
                    expect(analysis!.completedAt).toBeDefined();
                },
            ),
            { numRuns: 100 },
        );
    });
});


/**
 * **Feature: ai-code-review, Property 22: One-off analysis storage structure**
 * *For any* one-off analysis creation, the stored analysis record SHALL have
 * repositoryUrl set to the input URL, repositoryId set to undefined/null, and
 * repositoryOwner/repositoryName correctly populated from the parsed URL.
 * **Validates: Requirements 9.3**
 */
describe("Property 22: One-off analysis storage structure", () => {
    // Arbitrary for generating valid GitHub owner/repo names
    const gitHubNameArbitrary = fc
        .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,38}[a-zA-Z0-9]$/)
        .filter((s) => s.length >= 2 && s.length <= 39);

    // Arbitrary for generating valid branch names
    const branchArbitrary = fc
        .stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9_/-]{0,48}[a-zA-Z0-9]$/)
        .filter((s) => s.length >= 2 && !s.includes("//"));

    it("should store one-off analysis with correct structure", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 5 }),
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                branchArbitrary,
                async (userData, rubricData, rubricItems, owner, repoName, branch) => {
                    const t = convexTest(schema, modules);

                    // Create user first
                    await t.mutation(api.users.syncUser, userData);

                    // Create rubric with authentication
                    const rubricId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Add rubric items with authentication
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

                    // Construct repository URL
                    const repositoryUrl = `https://github.com/${owner}/${repoName}`;

                    // Create one-off analysis with authentication
                    const analysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createOneOffAnalysis, {
                            repositoryUrl,
                            repositoryOwner: owner,
                            repositoryName: repoName,
                            branch,
                            rubricId,
                        });

                    // Get the created analysis with authentication
                    const analysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId,
                        });

                    // Property: One-off analysis has correct storage structure
                    expect(analysis).not.toBeNull();

                    // repositoryId should be undefined for one-off analyses
                    expect(analysis?.repositoryId).toBeUndefined();

                    // repositoryUrl should be set to the input URL
                    expect(analysis?.repositoryUrl).toBe(repositoryUrl);

                    // repositoryOwner and repositoryName should be correctly populated
                    expect(analysis?.repositoryOwner).toBe(owner);
                    expect(analysis?.repositoryName).toBe(repoName);

                    // branch should be set
                    expect(analysis?.branch).toBe(branch);

                    // Other fields should be correctly initialized
                    expect(analysis?.status).toBe("pending");
                    expect(analysis?.totalItems).toBe(rubricItems.length);
                    expect(analysis?.completedItems).toBe(0);
                    expect(analysis?.failedItems).toBe(0);

                    // repository should be null since it's a one-off analysis
                    expect(analysis?.repository).toBeNull();
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should distinguish one-off from connected repository analyses", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                rubricDataArbitrary,
                fc.array(rubricItemArbitrary, { minLength: 1, maxLength: 3 }),
                gitHubNameArbitrary,
                gitHubNameArbitrary,
                branchArbitrary,
                async (
                    userData,
                    repoData,
                    rubricData,
                    rubricItems,
                    oneOffOwner,
                    oneOffRepoName,
                    oneOffBranch,
                ) => {
                    const t = convexTest(schema, modules);

                    // Create user first
                    await t.mutation(api.users.syncUser, userData);

                    // Create connected repository
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

                    // Create connected repository analysis
                    const connectedAnalysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createAnalysis, {
                            repositoryId,
                            rubricId,
                        });

                    // Create one-off analysis
                    const oneOffUrl = `https://github.com/${oneOffOwner}/${oneOffRepoName}`;
                    const oneOffAnalysisId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.analyses.createOneOffAnalysis, {
                            repositoryUrl: oneOffUrl,
                            repositoryOwner: oneOffOwner,
                            repositoryName: oneOffRepoName,
                            branch: oneOffBranch,
                            rubricId,
                        });

                    // Get both analyses
                    const connectedAnalysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId: connectedAnalysisId,
                        });

                    const oneOffAnalysis = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.analyses.getAnalysis, {
                            analysisId: oneOffAnalysisId,
                        });

                    // Property: Connected analysis has repositoryId, one-off does not
                    expect(connectedAnalysis?.repositoryId).toBe(repositoryId);
                    expect(connectedAnalysis?.repositoryUrl).toBeUndefined();
                    expect(connectedAnalysis?.repository).not.toBeNull();

                    expect(oneOffAnalysis?.repositoryId).toBeUndefined();
                    expect(oneOffAnalysis?.repositoryUrl).toBe(oneOffUrl);
                    expect(oneOffAnalysis?.repository).toBeNull();
                },
            ),
            { numRuns: 100 },
        );
    });
});
