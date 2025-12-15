import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Evaluation type validator - shared across schema and functions
export const evaluationTypeValidator = v.union(
    v.literal("yes_no"),
    v.literal("range"),
    v.literal("comments"),
    v.literal("code_examples"),
);

// Rubric item config validator
export const rubricItemConfigValidator = v.object({
    requireJustification: v.optional(v.boolean()),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    maxExamples: v.optional(v.number()),
});

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        imageUrl: v.optional(v.string()),
    }).index("by_clerk_id", ["clerkId"]),

    rubrics: defineTable({
        userId: v.optional(v.id("users")), // null for system templates
        name: v.string(),
        description: v.string(),
        isSystemTemplate: v.boolean(),
        systemTemplateId: v.optional(v.string()), // Stable ID for system templates
        createdAt: v.number(),
        updatedAt: v.number(),
        deletedAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_system_template", ["isSystemTemplate"])
        .index("by_system_template_id", ["systemTemplateId"]),

    rubricItems: defineTable({
        rubricId: v.id("rubrics"),
        name: v.string(),
        description: v.string(),
        evaluationType: evaluationTypeValidator,
        config: rubricItemConfigValidator,
        order: v.number(),
    }).index("by_rubric", ["rubricId"]),
});
