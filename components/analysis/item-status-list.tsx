"use client";

import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
	Clock01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type ItemStatus = "pending" | "processing" | "completed" | "failed";

interface ItemStatusInfo {
	id: string;
	name: string;
	status: ItemStatus;
}

interface ItemStatusListProps {
	items: ItemStatusInfo[];
	className?: string;
}

const statusConfig: Record<
	ItemStatus,
	{
		label: string;
		variant: "default" | "secondary" | "destructive" | "outline";
		icon: React.ReactNode;
	}
> = {
	pending: {
		label: "Pending",
		variant: "outline",
		icon: <HugeiconsIcon icon={Clock01Icon} className="size-3" />,
	},
	processing: {
		label: "Processing",
		variant: "secondary",
		icon: <Spinner className="size-3" />,
	},
	completed: {
		label: "Completed",
		variant: "default",
		icon: <HugeiconsIcon icon={CheckmarkCircle02Icon} className="size-3" />,
	},
	failed: {
		label: "Failed",
		variant: "destructive",
		icon: <HugeiconsIcon icon={Cancel01Icon} className="size-3" />,
	},
};

interface ItemRowProps {
	item: ItemStatusInfo;
}

function ItemRow({ item }: ItemRowProps) {
	const [isTransitioning, setIsTransitioning] = useState(false);
	const prevStatusRef = useRef<ItemStatus>(item.status);

	useEffect(() => {
		const prevStatus = prevStatusRef.current;
		const newStatus = item.status;

		// Trigger animation when status changes to completed or failed
		if (
			prevStatus !== newStatus &&
			(newStatus === "completed" || newStatus === "failed")
		) {
			setIsTransitioning(true);
			const timer = setTimeout(() => setIsTransitioning(false), 600);
			return () => clearTimeout(timer);
		}

		prevStatusRef.current = newStatus;
	}, [item.status]);

	const config = statusConfig[item.status];

	return (
		<div
			className={cn(
				"flex items-center justify-between rounded-lg border p-3 transition-all duration-300",
				item.status === "processing" && "border-primary/30 bg-primary/5",
				item.status === "completed" && "border-green-500/30 bg-green-500/5",
				item.status === "failed" && "border-destructive/30 bg-destructive/5",
				isTransitioning && "animate-pulse",
			)}
		>
			<span
				className={cn(
					"text-sm font-medium transition-colors duration-300",
					item.status === "completed" && "text-green-700 dark:text-green-400",
					item.status === "failed" && "text-destructive",
				)}
			>
				{item.name}
			</span>
			<Badge
				variant={config.variant}
				className={cn(
					"gap-1 transition-all duration-300",
					isTransitioning && "scale-110",
				)}
			>
				{config.icon}
				{config.label}
			</Badge>
		</div>
	);
}

export function ItemStatusList({ items, className }: ItemStatusListProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{items.map((item) => (
				<ItemRow key={item.id} item={item} />
			))}
		</div>
	);
}

export type { ItemStatus, ItemStatusInfo };
