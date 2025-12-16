import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new analysis job for a connected repository
export const createAnalysis = mutation({
	args: {
		repositoryId: v.id("repositories"),
		rubricId: v.id("rubrics"),
		branch: v.optional(v.string()), // Optional branch override
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		// Get user record
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			throw new Error("User not found");
		}

		// Verify repository belongs to user
		const repository = await ctx.db.get(args.repositoryId);
		if (!repository || repository.userId !== user._id) {
			throw new Error("Repository not found or access denied");
		}

		// Get rubric and count items
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}

		// Verify user has access to rubric (either owns it or it's a system template)
		if (!rubric.isSystemTemplate && rubric.userId !== user._id) {
			throw new Error("Rubric not found or access denied");
		}

		// Count rubric items
		const rubricItems = await ctx.db
			.query("rubricItems")
			.withIndex("by_rubric", (q) => q.eq("rubricId", args.rubricId))
			.collect();

		// Create analysis record
		const analysisId = await ctx.db.insert("analyses", {
			userId: user._id,
			repositoryId: args.repositoryId,
			repositoryOwner: repository.owner,
			repositoryName: repository.name,
			branch: args.branch || repository.defaultBranch,
			rubricId: args.rubricId,
			status: "pending",
			totalItems: rubricItems.length,
			completedItems: 0,
			failedItems: 0,
			createdAt: Date.now(),
		});

		// Create analysis result records for each rubric item
		for (const item of rubricItems) {
			await ctx.db.insert("analysisResults", {
				analysisId,
				rubricItemId: item._id,
				status: "pending",
			});
		}

		return analysisId;
	},
});

// Update analysis progress
export const updateAnalysisProgress = mutation({
	args: {
		analysisId: v.id("analyses"),
		triggerRunId: v.optional(v.string()),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("running"),
				v.literal("completed"),
				v.literal("failed"),
			),
		),
		completedItems: v.optional(v.number()),
		failedItems: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const analysis = await ctx.db.get(args.analysisId);
		if (!analysis) {
			throw new Error("Analysis not found");
		}

		const updates: Partial<{
			triggerRunId: string;
			status: "pending" | "running" | "completed" | "failed";
			completedItems: number;
			failedItems: number;
		}> = {};
		if (args.triggerRunId !== undefined)
			updates.triggerRunId = args.triggerRunId;
		if (args.status !== undefined) updates.status = args.status;
		if (args.completedItems !== undefined)
			updates.completedItems = args.completedItems;
		if (args.failedItems !== undefined) updates.failedItems = args.failedItems;

		await ctx.db.patch(args.analysisId, updates);
	},
});

// Update individual item result
export const updateItemResult = mutation({
	args: {
		analysisId: v.id("analyses"),
		rubricItemId: v.id("rubricItems"),
		status: v.union(
			v.literal("pending"),
			v.literal("processing"),
			v.literal("completed"),
			v.literal("failed"),
		),
		result: v.optional(v.any()),
		error: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Find the analysis result record
		const analysisResult = await ctx.db
			.query("analysisResults")
			.withIndex("by_analysis_and_item", (q) =>
				q
					.eq("analysisId", args.analysisId)
					.eq("rubricItemId", args.rubricItemId),
			)
			.unique();

		if (!analysisResult) {
			throw new Error("Analysis result not found");
		}

		const updates: {
			status: "pending" | "processing" | "completed" | "failed";
			result?: unknown;
			error?: string;
			completedAt?: number;
		} = {
			status: args.status,
		};

		if (args.result !== undefined) updates.result = args.result;
		if (args.error !== undefined) updates.error = args.error;
		if (args.status === "completed" || args.status === "failed") {
			updates.completedAt = Date.now();
		}

		await ctx.db.patch(analysisResult._id, updates);

		// Update analysis progress counters
		const allResults = await ctx.db
			.query("analysisResults")
			.withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
			.collect();

		const completedItems = allResults.filter(
			(r) => r.status === "completed",
		).length;
		const failedItems = allResults.filter((r) => r.status === "failed").length;

		await ctx.db.patch(args.analysisId, {
			completedItems,
			failedItems,
		});
	},
});

// Complete analysis
export const completeAnalysis = mutation({
	args: {
		analysisId: v.id("analyses"),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.analysisId, {
			status: "completed",
			completedAt: Date.now(),
		});
	},
});

// Fail analysis
export const failAnalysis = mutation({
	args: {
		analysisId: v.id("analyses"),
		errorMessage: v.string(),
	},
	handler: async (ctx, args) => {
		await ctx.db.patch(args.analysisId, {
			status: "failed",
			errorMessage: args.errorMessage,
			completedAt: Date.now(),
		});
	},
});

// Get analysis with results
export const getAnalysis = query({
	args: {
		analysisId: v.id("analyses"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const analysis = await ctx.db.get(args.analysisId);
		if (!analysis) {
			return null;
		}

		// Get user record to verify access
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user || analysis.userId !== user._id) {
			throw new Error("Access denied");
		}

		// Get repository and rubric info (repository may be null for one-off analyses)
		const repository = analysis.repositoryId
			? await ctx.db.get(analysis.repositoryId)
			: null;
		const rubric = await ctx.db.get(analysis.rubricId);

		// Get all results
		const results = await ctx.db
			.query("analysisResults")
			.withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
			.collect();

		// Get rubric items for context
		const rubricItems = await Promise.all(
			results.map((result) => ctx.db.get(result.rubricItemId)),
		);

		return {
			...analysis,
			repository,
			rubric,
			results: results.map((result, index) => ({
				...result,
				rubricItem: rubricItems[index],
			})),
		};
	},
});

// Query for background tasks - no user authentication required
// This is used by the Trigger.dev background job to fetch analysis details
// Security: Only returns data for the specific analysis ID, no user data exposed
export const getAnalysisForTask = query({
	args: {
		analysisId: v.id("analyses"),
	},
	handler: async (ctx, args) => {
		const analysis = await ctx.db.get(args.analysisId);
		if (!analysis) {
			return null;
		}

		// Get repository and rubric info (repository may be null for one-off analyses)
		const repository = analysis.repositoryId
			? await ctx.db.get(analysis.repositoryId)
			: null;
		const rubric = await ctx.db.get(analysis.rubricId);

		// Get all results
		const results = await ctx.db
			.query("analysisResults")
			.withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
			.collect();

		// Get rubric items for context
		const rubricItems = await Promise.all(
			results.map((result) => ctx.db.get(result.rubricItemId)),
		);

		return {
			...analysis,
			repository,
			rubric,
			results: results.map((result, index) => ({
				...result,
				rubricItem: rubricItems[index],
			})),
		};
	},
});

// List analyses for user with sorting by createdAt descending and filtering
export const listAnalyses = query({
	args: {
		limit: v.optional(v.number()),
		cursor: v.optional(v.string()),
		// Filter parameters
		repositoryId: v.optional(v.id("repositories")),
		rubricId: v.optional(v.id("rubrics")),
		status: v.optional(
			v.union(
				v.literal("pending"),
				v.literal("running"),
				v.literal("completed"),
				v.literal("failed"),
			),
		),
		dateFrom: v.optional(v.number()), // Unix timestamp
		dateTo: v.optional(v.number()), // Unix timestamp
	},
	handler: async (ctx, args) => {
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

		// Query analyses for user
		let analyses = await ctx.db
			.query("analyses")
			.withIndex("by_user", (q) => q.eq("userId", user._id))
			.order("desc")
			.collect();

		// Apply filters
		if (args.repositoryId) {
			analyses = analyses.filter((a) => a.repositoryId === args.repositoryId);
		}

		if (args.rubricId) {
			analyses = analyses.filter((a) => a.rubricId === args.rubricId);
		}

		if (args.status) {
			analyses = analyses.filter((a) => a.status === args.status);
		}

		if (args.dateFrom) {
			analyses = analyses.filter((a) => a.createdAt >= args.dateFrom!);
		}

		if (args.dateTo) {
			analyses = analyses.filter((a) => a.createdAt <= args.dateTo!);
		}

		// Sort by createdAt descending to ensure proper ordering
		const sortedAnalyses = [...analyses].sort(
			(a, b) => b.createdAt - a.createdAt,
		);

		// Apply limit
		const limitedAnalyses = sortedAnalyses.slice(0, args.limit || 20);

		// Get repository and rubric info for each analysis (repository may be null for one-off)
		const enrichedAnalyses = await Promise.all(
			limitedAnalyses.map(async (analysis) => {
				const repository = analysis.repositoryId
					? await ctx.db.get(analysis.repositoryId)
					: null;
				const rubric = await ctx.db.get(analysis.rubricId);
				return {
					...analysis,
					repository,
					rubric,
				};
			}),
		);

		return enrichedAnalyses;
	},
});

// Get analysis with all results - for viewing historical analysis
export const getAnalysisWithResults = query({
	args: {
		analysisId: v.id("analyses"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		const analysis = await ctx.db.get(args.analysisId);
		if (!analysis) {
			return null;
		}

		// Get user record to verify access
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user || analysis.userId !== user._id) {
			throw new Error("Access denied");
		}

		// Get repository and rubric info (may be null if deleted or one-off analysis)
		const repository = analysis.repositoryId
			? await ctx.db.get(analysis.repositoryId)
			: null;
		const rubric = await ctx.db.get(analysis.rubricId);

		// Get all results with their rubric items
		const results = await ctx.db
			.query("analysisResults")
			.withIndex("by_analysis", (q) => q.eq("analysisId", args.analysisId))
			.collect();

		// Get rubric items for context (preserving historical data)
		const resultsWithItems = await Promise.all(
			results.map(async (result) => {
				const rubricItem = await ctx.db.get(result.rubricItemId);
				return {
					...result,
					rubricItem,
				};
			}),
		);

		return {
			...analysis,
			repository,
			rubric,
			results: resultsWithItems,
		};
	},
});

// Create a new one-off analysis job for a public repository by URL
export const createOneOffAnalysis = mutation({
	args: {
		repositoryUrl: v.string(),
		repositoryOwner: v.string(),
		repositoryName: v.string(),
		branch: v.string(),
		rubricId: v.id("rubrics"),
	},
	handler: async (ctx, args) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			throw new Error("Not authenticated");
		}

		// Get user record
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		if (!user) {
			throw new Error("User not found");
		}

		// Validate URL format (basic validation - more thorough validation happens in UI)
		if (!args.repositoryUrl.includes("github.com")) {
			throw new Error("Invalid GitHub repository URL");
		}

		// Validate owner and name are not empty
		if (!args.repositoryOwner.trim() || !args.repositoryName.trim()) {
			throw new Error("Repository owner and name are required");
		}

		// Validate branch is not empty
		if (!args.branch.trim()) {
			throw new Error("Branch is required");
		}

		// Get rubric and count items
		const rubric = await ctx.db.get(args.rubricId);
		if (!rubric) {
			throw new Error("Rubric not found");
		}

		// Verify user has access to rubric (either owns it or it's a system template)
		if (!rubric.isSystemTemplate && rubric.userId !== user._id) {
			throw new Error("Rubric not found or access denied");
		}

		// Count rubric items
		const rubricItems = await ctx.db
			.query("rubricItems")
			.withIndex("by_rubric", (q) => q.eq("rubricId", args.rubricId))
			.collect();

		// Create analysis record for one-off analysis (no repositoryId)
		const analysisId = await ctx.db.insert("analyses", {
			userId: user._id,
			repositoryUrl: args.repositoryUrl,
			repositoryOwner: args.repositoryOwner,
			repositoryName: args.repositoryName,
			branch: args.branch,
			rubricId: args.rubricId,
			status: "pending",
			totalItems: rubricItems.length,
			completedItems: 0,
			failedItems: 0,
			createdAt: Date.now(),
		});

		// Create analysis result records for each rubric item
		for (const item of rubricItems) {
			await ctx.db.insert("analysisResults", {
				analysisId,
				rubricItemId: item._id,
				status: "pending",
			});
		}

		return analysisId;
	},
});
