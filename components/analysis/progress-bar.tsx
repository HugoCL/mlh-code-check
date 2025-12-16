"use client";

import {
	Progress,
	ProgressLabel,
	ProgressValue,
} from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
	totalItems: number;
	completedItems: number;
	failedItems: number;
	className?: string;
}

export function ProgressBar({
	totalItems,
	completedItems,
	failedItems,
	className,
}: ProgressBarProps) {
	const processedItems = completedItems + failedItems;
	const percentage = totalItems > 0 ? (processedItems / totalItems) * 100 : 0;

	return (
		<Progress value={percentage} className={cn("w-full", className)}>
			<ProgressLabel>
				Progress: {processedItems} / {totalItems} items
			</ProgressLabel>
			<ProgressValue />
		</Progress>
	);
}
