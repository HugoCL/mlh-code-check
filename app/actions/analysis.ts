"use server";

import { auth as clerkAuth } from "@clerk/nextjs/server";
import { auth, tasks } from "@trigger.dev/sdk/v3";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export interface StartAnalysisResult {
	success: boolean;
	analysisId?: string;
	accessToken?: string;
	error?: string;
}

/**
 * Server action to start a new analysis.
 * Creates the analysis record in Convex and returns a public access token
 * for real-time progress tracking.
 */
export async function startAnalysis(
	repositoryId: string,
	rubricId: string,
): Promise<StartAnalysisResult> {
	try {
		// Get the authenticated user
		const { userId } = await clerkAuth();
		if (!userId) {
			return { success: false, error: "Not authenticated" };
		}

		// Get Clerk token for Convex authentication
		const { getToken } = await clerkAuth();
		const token = await getToken({ template: "convex" });
		if (!token) {
			return { success: false, error: "Failed to get authentication token" };
		}

		// Set the auth token for Convex client
		convex.setAuth(token);

		// Create analysis record in Convex
		const analysisId = await convex.mutation(api.analyses.createAnalysis, {
			repositoryId: repositoryId as Id<"repositories">,
			rubricId: rubricId as Id<"rubrics">,
		});

		// Generate a public access token for real-time updates
		// This token allows the frontend to subscribe to the task run
		const publicAccessToken = await auth.createPublicToken({
			scopes: {
				read: {
					runs: true,
				},
			},
			expirationTime: "1h",
		});

		return {
			success: true,
			analysisId: analysisId,
			accessToken: publicAccessToken,
		};
	} catch (error) {
		console.error("Failed to start analysis:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

export interface TriggerAnalysisResult {
	success: boolean;
	runId?: string;
	error?: string;
}

/**
 * Server action to trigger the analysis task.
 * This is called after the analysis record is created.
 */
export async function triggerAnalysisTask(
	analysisId: string,
	repositoryId: string,
	rubricId: string,
	userId: string,
): Promise<TriggerAnalysisResult> {
	try {
		// Trigger the analysis task
		const handle = await tasks.trigger("analyze-repository", {
			analysisId,
			repositoryId,
			rubricId,
			userId,
		});

		// Update the analysis record with the trigger run ID
		const { getToken } = await clerkAuth();
		const token = await getToken({ template: "convex" });
		if (token) {
			convex.setAuth(token);
			await convex.mutation(api.analyses.updateAnalysisProgress, {
				analysisId: analysisId as Id<"analyses">,
				triggerRunId: handle.id,
			});
		}

		return {
			success: true,
			runId: handle.id,
		};
	} catch (error) {
		console.error("Failed to trigger analysis task:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Server action to get a public access token for subscribing to an existing run.
 */
export async function getAnalysisAccessToken(): Promise<{
	success: boolean;
	accessToken?: string;
	error?: string;
}> {
	try {
		const { userId } = await clerkAuth();
		if (!userId) {
			return { success: false, error: "Not authenticated" };
		}

		const publicAccessToken = await auth.createPublicToken({
			scopes: {
				read: {
					runs: true,
				},
			},
			expirationTime: "1h",
		});

		return {
			success: true,
			accessToken: publicAccessToken,
		};
	} catch (error) {
		console.error("Failed to get access token:", error);
		return {
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}
