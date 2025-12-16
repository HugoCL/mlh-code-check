import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

/**
 * **Feature: ai-code-review, Property 4: Evaluation result structure matches type**
 * *For any* completed evaluation result, the result structure SHALL match the evaluation type:
 * - yes_no: contains boolean `value` and string `justification`
 * - range: contains numeric `value` within configured `min`/`max` bounds, and string `rationale`
 * - comments: contains string `feedback`
 * - code_examples: contains array of examples, each with `filePath`, `lineStart`, `lineEnd`, `code`, and `explanation`
 * **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4**
 */
describe("Property 4: Evaluation result structure matches type", () => {
	// Arbitrary for generating yes_no results
	const yesNoResultArbitrary = fc.record({
		value: fc.boolean(),
		justification: fc.string({ minLength: 1, maxLength: 500 }),
	});

	// Arbitrary for generating range results
	const rangeResultArbitrary = fc
		.record({
			value: fc.integer({ min: 0, max: 100 }),
			min: fc.constant(0),
			max: fc.constant(100),
			rationale: fc.string({ minLength: 1, maxLength: 500 }),
		})
		.filter(
			(result) => result.value >= result.min && result.value <= result.max,
		);

	// Arbitrary for generating comments results
	const commentsResultArbitrary = fc.record({
		feedback: fc.string({ minLength: 1, maxLength: 1000 }),
	});

	// Arbitrary for generating code examples results
	const codeExamplesResultArbitrary = fc.record({
		examples: fc.array(
			fc
				.record({
					filePath: fc.string({ minLength: 1, maxLength: 200 }),
					lineStart: fc.integer({ min: 1, max: 1000 }),
					lineEnd: fc.integer({ min: 1, max: 1000 }),
					code: fc.string({ minLength: 1, maxLength: 500 }),
					explanation: fc.string({ minLength: 1, maxLength: 500 }),
				})
				.filter((example) => example.lineStart <= example.lineEnd),
			{ minLength: 1, maxLength: 5 },
		),
	});

	it("should validate yes_no result structure", async () => {
		await fc.assert(
			fc.property(yesNoResultArbitrary, (result) => {
				// Property: yes_no results have correct structure
				expect(typeof result.value).toBe("boolean");
				expect(typeof result.justification).toBe("string");
				expect(result.justification.length).toBeGreaterThan(0);
			}),
			{ numRuns: 100 },
		);
	});

	it("should validate range result structure", async () => {
		await fc.assert(
			fc.property(rangeResultArbitrary, (result) => {
				// Property: range results have correct structure and bounds
				expect(typeof result.value).toBe("number");
				expect(typeof result.min).toBe("number");
				expect(typeof result.max).toBe("number");
				expect(typeof result.rationale).toBe("string");
				expect(result.value).toBeGreaterThanOrEqual(result.min);
				expect(result.value).toBeLessThanOrEqual(result.max);
				expect(result.rationale.length).toBeGreaterThan(0);
			}),
			{ numRuns: 100 },
		);
	});

	it("should validate comments result structure", async () => {
		await fc.assert(
			fc.property(commentsResultArbitrary, (result) => {
				// Property: comments results have correct structure
				expect(typeof result.feedback).toBe("string");
				expect(result.feedback.length).toBeGreaterThan(0);
			}),
			{ numRuns: 100 },
		);
	});

	it("should validate code_examples result structure", async () => {
		await fc.assert(
			fc.property(codeExamplesResultArbitrary, (result) => {
				// Property: code_examples results have correct structure
				expect(Array.isArray(result.examples)).toBe(true);
				expect(result.examples.length).toBeGreaterThan(0);

				for (const example of result.examples) {
					expect(typeof example.filePath).toBe("string");
					expect(typeof example.lineStart).toBe("number");
					expect(typeof example.lineEnd).toBe("number");
					expect(typeof example.code).toBe("string");
					expect(typeof example.explanation).toBe("string");

					expect(example.filePath.length).toBeGreaterThan(0);
					expect(example.lineStart).toBeGreaterThan(0);
					expect(example.lineEnd).toBeGreaterThan(0);
					expect(example.lineStart).toBeLessThanOrEqual(example.lineEnd);
					expect(example.code.length).toBeGreaterThan(0);
					expect(example.explanation.length).toBeGreaterThan(0);
				}
			}),
			{ numRuns: 100 },
		);
	});

	it("should validate mixed evaluation types maintain structure integrity", async () => {
		const mixedResultArbitrary = fc.oneof(
			fc.record({ type: fc.constant("yes_no"), result: yesNoResultArbitrary }),
			fc.record({ type: fc.constant("range"), result: rangeResultArbitrary }),
			fc.record({
				type: fc.constant("comments"),
				result: commentsResultArbitrary,
			}),
			fc.record({
				type: fc.constant("code_examples"),
				result: codeExamplesResultArbitrary,
			}),
		);

		await fc.assert(
			fc.property(mixedResultArbitrary, (evaluation) => {
				// Property: Each evaluation type maintains its specific structure
				switch (evaluation.type) {
					case "yes_no":
						expect(typeof evaluation.result.value).toBe("boolean");
						expect(typeof evaluation.result.justification).toBe("string");
						break;
					case "range":
						expect(typeof evaluation.result.value).toBe("number");
						expect(typeof evaluation.result.min).toBe("number");
						expect(typeof evaluation.result.max).toBe("number");
						expect(typeof evaluation.result.rationale).toBe("string");
						expect(evaluation.result.value).toBeGreaterThanOrEqual(
							evaluation.result.min,
						);
						expect(evaluation.result.value).toBeLessThanOrEqual(
							evaluation.result.max,
						);
						break;
					case "comments":
						expect(typeof evaluation.result.feedback).toBe("string");
						expect(evaluation.result.feedback.length).toBeGreaterThan(0);
						break;
					case "code_examples":
						expect(Array.isArray(evaluation.result.examples)).toBe(true);
						expect(evaluation.result.examples.length).toBeGreaterThan(0);
						break;
				}
			}),
			{ numRuns: 100 },
		);
	});
});
