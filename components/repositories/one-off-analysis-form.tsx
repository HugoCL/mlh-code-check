import { Alert01Icon, CheckmarkCircle01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { type ParsedGitHubUrl, parseGitHubUrl } from "@/lib/github-url";

interface OneOffData extends ParsedGitHubUrl {
	url: string;
}

interface OneOffAnalysisFormProps {
	onValidData: (data: OneOffData[]) => void;
	onInvalidData: () => void;
}

export function OneOffAnalysisForm({
	onValidData,
	onInvalidData,
}: OneOffAnalysisFormProps) {
	const [text, setText] = useState("");
	const [validationState, setValidationState] = useState<
		"idle" | "valid" | "partial" | "invalid"
	>("idle");
	const [validCount, setValidCount] = useState(0);
	const [invalidCount, setInvalidCount] = useState(0);

	const validateUrls = useCallback(
		(inputText: string) => {
			if (!inputText.trim()) {
				setValidationState("idle");
				setValidCount(0);
				setInvalidCount(0);
				onInvalidData();
				return;
			}

			const lines = inputText
				.split("\n")
				.map((line) => line.trim())
				.filter((line) => line.length > 0);

			const validData: OneOffData[] = [];
			let invalid = 0;

			for (const line of lines) {
				const result = parseGitHubUrl(line);
				if (result.success) {
					validData.push({
						...result.data,
						branch: result.data.branch || "main",
						url: line,
					});
				} else {
					invalid++;
				}
			}

			setValidCount(validData.length);
			setInvalidCount(invalid);

			if (validData.length > 0 && invalid === 0) {
				setValidationState("valid");
				onValidData(validData);
			} else if (validData.length > 0 && invalid > 0) {
				setValidationState("partial");
				onValidData(validData);
			} else {
				setValidationState("invalid");
				onInvalidData();
			}
		},
		[onValidData, onInvalidData],
	);

	// Validate on change with debounce
	useEffect(() => {
		const timer = setTimeout(() => {
			validateUrls(text);
		}, 500);

		return () => clearTimeout(timer);
	}, [text, validateUrls]);

	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<div className="flex justify-between">
					<Label htmlFor="github-urls">GitHub Repository URLs</Label>
					<span className="text-xs text-muted-foreground">
						One URL per line
					</span>
				</div>
				<div className="relative">
					<Textarea
						id="github-urls"
						placeholder="https://github.com/owner/repository&#10;https://github.com/owner/another-repo"
						value={text}
						onChange={(e) => setText(e.target.value)}
						className={`min-h-[120px] font-mono text-sm ${
							validationState === "invalid"
								? "border-destructive focus-visible:ring-destructive"
								: validationState === "valid"
									? "border-green-500 focus-visible:ring-green-500"
									: validationState === "partial"
										? "border-yellow-500 focus-visible:ring-yellow-500"
										: ""
						}`}
					/>
					{validationState !== "idle" && (
						<div className="absolute right-3 top-3">
							{validationState === "valid" && (
								<HugeiconsIcon
									icon={CheckmarkCircle01Icon}
									className="size-5 text-green-500"
								/>
							)}
							{validationState === "invalid" && (
								<HugeiconsIcon
									icon={Alert01Icon}
									className="size-5 text-destructive"
								/>
							)}
							{validationState === "partial" && (
								<HugeiconsIcon
									icon={Alert01Icon}
									className="size-5 text-yellow-500"
								/>
							)}
						</div>
					)}
				</div>

				{validationState !== "idle" && (
					<div className="flex gap-4 text-xs">
						<div
							className={
								validCount > 0 ? "text-green-600" : "text-muted-foreground"
							}
						>
							<span className="font-medium">{validCount}</span> valid
						</div>
						<div
							className={
								invalidCount > 0 ? "text-destructive" : "text-muted-foreground"
							}
						>
							<span className="font-medium">{invalidCount}</span> invalid
						</div>
					</div>
				)}

				<p className="text-xs text-muted-foreground">
					Supported formats: https://github.com/owner/repo,
					https://github.com/owner/repo/tree/branch
				</p>
			</div>
		</div>
	);
}
