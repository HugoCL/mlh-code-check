"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnalysisRunner } from "@/components/analysis/analysis-runner";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function AnalysisProgressPage() {
	const params = useParams();
	const router = useRouter();
	const analysisId = params.id as string;

	const analysis = useQuery(api.analyses.getAnalysis, {
		analysisId: analysisId as Id<"analyses">,
	});
	const currentUser = useQuery(api.users.getCurrentUser);
	const rubric = useQuery(
		api.rubrics.getRubric,
		analysis ? { rubricId: analysis.rubricId } : "skip",
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
						{analysis.repository?.fullName ?? "Unknown Repository"} •{" "}
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

			<AnalysisRunner
				repositoryId={analysis.repositoryId}
				rubricId={analysis.rubricId}
				userId={currentUser._id}
				rubricItems={rubricItems}
				onComplete={handleComplete}
				onError={handleError}
			/>
		</div>
	);
}
