import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import * as fc from "fast-check";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import { modules } from "../../convex/test.setup";

/**
 * **Feature: ai-code-review, Property 1: User record synchronization**
 * *For any* successful Clerk authentication, the Convex database SHALL contain
 * a user record with a clerkId matching the authenticated user's Clerk ID.
 * **Validates: Requirements 1.2**
 */
describe("Property 1: User record synchronization", () => {
    // Arbitrary for generating valid user data
    const userDataArbitrary = fc.record({
        clerkId: fc.string({ minLength: 1, maxLength: 50 }).filter((s) => s.trim().length > 0),
        email: fc.emailAddress(),
        name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
        imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
    });

    it("should create a user record with matching clerkId for any valid user data", async () => {
        await fc.assert(
            fc.asyncProperty(userDataArbitrary, async (userData) => {
                const t = convexTest(schema, modules);

                // Sync user (simulating Clerk webhook or getOrCreateUser call)
                const userId = await t.mutation(api.users.syncUser, {
                    clerkId: userData.clerkId,
                    email: userData.email,
                    name: userData.name,
                    imageUrl: userData.imageUrl,
                });

                // Verify user was created
                expect(userId).toBeDefined();

                // Query the user by clerkId
                const user = await t.query(api.users.getUserByClerkId, {
                    clerkId: userData.clerkId,
                });

                // Property: User record exists with matching clerkId
                expect(user).not.toBeNull();
                expect(user?.clerkId).toBe(userData.clerkId);
                expect(user?.email).toBe(userData.email);
                expect(user?.name).toBe(userData.name);
            }),
            { numRuns: 100 }
        );
    });

    it("should return the same user record for repeated syncs with same clerkId", async () => {
        await fc.assert(
            fc.asyncProperty(userDataArbitrary, async (userData) => {
                const t = convexTest(schema, modules);

                // First sync
                const firstUserId = await t.mutation(api.users.syncUser, {
                    clerkId: userData.clerkId,
                    email: userData.email,
                    name: userData.name,
                    imageUrl: userData.imageUrl,
                });

                // Second sync with same clerkId
                const secondUserId = await t.mutation(api.users.syncUser, {
                    clerkId: userData.clerkId,
                    email: userData.email,
                    name: userData.name,
                    imageUrl: userData.imageUrl,
                });

                // Property: Same user ID returned for same clerkId
                expect(firstUserId).toBe(secondUserId);

                // Verify only one user exists with this clerkId
                const user = await t.query(api.users.getUserByClerkId, {
                    clerkId: userData.clerkId,
                });
                expect(user?._id).toBe(firstUserId);
            }),
            { numRuns: 100 }
        );
    });

    it("should update user data when syncing with changed information", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                userDataArbitrary,
                async (initialData, updatedData) => {
                    // Use same clerkId for both
                    const clerkId = initialData.clerkId;
                    const t = convexTest(schema, modules);

                    // Initial sync
                    await t.mutation(api.users.syncUser, {
                        clerkId,
                        email: initialData.email,
                        name: initialData.name,
                        imageUrl: initialData.imageUrl,
                    });

                    // Update sync with new data but same clerkId
                    await t.mutation(api.users.syncUser, {
                        clerkId,
                        email: updatedData.email,
                        name: updatedData.name,
                        imageUrl: updatedData.imageUrl,
                    });

                    // Query the user
                    const user = await t.query(api.users.getUserByClerkId, {
                        clerkId,
                    });

                    // Property: User data reflects the latest sync
                    expect(user?.clerkId).toBe(clerkId);
                    expect(user?.email).toBe(updatedData.email);
                    expect(user?.name).toBe(updatedData.name);
                }
            ),
            { numRuns: 100 }
        );
    });

    it("should create distinct users for different clerkIds", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                userDataArbitrary,
                async (userData1, userData2) => {
                    // Ensure different clerkIds
                    fc.pre(userData1.clerkId !== userData2.clerkId);

                    const t = convexTest(schema, modules);

                    // Sync both users
                    const userId1 = await t.mutation(api.users.syncUser, {
                        clerkId: userData1.clerkId,
                        email: userData1.email,
                        name: userData1.name,
                        imageUrl: userData1.imageUrl,
                    });

                    const userId2 = await t.mutation(api.users.syncUser, {
                        clerkId: userData2.clerkId,
                        email: userData2.email,
                        name: userData2.name,
                        imageUrl: userData2.imageUrl,
                    });

                    // Property: Different clerkIds create different user records
                    expect(userId1).not.toBe(userId2);

                    // Verify both users exist independently
                    const user1 = await t.query(api.users.getUserByClerkId, {
                        clerkId: userData1.clerkId,
                    });
                    const user2 = await t.query(api.users.getUserByClerkId, {
                        clerkId: userData2.clerkId,
                    });

                    expect(user1?.clerkId).toBe(userData1.clerkId);
                    expect(user2?.clerkId).toBe(userData2.clerkId);
                }
            ),
            { numRuns: 100 }
        );
    });
});
