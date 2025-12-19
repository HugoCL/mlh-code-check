"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnalysisRunner } from "@/components/analysis/analysis-runner";
import type { ItemStatus } from "@/components/analysis/item-status-list";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function AnalysisProgressPage() {
	const params = useParams();
	const router = useRouter();
	const analysisId = params.id as string;
	const { isAuthenticated } = useConvexAuth();

	const analysis = useQuery(
		api.analyses.getAnalysis,
		isAuthenticated ? { analysisId: analysisId as Id<"analyses"> } : "skip",
	);
	const currentUser = useQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);
	const rubric = useQuery(
		api.rubrics.getRubric,
		isAuthenticated && analysis ? { rubricId: analysis.rubricId } : "skip",
	);

	// Redirect to results if analysis is already completed
	useEffect(() => {
		if (analysis?.status === "completed" || analysis?.status === "failed") {
			router.replace(`/dashboard/analyses/${analysisId}`);
		}
	}, [analysis?.status, analysisId, router]);

	const handleComplete = (completedAnalysisId: string) => {
		router.push(`/dashboard/analyses/${completedAnalysisId}`);
	};

	const handleError = (error: string) => {
		console.error("Analysis error:", error);
	};

	if (
		analysis === undefined ||
		currentUser === undefined ||
		currentUser === null
	) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (analysis === null) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button
						variant="ghost"
						size="icon-sm"
						render={<Link href="/dashboard" />}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} />
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Analysis Not Found</h1>
						<p className="text-muted-foreground">
							The requested analysis could not be found.
						</p>
					</div>
				</div>
			</div>
		);
	}

	const rubricItems =
		rubric?.items?.map((item) => ({
			id: item._id,
			name: item.name,
		})) ?? [];
	const itemStatusOverrides = (analysis.results ?? []).reduce(
		(acc, result) => {
			acc[result.rubricItemId] = result.status as ItemStatus;
			return acc;
		},
		{} as Record<string, ItemStatus>,
	);

	// Determine if this is a one-off analysis (no repositoryId)
	const isOneOff = !analysis.repositoryId;

	// Get display name for repository
	const repositoryDisplayName =
		analysis.repository?.fullName ??
		(analysis.repositoryOwner && analysis.repositoryName
			? `${analysis.repositoryOwner}/${analysis.repositoryName}`
			: "Unknown Repository");

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon-sm"
					render={<Link href="/dashboard" />}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} />
				</Button>
				<div className="flex-1">
					<h1 className="text-2xl font-bold">Analysis Progress</h1>
					<p className="text-muted-foreground">
						{repositoryDisplayName} •{" "}
						{analysis.rubric?.name ?? "Unknown Rubric"}
					</p>
				</div>
				{(analysis.status === "completed" || analysis.status === "failed") && (
					<Button render={<Link href={`/dashboard/analyses/${analysisId}`} />}>
						View Results
						<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
					</Button>
				)}
			</div>

			{isOneOff ? (
				<AnalysisRunner
					analysisId={analysisId}
					repositoryUrl={analysis.repositoryUrl ?? ""}
					repositoryOwner={analysis.repositoryOwner ?? ""}
					repositoryName={analysis.repositoryName ?? ""}
					branch={analysis.branch ?? "main"}
					rubricId={analysis.rubricId}
					userId={currentUser._id}
					rubricItems={rubricItems}
					progressOverride={{
						totalItems: analysis.totalItems,
						completedItems: analysis.completedItems,
						failedItems: analysis.failedItems,
						itemStatuses: itemStatusOverrides,
					}}
					onComplete={handleComplete}
					onError={handleError}
				/>
			) : (
				<AnalysisRunner
					analysisId={analysisId}
					repositoryId={analysis.repositoryId!}
					rubricId={analysis.rubricId}
					userId={currentUser._id}
					rubricItems={rubricItems}
					progressOverride={{
						totalItems: analysis.totalItems,
						completedItems: analysis.completedItems,
						failedItems: analysis.failedItems,
						itemStatuses: itemStatusOverrides,
					}}
					onComplete={handleComplete}
					onError={handleError}
				/>
			)}
		</div>
	);
}
