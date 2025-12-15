import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/**
 * Get or create a user based on Clerk authentication.
 * This is called when a user authenticates to ensure they have a Convex user record.
 */
export const getOrCreateUser = mutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.string(),
		imageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		// Check if user already exists
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existingUser) {
			// Update user info if it has changed
			if (
				existingUser.email !== args.email ||
				existingUser.name !== args.name ||
				existingUser.imageUrl !== args.imageUrl
			) {
				await ctx.db.patch(existingUser._id, {
					email: args.email,
					name: args.name,
					imageUrl: args.imageUrl,
				});
			}
			return existingUser._id;
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			clerkId: args.clerkId,
			email: args.email,
			name: args.name,
			imageUrl: args.imageUrl,
		});

		return userId;
	},
});

/**
 * Get the current user based on their Clerk ID.
 */
export const getCurrentUser = query({
	args: {},
	handler: async (ctx) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) {
			return null;
		}

		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
			.unique();

		return user;
	},
});

/**
 * Get a user by their Clerk ID.
 */
export const getUserByClerkId = query({
	args: { clerkId: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		return user;
	},
});

/**
 * Sync user data from Clerk webhook.
 * This mutation is called when Clerk sends a webhook for user events.
 */
export const syncUser = mutation({
	args: {
		clerkId: v.string(),
		email: v.string(),
		name: v.string(),
		imageUrl: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const existingUser = await ctx.db
			.query("users")
			.withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
			.unique();

		if (existingUser) {
			// Update existing user
			await ctx.db.patch(existingUser._id, {
				email: args.email,
				name: args.name,
				imageUrl: args.imageUrl,
			});
			return existingUser._id;
		}

		// Create new user
		const userId = await ctx.db.insert("users", {
			clerkId: args.clerkId,
			email: args.email,
			name: args.name,
			imageUrl: args.imageUrl,
		});

		return userId;
	},
});
