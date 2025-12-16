"use client";

import { Alert01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseGitHubUrl, type ParsedGitHubUrl } from "@/lib/github-url";

interface OneOffAnalysisFormProps {
	onValidUrl: (data: ParsedGitHubUrl & { url: string }) => void;
	onInvalidUrl: () => void;
}

export function OneOffAnalysisForm({
	onValidUrl,
	onInvalidUrl,
}: OneOffAnalysisFormProps) {
	const [url, setUrl] = useState("");
	const [branch, setBranch] = useState("");
	const [validationState, setValidationState] = useState<
		"idle" | "valid" | "invalid"
	>("idle");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [parsedData, setParsedData] = useState<ParsedGitHubUrl | null>(null);

	const validateUrl = useCallback((inputUrl: string) => {
		if (!inputUrl.trim()) {
			setValidationState("idle");
			setErrorMessage(null);
			setParsedData(null);
			return null;
		}

		const result = parseGitHubUrl(inputUrl);

		if (result.success) {
			setValidationState("valid");
			setErrorMessage(null);
			setParsedData(result.data);
			return result.data;
		}
		setValidationState("invalid");
		setErrorMessage(result.error);
		setParsedData(null);
		return null;
	}, []);

	// Validate URL on change with debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			const data = validateUrl(url);
			if (data) {
				// Use branch from URL if present, otherwise use custom branch or default to "main"
				const effectiveBranch = data.branch || branch || "main";
				onValidUrl({
					...data,
					branch: effectiveBranch,
					url,
				});
			} else {
				onInvalidUrl();
			}
		}, 300);

		return () => clearTimeout(timer);
	}, [url, branch, validateUrl, onValidUrl, onInvalidUrl]);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="github-url">GitHub Repository URL</Label>
				<div className="relative">
					<Input
						id="github-url"
						type="url"
						placeholder="https://github.com/owner/repository"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						className={
							validationState === "invalid"
								? "border-destructive pr-10"
								: validationState === "valid"
									? "border-green-500 pr-10"
									: ""
						}
					/>
					{validationState === "valid" && (
						<HugeiconsIcon
							icon={CheckmarkCircle01Icon}
							className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-green-500"
						/>
					)}
					{validationState === "invalid" && (
						<HugeiconsIcon
							icon={Alert01Icon}
							className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-destructive"
						/>
					)}
				</div>
				{errorMessage && (
					<p className="text-sm text-destructive">{errorMessage}</p>
				)}
				<p className="text-xs text-muted-foreground">
					Supported formats: https://github.com/owner/repo,
					https://github.com/owner/repo/tree/branch,
					git@github.com:owner/repo.git
				</p>
			</div>

			{validationState === "valid" && parsedData && (
				<>
					<div className="rounded-lg border bg-muted/50 p-3 space-y-2">
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Owner:</span>
							<span className="font-medium">{parsedData.owner}</span>
						</div>
						<div className="flex items-center gap-2 text-sm">
							<span className="text-muted-foreground">Repository:</span>
							<span className="font-medium">{parsedData.repo}</span>
						</div>
						{parsedData.branch && (
							<div className="flex items-center gap-2 text-sm">
								<span className="text-muted-foreground">
									Branch (from URL):
								</span>
								<span className="font-medium">{parsedData.branch}</span>
							</div>
						)}
					</div>

					{!parsedData.branch && (
						<div className="space-y-2">
							<Label htmlFor="branch">Branch (optional)</Label>
							<Input
								id="branch"
								type="text"
								placeholder="main"
								value={branch}
								onChange={(e) => setBranch(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Leave empty to use the repository's default branch (main/master)
							</p>
						</div>
					)}
				</>
			)}
		</div>
	);
}
