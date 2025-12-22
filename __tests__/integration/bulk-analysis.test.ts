import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "../../convex/_generated/api";
import schema from "../../convex/schema";
import { modules } from "../../convex/test.setup";

describe("Integration: Bulk Analysis Creation", () => {
	it("should create multiple one-off analyses in parallel", async () => {
		const t = convexTest(schema, modules);

		// 1. Create user
		const userData = {
			clerkId: "test-user-id",
			email: "test@example.com",
			name: "Test User",
		};
		await t.mutation(api.users.syncUser, userData);

		// 2. Create rubric
		const rubricId = await t
			.withIdentity({ subject: userData.clerkId })
			.mutation(api.rubrics.createRubric, {
				name: "Test Rubric",
				description: "Rubric for testing",
			});

		// Add rubric item
		await t
			.withIdentity({ subject: userData.clerkId })
			.mutation(api.rubrics.addRubricItem, {
				rubricId,
				name: "Check something",
				description: "Check if something is true",
				evaluationType: "yes_no",
				config: {},
				order: 1,
			});

		// 3. Define multiple one-off analyses
		const analysesData = [
			{
				url: "https://github.com/owner/repo1",
				owner: "owner",
				repo: "repo1",
				branch: "main",
			},
			{
				url: "https://github.com/owner/repo2",
				owner: "owner",
				repo: "repo2",
				branch: "develop",
			},
			{
				url: "https://github.com/another/repo3",
				owner: "another",
				repo: "repo3",
				branch: "master",
			},
		];

		// 4. Create them in parallel (simulating what the frontend does)
		await Promise.all(
			analysesData.map((data) =>
				t
					.withIdentity({ subject: userData.clerkId })
					.mutation(api.analyses.createOneOffAnalysis, {
						repositoryUrl: data.url,
						repositoryOwner: data.owner,
						repositoryName: data.repo,
						branch: data.branch,
						rubricId,
					}),
			),
		);

		// 5. Verify they were created
		const analyses = await t
			.withIdentity({ subject: userData.clerkId })
			.query(api.analyses.listAnalyses, {});

		expect(analyses).toHaveLength(3);

		// Verify details
		const repoNames = analyses.map((a) => a.repositoryName).sort();
		expect(repoNames).toEqual(["repo1", "repo2", "repo3"]);

		const owners = analyses.map((a) => a.repositoryOwner).sort();
		expect(owners).toEqual(["another", "owner", "owner"]);

		// Verify status
		analyses.forEach((analysis) => {
			expect(analysis.status).toBe("pending");
			expect(analysis.repositoryUrl).toBeDefined();
			expect(analysis.rubricId).toBe(rubricId);
		});
	});
});
