import { v } from "convex/values";
import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";

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

// Connect a repository for the authenticated user
export const connectRepository = mutation({
    args: {
        owner: v.string(),
        name: v.string(),
        fullName: v.string(),
        defaultBranch: v.string(),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);

        // Check if repository is already connected
        const existing = await ctx.db
            .query("repositories")
            .withIndex("by_full_name", (q) => q.eq("fullName", args.fullName))
            .filter((q) => q.eq(q.field("userId"), user._id))
            .first();

        if (existing) {
            throw new Error("Repository already connected");
        }

        const repositoryId = await ctx.db.insert("repositories", {
            userId: user._id,
            owner: args.owner,
            name: args.name,
            fullName: args.fullName,
            defaultBranch: args.defaultBranch,
            connectedAt: Date.now(),
        });

        return repositoryId;
    },
});

// List repositories for the authenticated user
export const listRepositories = query({
    args: {},
    handler: async (ctx) => {
        const user = await getAuthenticatedUser(ctx);

        return await ctx.db
            .query("repositories")
            .withIndex("by_user", (q) => q.eq("userId", user._id))
            .order("desc")
            .collect();
    },
});

// Disconnect a repository
export const disconnectRepository = mutation({
    args: {
        repositoryId: v.id("repositories"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);

        // Verify the repository belongs to the user
        const repository = await ctx.db.get(args.repositoryId);
        if (!repository) {
            throw new Error("Repository not found");
        }

        if (repository.userId !== user._id) {
            throw new Error("Not authorized to disconnect this repository");
        }

        await ctx.db.delete(args.repositoryId);
    },
});

// Get a single repository by ID
export const getRepository = query({
    args: {
        repositoryId: v.id("repositories"),
    },
    handler: async (ctx, args) => {
        const user = await getAuthenticatedUser(ctx);

        const repository = await ctx.db.get(args.repositoryId);
        if (!repository) {
            throw new Error("Repository not found");
        }

        if (repository.userId !== user._id) {
            throw new Error("Not authorized to access this repository");
        }

        return repository;
    },
});