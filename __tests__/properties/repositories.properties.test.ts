import { convexTest } from "convex-test";
import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../../convex/test.setup";

/**
 * **Feature: ai-code-review, Property 10: Repository storage completeness**
 * *For any* successfully connected repository, the stored record SHALL contain
 * owner, name, fullName (matching "owner/name" format), defaultBranch, and the
 * connecting user's ID.
 * **Validates: Requirements 4.2**
 */
describe("Property 10: Repository storage completeness", () => {
    // Arbitrary for generating valid repository data
    const repositoryDataArbitrary = fc.record({
        owner: fc
            .string({ minLength: 1, maxLength: 39 })
            .filter((s) => s.trim().length > 0 && /^[a-zA-Z0-9\-_.]+$/.test(s)),
        name: fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0 && /^[a-zA-Z0-9\-_.]+$/.test(s)),
        defaultBranch: fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0),
    }).map((data) => ({
        ...data,
        fullName: `${data.owner}/${data.name}`,
    }));

    // Arbitrary for generating valid user data
    const userDataArbitrary = fc.record({
        clerkId: fc
            .string({ minLength: 1, maxLength: 50 })
            .filter((s) => s.trim().length > 0),
        email: fc.emailAddress(),
        name: fc
            .string({ minLength: 1, maxLength: 100 })
            .filter((s) => s.trim().length > 0),
        imageUrl: fc.option(fc.webUrl(), { nil: undefined }),
    });

    it("should store repository with all required fields for any valid repository data", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                async (userData, repoData) => {
                    const t = convexTest(schema, modules);

                    // Create a user first
                    const userId = await t.mutation(api.users.syncUser, {
                        clerkId: userData.clerkId,
                        email: userData.email,
                        name: userData.name,
                        imageUrl: userData.imageUrl,
                    });

                    // Set up authentication context and connect repository
                    const repositoryId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.repositories.connectRepository, {
                            owner: repoData.owner,
                            name: repoData.name,
                            fullName: repoData.fullName,
                            defaultBranch: repoData.defaultBranch,
                        });

                    // Verify repository was created
                    expect(repositoryId).toBeDefined();

                    // Get the stored repository
                    const repository = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.repositories.getRepository, {
                            repositoryId,
                        });

                    // Property: Repository record contains all required fields
                    expect(repository).not.toBeNull();
                    expect(repository?.userId).toBe(userId);
                    expect(repository?.owner).toBe(repoData.owner);
                    expect(repository?.name).toBe(repoData.name);
                    expect(repository?.fullName).toBe(repoData.fullName);
                    expect(repository?.fullName).toBe(`${repoData.owner}/${repoData.name}`);
                    expect(repository?.defaultBranch).toBe(repoData.defaultBranch);
                    expect(repository?.connectedAt).toBeTypeOf("number");
                    expect(repository?.connectedAt).toBeGreaterThan(0);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should prevent duplicate repository connections for same user", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                async (userData, repoData) => {
                    const t = convexTest(schema, modules);

                    // Create a user first
                    await t.mutation(api.users.syncUser, {
                        clerkId: userData.clerkId,
                        email: userData.email,
                        name: userData.name,
                        imageUrl: userData.imageUrl,
                    });

                    // Connect repository first time
                    const firstRepositoryId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.repositories.connectRepository, {
                            owner: repoData.owner,
                            name: repoData.name,
                            fullName: repoData.fullName,
                            defaultBranch: repoData.defaultBranch,
                        });

                    expect(firstRepositoryId).toBeDefined();

                    // Attempt to connect same repository again
                    await expect(
                        t
                            .withIdentity({ subject: userData.clerkId })
                            .mutation(api.repositories.connectRepository, {
                                owner: repoData.owner,
                                name: repoData.name,
                                fullName: repoData.fullName,
                                defaultBranch: repoData.defaultBranch,
                            }),
                    ).rejects.toThrow("Repository already connected");
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should allow different users to connect the same repository", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                userDataArbitrary,
                repositoryDataArbitrary,
                async (userData1, userData2, repoData) => {
                    // Ensure different users
                    fc.pre(userData1.clerkId !== userData2.clerkId);

                    const t = convexTest(schema, modules);

                    // Create both users
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

                    // Connect repository as first user
                    const repo1Id = await t
                        .withIdentity({ subject: userData1.clerkId })
                        .mutation(api.repositories.connectRepository, {
                            owner: repoData.owner,
                            name: repoData.name,
                            fullName: repoData.fullName,
                            defaultBranch: repoData.defaultBranch,
                        });

                    // Connect same repository as second user
                    const repo2Id = await t
                        .withIdentity({ subject: userData2.clerkId })
                        .mutation(api.repositories.connectRepository, {
                            owner: repoData.owner,
                            name: repoData.name,
                            fullName: repoData.fullName,
                            defaultBranch: repoData.defaultBranch,
                        });

                    // Property: Different users can connect same repository
                    expect(repo1Id).not.toBe(repo2Id);

                    // Verify both repositories exist with correct user associations
                    const repo1AsUser1 = await t
                        .withIdentity({ subject: userData1.clerkId })
                        .query(api.repositories.getRepository, {
                            repositoryId: repo1Id,
                        });

                    expect(repo1AsUser1?.userId).toBe(userId1);
                    expect(repo1AsUser1?.fullName).toBe(repoData.fullName);

                    const repo2AsUser2 = await t
                        .withIdentity({ subject: userData2.clerkId })
                        .query(api.repositories.getRepository, {
                            repositoryId: repo2Id,
                        });

                    expect(repo2AsUser2?.userId).toBe(userId2);
                    expect(repo2AsUser2?.fullName).toBe(repoData.fullName);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should list repositories only for the authenticated user", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                userDataArbitrary,
                fc.array(repositoryDataArbitrary, { minLength: 1, maxLength: 5 }),
                async (userData1, userData2, repoDataArray) => {
                    // Ensure different users
                    fc.pre(userData1.clerkId !== userData2.clerkId);
                    // Ensure unique repository names
                    const uniqueRepos = repoDataArray.filter(
                        (repo, index, arr) =>
                            arr.findIndex((r) => r.fullName === repo.fullName) === index,
                    );
                    fc.pre(uniqueRepos.length > 0);

                    const t = convexTest(schema, modules);

                    // Create both users
                    const userId1 = await t.mutation(api.users.syncUser, {
                        clerkId: userData1.clerkId,
                        email: userData1.email,
                        name: userData1.name,
                        imageUrl: userData1.imageUrl,
                    });

                    // Connect repositories as first user
                    const user1RepoIds = [];
                    for (const repoData of uniqueRepos) {
                        const repoId = await t
                            .withIdentity({ subject: userData1.clerkId })
                            .mutation(api.repositories.connectRepository, {
                                owner: repoData.owner,
                                name: repoData.name,
                                fullName: repoData.fullName,
                                defaultBranch: repoData.defaultBranch,
                            });
                        user1RepoIds.push(repoId);
                    }

                    // List repositories as first user
                    const user1Repos = await t
                        .withIdentity({ subject: userData1.clerkId })
                        .query(api.repositories.listRepositories);

                    // Property: User only sees their own repositories
                    expect(user1Repos).toHaveLength(uniqueRepos.length);
                    for (const repo of user1Repos) {
                        expect(repo.userId).toBe(userId1);
                    }

                    // List repositories as second user (should be empty)
                    const user2Repos = await t
                        .withIdentity({ subject: userData2.clerkId })
                        .query(api.repositories.listRepositories);

                    expect(user2Repos).toHaveLength(0);
                },
            ),
            { numRuns: 100 },
        );
    });

    it("should successfully disconnect repository and remove from storage", async () => {
        await fc.assert(
            fc.asyncProperty(
                userDataArbitrary,
                repositoryDataArbitrary,
                async (userData, repoData) => {
                    const t = convexTest(schema, modules);

                    // Create a user first
                    await t.mutation(api.users.syncUser, {
                        clerkId: userData.clerkId,
                        email: userData.email,
                        name: userData.name,
                        imageUrl: userData.imageUrl,
                    });

                    // Connect repository
                    const repositoryId = await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.repositories.connectRepository, {
                            owner: repoData.owner,
                            name: repoData.name,
                            fullName: repoData.fullName,
                            defaultBranch: repoData.defaultBranch,
                        });

                    // Verify repository exists
                    const repository = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.repositories.getRepository, {
                            repositoryId,
                        });
                    expect(repository).not.toBeNull();

                    // Disconnect repository
                    await t
                        .withIdentity({ subject: userData.clerkId })
                        .mutation(api.repositories.disconnectRepository, {
                            repositoryId,
                        });

                    // Property: Repository should no longer exist
                    await expect(
                        t
                            .withIdentity({ subject: userData.clerkId })
                            .query(api.repositories.getRepository, {
                                repositoryId,
                            }),
                    ).rejects.toThrow("Repository not found");

                    // Verify it's not in the list
                    const repositories = await t
                        .withIdentity({ subject: userData.clerkId })
                        .query(api.repositories.listRepositories);
                    expect(repositories.find((r) => r._id === repositoryId)).toBeUndefined();
                },
            ),
            { numRuns: 100 },
        );
    });
});