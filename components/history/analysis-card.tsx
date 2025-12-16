"use client";

import {
	AlertCircleIcon,
	CheckmarkCircle02Icon,
	Clock01Icon,
	Loading03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Id } from "@/convex/_generated/dataModel";

type AnalysisStatus = "pending" | "running" | "completed" | "failed";

interface AnalysisCardProps {
	analysis: {
		_id: Id<"analyses">;
		status: AnalysisStatus;
		totalItems: number;
		completedItems: number;
		failedItems: number;
		createdAt: number;
		completedAt?: number;
		repositoryUrl?: string; // For one-off analyses
		repositoryOwner?: string;
		repositoryName?: string;
		repository?: {
			fullName: string;
		} | null;
		rubric?: {
			name: string;
		} | null;
	};
	onClick?: (analysisId: Id<"analyses">) => void;
}

const statusConfig: Record<
	AnalysisStatus,
	{
		icon: typeof CheckmarkCircle02Icon;
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
	}
> = {
	pending: { icon: Clock01Icon, label: "Pending", variant: "secondary" },
	running: { icon: Loading03Icon, label: "Running", variant: "outline" },
	completed: {
		icon: CheckmarkCircle02Icon,
		label: "Completed",
		variant: "default",
	},
	failed: { icon: AlertCircleIcon, label: "Failed", variant: "destructive" },
};

export function AnalysisCard({ analysis, onClick }: AnalysisCardProps) {
	const config = statusConfig[analysis.status];
	const StatusIcon = config.icon;

	const formatDate = (timestamp: number) => {
		return new Date(timestamp).toLocaleDateString(undefined, {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Determine repository display name
	const isOneOff = !analysis.repository && analysis.repositoryUrl;
	const repositoryDisplayName = analysis.repository?.fullName
		? analysis.repository.fullName
		: analysis.repositoryOwner && analysis.repositoryName
			? `${analysis.repositoryOwner}/${analysis.repositoryName}`
			: "Unknown Repository";

	return (
		<Card
			size="sm"
			className={
				onClick
					? "cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
					: ""
			}
			onClick={() => onClick?.(analysis._id)}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{repositoryDisplayName}
					{isOneOff && (
						<Badge variant="outline" className="text-xs">
							One-off
						</Badge>
					)}
				</CardTitle>
				<Badge variant={config.variant} className="w-fit">
					<HugeiconsIcon icon={StatusIcon} data-icon="inline-start" />
					{config.label}
				</Badge>
				<CardDescription className="line-clamp-1">
					Rubric: {analysis.rubric?.name || "Unknown Rubric"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="flex flex-col gap-2 text-xs text-muted-foreground">
					<div className="flex justify-between">
						<span>Progress</span>
						<span>
							{analysis.completedItems + analysis.failedItems} /{" "}
							{analysis.totalItems} items
						</span>
					</div>
					{analysis.failedItems > 0 && (
						<div className="flex justify-between text-destructive">
							<span>Failed</span>
							<span>{analysis.failedItems} items</span>
						</div>
					)}
					<div className="flex justify-between">
						<span>Created</span>
						<span>{formatDate(analysis.createdAt)}</span>
					</div>
					{analysis.completedAt && (
						<div className="flex justify-between">
							<span>Completed</span>
							<span>{formatDate(analysis.completedAt)}</span>
						</div>
					)}
				</div>
			</CardContent>
		</Card>
	);
}
