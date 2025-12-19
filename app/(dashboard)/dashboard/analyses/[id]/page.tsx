"use client";

import { ArrowLeft01Icon, Loading03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { ResultsView } from "@/components/results/results-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function AnalysisResultsPage() {
	const params = useParams();
	const router = useRouter();
	const analysisId = params.id as string;
	const { isAuthenticated } = useConvexAuth();

	const analysis = useQuery(
		api.analyses.getAnalysisWithResults,
		isAuthenticated ? { analysisId: analysisId as Id<"analyses"> } : "skip",
	);

	// Redirect to progress page if analysis is still running
	useEffect(() => {
		if (analysis?.status === "pending" || analysis?.status === "running") {
			router.replace(`/dashboard/analyses/${analysisId}/progress`);
		}
	}, [analysis?.status, analysisId, router]);

	if (analysis === undefined) {
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
						render={<Link href="/dashboard/analyses" />}
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

	// Show loading state for pending/running analyses
	if (analysis.status === "pending" || analysis.status === "running") {
		const inProgressRepoName =
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
						render={<Link href="/dashboard/analyses" />}
					>
						<HugeiconsIcon icon={ArrowLeft01Icon} />
					</Button>
					<div className="flex-1">
						<h1 className="text-2xl font-bold">Analysis in Progress</h1>
						<p className="text-muted-foreground">{inProgressRepoName}</p>
					</div>
					<Badge variant="secondary">
						<HugeiconsIcon
							icon={Loading03Icon}
							className="size-3 animate-spin"
						/>
						{analysis.status === "pending" ? "Pending" : "Running"}
					</Badge>
				</div>
				<div className="flex items-center justify-center py-12">
					<div className="text-center space-y-4">
						<Spinner className="size-8 mx-auto" />
						<p className="text-muted-foreground">
							Redirecting to progress page...
						</p>
					</div>
				</div>
			</div>
		);
	}

	// Transform analysis data for ResultsView
	const repositoryOwner =
		analysis.repository?.owner ?? analysis.repositoryOwner ?? "";
	const repositoryName =
		analysis.repository?.name ?? analysis.repositoryName ?? "";
	const repositoryFullName =
		analysis.repository?.fullName ??
		(repositoryOwner && repositoryName
			? `${repositoryOwner}/${repositoryName}`
			: undefined);

	const analysisForView = {
		_id: analysis._id,
		status: analysis.status,
		totalItems: analysis.totalItems,
		completedItems: analysis.completedItems,
		failedItems: analysis.failedItems,
		createdAt: analysis.createdAt,
		completedAt: analysis.completedAt,
		repository:
			repositoryFullName && repositoryOwner && repositoryName
				? {
						fullName: repositoryFullName,
						owner: repositoryOwner,
						name: repositoryName,
						branch: analysis.branch,
					}
				: undefined,
		rubric: analysis.rubric ? { name: analysis.rubric.name } : undefined,
		results: analysis.results.map((result) => ({
			_id: result._id,
			rubricItemId: result.rubricItemId,
			status: result.status,
			result: result.result,
			error: result.error,
			rubricItem: result.rubricItem
				? {
						_id: result.rubricItem._id,
						name: result.rubricItem.name,
						description: result.rubricItem.description,
						evaluationType: result.rubricItem.evaluationType,
						config: result.rubricItem.config,
					}
				: undefined,
		})),
	};

	// Get repository display name - use linked repository or fall back to stored owner/name
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
					render={<Link href="/dashboard/analyses" />}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Analysis Results</h1>
					<p className="text-muted-foreground">
						{repositoryDisplayName} •{" "}
						{analysis.rubric?.name ?? "Unknown Rubric"}
					</p>
				</div>
			</div>

			<ResultsView analysis={analysisForView} />
		</div>
	);
}
