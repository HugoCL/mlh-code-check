"use client";

import { File01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { constructGitHubFileUrl } from "@/lib/github-url";

export interface CodeExample {
	filePath: string;
	lineStart: number;
	lineEnd: number;
	code: string;
	explanation: string;
}

export interface CodeExamplesResult {
	examples: CodeExample[];
}

interface CodeExamplesResultCardProps {
	itemName: string;
	itemDescription: string;
	result: CodeExamplesResult;
	repository?: {
		owner: string;
		name: string;
		branch: string;
	};
}

function getLanguageFromPath(filePath: string): string {
	const extension = filePath.split(".").pop()?.toLowerCase() ?? "";
	const languageMap: Record<string, string> = {
		ts: "typescript",
		tsx: "tsx",
		js: "javascript",
		jsx: "jsx",
		py: "python",
		rb: "ruby",
		go: "go",
		rs: "rust",
		java: "java",
		kt: "kotlin",
		swift: "swift",
		cs: "csharp",
		cpp: "cpp",
		c: "c",
		h: "c",
		hpp: "cpp",
		css: "css",
		scss: "scss",
		html: "html",
		json: "json",
		yaml: "yaml",
		yml: "yaml",
		md: "markdown",
		sql: "sql",
		sh: "bash",
		bash: "bash",
		zsh: "bash",
	};
	return languageMap[extension] ?? "text";
}

export function CodeExamplesResultCard({
	itemName,
	itemDescription,
	result,
	repository,
}: CodeExamplesResultCardProps) {
	const hasRepository =
		!!repository?.owner && !!repository?.name && !!repository?.branch;

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>{itemName}</CardTitle>
					<Badge variant="secondary">
						{result.examples.length} example
						{result.examples.length !== 1 ? "s" : ""}
					</Badge>
				</div>
				<CardDescription>{itemDescription}</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{result.examples.map((example, index) => (
					<div
						key={`${example.filePath}-${example.lineStart}-${example.lineEnd}-${index}`}
						className="space-y-2"
					>
						<div className="flex items-center gap-2 text-sm">
							<HugeiconsIcon
								icon={File01Icon}
								className="size-4 text-muted-foreground"
							/>
							{hasRepository ? (
								<a
									href={constructGitHubFileUrl({
										owner: repository!.owner,
										repo: repository!.name,
										branch: repository!.branch,
										filePath: example.filePath,
										lineStart: example.lineStart,
										lineEnd: example.lineEnd,
									})}
									target="_blank"
									rel="noreferrer"
									className="font-mono text-muted-foreground hover:text-foreground hover:underline"
								>
									{example.filePath}
								</a>
							) : (
								<span className="font-mono text-muted-foreground">
									{example.filePath}
								</span>
							)}
							<Badge variant="outline" className="text-xs">
								L{example.lineStart}-{example.lineEnd}
							</Badge>
						</div>
						<div className="rounded-lg overflow-hidden border">
							<SyntaxHighlighter
								language={getLanguageFromPath(example.filePath)}
								style={oneDark}
								showLineNumbers
								startingLineNumber={example.lineStart}
								customStyle={{
									margin: 0,
									borderRadius: 0,
									fontSize: "0.875rem",
								}}
							>
								{example.code}
							</SyntaxHighlighter>
						</div>
						<p className="text-sm text-muted-foreground">
							{example.explanation}
						</p>
						{index < result.examples.length - 1 && (
							<div className="border-t my-4" />
						)}
					</div>
				))}
				{result.examples.length === 0 && (
					<p className="text-sm text-muted-foreground">
						No code examples found.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
