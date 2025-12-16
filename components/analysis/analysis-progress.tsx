"use client";

import { useRealtimeTaskTrigger } from "@trigger.dev/react-hooks";
import type { analyzeRepository } from "@/trigger/analyze";
import { ProgressBar } from "./progress-bar";
import { ItemStatusList, type ItemStatusInfo } from "./item-status-list";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
	CheckmarkCircle02Icon,
	Cancel01Icon,
	AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";

interface AnalysisProgressMetadata {
	status: "initializing" | "fetching_repo" | "evaluating" | "completing";
	totalItems: number;
	completedItems: number;
	failedItems: number;
	currentItem?: string;
	items: Record<string, "pending" | "processing" | "completed" | "failed">;
}

interface AnalysisProgressProps {
	accessToken: string;
	analysisId: string;
	repositoryId: string;
	rubricId: string;
	userId: string;
	rubricItems?: Array<{ id: string; name: string }>;
	onComplete?: () => void;
}

const statusLabels: Record<AnalysisProgressMetadata["status"], string> = {
	initializing: "Initializing analysis...",
	fetching_repo: "Fetching repository content...",
	evaluating: "Evaluating rubric items...",
	completing: "Completing analysis...",
};

export function AnalysisProgress({
	accessToken,
	analysisId,
	repositoryId,
	rubricId,
	userId,
	rubricItems = [],
	onComplete,
}: AnalysisProgressProps) {
	const { submit, run, error, isLoading } = useRealtimeTaskTrigger<
		typeof analyzeRepository
	>("analyze-repository", {
		accessToken,
	});

	// Parse progress metadata from run
	const progressMetadata = run?.metadata?.progress as
		| AnalysisProgressMetadata
		| undefined;

	// Build item status list from metadata
	const itemStatuses: ItemStatusInfo[] = rubricItems.map((item) => ({
		id: item.id,
		name: item.name,
		status: progressMetadata?.items?.[item.id] ?? "pending",
	}));

	const totalItems = progressMetadata?.totalItems ?? rubricItems.length;
	const completedItems = progressMetadata?.completedItems ?? 0;
	const failedItems = progressMetadata?.failedItems ?? 0;

	// Check if analysis is complete
	const isComplete =
		run?.status === "COMPLETED" || progressMetadata?.status === "completing";
	const isFailed = run?.status === "FAILED";

	// Trigger onComplete callback when analysis finishes
	if ((isComplete || isFailed) && onComplete) {
		onComplete();
	}

	const handleStartAnalysis = () => {
		submit({
			analysisId,
			repositoryId,
			rubricId,
			userId,
		});
	};

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
						Analysis Error
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Not started yet
	if (!run && !isLoading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Ready to Analyze</CardTitle>
					<CardDescription>
						Click the button below to start analyzing the repository against the
						selected rubric.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={handleStartAnalysis}>Start Analysis</Button>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						{isComplete ? (
							<>
								<HugeiconsIcon
									icon={CheckmarkCircle02Icon}
									className="size-5 text-green-500"
								/>
								Analysis Complete
							</>
						) : isFailed ? (
							<>
								<HugeiconsIcon
									icon={Cancel01Icon}
									className="size-5 text-destructive"
								/>
								Analysis Failed
							</>
						) : (
							<>
								<Spinner className="size-5" />
								Analysis in Progress
							</>
						)}
					</CardTitle>
					{progressMetadata?.status && !isComplete && !isFailed && (
						<Badge variant="secondary">
							{statusLabels[progressMetadata.status]}
						</Badge>
					)}
				</div>
				{progressMetadata?.currentItem && !isComplete && (
					<CardDescription>
						Currently evaluating: {progressMetadata.currentItem}
					</CardDescription>
				)}
			</CardHeader>
			<CardContent className="space-y-6">
				<ProgressBar
					totalItems={totalItems}
					completedItems={completedItems}
					failedItems={failedItems}
				/>

				{failedItems > 0 && (
					<div className="text-sm text-destructive">
						{failedItems} item{failedItems > 1 ? "s" : ""} failed during
						evaluation
					</div>
				)}

				{itemStatuses.length > 0 && (
					<div>
						<h4 className="mb-3 text-sm font-medium">Rubric Items</h4>
						<ItemStatusList items={itemStatuses} />
					</div>
				)}
			</CardContent>
		</Card>
	);
}
