import { openai } from "@ai-sdk/openai";
import { batch, metadata, task } from "@trigger.dev/sdk/v3";
import { generateObject } from "ai";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";

// Evaluation result types
interface YesNoResult {
	value: boolean;
	justification: string;
}

interface RangeResult {
	value: number;
	min: number;
	max: number;
	rationale: string;
}

interface CommentsResult {
	feedback: string;
}

interface CodeExample {
	filePath: string;
	lineStart: number;
	lineEnd: number;
	code: string;
	explanation: string;
}

interface CodeExamplesResult {
	examples: CodeExample[];
}

type EvaluationResult =
	| YesNoResult
	| RangeResult
	| CommentsResult
	| CodeExamplesResult;

// Rubric item config type
interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	maxExamples?: number;
}

// Types for the analysis workflow
interface AnalysisJobPayload {
	analysisId: string;
	repositoryId: string;
	rubricId: string;
	userId: string;
}

interface RubricItemPayload {
	analysisId: string;
	itemId: string;
	itemName: string;
	itemDescription: string;
	evaluationType: "yes_no" | "range" | "comments" | "code_examples";
	config: RubricItemConfig;
	repositoryContent: RepositoryContent;
}

interface RepositoryContent {
	files: Array<{
		path: string;
		content: string;
		language: string;
	}>;
	structure: string;
}

interface AnalysisProgressMetadata {
	status: "initializing" | "fetching_repo" | "evaluating" | "completing";
	totalItems: number;
	completedItems: number;
	failedItems: number;
	currentItem?: string;
	items: Record<string, "pending" | "processing" | "completed" | "failed">;
}

// Helper to serialize metadata for Trigger.dev
function serializeMetadata(
	data: AnalysisProgressMetadata,
): Record<string, string | number | boolean | null | Record<string, string>> {
	return JSON.parse(JSON.stringify(data));
}

// Repository type from Convex
interface Repository {
	_id: Id<"repositories">;
	userId: Id<"users">;
	owner: string;
	name: string;
	fullName: string;
	defaultBranch: string;
	connectedAt: number;
}

// Main analysis orchestrator task
export const analyzeRepository = task({
	id: "analyze-repository",
	retry: {
		maxAttempts: 3,
		factor: 2,
		minTimeoutInMs: 1000,
		maxTimeoutInMs: 10000,
		randomize: true,
	},
	run: async (payload: AnalysisJobPayload) => {
		const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

		try {
			// Initialize progress metadata
			const progressMetadata: AnalysisProgressMetadata = {
				status: "initializing",
				totalItems: 0,
				completedItems: 0,
				failedItems: 0,
				items: {},
			};

			metadata.set("progress", serializeMetadata(progressMetadata));

			// Update analysis status to running
			await convex.mutation(api.analyses.updateAnalysisProgress, {
				analysisId: payload.analysisId as Id<"analyses">,
				status: "running",
			});

			// Get analysis details
			const analysis = await convex.query(api.analyses.getAnalysis, {
				analysisId: payload.analysisId as Id<"analyses">,
			});

			if (!analysis) {
				throw new Error("Analysis not found");
			}

			// Get rubric items
			const rubricItems = analysis.results || [];
			progressMetadata.totalItems = rubricItems.length;

			// Initialize item statuses
			for (const result of rubricItems) {
				if (result.rubricItem) {
					progressMetadata.items[result.rubricItem._id] = "pending";
				}
			}

			metadata.set("progress", serializeMetadata(progressMetadata));

			// Fetch repository content
			progressMetadata.status = "fetching_repo";
			metadata.set("progress", serializeMetadata(progressMetadata));

			const repositoryContent = await fetchRepositoryContent(
				analysis.repository as Repository | null,
			);

			// Prepare rubric item evaluation tasks
			progressMetadata.status = "evaluating";
			metadata.set("progress", serializeMetadata(progressMetadata));

			const evaluationTasks = rubricItems
				.filter((result) => result.rubricItem)
				.map((result) => {
					const item = result.rubricItem!;
					return {
						task: evaluateRubricItem,
						payload: {
							analysisId: payload.analysisId,
							itemId: item._id,
							itemName: item.name,
							itemDescription: item.description,
							evaluationType: item.evaluationType,
							config: item.config as RubricItemConfig,
							repositoryContent,
						} satisfies RubricItemPayload,
					};
				});

			// Execute rubric item evaluations in parallel
			const { runs: evaluationResults } =
				await batch.triggerByTaskAndWait(evaluationTasks);

			// Process results and update progress
			let completedCount = 0;
			let failedCount = 0;

			for (const result of evaluationResults) {
				if (result.ok) {
					completedCount++;
					if (result.output.itemId) {
						progressMetadata.items[result.output.itemId] = "completed";
					}
				} else {
					failedCount++;
					// For failed results, we can't easily get the itemId from the error
				}
			}

			progressMetadata.completedItems = completedCount;
			progressMetadata.failedItems = failedCount;
			progressMetadata.status = "completing";
			metadata.set("progress", serializeMetadata(progressMetadata));

			// Complete the analysis
			await convex.mutation(api.analyses.completeAnalysis, {
				analysisId: payload.analysisId as Id<"analyses">,
			});

			return {
				analysisId: payload.analysisId,
				totalItems: progressMetadata.totalItems,
				completedItems: completedCount,
				failedItems: failedCount,
				status: "completed",
			};
		} catch (error) {
			// Mark analysis as failed
			await convex.mutation(api.analyses.failAnalysis, {
				analysisId: payload.analysisId as Id<"analyses">,
				errorMessage: error instanceof Error ? error.message : "Unknown error",
			});

			throw error;
		}
	},
});

// Rubric item evaluation worker task
export const evaluateRubricItem = task({
	id: "evaluate-rubric-item",
	retry: {
		maxAttempts: 2,
		factor: 1.5,
		minTimeoutInMs: 500,
		maxTimeoutInMs: 5000,
		randomize: true,
	},
	run: async (payload: RubricItemPayload) => {
		const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

		try {
			// Update item status to processing
			await convex.mutation(api.analyses.updateItemResult, {
				analysisId: payload.analysisId as Id<"analyses">,
				rubricItemId: payload.itemId as Id<"rubricItems">,
				status: "processing",
			});

			// Construct AI prompt based on evaluation type
			const prompt = constructPrompt(payload);

			// Call AI model
			const result = await evaluateWithAI(prompt, payload.evaluationType);

			// Update item result
			await convex.mutation(api.analyses.updateItemResult, {
				analysisId: payload.analysisId as Id<"analyses">,
				rubricItemId: payload.itemId as Id<"rubricItems">,
				status: "completed",
				result,
			});

			return {
				itemId: payload.itemId,
				status: "completed" as const,
				result,
			};
		} catch (error) {
			// Update item as failed
			await convex.mutation(api.analyses.updateItemResult, {
				analysisId: payload.analysisId as Id<"analyses">,
				rubricItemId: payload.itemId as Id<"rubricItems">,
				status: "failed",
				error: error instanceof Error ? error.message : "Unknown error",
			});

			throw { itemId: payload.itemId, error };
		}
	},
});

// Helper function to fetch repository content via GitHub MCP
async function fetchRepositoryContent(
	_repository: Repository | null,
): Promise<RepositoryContent> {
	// This would use GitHub MCP to fetch repository content
	// For now, return mock data
	return {
		files: [
			{
				path: "src/main.ts",
				content: "console.log('Hello, world!');",
				language: "typescript",
			},
			{
				path: "README.md",
				content: "# Sample Repository\n\nThis is a sample repository.",
				language: "markdown",
			},
		],
		structure: `
src/
  main.ts
README.md
package.json
		`.trim(),
	};
}

// Helper function to construct AI prompt based on evaluation type
function constructPrompt(payload: RubricItemPayload): string {
	const { itemName, itemDescription, evaluationType, repositoryContent } =
		payload;

	const basePrompt = `
You are a code reviewer evaluating a repository against specific criteria.

Repository Structure:
${repositoryContent.structure}

Files:
${repositoryContent.files.map((file) => `--- ${file.path} ---\n${file.content}`).join("\n\n")}

Evaluation Criteria:
Name: ${itemName}
Description: ${itemDescription}
	`.trim();

	switch (evaluationType) {
		case "yes_no":
			return `${basePrompt}

Please evaluate whether this repository meets the criteria. Respond with a JSON object containing:
- "value": boolean (true if criteria is met, false otherwise)
- "justification": string (explanation of your evaluation)

Example response:
{"value": true, "justification": "The code follows proper TypeScript conventions..."}`;

		case "range": {
			const config = payload.config || {};
			const min = config.minValue ?? 0;
			const max = config.maxValue ?? 100;
			return `${basePrompt}

Please evaluate this repository on a scale from ${min} to ${max}. Respond with a JSON object containing:
- "value": number (score between ${min} and ${max})
- "min": ${min}
- "max": ${max}
- "rationale": string (explanation of your score)

Example response:
{"value": 85, "min": ${min}, "max": ${max}, "rationale": "The code quality is high but could improve..."}`;
		}

		case "comments":
			return `${basePrompt}

Please provide detailed feedback about this repository. Respond with a JSON object containing:
- "feedback": string (detailed comments and suggestions)

Example response:
{"feedback": "The repository shows good structure but could benefit from..."}`;

		case "code_examples":
			return `${basePrompt}

Please identify specific code examples that relate to the evaluation criteria. Respond with a JSON object containing:
- "examples": array of objects, each with:
  - "filePath": string
  - "lineStart": number
  - "lineEnd": number
  - "code": string (the relevant code snippet)
  - "explanation": string (why this code is relevant)

Example response:
{"examples": [{"filePath": "src/main.ts", "lineStart": 1, "lineEnd": 3, "code": "console.log('Hello');", "explanation": "This demonstrates..."}]}`;

		default:
			throw new Error(`Unknown evaluation type: ${evaluationType}`);
	}
}

// Helper function to evaluate with AI
async function evaluateWithAI(
	prompt: string,
	evaluationType: "yes_no" | "range" | "comments" | "code_examples",
): Promise<EvaluationResult> {
	const model = openai("gpt-4o-mini");

	switch (evaluationType) {
		case "yes_no": {
			const schema = z.object({
				value: z.boolean(),
				justification: z.string(),
			});

			const result = await generateObject({
				model,
				prompt,
				schema,
			});

			return result.object;
		}

		case "range": {
			const schema = z.object({
				value: z.number(),
				min: z.number(),
				max: z.number(),
				rationale: z.string(),
			});

			const result = await generateObject({
				model,
				prompt,
				schema,
			});

			return result.object;
		}

		case "comments": {
			const schema = z.object({
				feedback: z.string(),
			});

			const result = await generateObject({
				model,
				prompt,
				schema,
			});

			return result.object;
		}

		case "code_examples": {
			const schema = z.object({
				examples: z.array(
					z.object({
						filePath: z.string(),
						lineStart: z.number(),
						lineEnd: z.number(),
						code: z.string(),
						explanation: z.string(),
					}),
				),
			});

			const result = await generateObject({
				model,
				prompt,
				schema,
			});

			return result.object;
		}
	}
}
