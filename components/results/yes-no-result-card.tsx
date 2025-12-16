"use client";

import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
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

export interface YesNoResult {
	value: boolean;
	justification: string;
}

interface YesNoResultCardProps {
	itemName: string;
	itemDescription: string;
	result: YesNoResult;
}

export function YesNoResultCard({
	itemName,
	itemDescription,
	result,
}: YesNoResultCardProps) {
	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>{itemName}</CardTitle>
					<Badge variant={result.value ? "default" : "destructive"}>
						<HugeiconsIcon
							icon={result.value ? CheckmarkCircle02Icon : Cancel01Icon}
							className="size-3"
						/>
						{result.value ? "Yes" : "No"}
					</Badge>
				</div>
				<CardDescription>{itemDescription}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-muted-foreground text-sm">
					<p className="font-medium text-foreground mb-1">Justification</p>
					<p>{result.justification}</p>
				</div>
			</CardContent>
		</Card>
	);
}
