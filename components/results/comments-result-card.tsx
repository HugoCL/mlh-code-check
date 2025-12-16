"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";

export interface CommentsResult {
	feedback: string;
}

interface CommentsResultCardProps {
	itemName: string;
	itemDescription: string;
	result: CommentsResult;
}

export function CommentsResultCard({
	itemName,
	itemDescription,
	result,
}: CommentsResultCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{itemName}</CardTitle>
				<CardDescription>{itemDescription}</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="prose prose-sm dark:prose-invert max-w-none">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{result.feedback}
					</ReactMarkdown>
				</div>
			</CardContent>
		</Card>
	);
}
