export interface ExportableAnalysis {
	_id: string;
	status: string;
	totalItems: number;
	completedItems: number;
	failedItems: number;
	createdAt: number;
	completedAt?: number;
	repository?: {
		fullName: string;
	};
	rubric?: {
		name: string;
	};
	results: Array<{
		_id: string;
		rubricItemId: string;
		status: string;
		result?: unknown;
		error?: string;
		rubricItem?: {
			_id: string;
			name: string;
			description: string;
			evaluationType: string;
		};
	}>;
}

/**
 * Export analysis results as JSON string
 * **Feature: ai-code-review, Property 16: Export format validity**
 * **Validates: Requirements 7.5**
 */
export function exportAsJSON(analysis: ExportableAnalysis): string {
	const exportData = {
		id: analysis._id,
		status: analysis.status,
		repository: analysis.repository?.fullName ?? "Unknown",
		rubric: analysis.rubric?.name ?? "Unknown",
		summary: {
			totalItems: analysis.totalItems,
			completedItems: analysis.completedItems,
			failedItems: analysis.failedItems,
		},
		createdAt: new Date(analysis.createdAt).toISOString(),
		completedAt: analysis.completedAt
			? new Date(analysis.completedAt).toISOString()
			: null,
		results: analysis.results.map((result) => ({
			itemId: result.rubricItemId,
			itemName: result.rubricItem?.name ?? "Unknown",
			itemDescription: result.rubricItem?.description ?? "",
			evaluationType: result.rubricItem?.evaluationType ?? "unknown",
			status: result.status,
			result: result.result ?? null,
			error: result.error ?? null,
		})),
	};

	return JSON.stringify(exportData, null, 2);
}

/**
 * Export analysis results as Markdown string
 * **Feature: ai-code-review, Property 16: Export format validity**
 * **Validates: Requirements 7.5**
 */
export function exportAsMarkdown(analysis: ExportableAnalysis): string {
	const lines: string[] = [];

	// Header
	lines.push(`# Analysis Results`);
	lines.push("");
	lines.push(`**Repository:** ${analysis.repository?.fullName ?? "Unknown"}`);
	lines.push(`**Rubric:** ${analysis.rubric?.name ?? "Unknown"}`);
	lines.push(`**Status:** ${analysis.status}`);
	lines.push(
		`**Completed:** ${analysis.completedItems}/${analysis.totalItems} items`,
	);
	if (analysis.failedItems > 0) {
		lines.push(`**Failed:** ${analysis.failedItems} items`);
	}
	lines.push(`**Created:** ${new Date(analysis.createdAt).toLocaleString()}`);
	if (analysis.completedAt) {
		lines.push(
			`**Completed:** ${new Date(analysis.completedAt).toLocaleString()}`,
		);
	}
	lines.push("");
	lines.push("---");
	lines.push("");

	// Results
	lines.push("## Results");
	lines.push("");

	for (const result of analysis.results) {
		const itemName = result.rubricItem?.name ?? "Unknown Item";
		const itemDescription = result.rubricItem?.description ?? "";
		const evaluationType = result.rubricItem?.evaluationType ?? "unknown";

		lines.push(`### ${itemName}`);
		lines.push("");
		if (itemDescription) {
			lines.push(`*${itemDescription}*`);
			lines.push("");
		}

		if (result.status === "failed") {
			lines.push(`**Status:** ❌ Failed`);
			if (result.error) {
				lines.push(`**Error:** ${result.error}`);
			}
			lines.push("");
			continue;
		}

		if (result.status !== "completed" || !result.result) {
			lines.push(`**Status:** ${result.status}`);
			lines.push("");
			continue;
		}

		const res = result.result as Record<string, unknown>;

		switch (evaluationType) {
			case "yes_no": {
				const value = res.value as boolean;
				const justification = res.justification as string;
				lines.push(`**Result:** ${value ? "✅ Yes" : "❌ No"}`);
				lines.push("");
				if (justification) {
					lines.push("**Justification:**");
					lines.push("");
					lines.push(justification);
				}
				break;
			}
			case "range": {
				const value = res.value as number;
				const min = res.min as number;
				const max = res.max as number;
				const rationale = res.rationale as string;
				lines.push(`**Score:** ${value} / ${max} (min: ${min})`);
				lines.push("");
				if (rationale) {
					lines.push("**Rationale:**");
					lines.push("");
					lines.push(rationale);
				}
				break;
			}
			case "comments": {
				const feedback = res.feedback as string;
				lines.push("**Feedback:**");
				lines.push("");
				lines.push(feedback);
				break;
			}
			case "code_examples": {
				const examples = res.examples as Array<{
					filePath: string;
					lineStart: number;
					lineEnd: number;
					code: string;
					explanation: string;
				}>;
				lines.push(`**Examples:** ${examples.length} found`);
				lines.push("");
				for (const example of examples) {
					lines.push(
						`#### ${example.filePath} (L${example.lineStart}-${example.lineEnd})`,
					);
					lines.push("");
					lines.push("```");
					lines.push(example.code);
					lines.push("```");
					lines.push("");
					if (example.explanation) {
						lines.push(example.explanation);
						lines.push("");
					}
				}
				break;
			}
			default:
				lines.push("**Result:** (unknown format)");
				lines.push("");
				lines.push("```json");
				lines.push(JSON.stringify(res, null, 2));
				lines.push("```");
		}

		lines.push("");
		lines.push("---");
		lines.push("");
	}

	return lines.join("\n");
}
