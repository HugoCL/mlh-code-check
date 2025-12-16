"use client";

import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
	CheckmarkCircle02Icon,
	Cancel01Icon,
	Clock01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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

export function ItemStatusList({ items, className }: ItemStatusListProps) {
	return (
		<div className={cn("space-y-2", className)}>
			{items.map((item) => {
				const config = statusConfig[item.status];
				return (
					<div
						key={item.id}
						className="flex items-center justify-between rounded-lg border p-3"
					>
						<span className="text-sm font-medium">{item.name}</span>
						<Badge variant={config.variant} className="gap-1">
							{config.icon}
							{config.label}
						</Badge>
					</div>
				);
			})}
		</div>
	);
}

export type { ItemStatus, ItemStatusInfo };
