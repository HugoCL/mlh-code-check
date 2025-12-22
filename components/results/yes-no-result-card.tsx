"use client";

import {
	Cancel01Icon,
	CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
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
				<div className="text-sm">
					<p className="font-medium text-foreground mb-1">Justification</p>
					<div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{result.justification}
						</ReactMarkdown>
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
