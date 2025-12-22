"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface RangeResult {
	value: number;
	min: number;
	max: number;
	rationale: string;
}

interface RangeResultCardProps {
	itemName: string;
	itemDescription: string;
	result: RangeResult;
}

function getScoreColor(value: number, min: number, max: number): string {
	const percentage = ((value - min) / (max - min)) * 100;
	if (percentage >= 80) return "text-green-600 dark:text-green-400";
	if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
	if (percentage >= 40) return "text-orange-600 dark:text-orange-400";
	return "text-red-600 dark:text-red-400";
}

function getProgressColor(value: number, min: number, max: number): string {
	const percentage = ((value - min) / (max - min)) * 100;
	if (percentage >= 80) return "bg-green-500";
	if (percentage >= 60) return "bg-yellow-500";
	if (percentage >= 40) return "bg-orange-500";
	return "bg-red-500";
}

export function RangeResultCard({
	itemName,
	itemDescription,
	result,
}: RangeResultCardProps) {
	const percentage =
		((result.value - result.min) / (result.max - result.min)) * 100;
	const scoreColor = getScoreColor(result.value, result.min, result.max);
	const progressColor = getProgressColor(result.value, result.min, result.max);

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>{itemName}</CardTitle>
					<Badge
						variant="outline"
						className={cn("text-base font-bold", scoreColor)}
					>
						{result.value} / {result.max}
					</Badge>
				</div>
				<CardDescription>{itemDescription}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="space-y-2">
					<div className="flex justify-between text-xs text-muted-foreground">
						<span>{result.min}</span>
						<span>{result.max}</span>
					</div>
					<div className="h-3 w-full rounded-full bg-muted overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								progressColor,
							)}
							style={{ width: `${percentage}%` }}
						/>
					</div>
				</div>
				<div className="text-sm">
					<p className="font-medium text-foreground mb-1">Rationale</p>
					<div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{result.rationale}
						</ReactMarkdown>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
