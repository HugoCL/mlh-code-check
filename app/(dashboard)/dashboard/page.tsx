"use client";

import {
	Add01Icon,
	AnalyticsUpIcon,
	ArrowRight01Icon,
	FileEditIcon,
	GitBranchIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisCard } from "@/components/history/analysis-card";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";

export default function DashboardPage() {
	const router = useRouter();
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const analyses = useQuery(
		api.analyses.listAnalyses,
		isAuthenticated ? { limit: 6 } : "skip",
	);

	// Treat as "no data" when auth is still loading to avoid showing spinners
	const isDataLoading =
		!isAuthLoading && isAuthenticated && analyses === undefined;

	const handleSelectAnalysis = (analysisId: string) => {
		router.push(`/dashboard/analyses/${analysisId}`);
	};

	const handleStartNewAnalysis = () => {
		router.push("/dashboard/analyses/new");
	};

	return (
		<div className="space-y-8">
			<div>
				<h1 className="text-2xl font-bold">Dashboard</h1>
				<p className="text-muted-foreground">
					Welcome back! Here's an overview of your code review activity.
				</p>
			</div>

			{/* Quick Actions */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card
					size="sm"
					className="hover:ring-2 hover:ring-primary/20 transition-all"
				>
					<Link href="/dashboard/analyses/new" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<HugeiconsIcon icon={Add01Icon} className="size-4" />
								</div>
								New Analysis
							</CardTitle>
							<CardDescription>
								Start a new code review analysis on a repository
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>

				<Card
					size="sm"
					className="hover:ring-2 hover:ring-primary/20 transition-all"
				>
					<Link href="/dashboard/rubrics" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<HugeiconsIcon icon={FileEditIcon} className="size-4" />
								</div>
								Manage Rubrics
							</CardTitle>
							<CardDescription>
								Create and edit evaluation rubrics for your analyses
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>

				<Card
					size="sm"
					className="hover:ring-2 hover:ring-primary/20 transition-all"
				>
					<Link href="/dashboard/repositories" className="block">
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<HugeiconsIcon icon={GitBranchIcon} className="size-4" />
								</div>
								Repositories
							</CardTitle>
							<CardDescription>
								Connect and manage your GitHub repositories
							</CardDescription>
						</CardHeader>
					</Link>
				</Card>
			</div>

			{/* Recent Analyses */}
			<div className="space-y-4">
				<div className="flex items-center justify-between">
					<h2 className="text-lg font-semibold">Recent Analyses</h2>
					<Button
						variant="ghost"
						size="sm"
						render={<Link href="/dashboard/analyses" />}
					>
						View All
						<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
					</Button>
				</div>

				{isDataLoading ? (
					<div className="flex items-center justify-center py-12">
						<Spinner className="size-8" />
					</div>
				) : !analyses || analyses.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyMedia>
								<HugeiconsIcon icon={AnalyticsUpIcon} className="size-12" />
							</EmptyMedia>
							<EmptyTitle>No analyses yet</EmptyTitle>
							<EmptyDescription>
								Run your first code analysis to see results here.
							</EmptyDescription>
						</EmptyHeader>
						<EmptyContent>
							<Button onClick={handleStartNewAnalysis}>
								<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
								Start Analysis
							</Button>
						</EmptyContent>
					</Empty>
				) : (
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{analyses.map((analysis) => (
							<AnalysisCard
								key={analysis._id}
								analysis={analysis}
								onClick={handleSelectAnalysis}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
}
