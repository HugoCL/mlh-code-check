"use client";

import { AnalyticsUpIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useQuery } from "convex/react";
import { useState } from "react";
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
import type { Id } from "@/convex/_generated/dataModel";
import { AnalysisCard } from "./analysis-card";
import { FilterPanel, type FilterValues } from "./filter-panel";

interface AnalysisHistoryProps {
	onSelectAnalysis?: (analysisId: Id<"analyses">) => void;
	onStartNewAnalysis?: () => void;
	limit?: number;
	showFilters?: boolean;
}

export function AnalysisHistory({
	onSelectAnalysis,
	onStartNewAnalysis,
	limit = 20,
	showFilters = true,
}: AnalysisHistoryProps) {
	const [filters, setFilters] = useState<FilterValues>({});
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();

	const analyses = useQuery(
		api.analyses.listAnalyses,
		isAuthenticated
			? {
					limit,
					repositoryId: filters.repositoryId,
					rubricId: filters.rubricId,
					status: filters.status,
					dateFrom: filters.dateFrom,
					dateTo: filters.dateTo,
				}
			: "skip",
	);

	// Only show loading spinner when auth is done and data is actually loading
	const isDataLoading =
		!isAuthLoading && isAuthenticated && analyses === undefined;

	if (isDataLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	const hasActiveFilters =
		filters.repositoryId ||
		filters.rubricId ||
		filters.status ||
		filters.dateFrom ||
		filters.dateTo;

	if (!analyses || (analyses.length === 0 && !hasActiveFilters)) {
		return (
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
				{onStartNewAnalysis && (
					<EmptyContent>
						<button
							type="button"
							onClick={onStartNewAnalysis}
							className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Start Analysis
						</button>
					</EmptyContent>
				)}
			</Empty>
		);
	}

	return (
		<div className="space-y-4">
			{showFilters && (
				<FilterPanel filters={filters} onFiltersChange={setFilters} />
			)}

			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Analysis History</h2>
				<span className="text-sm text-muted-foreground">
					{analyses.length} {analyses.length === 1 ? "analysis" : "analyses"}
					{hasActiveFilters && " (filtered)"}
				</span>
			</div>

			{analyses.length === 0 && hasActiveFilters ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia>
							<HugeiconsIcon icon={AnalyticsUpIcon} className="size-12" />
						</EmptyMedia>
						<EmptyTitle>No matching analyses</EmptyTitle>
						<EmptyDescription>
							Try adjusting your filters to see more results.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{analyses.map((analysis) => (
						<AnalysisCard
							key={analysis._id}
							analysis={analysis}
							onClick={onSelectAnalysis}
						/>
					))}
				</div>
			)}
		</div>
	);
}
