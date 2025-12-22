import { v } from "convex/values";
import { SYSTEM_TEMPLATES } from "../lib/templates.js";
import { Id } from "./_generated/dataModel";
import {
	internalMutation,
	MutationCtx,
	mutation,
	QueryCtx,
	query,
} from "./_generated/server";
import { evaluationTypeValidator, rubricItemConfigValidator } from "./schema";

// Helper function to get authenticated user
async function getAuthenticatedUser(ctx: MutationCtx | QueryCtx) {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) {
		throw new Error("Not authenticated");
	}

	const user = await ctx.db
		.query("users")
		.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
		.unique();

	if (!user) {
		throw new Error("User not found");
	}

	return user;
}

function normalizeOptions(options?: string[]) {
	if (!options) return [];

	const cleaned = options
		.map((option) => option.trim())
		.filter((option) => option.length > 0);

	const seen = new Set<string>();
	const uniqueOptions: string[] = [];

	for (const option of cleaned) {
		const key = option.toLowerCase();
		if (!seen.has(key)) {
			seen.add(key);
			uniqueOptions.push(option);
		}
	}

	return uniqueOptions;
}

/**
 * Create a new rubric for the authenticated user.
 * Requirements: 2.1 - Store rubric with name, description, and empty item list
 */
export const createRubric = mutation({
	args: {
		name: v.string(),
		description: v.string(),
	},
	handler: async (ctx, args) => {
		const user = await getAuthenticatedUser(ctx);
		const now = Date.now();

		const rubricId = await ctx.db.insert("rubrics", {
			userId: user._id,
			name: args.name,
			description: args.description,
			isSystemTemplate: false,
			createdAt: now,
			updatedAt: now,
		});

		return rubricId;
	},
});

/**
 * Update an existing rubric's metadata.
 * Requirements: 2.7 - Update rubric and reflect changes immediately
 */
export const updateRubric = mutation({
	args: {
		rubricId: v.id("rubrics"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}

		// Don't allow editing system templates directly
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot edit system templates directly");
		}

		// Don't allow editing deleted rubrics
		if (rubric.deletedAt) {
			throw new Error("Cannot edit deleted rubric");
		}

		const updates: { name?: string; description?: string; updatedAt: number } =
			{
				updatedAt: Date.now(),
			};

		if (args.name !== undefined) {
			updates.name = args.name;
		}
		if (args.description !== undefined) {
			updates.description = args.description;
		}

		await ctx.db.patch(args.rubricId, updates);

		return args.rubricId;
	},
});

/**
 * Soft delete a rubric.
 * Requirements: 2.8 - Remove from list but preserve for historical analyses
 */
export const deleteRubric = mutation({
	args: {
		rubricId: v.id("rubrics"),
	},
	handler: async (ctx, args) => {
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}

		// Don't allow deleting system templates
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot delete system templates");
		}

		// Already deleted
		if (rubric.deletedAt) {
			return args.rubricId;
		}

		await ctx.db.patch(args.rubricId, {
			deletedAt: Date.now(),
			updatedAt: Date.now(),
		});

		return args.rubricId;
	},
});

/**
 * List all rubrics for a user (excluding soft-deleted ones).
 * Also includes system templates.
 * Requirements: 2.8 - Deleted rubrics should not appear in list
 */
export const listRubrics = query({
	args: {
		userId: v.id("users"),
	},
	handler: async (ctx, args) => {
		// Get user's rubrics (non-deleted)
		const userRubrics = await ctx.db
			.query("rubrics")
			.withIndex("by_user", (q) => q.eq("userId", args.userId))
			.collect();

		// Filter out deleted rubrics
		const activeUserRubrics = userRubrics.filter((r) => !r.deletedAt);

		// Get system templates
		const systemTemplates = await ctx.db
			.query("rubrics")
			.withIndex("by_system_template", (q) => q.eq("isSystemTemplate", true))
			.collect();

		// Filter out deleted system templates (shouldn't happen but be safe)
		const activeSystemTemplates = systemTemplates.filter((r) => !r.deletedAt);

		return [...activeUserRubrics, ...activeSystemTemplates];
	},
});

/**
 * Get a single rubric by ID with its items.
 */
export const getRubric = query({
	args: {
		rubricId: v.id("rubrics"),
	},
	handler: async (ctx, args) => {
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			return null;
		}

		// Get all items for this rubric, sorted by order
		const items = await ctx.db
			.query("rubricItems")
			.withIndex("by_rubric", (q) => q.eq("rubricId", args.rubricId))
			.collect();

		// Sort by order
		items.sort((a, b) => a.order - b.order);

		return {
			...rubric,
			items,
		};
	},
});

/**
 * Get a rubric by ID without items (for checking existence/ownership).
 */
export const getRubricById = query({
	args: {
		rubricId: v.id("rubrics"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.rubricId);
	},
});

// ============================================================================
// Rubric Item Management
// ============================================================================

/**
 * Add a new item to a rubric.
 * Requirements: 2.2 - Require name, description, evaluation type, and optional config
 */
export const addRubricItem = mutation({
	args: {
		rubricId: v.id("rubrics"),
		name: v.string(),
		description: v.string(),
		evaluationType: evaluationTypeValidator,
		config: v.optional(rubricItemConfigValidator),
		order: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Validate required fields
		if (!args.name || args.name.trim().length === 0) {
			throw new Error("Rubric item name is required");
		}
		if (!args.description || args.description.trim().length === 0) {
			throw new Error("Rubric item description is required");
		}

		// Verify rubric exists and is not deleted
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}
		if (rubric.deletedAt) {
			throw new Error("Cannot add items to deleted rubric");
		}
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot modify system templates directly");
		}

		// Determine order - use provided order or calculate next
		let order = args.order;
		if (order === undefined) {
			const existingItems = await ctx.db
				.query("rubricItems")
				.withIndex("by_rubric", (q) => q.eq("rubricId", args.rubricId))
				.collect();

			const maxOrder = existingItems.reduce(
				(max, item) => Math.max(max, item.order),
				-1,
			);
			order = maxOrder + 1;
		}

		// Validate config based on evaluation type
		const config = args.config ?? {};

		// For range type, validate min/max and require rangeGuidance
		if (args.evaluationType === "range") {
			if (config.minValue !== undefined && config.maxValue !== undefined) {
				if (config.minValue >= config.maxValue) {
					throw new Error("Range minValue must be less than maxValue");
				}
			}
			// Require rangeGuidance for range type items
			if (!config.rangeGuidance || config.rangeGuidance.trim().length === 0) {
				throw new Error(
					"Range evaluation type requires guidance text describing when each score level should be selected",
				);
			}
		}

		if (args.evaluationType === "options") {
			const normalizedOptions = normalizeOptions(config.options);
			if (normalizedOptions.length === 0) {
				throw new Error("Options evaluation type requires at least one option");
			}

			if (config.maxSelections !== undefined) {
				if (!config.allowMultiple) {
					throw new Error(
						"Options evaluation type requires allowMultiple to set maxSelections",
					);
				}
				if (config.maxSelections < 1) {
					throw new Error("Options maxSelections must be at least 1");
				}
				if (config.maxSelections > normalizedOptions.length) {
					throw new Error(
						"Options maxSelections cannot exceed the number of options",
					);
				}
			}

			config.options = normalizedOptions;
		}

		const itemId = await ctx.db.insert("rubricItems", {
			rubricId: args.rubricId,
			name: args.name.trim(),
			description: args.description.trim(),
			evaluationType: args.evaluationType,
			config,
			order,
		});

		// Update rubric's updatedAt
		await ctx.db.patch(args.rubricId, { updatedAt: Date.now() });

		return itemId;
	},
});

/**
 * Update an existing rubric item.
 * Requirements: 2.3, 2.4, 2.5, 2.6 - Support all evaluation types
 */
export const updateRubricItem = mutation({
	args: {
		itemId: v.id("rubricItems"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		evaluationType: v.optional(evaluationTypeValidator),
		config: v.optional(rubricItemConfigValidator),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.itemId);
		if (!item) {
			throw new Error("Rubric item not found");
		}

		// Verify parent rubric is editable
		const rubric = await ctx.db.get(item.rubricId);
		if (!rubric) {
			throw new Error("Parent rubric not found");
		}
		if (rubric.deletedAt) {
			throw new Error("Cannot modify items in deleted rubric");
		}
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot modify system templates directly");
		}

		// Validate name if provided
		if (args.name !== undefined && args.name.trim().length === 0) {
			throw new Error("Rubric item name cannot be empty");
		}

		// Validate description if provided
		if (
			args.description !== undefined &&
			args.description.trim().length === 0
		) {
			throw new Error("Rubric item description cannot be empty");
		}

		// Build updates
		const updates: {
			name?: string;
			description?: string;
			evaluationType?:
				| "yes_no"
				| "range"
				| "comments"
				| "code_examples"
				| "options";
			config?: {
				requireJustification?: boolean;
				minValue?: number;
				maxValue?: number;
				rangeGuidance?: string;
				maxExamples?: number;
				options?: string[];
				allowMultiple?: boolean;
				maxSelections?: number;
			};
		} = {};

		if (args.name !== undefined) {
			updates.name = args.name.trim();
		}
		if (args.description !== undefined) {
			updates.description = args.description.trim();
		}
		if (args.evaluationType !== undefined) {
			updates.evaluationType = args.evaluationType;
		}
		if (args.config !== undefined) {
			// Validate range config
			const evalType = args.evaluationType ?? item.evaluationType;
			if (evalType === "range") {
				if (
					args.config.minValue !== undefined &&
					args.config.maxValue !== undefined
				) {
					if (args.config.minValue >= args.config.maxValue) {
						throw new Error("Range minValue must be less than maxValue");
					}
				}
				// Require rangeGuidance for range type items
				if (
					!args.config.rangeGuidance ||
					args.config.rangeGuidance.trim().length === 0
				) {
					throw new Error(
						"Range evaluation type requires guidance text describing when each score level should be selected",
					);
				}
			}
			if (evalType === "options") {
				const normalizedOptions = normalizeOptions(args.config.options);
				if (normalizedOptions.length === 0) {
					throw new Error(
						"Options evaluation type requires at least one option",
					);
				}

				if (args.config.maxSelections !== undefined) {
					if (!args.config.allowMultiple) {
						throw new Error(
							"Options evaluation type requires allowMultiple to set maxSelections",
						);
					}
					if (args.config.maxSelections < 1) {
						throw new Error("Options maxSelections must be at least 1");
					}
					if (args.config.maxSelections > normalizedOptions.length) {
						throw new Error(
							"Options maxSelections cannot exceed the number of options",
						);
					}
				}

				updates.config = { ...args.config, options: normalizedOptions };
			} else {
				updates.config = args.config;
			}
		}
		if (
			args.config === undefined &&
			(args.evaluationType ?? item.evaluationType) === "options"
		) {
			const existingOptions = normalizeOptions(
				(item.config as { options?: string[] } | undefined)?.options,
			);
			if (existingOptions.length === 0) {
				throw new Error("Options evaluation type requires at least one option");
			}
		}

		await ctx.db.patch(args.itemId, updates);

		// Update rubric's updatedAt
		await ctx.db.patch(item.rubricId, { updatedAt: Date.now() });

		return args.itemId;
	},
});

/**
 * Delete a rubric item.
 */
export const deleteRubricItem = mutation({
	args: {
		itemId: v.id("rubricItems"),
	},
	handler: async (ctx, args) => {
		const item = await ctx.db.get(args.itemId);
		if (!item) {
			throw new Error("Rubric item not found");
		}

		// Verify parent rubric is editable
		const rubric = await ctx.db.get(item.rubricId);
		if (!rubric) {
			throw new Error("Parent rubric not found");
		}
		if (rubric.deletedAt) {
			throw new Error("Cannot modify items in deleted rubric");
		}
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot modify system templates directly");
		}

		// Delete the item
		await ctx.db.delete(args.itemId);

		// Update rubric's updatedAt
		await ctx.db.patch(item.rubricId, { updatedAt: Date.now() });

		return args.itemId;
	},
});

/**
 * Reorder rubric items.
 * Accepts an array of item IDs in the desired order.
 */
export const reorderRubricItems = mutation({
	args: {
		rubricId: v.id("rubrics"),
		itemIds: v.array(v.id("rubricItems")),
	},
	handler: async (ctx, args) => {
		// Verify rubric exists and is editable
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}
		if (rubric.deletedAt) {
			throw new Error("Cannot reorder items in deleted rubric");
		}
		if (rubric.isSystemTemplate) {
			throw new Error("Cannot modify system templates directly");
		}

		// Get all items for this rubric
		const existingItems = await ctx.db
			.query("rubricItems")
			.withIndex("by_rubric", (q) => q.eq("rubricId", args.rubricId))
			.collect();

		const existingIds = new Set(existingItems.map((item) => item._id));

		// Verify all provided IDs belong to this rubric
		for (const itemId of args.itemIds) {
			if (!existingIds.has(itemId)) {
				throw new Error(`Item ${itemId} does not belong to this rubric`);
			}
		}

		// Verify all items are included
		if (args.itemIds.length !== existingItems.length) {
			throw new Error("All rubric items must be included in reorder");
		}

		// Update order for each item
		for (let i = 0; i < args.itemIds.length; i++) {
			await ctx.db.patch(args.itemIds[i], { order: i });
		}

		// Update rubric's updatedAt
		await ctx.db.patch(args.rubricId, { updatedAt: Date.now() });

		return args.rubricId;
	},
});

/**
 * Get a single rubric item by ID.
 */
export const getRubricItem = query({
	args: {
		itemId: v.id("rubricItems"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.itemId);
	},
});

// ============================================================================
// System Template Management
// ============================================================================

/**
 * Internal function to load system templates on application initialization.
 * This upserts system templates to ensure they're always available.
 * Requirements: 3.1 - Load templates from configuration and store in Convex
 */
async function upsertSystemTemplates(
	ctx: MutationCtx,
	templates: {
		id: string;
		name: string;
		description: string;
		items: {
			name: string;
			description: string;
			evaluationType:
				| "yes_no"
				| "range"
				| "comments"
				| "code_examples"
				| "options";
			config: {
				requireJustification?: boolean;
				minValue?: number;
				maxValue?: number;
				rangeGuidance?: string;
				maxExamples?: number;
				options?: string[];
				allowMultiple?: boolean;
				maxSelections?: number;
			};
		}[];
	}[],
) {
	const now = Date.now();

	for (const template of templates) {
		// Check if template already exists
		const existing = await ctx.db
			.query("rubrics")
			.withIndex("by_system_template_id", (q) =>
				q.eq("systemTemplateId", template.id),
			)
			.first();

		let rubricId: Id<"rubrics"> | undefined = undefined;

		if (existing) {
			// Update existing template
			await ctx.db.patch(existing._id, {
				name: template.name,
				description: template.description,
				updatedAt: now,
			});
			rubricId = existing._id;

			// Delete existing items to replace them
			const existingItems = await ctx.db
				.query("rubricItems")
				.withIndex("by_rubric", (q) => q.eq("rubricId", existing._id))
				.collect();

			for (const item of existingItems) {
				await ctx.db.delete(item._id);
			}
		} else {
			// Create new template
			rubricId = await ctx.db.insert("rubrics", {
				userId: undefined, // System templates have no user
				name: template.name,
				description: template.description,
				isSystemTemplate: true,
				systemTemplateId: template.id,
				createdAt: now,
				updatedAt: now,
			});
		}

		// Add all items
		for (let i = 0; i < template.items.length; i++) {
			const item = template.items[i];
			await ctx.db.insert("rubricItems", {
				rubricId: rubricId,
				name: item.name,
				description: item.description,
				evaluationType: item.evaluationType,
				config: item.config,
				order: i,
			});
		}
	}

	return { loaded: templates.length };
}

export const loadSystemTemplates = internalMutation({
	args: {
		templates: v.array(
			v.object({
				id: v.string(),
				name: v.string(),
				description: v.string(),
				items: v.array(
					v.object({
						name: v.string(),
						description: v.string(),
						evaluationType: evaluationTypeValidator,
						config: rubricItemConfigValidator,
					}),
				),
			}),
		),
	},
	handler: async (ctx, args) => {
		return await upsertSystemTemplates(ctx, args.templates);
	},
});

/**
 * Public mutation to sync system templates.
 */
export const syncSystemTemplates = mutation({
	args: {},
	handler: async (ctx) => {
		await getAuthenticatedUser(ctx);
		return await upsertSystemTemplates(ctx, SYSTEM_TEMPLATES);
	},
});

/**
 * Duplicate a system template to create a user's personal copy.
 * Requirements: 3.4 - Create user copy when customizing system template
 */
export const duplicateSystemTemplate = mutation({
	args: {
		userId: v.id("users"),
		systemTemplateId: v.id("rubrics"),
		name: v.optional(v.string()), // Optional custom name
	},
	handler: async (ctx, args) => {
		// Get the system template
		const template = await ctx.db.get(args.systemTemplateId);
		if (!template) {
			throw new Error("Template not found");
		}

		if (!template.isSystemTemplate) {
			throw new Error("Can only duplicate system templates");
		}

		// Get template items
		const templateItems = await ctx.db
			.query("rubricItems")
			.withIndex("by_rubric", (q) => q.eq("rubricId", args.systemTemplateId))
			.collect();

		// Sort by order
		templateItems.sort((a, b) => a.order - b.order);

		const now = Date.now();

		// Create user copy of the rubric
		const newRubricId = await ctx.db.insert("rubrics", {
			userId: args.userId,
			name: args.name || `${template.name} (Copy)`,
			description: template.description,
			isSystemTemplate: false,
			createdAt: now,
			updatedAt: now,
		});

		// Copy all items
		for (const item of templateItems) {
			await ctx.db.insert("rubricItems", {
				rubricId: newRubricId,
				name: item.name,
				description: item.description,
				evaluationType: item.evaluationType,
				config: item.config,
				order: item.order,
			});
		}

		return newRubricId;
	},
});
