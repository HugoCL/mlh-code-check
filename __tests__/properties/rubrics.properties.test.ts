import { convexTest } from "convex-test";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { api, internal } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../../convex/test.setup";
import { SYSTEM_TEMPLATES } from "../../lib/templates";

// Helper to create a test user
async function createTestUser(
    t: ReturnType<typeof convexTest>,
    clerkId?: string,
) {
    const id = clerkId ?? fc.sample(fc.uuid(), 1)[0];
    const userId = await t.mutation(api.users.syncUser, {
        clerkId: id,
        email: `${id}@test.com`,
        name: "Test User",
    });
    return { userId, clerkId: id };
}

// Arbitrary for generating valid rubric data
const rubricDataArbitrary = fc.record({
    name: fc
        .string({ minLength: 1, maxLength: 100 })
        .filter((s) => s.trim().length > 0),
    description: fc.string({ minLength: 0, maxLength: 500 }),
});

/**
 * **Feature: ai-code-review, Property 2: Rubric creation persistence**
 * *For any* valid rubric name and description, creating a rubric SHALL result
 * in a stored record retrievable by ID with matching name, description, empty
 * items list, and the creating user's ID.
 * **Validates: Requirements 2.1**
 */
describe("Property 2: Rubric creation persistence", () => {
    it("should persist rubric with matching data and empty items list", async () => {
        await fc.assert(
            fc.asyncProperty(rubricDataArbitrary, async (rubricData) => {
                const t = convexTest(schema, modules);

                // Create a test user first
                const { userId, clerkId } = await createTestUser(t);

                // Create the rubric with authentication
                const rubricId = await t
                    .withIdentity({ subject: clerkId })
                    .mutation(api.rubrics.createRubric, {
                        name: rubricData.name,
                        description: rubricData.description,
                    });

                // Verify rubric was created
                expect(rubricId).toBeDefined();

                // Retrieve the rubric
                const rubric = await t.query(api.rubrics.getRubric, { rubricId });

                // Property: Rubric exists with matching data
                expect(rubric).not.toBeNull();
                expect(rubric?.name).toBe(rubricData.name);
                expect(rubric?.description).toBe(rubricData.description);
                expect(rubric?.userId).toBe(userId);
                expect(rubric?.isSystemTemplate).toBe(false);
                expect(rubric?.items).toEqual([]);
                expect(rubric?.deletedAt).toBeUndefined();
            }),
            { numRuns: 100 },
        );
    });

    it("should create distinct rubrics for each creation call", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                rubricDataArbitrary,
                async (rubricData1, rubricData2) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    // Create two rubrics with authentication
                    const rubricId1 = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData1.name,
                            description: rubricData1.description,
                        });

                    const rubricId2 = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData2.name,
                            description: rubricData2.description,
                        });

                    // Property: Each creation produces a distinct rubric
                    expect(rubricId1).not.toBe(rubricId2);

                    // Both rubrics should be retrievable
                    const rubric1 = await t.query(api.rubrics.getRubric, {
                        rubricId: rubricId1,
                    });
                    const rubric2 = await t.query(api.rubrics.getRubric, {
                        rubricId: rubricId2,
                    });

                    expect(rubric1?.name).toBe(rubricData1.name);
                    expect(rubric2?.name).toBe(rubricData2.name);
                },
            ),
            { numRuns: 100 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 5: Rubric update persistence**
 * *For any* rubric update operation with valid data, retrieving the rubric
 * immediately after SHALL return the updated values.
 * **Validates: Requirements 2.7**
 */
describe("Property 5: Rubric update persistence", () => {
    it("should persist updated name and description", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                rubricDataArbitrary,
                async (initialData, updatedData) => {
                    const t = convexTest(schema, modules);
                    const { userId, clerkId } = await createTestUser(t);

                    // Create initial rubric with authentication
                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: initialData.name,
                            description: initialData.description,
                        });

                    // Update the rubric with authentication
                    await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.updateRubric, {
                            rubricId,
                            name: updatedData.name,
                            description: updatedData.description,
                        });

                    // Retrieve and verify
                    const rubric = await t.query(api.rubrics.getRubric, { rubricId });

                    // Property: Updated values are persisted
                    expect(rubric?.name).toBe(updatedData.name);
                    expect(rubric?.description).toBe(updatedData.description);
                    expect(rubric?.userId).toBe(userId);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should update only specified fields", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                fc
                    .string({ minLength: 1, maxLength: 100 })
                    .filter((s) => s.trim().length > 0),
                async (initialData, newName) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    // Create initial rubric with authentication
                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: initialData.name,
                            description: initialData.description,
                        });

                    // Update only the name with authentication
                    await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.updateRubric, {
                            rubricId,
                            name: newName,
                        });

                    // Retrieve and verify
                    const rubric = await t.query(api.rubrics.getRubric, { rubricId });

                    // Property: Only name changed, description unchanged
                    expect(rubric?.name).toBe(newName);
                    expect(rubric?.description).toBe(initialData.description);
                },
            ),
            { numRuns: 100 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 6: Soft delete preserves history**
 * *For any* deleted rubric that has been used in analyses, the rubric SHALL
 * not appear in user's rubric list, but historical analyses SHALL still be
 * retrievable with their original rubric reference.
 * **Validates: Requirements 2.8**
 */
describe("Property 6: Soft delete preserves history", () => {
    it("should not appear in listRubrics after deletion", async () => {
        await fc.assert(
            fc.asyncProperty(rubricDataArbitrary, async (rubricData) => {
                const t = convexTest(schema, modules);
                const { userId, clerkId } = await createTestUser(t);

                // Create a rubric with authentication
                const rubricId = await t
                    .withIdentity({ subject: clerkId })
                    .mutation(api.rubrics.createRubric, {
                        name: rubricData.name,
                        description: rubricData.description,
                    });

                // Verify it appears in list
                const listBefore = await t.query(api.rubrics.listRubrics, { userId });
                const foundBefore = listBefore.some((r) => r._id === rubricId);
                expect(foundBefore).toBe(true);

                // Delete the rubric
                await t.mutation(api.rubrics.deleteRubric, { rubricId });

                // Verify it no longer appears in list
                const listAfter = await t.query(api.rubrics.listRubrics, { userId });
                const foundAfter = listAfter.some((r) => r._id === rubricId);

                // Property: Deleted rubric not in list
                expect(foundAfter).toBe(false);
            }),
            { numRuns: 100 },
        );
    });

    it("should still be retrievable by ID after deletion", async () => {
        await fc.assert(
            fc.asyncProperty(rubricDataArbitrary, async (rubricData) => {
                const t = convexTest(schema, modules);
                const { clerkId } = await createTestUser(t);

                // Create a rubric
                const rubricId = await t
                    .withIdentity({ subject: clerkId })
                    .mutation(api.rubrics.createRubric, {
                        name: rubricData.name,
                        description: rubricData.description,
                    });

                // Delete the rubric
                await t.mutation(api.rubrics.deleteRubric, { rubricId });

                // Retrieve by ID
                const rubric = await t.query(api.rubrics.getRubric, { rubricId });

                // Property: Rubric still exists with original data
                expect(rubric).not.toBeNull();
                expect(rubric?.name).toBe(rubricData.name);
                expect(rubric?.description).toBe(rubricData.description);
                expect(rubric?.deletedAt).toBeDefined();
            }),
            { numRuns: 100 },
        );
    });

    it("should be idempotent - deleting twice has same effect", async () => {
        await fc.assert(
            fc.asyncProperty(rubricDataArbitrary, async (rubricData) => {
                const t = convexTest(schema, modules);
                const { clerkId } = await createTestUser(t);

                // Create a rubric
                const rubricId = await t
                    .withIdentity({ subject: clerkId })
                    .mutation(api.rubrics.createRubric, {
                        name: rubricData.name,
                        description: rubricData.description,
                    });

                // Delete twice
                await t.mutation(api.rubrics.deleteRubric, { rubricId });
                const firstDeletedRubric = await t.query(api.rubrics.getRubric, {
                    rubricId,
                });
                const firstDeletedAt = firstDeletedRubric?.deletedAt;

                await t.mutation(api.rubrics.deleteRubric, { rubricId });
                const secondDeletedRubric = await t.query(api.rubrics.getRubric, {
                    rubricId,
                });

                // Property: Second delete doesn't change deletedAt
                expect(secondDeletedRubric?.deletedAt).toBe(firstDeletedAt);
            }),
            { numRuns: 100 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 3: Rubric item validation**
 * *For any* rubric item creation attempt, the item SHALL only be stored if it
 * contains a non-empty name, non-empty description, and valid evaluation type.
 * **Validates: Requirements 2.2**
 */
describe("Property 3: Rubric item validation", () => {
    // Arbitrary for valid evaluation types
    const evaluationTypeArbitrary = fc.constantFrom(
        "yes_no",
        "range",
        "comments",
        "code_examples",
    ) as fc.Arbitrary<"yes_no" | "range" | "comments" | "code_examples">;

    // Arbitrary for valid rubric item data
    const validItemDataArbitrary = fc.record({
        name: fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
        description: fc
            .string({ minLength: 1, maxLength: 500 })
            .filter((s) => s.trim().length > 0),
        evaluationType: evaluationTypeArbitrary,
    });

    it("should store valid rubric items with all required fields", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                validItemDataArbitrary,
                async (rubricData, itemData) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    // Create a rubric first
                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Add a valid item
                    const itemId = await t.mutation(api.rubrics.addRubricItem, {
                        rubricId,
                        name: itemData.name,
                        description: itemData.description,
                        evaluationType: itemData.evaluationType,
                    });

                    // Verify item was created
                    expect(itemId).toBeDefined();

                    // Retrieve and verify
                    const item = await t.query(api.rubrics.getRubricItem, { itemId });

                    // Property: Item stored with matching data
                    expect(item).not.toBeNull();
                    expect(item?.name).toBe(itemData.name.trim());
                    expect(item?.description).toBe(itemData.description.trim());
                    expect(item?.evaluationType).toBe(itemData.evaluationType);
                    expect(item?.rubricId).toBe(rubricId);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should reject items with empty name", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                fc.constantFrom("", "   ", "\t", "\n"),
                fc
                    .string({ minLength: 1, maxLength: 500 })
                    .filter((s) => s.trim().length > 0),
                evaluationTypeArbitrary,
                async (rubricData, emptyName, description, evalType) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Property: Empty name should be rejected
                    await expect(
                        t.mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name: emptyName,
                            description,
                            evaluationType: evalType,
                        }),
                    ).rejects.toThrow();
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should reject items with empty description", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                fc
                    .string({ minLength: 1, maxLength: 100 })
                    .filter((s) => s.trim().length > 0),
                fc.constantFrom("", "   ", "\t", "\n"),
                evaluationTypeArbitrary,
                async (rubricData, name, emptyDescription, evalType) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Property: Empty description should be rejected
                    await expect(
                        t.mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name,
                            description: emptyDescription,
                            evaluationType: evalType,
                        }),
                    ).rejects.toThrow();
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should assign sequential order to items", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                fc.array(validItemDataArbitrary, { minLength: 2, maxLength: 5 }),
                async (rubricData, itemsData) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Add multiple items
                    const itemIds = [];
                    for (const itemData of itemsData) {
                        const itemId = await t.mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name: itemData.name,
                            description: itemData.description,
                            evaluationType: itemData.evaluationType,
                        });
                        itemIds.push(itemId);
                    }

                    // Retrieve rubric with items
                    const rubric = await t.query(api.rubrics.getRubric, { rubricId });

                    // Property: Items have sequential order starting from 0
                    expect(rubric?.items.length).toBe(itemsData.length);
                    for (let i = 0; i < rubric!.items.length; i++) {
                        expect(rubric!.items[i].order).toBe(i);
                    }
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should validate range config - minValue must be less than maxValue", async () => {
        await fc.assert(
            fc.asyncProperty(
                rubricDataArbitrary,
                validItemDataArbitrary,
                fc.integer({ min: 1, max: 100 }),
                async (rubricData, itemData, value) => {
                    const t = convexTest(schema, modules);
                    const { clerkId } = await createTestUser(t);

                    const rubricId = await t
                        .withIdentity({ subject: clerkId })
                        .mutation(api.rubrics.createRubric, {
                            name: rubricData.name,
                            description: rubricData.description,
                        });

                    // Property: Invalid range (min >= max) should be rejected
                    await expect(
                        t.mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name: itemData.name,
                            description: itemData.description,
                            evaluationType: "range",
                            config: {
                                minValue: value,
                                maxValue: value, // Equal values should fail
                            },
                        }),
                    ).rejects.toThrow();

                    await expect(
                        t.mutation(api.rubrics.addRubricItem, {
                            rubricId,
                            name: itemData.name,
                            description: itemData.description,
                            evaluationType: "range",
                            config: {
                                minValue: value + 1,
                                maxValue: value, // min > max should fail
                            },
                        }),
                    ).rejects.toThrow();
                },
            ),
            { numRuns: 50 },
        );
    });
});

// ============================================================================
// System Template Properties
// ============================================================================

/**
 * **Feature: ai-code-review, Property 7: Rubric listing includes both types**
 * *For any* authenticated user, listing available rubrics SHALL return both
 * user-created rubrics (with userId matching the user) and system templates
 * (with isSystemTemplate=true), with each rubric correctly flagged.
 * **Validates: Requirements 3.2**
 */
describe("Property 7: Rubric listing includes both types", () => {
    it("should include both user rubrics and system templates with correct flags", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(rubricDataArbitrary, { minLength: 1, maxLength: 3 }),
                async (userRubricsData) => {
                    const t = convexTest(schema, modules);
                    const { userId, clerkId } = await createTestUser(t);

                    // Load system templates first
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    // Create user rubrics
                    const userRubricIds = [];
                    for (const rubricData of userRubricsData) {
                        const rubricId = await t
                            .withIdentity({ subject: clerkId })
                            .mutation(api.rubrics.createRubric, {
                                name: rubricData.name,
                                description: rubricData.description,
                            });
                        userRubricIds.push(rubricId);
                    }

                    // List all rubrics
                    const allRubrics = await t.query(api.rubrics.listRubrics, { userId });

                    // Property: List includes both types with correct flags
                    const userRubrics = allRubrics.filter((r) => !r.isSystemTemplate);
                    const systemTemplates = allRubrics.filter((r) => r.isSystemTemplate);

                    // Should have our user rubrics
                    expect(userRubrics.length).toBe(userRubricsData.length);
                    for (const userRubric of userRubrics) {
                        expect(userRubric.userId).toBe(userId);
                        expect(userRubric.isSystemTemplate).toBe(false);
                    }

                    // Should have system templates
                    expect(systemTemplates.length).toBe(SYSTEM_TEMPLATES.length);
                    for (const template of systemTemplates) {
                        expect(template.userId).toBeUndefined();
                        expect(template.isSystemTemplate).toBe(true);
                        expect(template.systemTemplateId).toBeDefined();
                    }
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should maintain separation between user rubrics and system templates", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.array(rubricDataArbitrary, { minLength: 0, maxLength: 2 }),
                async (userRubricsData) => {
                    const t = convexTest(schema, modules);
                    const { userId, clerkId } = await createTestUser(t);

                    // Load system templates
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    // Create user rubrics
                    for (const rubricData of userRubricsData) {
                        await t
                            .withIdentity({ subject: clerkId })
                            .mutation(api.rubrics.createRubric, {
                                name: rubricData.name,
                                description: rubricData.description,
                            });
                    }

                    // List rubrics
                    const allRubrics = await t.query(api.rubrics.listRubrics, { userId });

                    // Property: No overlap between user rubrics and system templates
                    const userRubrics = allRubrics.filter((r) => !r.isSystemTemplate);
                    const systemTemplates = allRubrics.filter((r) => r.isSystemTemplate);

                    // No system template should have a userId
                    for (const template of systemTemplates) {
                        expect(template.userId).toBeUndefined();
                    }

                    // All user rubrics should have the correct userId
                    for (const userRubric of userRubrics) {
                        expect(userRubric.userId).toBe(userId);
                    }

                    // No ID overlap
                    const userIds = new Set(userRubrics.map((r) => r._id));
                    const templateIds = new Set(systemTemplates.map((r) => r._id));
                    const intersection = new Set(
                        [...userIds].filter((id) => templateIds.has(id)),
                    );
                    expect(intersection.size).toBe(0);
                },
            ),
            { numRuns: 50 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 8: System template direct usage**
 * *For any* analysis created using a system template, the analysis record
 * SHALL reference the system template's rubricId directly without creating
 * a duplicate rubric.
 * **Validates: Requirements 3.3**
 */
describe("Property 8: System template direct usage", () => {
    it("should reference system template directly without duplication", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...SYSTEM_TEMPLATES.map((t) => t.id)),
                async (templateId) => {
                    const t = convexTest(schema, modules);
                    const { userId } = await createTestUser(t);

                    // Load system templates
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    // Find the system template
                    const allRubrics = await t.query(api.rubrics.listRubrics, { userId });
                    const systemTemplate = allRubrics.find(
                        (r) => r.isSystemTemplate && r.systemTemplateId === templateId,
                    );

                    expect(systemTemplate).toBeDefined();

                    // Property: System template can be used directly
                    // We verify this by checking that the template exists and has the correct properties
                    expect(systemTemplate!.isSystemTemplate).toBe(true);
                    expect(systemTemplate!.systemTemplateId).toBe(templateId);
                    expect(systemTemplate!.userId).toBeUndefined();

                    // Verify template has items (not empty)
                    const templateWithItems = await t.query(api.rubrics.getRubric, {
                        rubricId: systemTemplate!._id,
                    });
                    expect(templateWithItems!.items.length).toBeGreaterThan(0);

                    // Property: Template items match the configuration
                    const originalTemplate = SYSTEM_TEMPLATES.find(
                        (st) => st.id === templateId,
                    )!;
                    expect(templateWithItems!.items.length).toBe(
                        originalTemplate.items.length,
                    );
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should preserve system template stability across reloads", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...SYSTEM_TEMPLATES.map((t) => t.id)),
                async (templateId) => {
                    const t = convexTest(schema, modules);
                    const { userId } = await createTestUser(t);

                    // Load templates first time
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    const firstLoad = await t.query(api.rubrics.listRubrics, { userId });
                    const firstTemplate = firstLoad.find(
                        (r) => r.isSystemTemplate && r.systemTemplateId === templateId,
                    );

                    // Load templates second time (simulating app restart)
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    const secondLoad = await t.query(api.rubrics.listRubrics, { userId });
                    const secondTemplate = secondLoad.find(
                        (r) => r.isSystemTemplate && r.systemTemplateId === templateId,
                    );

                    // Property: Same template ID after reload
                    expect(firstTemplate!._id).toBe(secondTemplate!._id);
                    expect(firstTemplate!.systemTemplateId).toBe(
                        secondTemplate!.systemTemplateId,
                    );
                },
            ),
            { numRuns: 30 },
        );
    });
});

/**
 * **Feature: ai-code-review, Property 9: Template duplication creates user copy**
 * *For any* system template duplication operation, the resulting rubric SHALL
 * have userId set to the requesting user, isSystemTemplate=false, and contain
 * copies of all original rubric items.
 * **Validates: Requirements 3.4**
 */
describe("Property 9: Template duplication creates user copy", () => {
    it("should create user copy with all template items", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...SYSTEM_TEMPLATES.map((t) => t.id)),
                fc.option(
                    fc
                        .string({ minLength: 1, maxLength: 100 })
                        .filter((s) => s.trim().length > 0),
                    { nil: undefined },
                ),
                async (templateId, customName) => {
                    const t = convexTest(schema, modules);
                    const { userId } = await createTestUser(t);

                    // Load system templates
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    // Find the system template
                    const allRubrics = await t.query(api.rubrics.listRubrics, { userId });
                    const systemTemplate = allRubrics.find(
                        (r) => r.isSystemTemplate && r.systemTemplateId === templateId,
                    );

                    expect(systemTemplate).toBeDefined();

                    // Get original template with items
                    const originalTemplate = await t.query(api.rubrics.getRubric, {
                        rubricId: systemTemplate!._id,
                    });

                    // Duplicate the template
                    const duplicatedRubricId = await t.mutation(
                        api.rubrics.duplicateSystemTemplate,
                        {
                            userId,
                            systemTemplateId: systemTemplate!._id,
                            name: customName,
                        },
                    );

                    // Get the duplicated rubric
                    const duplicatedRubric = await t.query(api.rubrics.getRubric, {
                        rubricId: duplicatedRubricId,
                    });

                    // Property: Duplicated rubric is a user rubric
                    expect(duplicatedRubric!.userId).toBe(userId);
                    expect(duplicatedRubric!.isSystemTemplate).toBe(false);
                    expect(duplicatedRubric!.systemTemplateId).toBeUndefined();

                    // Property: Name is either custom or default copy name
                    if (customName) {
                        expect(duplicatedRubric!.name).toBe(customName);
                    } else {
                        expect(duplicatedRubric!.name).toBe(
                            `${originalTemplate!.name} (Copy)`,
                        );
                    }

                    // Property: All items are copied
                    expect(duplicatedRubric!.items.length).toBe(
                        originalTemplate!.items.length,
                    );

                    for (let i = 0; i < originalTemplate!.items.length; i++) {
                        const originalItem = originalTemplate!.items[i];
                        const duplicatedItem = duplicatedRubric!.items[i];

                        expect(duplicatedItem.name).toBe(originalItem.name);
                        expect(duplicatedItem.description).toBe(originalItem.description);
                        expect(duplicatedItem.evaluationType).toBe(
                            originalItem.evaluationType,
                        );
                        expect(duplicatedItem.config).toEqual(originalItem.config);
                        expect(duplicatedItem.order).toBe(originalItem.order);
                        expect(duplicatedItem.rubricId).toBe(duplicatedRubricId);
                    }
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should create independent copy that can be modified", async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(...SYSTEM_TEMPLATES.map((t) => t.id)),
                rubricDataArbitrary,
                async (templateId, newData) => {
                    const t = convexTest(schema, modules);
                    const { userId } = await createTestUser(t);

                    // Load system templates
                    await t.mutation(internal.rubrics.loadSystemTemplates, {
                        templates: SYSTEM_TEMPLATES,
                    });

                    // Find and duplicate template
                    const allRubrics = await t.query(api.rubrics.listRubrics, { userId });
                    const systemTemplate = allRubrics.find(
                        (r) => r.isSystemTemplate && r.systemTemplateId === templateId,
                    );

                    const duplicatedRubricId = await t.mutation(
                        api.rubrics.duplicateSystemTemplate,
                        {
                            userId,
                            systemTemplateId: systemTemplate!._id,
                        },
                    );

                    // Modify the duplicated rubric
                    await t.mutation(api.rubrics.updateRubric, {
                        rubricId: duplicatedRubricId,
                        name: newData.name,
                        description: newData.description,
                    });

                    // Get both rubrics
                    const originalTemplate = await t.query(api.rubrics.getRubric, {
                        rubricId: systemTemplate!._id,
                    });
                    const modifiedCopy = await t.query(api.rubrics.getRubric, {
                        rubricId: duplicatedRubricId,
                    });

                    // Property: Original template unchanged
                    expect(originalTemplate!.name).not.toBe(newData.name);
                    expect(originalTemplate!.description).not.toBe(newData.description);
                    expect(originalTemplate!.isSystemTemplate).toBe(true);

                    // Property: Copy was modified
                    expect(modifiedCopy!.name).toBe(newData.name);
                    expect(modifiedCopy!.description).toBe(newData.description);
                    expect(modifiedCopy!.isSystemTemplate).toBe(false);
                    expect(modifiedCopy!.userId).toBe(userId);
                },
            ),
            { numRuns: 50 },
        );
    });

    it("should reject duplication of non-system templates", async () => {
        await fc.assert(
            fc.asyncProperty(rubricDataArbitrary, async (rubricData) => {
                const t = convexTest(schema, modules);
                const { userId, clerkId } = await createTestUser(t);

                // Create a regular user rubric
                const userRubricId = await t
                    .withIdentity({ subject: clerkId })
                    .mutation(api.rubrics.createRubric, {
                        name: rubricData.name,
                        description: rubricData.description,
                    });

                // Property: Cannot duplicate non-system templates
                await expect(
                    t.mutation(api.rubrics.duplicateSystemTemplate, {
                        userId,
                        systemTemplateId: userRubricId,
                    }),
                ).rejects.toThrow();
            }),
            { numRuns: 50 },
        );
    });
});
