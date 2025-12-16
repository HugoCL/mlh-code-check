"use client";

import {
	AlertCircleIcon,
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { useCallback, useEffect, useState } from "react";
import { startAnalysis, triggerAnalysisTask } from "@/app/actions/analysis";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import type { analyzeRepository } from "@/trigger/analyze";
import { type ItemStatusInfo, ItemStatusList } from "./item-status-list";
import { ProgressBar } from "./progress-bar";

interface AnalysisProgressMetadata {
	status: "initializing" | "fetching_repo" | "evaluating" | "completing";
	totalItems: number;
	completedItems: number;
	failedItems: number;
	currentItem?: string;
	items: Record<string, "pending" | "processing" | "completed" | "failed">;
}

interface RubricItem {
	id: string;
	name: string;
}

interface AnalysisRunnerProps {
	repositoryId: string;
	rubricId: string;
	userId: string;
	rubricItems?: RubricItem[];
	onComplete?: (analysisId: string) => void;
	onError?: (error: string) => void;
}

const statusLabels: Record<AnalysisProgressMetadata["status"], string> = {
	initializing: "Initializing analysis...",
	fetching_repo: "Fetching repository content...",
	evaluating: "Evaluating rubric items...",
	completing: "Completing analysis...",
};

type AnalysisState =
	| { status: "idle" }
	| { status: "starting" }
	| {
			status: "running";
			analysisId: string;
			runId: string;
			accessToken: string;
	  }
	| { status: "completed"; analysisId: string }
	| { status: "failed"; error: string };

export function AnalysisRunner({
	repositoryId,
	rubricId,
	userId,
	rubricItems = [],
	onComplete,
	onError,
}: AnalysisRunnerProps) {
	const [state, setState] = useState<AnalysisState>({ status: "idle" });

	const handleStartAnalysis = useCallback(async () => {
		setState({ status: "starting" });

		try {
			// Step 1: Create analysis record and get access token
			const result = await startAnalysis(repositoryId, rubricId);

			if (!result.success || !result.analysisId || !result.accessToken) {
				setState({
					status: "failed",
					error: result.error ?? "Failed to start analysis",
				});
				onError?.(result.error ?? "Failed to start analysis");
				return;
			}

			// Step 2: Trigger the analysis task
			const triggerResult = await triggerAnalysisTask(
				result.analysisId,
				repositoryId,
				rubricId,
				userId,
			);

			if (!triggerResult.success || !triggerResult.runId) {
				setState({
					status: "failed",
					error: triggerResult.error ?? "Failed to trigger analysis",
				});
				onError?.(triggerResult.error ?? "Failed to trigger analysis");
				return;
			}

			// Step 3: Set running state with run ID for subscription
			setState({
				status: "running",
				analysisId: result.analysisId,
				runId: triggerResult.runId,
				accessToken: result.accessToken,
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			setState({ status: "failed", error: errorMessage });
			onError?.(errorMessage);
		}
	}, [repositoryId, rubricId, userId, onError]);

	if (state.status === "idle") {
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

	if (state.status === "starting") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Spinner className="size-5" />
						Starting Analysis...
					</CardTitle>
					<CardDescription>
						Setting up the analysis job. This may take a moment.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	if (state.status === "failed") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
						Analysis Failed
					</CardTitle>
					<CardDescription>{state.error}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button onClick={handleStartAnalysis} variant="outline">
						Try Again
					</Button>
				</CardContent>
			</Card>
		);
	}

	if (state.status === "completed") {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<HugeiconsIcon
							icon={CheckmarkCircle02Icon}
							className="size-5 text-green-500"
						/>
						Analysis Complete
					</CardTitle>
					<CardDescription>
						The analysis has finished. View the results to see the evaluation.
					</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	// Running state - render the realtime progress component
	return (
		<AnalysisProgressView
			runId={state.runId}
			accessToken={state.accessToken}
			analysisId={state.analysisId}
			rubricItems={rubricItems}
			onComplete={() => {
				setState({ status: "completed", analysisId: state.analysisId });
				onComplete?.(state.analysisId);
			}}
			onFailed={(error) => {
				setState({ status: "failed", error });
				onError?.(error);
			}}
		/>
	);
}

interface AnalysisProgressViewProps {
	runId: string;
	accessToken: string;
	analysisId: string;
	rubricItems: RubricItem[];
	onComplete: () => void;
	onFailed: (error: string) => void;
}

function AnalysisProgressView({
	runId,
	accessToken,
	analysisId,
	rubricItems,
	onComplete,
	onFailed,
}: AnalysisProgressViewProps) {
	const { run, error } = useRealtimeRun<typeof analyzeRepository>(runId, {
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
	const isComplete = run?.status === "COMPLETED";
	const isFailed = run?.status === "FAILED";

	// Handle completion/failure
	useEffect(() => {
		if (isComplete) {
			onComplete();
		} else if (isFailed) {
			onFailed(run?.error?.message ?? "Analysis failed");
		}
	}, [isComplete, isFailed, onComplete, onFailed, run?.error?.message]);

	if (error) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-destructive">
						<HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
						Connection Error
					</CardTitle>
					<CardDescription>{error.message}</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2">
						<Spinner className="size-5" />
						Analysis in Progress
					</CardTitle>
					{progressMetadata?.status && (
						<Badge variant="secondary">
							{statusLabels[progressMetadata.status]}
						</Badge>
					)}
				</div>
				{progressMetadata?.currentItem && (
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

				<div className="text-xs text-muted-foreground">
					Analysis ID: {analysisId}
				</div>
			</CardContent>
		</Card>
	);
}
