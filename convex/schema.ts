import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Evaluation type validator - shared across schema and functions
export const evaluationTypeValidator = v.union(
    v.literal("yes_no"),
    v.literal("range"),
    v.literal("comments"),
    v.literal("code_examples"),
    v.literal("options"),
);

// Rubric item config validator
export const rubricItemConfigValidator = v.object({
    requireJustification: v.optional(v.boolean()),
    minValue: v.optional(v.number()),
    maxValue: v.optional(v.number()),
    rangeGuidance: v.optional(v.string()), // Required for range type: describes when each score level should be selected
    maxExamples: v.optional(v.number()),
    options: v.optional(v.array(v.string())),
    allowMultiple: v.optional(v.boolean()),
    maxSelections: v.optional(v.number()),
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

    repositories: defineTable({
        userId: v.id("users"),
        owner: v.string(),
        name: v.string(),
        fullName: v.string(),
        defaultBranch: v.string(),
        connectedAt: v.number(),
    })
        .index("by_user", ["userId"])
        .index("by_full_name", ["fullName"]),

    analyses: defineTable({
        userId: v.id("users"),
        repositoryId: v.optional(v.id("repositories")), // Optional for one-off analyses
        repositoryUrl: v.optional(v.string()), // For one-off analyses
        repositoryOwner: v.string(), // Owner extracted from URL or connected repo
        repositoryName: v.string(), // Name extracted from URL or connected repo
        branch: v.string(), // Branch to analyze
        rubricId: v.id("rubrics"),
        triggerRunId: v.optional(v.string()),
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        totalItems: v.number(),
        completedItems: v.number(),
        failedItems: v.number(),
        errorMessage: v.optional(v.string()),
        createdAt: v.number(),
        completedAt: v.optional(v.number()),
    })
        .index("by_user", ["userId"])
        .index("by_user_and_status", ["userId", "status"])
        .index("by_repository", ["repositoryId"])
        .index("by_trigger_run", ["triggerRunId"]),

    analysisResults: defineTable({
        analysisId: v.id("analyses"),
        rubricItemId: v.id("rubricItems"),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("failed"),
        ),
        result: v.optional(v.any()), // Typed per evaluation type
        error: v.optional(v.string()),
        completedAt: v.optional(v.number()),
    })
        .index("by_analysis", ["analysisId"])
        .index("by_analysis_and_item", ["analysisId", "rubricItemId"]),
});
