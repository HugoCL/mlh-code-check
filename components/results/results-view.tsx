"use client";

import {
	AlertCircleIcon,
	Download01Icon,
	File01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { exportAsJSON, exportAsMarkdown } from "@/lib/export";
import {
	type CodeExamplesResult,
	CodeExamplesResultCard,
} from "./code-examples-result-card";
import {
	type CommentsResult,
	CommentsResultCard,
} from "./comments-result-card";
import {
	type OptionsResult,
	OptionsResultCard,
} from "./options-result-card";
import { type RangeResult, RangeResultCard } from "./range-result-card";
import { type YesNoResult, YesNoResultCard } from "./yes-no-result-card";

export type EvaluationType =
	| "yes_no"
	| "range"
	| "comments"
	| "code_examples"
	| "options";

export interface RubricItem {
	_id: string;
	name: string;
	description: string;
	evaluationType: EvaluationType;
	config: {
		requireJustification?: boolean;
		minValue?: number;
		maxValue?: number;
		maxExamples?: number;
		options?: string[];
		allowMultiple?: boolean;
		maxSelections?: number;
	};
}

export interface AnalysisResult {
	_id: string;
	rubricItemId: string;
	status: "pending" | "processing" | "completed" | "failed";
	result?:
		| YesNoResult
		| RangeResult
		| CommentsResult
		| CodeExamplesResult
		| OptionsResult;
	error?: string;
	rubricItem?: RubricItem;
}

export interface Analysis {
	_id: string;
	status: "pending" | "running" | "completed" | "failed";
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
	results: AnalysisResult[];
}

interface ResultsViewProps {
	analysis: Analysis;
}

export function ResultsView({ analysis }: ResultsViewProps) {
	const completedResults = analysis.results.filter(
		(r) => r.status === "completed" && r.result && r.rubricItem,
	);
	const failedResults = analysis.results.filter((r) => r.status === "failed");

	const handleExportJSON = () => {
		const json = exportAsJSON(analysis);
		const blob = new Blob([json], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `analysis-${analysis._id}.json`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleExportMarkdown = () => {
		const markdown = exportAsMarkdown(analysis);
		const blob = new Blob([markdown], { type: "text/markdown" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `analysis-${analysis._id}.md`;
		a.click();
		URL.revokeObjectURL(url);
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>Analysis Results</CardTitle>
							<CardDescription>
								{analysis.repository?.fullName} • {analysis.rubric?.name}
							</CardDescription>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary">
								{analysis.completedItems}/{analysis.totalItems} completed
							</Badge>
							{analysis.failedItems > 0 && (
								<Badge variant="destructive">
									{analysis.failedItems} failed
								</Badge>
							)}
						</div>
					</div>
				</CardHeader>
				<CardContent>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleExportJSON}>
							<HugeiconsIcon icon={Download01Icon} className="size-4" />
							Export JSON
						</Button>
						<Button variant="outline" size="sm" onClick={handleExportMarkdown}>
							<HugeiconsIcon icon={File01Icon} className="size-4" />
							Export Markdown
						</Button>
					</div>
				</CardContent>
			</Card>

			{failedResults.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2 text-destructive">
							<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
							Failed Evaluations
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-2">
						{failedResults.map((result) => (
							<div
								key={result._id}
								className="flex items-center justify-between p-3 rounded-lg bg-destructive/10"
							>
								<span className="font-medium">
									{result.rubricItem?.name ?? "Unknown Item"}
								</span>
								<span className="text-sm text-muted-foreground">
									{result.error ?? "Unknown error"}
								</span>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			<div className="space-y-4">
				{completedResults.map((result) => {
					const item = result.rubricItem!;
					const evaluationResult = result.result!;

					switch (item.evaluationType) {
						case "yes_no":
							return (
								<YesNoResultCard
									key={result._id}
									itemName={item.name}
									itemDescription={item.description}
									result={evaluationResult as YesNoResult}
								/>
							);
						case "range":
							return (
								<RangeResultCard
									key={result._id}
									itemName={item.name}
									itemDescription={item.description}
									result={evaluationResult as RangeResult}
								/>
							);
						case "comments":
							return (
								<CommentsResultCard
									key={result._id}
									itemName={item.name}
									itemDescription={item.description}
									result={evaluationResult as CommentsResult}
								/>
							);
						case "code_examples":
							return (
								<CodeExamplesResultCard
									key={result._id}
									itemName={item.name}
									itemDescription={item.description}
									result={evaluationResult as CodeExamplesResult}
								/>
							);
						case "options":
							return (
								<OptionsResultCard
									key={result._id}
									itemName={item.name}
									itemDescription={item.description}
									result={evaluationResult as OptionsResult}
								/>
							);
						default:
							return null;
					}
				})}
			</div>

			{completedResults.length === 0 && failedResults.length === 0 && (
				<Card>
					<CardContent className="py-8 text-center text-muted-foreground">
						No results available yet.
					</CardContent>
				</Card>
			)}
		</div>
	);
}
