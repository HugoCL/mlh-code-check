
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

interface OptionsResult {
	selections: string[];
}

type EvaluationResult =
	| YesNoResult
	| RangeResult
	| CommentsResult
	| CodeExamplesResult
	| OptionsResult;

// Rubric item config type
interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	rangeGuidance?: string;
	maxExamples?: number;
	options?: string[];
	allowMultiple?: boolean;
	maxSelections?: number;
}

// Types for the analysis workflow
interface AnalysisJobPayload {
    analysisId: string;
    repositoryId?: string; // Optional for one-off analyses
    repositoryUrl?: string; // For one-off analyses
    repositoryOwner?: string; // Can be fetched from analysis record
    repositoryName?: string; // Can be fetched from analysis record
    branch?: string; // Can be fetched from analysis record
    rubricId: string;
    userId: string;
}

interface RubricItemPayload {
	analysisId: string;
	itemId: string;
	itemName: string;
	itemDescription: string;
	evaluationType: "yes_no" | "range" | "comments" | "code_examples" | "options";
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

            // Get analysis details (using task-specific query that doesn't require auth)
            const analysis = await convex.query(api.analyses.getAnalysisForTask, {
                analysisId: payload.analysisId as Id<"analyses">,
            });

            if (!analysis) {
                throw new Error("Analysis not found");
            }

            // Get repository info from payload or analysis record
            const repositoryOwner =
                payload.repositoryOwner ?? analysis.repositoryOwner;
            const repositoryName = payload.repositoryName ?? analysis.repositoryName;
            const branch = payload.branch ?? analysis.branch;

            if (!repositoryOwner || !repositoryName || !branch) {
                throw new Error("Missing repository information");
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

            // Determine if this is a one-off analysis
            const isOneOff = !analysis.repositoryId;

            const repositoryContent = await fetchRepositoryContent({
                owner: repositoryOwner,
                name: repositoryName,
                branch: branch,
                isOneOff,
            });

            // Prepare rubric item evaluation tasks
            progressMetadata.status = "evaluating";
            metadata.set("progress", serializeMetadata(progressMetadata));

            const evaluationTasks = rubricItems
                .filter((result) => result.rubricItem)
                .map((result) => {
                    const item = result.rubricItem!;

                    // Debug logging to see what config we're getting
                    console.log(`Rubric item ${item.name} config:`, JSON.stringify(item.config, null, 2));

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
			const result = await evaluateWithAI(
				prompt,
				payload.evaluationType,
				payload.config,
			);

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

// Repository info for fetching content
interface RepositoryInfo {
    owner: string;
    name: string;
    branch: string;
    isOneOff: boolean;
}

// GitHub API types
interface GitHubTreeItem {
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
}

interface GitHubTreeResponse {
    sha: string;
    url: string;
    tree: GitHubTreeItem[];
    truncated: boolean;
}

// File extensions to include in analysis
const CODE_EXTENSIONS = new Set([
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".py",
    ".java",
    ".go",
    ".rs",
    ".rb",
    ".php",
    ".c",
    ".cpp",
    ".h",
    ".hpp",
    ".cs",
    ".swift",
    ".kt",
    ".scala",
    ".vue",
    ".svelte",
    ".astro",
    ".md",
    ".json",
    ".yaml",
    ".yml",
    ".toml",
    ".xml",
    ".html",
    ".css",
    ".scss",
    ".less",
    ".sql",
    ".sh",
    ".bash",
    ".zsh",
    ".dockerfile",
]);

// Files to always include
const IMPORTANT_FILES = new Set([
    "readme.md",
    "readme",
    "package.json",
    "cargo.toml",
    "go.mod",
    "requirements.txt",
    "pyproject.toml",
    "gemfile",
    "pom.xml",
    "build.gradle",
    "makefile",
    "dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".gitignore",
    "license",
    "license.md",
    "contributing.md",
]);

// Directories to skip
const SKIP_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    "__pycache__",
    ".venv",
    "venv",
    "vendor",
    "target",
    ".idea",
    ".vscode",
    "coverage",
    ".nyc_output",
]);

// Max file size to fetch (100KB)
const MAX_FILE_SIZE = 100 * 1024;

// Max total content size (500KB to stay within AI context limits)
const MAX_TOTAL_CONTENT_SIZE = 500 * 1024;

// Max files to fetch
const MAX_FILES = 50;

// Helper to get language from file path
function getLanguageFromPath(path: string): string {
    const ext = path.toLowerCase().split(".").pop() || "";
    const langMap: Record<string, string> = {
        ts: "typescript",
        tsx: "typescript",
        js: "javascript",
        jsx: "javascript",
        py: "python",
        java: "java",
        go: "go",
        rs: "rust",
        rb: "ruby",
        php: "php",
        c: "c",
        cpp: "cpp",
        h: "c",
        hpp: "cpp",
        cs: "csharp",
        swift: "swift",
        kt: "kotlin",
        scala: "scala",
        vue: "vue",
        svelte: "svelte",
        astro: "astro",
        md: "markdown",
        json: "json",
        yaml: "yaml",
        yml: "yaml",
        toml: "toml",
        xml: "xml",
        html: "html",
        css: "css",
        scss: "scss",
        less: "less",
        sql: "sql",
        sh: "bash",
        bash: "bash",
        zsh: "zsh",
        dockerfile: "dockerfile",
    };
    return langMap[ext] || "text";
}

// Helper to check if a file should be included
function shouldIncludeFile(path: string, size?: number): boolean {
    const lowerPath = path.toLowerCase();
    const fileName = lowerPath.split("/").pop() || "";

    // Skip files in excluded directories
    const pathParts = lowerPath.split("/");
    for (const part of pathParts) {
        if (SKIP_DIRECTORIES.has(part)) {
            return false;
        }
    }

    // Skip files that are too large
    if (size && size > MAX_FILE_SIZE) {
        return false;
    }

    // Always include important files
    if (IMPORTANT_FILES.has(fileName)) {
        return true;
    }

    // Check file extension
    const ext = "." + (fileName.split(".").pop() || "");
    return CODE_EXTENSIONS.has(ext);
}

// Build directory tree structure string
function buildTreeStructure(files: string[]): string {
    const tree: Record<string, unknown> = {};

    for (const file of files) {
        const parts = file.split("/");
        let current = tree;
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (i === parts.length - 1) {
                current[part] = null; // File
            } else {
                if (!current[part]) {
                    current[part] = {};
                }
                current[part] = current[part] as Record<string, unknown>;
                current = current[part] as Record<string, unknown>;
            }
        }
    }

    function renderTree(
        node: Record<string, unknown>,
        prefix = "",
        isLast = true,
    ): string {
        const entries = Object.entries(node).sort(([a, aVal], [b, bVal]) => {
            // Directories first
            const aIsDir = aVal !== null;
            const bIsDir = bVal !== null;
            if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
            return a.localeCompare(b);
        });

        let result = "";
        entries.forEach(([name, value], index) => {
            const isLastEntry = index === entries.length - 1;
            const connector = isLastEntry ? "└── " : "├── ";
            const childPrefix = isLastEntry ? "    " : "│   ";

            if (value === null) {
                result += `${prefix}${connector}${name}\n`;
            } else {
                result += `${prefix}${connector}${name}/\n`;
                result += renderTree(
                    value as Record<string, unknown>,
                    prefix + childPrefix,
                    isLastEntry,
                );
            }
        });

        return result;
    }

    return renderTree(tree).trim();
}

// Helper function to fetch repository content via GitHub API
async function fetchRepositoryContent(
    repoInfo: RepositoryInfo,
): Promise<RepositoryContent> {
    console.log(
        `Fetching content for ${repoInfo.owner}/${repoInfo.name}@${repoInfo.branch} (one-off: ${repoInfo.isOneOff})`,
    );

    const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "MLH-Code-Review-App",
    };

    // Use GitHub token if available (for higher rate limits)
    const githubToken = process.env.GITHUB_TOKEN;
    if (githubToken) {
        headers.Authorization = `Bearer ${githubToken}`;
    }

    try {
        // First, get the repository tree
        const treeUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.name}/git/trees/${repoInfo.branch}?recursive=1`;
        const treeResponse = await fetch(treeUrl, { headers });

        if (!treeResponse.ok) {
            if (treeResponse.status === 404) {
                throw new Error(
                    `Repository or branch not found: ${repoInfo.owner}/${repoInfo.name}@${repoInfo.branch}`,
                );
            }
            if (treeResponse.status === 403) {
                throw new Error(
                    "GitHub API rate limit exceeded. Please try again later.",
                );
            }
            throw new Error(
                `Failed to fetch repository tree: ${treeResponse.status} ${treeResponse.statusText}`,
            );
        }

        const treeData = (await treeResponse.json()) as GitHubTreeResponse;

        // Filter to only include relevant files
        const filesToFetch = treeData.tree
            .filter(
                (item) =>
                    item.type === "blob" && shouldIncludeFile(item.path, item.size),
            )
            .slice(0, MAX_FILES);

        console.log(
            `Found ${treeData.tree.length} items, fetching ${filesToFetch.length} relevant files`,
        );

        // Fetch file contents in parallel (with concurrency limit)
        const files: RepositoryContent["files"] = [];
        let totalSize = 0;
        const concurrencyLimit = 10;

        for (let i = 0; i < filesToFetch.length; i += concurrencyLimit) {
            const batch = filesToFetch.slice(i, i + concurrencyLimit);
            const batchResults = await Promise.all(
                batch.map(async (item) => {
                    try {
                        const contentUrl = `https://api.github.com/repos/${repoInfo.owner}/${repoInfo.name}/contents/${item.path}?ref=${repoInfo.branch}`;
                        const contentResponse = await fetch(contentUrl, { headers });

                        if (!contentResponse.ok) {
                            console.warn(
                                `Failed to fetch ${item.path}: ${contentResponse.status}`,
                            );
                            return null;
                        }

                        const contentData = (await contentResponse.json()) as {
                            content?: string;
                            encoding?: string;
                            size: number;
                        };

                        if (contentData.content && contentData.encoding === "base64") {
                            const content = Buffer.from(
                                contentData.content,
                                "base64",
                            ).toString("utf-8");
                            return {
                                path: item.path,
                                content,
                                language: getLanguageFromPath(item.path),
                                size: contentData.size,
                            };
                        }
                        return null;
                    } catch (error) {
                        console.warn(`Error fetching ${item.path}:`, error);
                        return null;
                    }
                }),
            );

            for (const result of batchResults) {
                if (result && totalSize + result.size <= MAX_TOTAL_CONTENT_SIZE) {
                    files.push({
                        path: result.path,
                        content: result.content,
                        language: result.language,
                    });
                    totalSize += result.size;
                }
            }

            // Stop if we've reached the content limit
            if (totalSize >= MAX_TOTAL_CONTENT_SIZE) {
                console.log(`Reached content size limit (${totalSize} bytes)`);
                break;
            }
        }

        // Build the directory structure
        const allPaths = treeData.tree
            .filter((item) => {
                const pathParts = item.path.split("/");
                return !pathParts.some((part) => SKIP_DIRECTORIES.has(part));
            })
            .map((item) => item.path);

        const structure = buildTreeStructure(allPaths.slice(0, 200)); // Limit tree size

        console.log(
            `Successfully fetched ${files.length} files (${totalSize} bytes)`,
        );

        return {
            files,
            structure,
        };
    } catch (error) {
        console.error("Error fetching repository content:", error);
        throw error;
    }
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
            const guidance = config.rangeGuidance ?? "";

            // Debug logging to see what we're getting
            console.log("Range evaluation config:", JSON.stringify(config, null, 2));
            console.log("Range guidance:", guidance);

            let guidanceSection = "";
            if (guidance && guidance.trim()) {
                guidanceSection = `
Score Guidance (use this to determine the appropriate score):
${guidance}
`;
            } else {
                console.warn("No range guidance provided for range evaluation");
            }

            return `${basePrompt}
${guidanceSection}
Please evaluate this repository on a scale from ${min} to ${max}. Respond with a JSON object containing:
- "value": number (score between ${min} and ${max})
- "min": ${min}
- "max": ${max}
- "rationale": string (explanation of your score based on the guidance criteria)

Example response:
{"value": 3, "min": ${min}, "max": ${max}, "rationale": "Based on the scoring guidance, the repository demonstrates..."}`;
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

		case "options": {
			const config = payload.config || {};
			const options = config.options ?? [];
			const allowMultiple = config.allowMultiple ?? false;
			const maxSelections = config.maxSelections;

			const optionList = options.length
				? options.map((option) => `- ${option}`).join("\n")
				: "- (no options provided)";

			const selectionGuidance = allowMultiple
				? "Select one or more options if necessary, but keep the selection minimal."
				: "Select exactly one option.";

			const maxGuidance =
				allowMultiple && maxSelections
					? `Select at most ${maxSelections} option${maxSelections === 1 ? "" : "s"}.`
					: "";

			return `${basePrompt}

Options:
${optionList}

${selectionGuidance}
${maxGuidance}

Respond with a JSON object containing:
- "selections": array of strings (each must match one of the options exactly)

Example response:
{"selections": ["TypeScript"]}`;
		}

		default:
			throw new Error(`Unknown evaluation type: ${evaluationType}`);
	}
}

// Helper function to evaluate with AI
async function evaluateWithAI(
	prompt: string,
	evaluationType: "yes_no" | "range" | "comments" | "code_examples" | "options",
	config?: RubricItemConfig,
): Promise<EvaluationResult> {
	const model = "google/gemini-2.5-flash";

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

		case "options": {
			const allowMultiple = config?.allowMultiple ?? false;
			const maxSelections = config?.maxSelections;
			const options =
				config?.options?.map((option) => option.toLowerCase()) ?? [];

			let selectionsSchema = z.array(z.string()).min(1);

			if (!allowMultiple) {
				selectionsSchema = selectionsSchema.max(1);
			} else if (maxSelections !== undefined) {
				selectionsSchema = selectionsSchema.max(maxSelections);
			}

			if (options.length > 0) {
				selectionsSchema = selectionsSchema.refine(
					(selections) =>
						selections.every((selection) =>
							options.includes(selection.toLowerCase()),
						),
					{
						message: "Selections must be from the provided options list",
					},
				);
			}

			const schema = z.object({
				selections: selectionsSchema,
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
