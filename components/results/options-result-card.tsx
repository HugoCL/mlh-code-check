"use client";

import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export interface OptionsResult {
	selections: string[];
}

interface OptionsResultCardProps {
	itemName: string;
	itemDescription: string;
	result: OptionsResult;
}

export function OptionsResultCard({
	itemName,
	itemDescription,
	result,
}: OptionsResultCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{itemName}</CardTitle>
				<CardDescription>{itemDescription}</CardDescription>
			</CardHeader>
			<CardContent>
				{result.selections.length > 0 ? (
					<div className="flex flex-wrap gap-2">
					{result.selections.map((selection, index) => (
						<Badge key={`${selection}-${index}`} variant="secondary">
							{selection}
						</Badge>
					))}
					</div>
				) : (
					<p className="text-sm text-muted-foreground">
						No selections returned.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
