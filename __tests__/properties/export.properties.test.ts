import * as fc from "fast-check";
import { describe, expect, it } from "vitest";
import {
	type ExportableAnalysis,
	exportAsJSON,
	exportAsMarkdown,
} from "../../lib/export";

// Arbitrary for generating valid evaluation types
const evaluationTypeArbitrary = fc.constantFrom(
	"yes_no",
	"range",
	"comments",
	"code_examples",
	"options",
);

// Arbitrary for generating yes/no results
const yesNoResultArbitrary = fc.record({
	value: fc.boolean(),
	justification: fc.string({ minLength: 0, maxLength: 500 }),
});

// Arbitrary for generating range results
const rangeResultArbitrary = fc
	.record({
		min: fc.integer({ min: 0, max: 50 }),
		max: fc.integer({ min: 51, max: 100 }),
		value: fc.integer({ min: 0, max: 100 }),
		rationale: fc.string({ minLength: 0, maxLength: 500 }),
	})
	.map((r) => ({
		...r,
		value: Math.max(r.min, Math.min(r.max, r.value)), // Ensure value is within range
	}));

// Arbitrary for generating comments results
const commentsResultArbitrary = fc.record({
	feedback: fc.string({ minLength: 0, maxLength: 1000 }),
});

// Arbitrary for generating code example
const codeExampleArbitrary = fc.record({
	filePath: fc.stringMatching(/^[a-z]+\/[a-z]+\.(ts|js|py|go)$/),
	lineStart: fc.integer({ min: 1, max: 100 }),
	lineEnd: fc.integer({ min: 101, max: 200 }),
	code: fc.string({ minLength: 1, maxLength: 500 }),
	explanation: fc.string({ minLength: 0, maxLength: 300 }),
});

// Arbitrary for generating code examples results
const codeExamplesResultArbitrary = fc.record({
	examples: fc.array(codeExampleArbitrary, { minLength: 0, maxLength: 3 }),
});

const optionsResultArbitrary = fc.record({
	selections: fc.array(fc.string({ minLength: 1, maxLength: 50 }), {
		minLength: 0,
		maxLength: 5,
	}),
});

// Generate result based on evaluation type
function generateResultForType(evalType: string): fc.Arbitrary<unknown> {
	switch (evalType) {
		case "yes_no":
			return yesNoResultArbitrary;
		case "range":
			return rangeResultArbitrary;
		case "comments":
			return commentsResultArbitrary;
		case "code_examples":
			return codeExamplesResultArbitrary;
		case "options":
			return optionsResultArbitrary;
		default:
			return fc.constant(null);
	}
}

// Arbitrary for generating a rubric item
const rubricItemArbitrary = fc.record({
	_id: fc.uuid(),
	name: fc
		.string({ minLength: 1, maxLength: 100 })
		.filter((s) => s.trim().length > 0),
	description: fc.string({ minLength: 0, maxLength: 300 }),
	evaluationType: evaluationTypeArbitrary,
});

// Arbitrary for generating analysis result status
const resultStatusArbitrary = fc.constantFrom(
	"pending",
	"processing",
	"completed",
	"failed",
);

// Arbitrary for generating a complete analysis result
const analysisResultArbitrary = fc
	.record({
		_id: fc.uuid(),
		rubricItemId: fc.uuid(),
		status: resultStatusArbitrary,
		rubricItem: rubricItemArbitrary,
		error: fc.option(fc.string({ minLength: 1, maxLength: 200 }), {
			nil: undefined,
		}),
	})
	.chain((result) => {
		if (result.status === "completed" && result.rubricItem) {
			return generateResultForType(result.rubricItem.evaluationType).map(
				(generatedResult) => ({
					...result,
					result: generatedResult,
				}),
			);
		}
		return fc.constant({ ...result, result: undefined });
	});

// Arbitrary for generating a complete analysis
const analysisArbitrary = fc.record({
	_id: fc.uuid(),
	status: fc.constantFrom("pending", "running", "completed", "failed"),
	totalItems: fc.integer({ min: 1, max: 10 }),
	completedItems: fc.integer({ min: 0, max: 10 }),
	failedItems: fc.integer({ min: 0, max: 5 }),
	createdAt: fc.integer({ min: 1609459200000, max: 1735689600000 }), // 2021-2025
	completedAt: fc.option(
		fc.integer({ min: 1609459200000, max: 1735689600000 }),
		{
			nil: undefined,
		},
	),
	repository: fc.option(
		fc.record({
			fullName: fc.stringMatching(/^[a-z]+\/[a-z-]+$/),
		}),
		{ nil: undefined },
	),
	rubric: fc.option(
		fc.record({
			name: fc
				.string({ minLength: 1, maxLength: 100 })
				.filter((s) => s.trim().length > 0),
		}),
		{ nil: undefined },
	),
	results: fc.array(analysisResultArbitrary, { minLength: 0, maxLength: 5 }),
});

/**
 * **Feature: ai-code-review, Property 16: Export format validity**
 * *For any* completed analysis export, JSON export SHALL produce valid parseable
 * JSON containing all results, and Markdown export SHALL produce valid Markdown
 * with all results formatted appropriately.
 * **Validates: Requirements 7.5**
 */
describe("Property 16: Export format validity", () => {
	it("JSON export should produce valid parseable JSON", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const jsonString = exportAsJSON(analysis as ExportableAnalysis);

				// Property: JSON should be parseable
				let parsed: unknown;
				expect(() => {
					parsed = JSON.parse(jsonString);
				}).not.toThrow();

				// Property: Parsed JSON should be an object
				expect(typeof parsed).toBe("object");
				expect(parsed).not.toBeNull();
			}),
			{ numRuns: 100 },
		);
	});

	it("JSON export should contain all required fields", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const jsonString = exportAsJSON(analysis as ExportableAnalysis);
				const parsed = JSON.parse(jsonString) as Record<string, unknown>;

				// Property: JSON should contain required top-level fields
				expect(parsed).toHaveProperty("id");
				expect(parsed).toHaveProperty("status");
				expect(parsed).toHaveProperty("repository");
				expect(parsed).toHaveProperty("rubric");
				expect(parsed).toHaveProperty("summary");
				expect(parsed).toHaveProperty("createdAt");
				expect(parsed).toHaveProperty("results");

				// Property: Summary should contain counts
				const summary = parsed.summary as Record<string, unknown>;
				expect(summary).toHaveProperty("totalItems");
				expect(summary).toHaveProperty("completedItems");
				expect(summary).toHaveProperty("failedItems");

				// Property: Results should be an array
				expect(Array.isArray(parsed.results)).toBe(true);
			}),
			{ numRuns: 100 },
		);
	});

	it("JSON export should preserve all result data", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const jsonString = exportAsJSON(analysis as ExportableAnalysis);
				const parsed = JSON.parse(jsonString) as Record<string, unknown>;
				const results = parsed.results as Array<Record<string, unknown>>;

				// Property: Number of results should match
				expect(results.length).toBe(analysis.results.length);

				// Property: Each result should have required fields
				for (const result of results) {
					expect(result).toHaveProperty("itemId");
					expect(result).toHaveProperty("itemName");
					expect(result).toHaveProperty("evaluationType");
					expect(result).toHaveProperty("status");
				}
			}),
			{ numRuns: 100 },
		);
	});

	it("JSON export should produce valid ISO date strings", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const jsonString = exportAsJSON(analysis as ExportableAnalysis);
				const parsed = JSON.parse(jsonString) as Record<string, unknown>;

				// Property: createdAt should be valid ISO date
				const createdAt = parsed.createdAt as string;
				expect(() => new Date(createdAt)).not.toThrow();
				expect(new Date(createdAt).toISOString()).toBe(createdAt);

				// Property: completedAt should be valid ISO date if present
				if (parsed.completedAt !== null) {
					const completedAt = parsed.completedAt as string;
					expect(() => new Date(completedAt)).not.toThrow();
					expect(new Date(completedAt).toISOString()).toBe(completedAt);
				}
			}),
			{ numRuns: 100 },
		);
	});

	it("Markdown export should produce non-empty string", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Markdown should be a non-empty string
				expect(typeof markdown).toBe("string");
				expect(markdown.length).toBeGreaterThan(0);
			}),
			{ numRuns: 100 },
		);
	});

	it("Markdown export should contain header with analysis info", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Markdown should start with header
				expect(markdown).toMatch(/^# Analysis Results/);

				// Property: Should contain repository info
				expect(markdown).toContain("**Repository:**");

				// Property: Should contain rubric info
				expect(markdown).toContain("**Rubric:**");

				// Property: Should contain status
				expect(markdown).toContain("**Status:**");

				// Property: Should contain completion count
				expect(markdown).toContain("**Completed:**");
			}),
			{ numRuns: 100 },
		);
	});

	it("Markdown export should include all results", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Should have Results section
				expect(markdown).toContain("## Results");

				// Property: Each result item should have a heading
				for (const result of analysis.results) {
					if (result.rubricItem) {
						expect(markdown).toContain(`### ${result.rubricItem.name}`);
					}
				}
			}),
			{ numRuns: 100 },
		);
	});

	it("Markdown export should format yes/no results correctly", async () => {
		// Generate analysis with at least one yes/no result
		const yesNoAnalysisArbitrary = fc.record({
			_id: fc.uuid(),
			status: fc.constant("completed"),
			totalItems: fc.constant(1),
			completedItems: fc.constant(1),
			failedItems: fc.constant(0),
			createdAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			completedAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			repository: fc.record({ fullName: fc.constant("owner/repo") }),
			rubric: fc.record({ name: fc.constant("Test Rubric") }),
			results: fc.constant([
				{
					_id: "result-1",
					rubricItemId: "item-1",
					status: "completed" as const,
					rubricItem: {
						_id: "item-1",
						name: "Test Item",
						description: "Test description",
						evaluationType: "yes_no",
					},
					result: { value: true, justification: "Test justification" },
				},
			]),
		});

		await fc.assert(
			fc.asyncProperty(yesNoAnalysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Yes/no results should show checkmark or X
				expect(markdown).toMatch(/\*\*Result:\*\* (✅ Yes|❌ No)/);
			}),
			{ numRuns: 50 },
		);
	});

	it("Markdown export should format range results correctly", async () => {
		const rangeAnalysisArbitrary = fc.record({
			_id: fc.uuid(),
			status: fc.constant("completed"),
			totalItems: fc.constant(1),
			completedItems: fc.constant(1),
			failedItems: fc.constant(0),
			createdAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			completedAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			repository: fc.record({ fullName: fc.constant("owner/repo") }),
			rubric: fc.record({ name: fc.constant("Test Rubric") }),
			results: fc.constant([
				{
					_id: "result-1",
					rubricItemId: "item-1",
					status: "completed" as const,
					rubricItem: {
						_id: "item-1",
						name: "Test Item",
						description: "Test description",
						evaluationType: "range",
					},
					result: { value: 75, min: 0, max: 100, rationale: "Good score" },
				},
			]),
		});

		await fc.assert(
			fc.asyncProperty(rangeAnalysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Range results should show score format
				expect(markdown).toMatch(/\*\*Score:\*\* \d+ \/ \d+ \(min: \d+\)/);
			}),
			{ numRuns: 50 },
		);
	});

	it("Markdown export should format failed results correctly", async () => {
		const failedAnalysisArbitrary = fc.record({
			_id: fc.uuid(),
			status: fc.constant("completed"),
			totalItems: fc.constant(1),
			completedItems: fc.constant(0),
			failedItems: fc.constant(1),
			createdAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			completedAt: fc.integer({ min: 1609459200000, max: 1735689600000 }),
			repository: fc.record({ fullName: fc.constant("owner/repo") }),
			rubric: fc.record({ name: fc.constant("Test Rubric") }),
			results: fc.constant([
				{
					_id: "result-1",
					rubricItemId: "item-1",
					status: "failed" as const,
					rubricItem: {
						_id: "item-1",
						name: "Failed Item",
						description: "Test description",
						evaluationType: "yes_no",
					},
					error: "Test error message",
				},
			]),
		});

		await fc.assert(
			fc.asyncProperty(failedAnalysisArbitrary, async (analysis) => {
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);

				// Property: Failed results should show failed status
				expect(markdown).toContain("**Status:** ❌ Failed");
				expect(markdown).toContain("**Error:**");
			}),
			{ numRuns: 50 },
		);
	});

	it("JSON and Markdown exports should be consistent", async () => {
		await fc.assert(
			fc.asyncProperty(analysisArbitrary, async (analysis) => {
				const jsonString = exportAsJSON(analysis as ExportableAnalysis);
				const markdown = exportAsMarkdown(analysis as ExportableAnalysis);
				const parsed = JSON.parse(jsonString) as Record<string, unknown>;

				// Property: Both exports should reference the same analysis ID
				expect(parsed.id).toBe(analysis._id);

				// Property: Both should have same number of results
				const jsonResults = parsed.results as Array<unknown>;
				// Count all level-3 headings in the Results section (each result gets a ### heading)
				const resultsSection = markdown.split("## Results")[1] || "";
				const resultHeadingsCount = (resultsSection.match(/^### /gm) || [])
					.length;
				expect(jsonResults.length).toBe(resultHeadingsCount);
			}),
			{ numRuns: 100 },
		);
	});
});
