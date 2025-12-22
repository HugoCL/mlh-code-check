"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { OneOffAnalysisForm } from "@/components/repositories/one-off-analysis-form";
import { RepositorySelector } from "@/components/repositories/repository-selector";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { ParsedGitHubUrl } from "@/lib/github-url";

// One-off analysis data type
interface OneOffData extends ParsedGitHubUrl {
	url: string;
}

export default function NewAnalysisPage() {
	const router = useRouter();
	const [analysisMode, setAnalysisMode] = useState<"connected" | "one-off">(
		"one-off",
	);
	const [selectedRepository, setSelectedRepository] = useState<string | null>(
		null,
	);
	const [oneOffData, setOneOffData] = useState<OneOffData[]>([]);
	const [selectedRubric, setSelectedRubric] = useState<string | null>(null);
	const [isStarting, setIsStarting] = useState(false);
	const { isAuthenticated } = useConvexAuth();

	const currentUser = useQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);
	const rubrics = useQuery(
		api.rubrics.listRubrics,
		isAuthenticated && currentUser ? { userId: currentUser._id } : "skip",
	);

	const createAnalysis = useMutation(api.analyses.createAnalysis);
	const createOneOffAnalysis = useMutation(api.analyses.createOneOffAnalysis);

	const handleValidData = useCallback((data: OneOffData[]) => {
		setOneOffData(data);
	}, []);

	const handleInvalidData = useCallback(() => {
		setOneOffData([]);
	}, []);

	const handleStartAnalysis = async () => {
		if (!selectedRubric) return;

		setIsStarting(true);
		try {
			if (analysisMode === "connected") {
				if (!selectedRepository) return;
				const analysisId = await createAnalysis({
					repositoryId: selectedRepository as Id<"repositories">,
					rubricId: selectedRubric as Id<"rubrics">,
				});
				router.push(`/dashboard/analyses/${analysisId}/progress`);
			} else {
				if (oneOffData.length === 0) return;
				
				// Create all analyses in parallel
				await Promise.all(
					oneOffData.map((data) =>
						createOneOffAnalysis({
							repositoryUrl: data.url,
							repositoryOwner: data.owner,
							repositoryName: data.repo,
							branch: data.branch || "main",
							rubricId: selectedRubric as Id<"rubrics">,
						})
					)
				);

				// Redirect to analyses list since we created multiple
				router.push("/dashboard/analyses");
			}
		} catch (error) {
			console.error("Failed to start analysis:", error);
			setIsStarting(false);
		}
	};

	const canStartConnected =
		analysisMode === "connected" &&
		selectedRepository &&
		selectedRubric &&
		!isStarting;
	const canStartOneOff =
		analysisMode === "one-off" && oneOffData.length > 0 && selectedRubric && !isStarting;
	const canStart = canStartConnected || canStartOneOff;

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button
					variant="ghost"
					size="icon-sm"
					render={<Link href="/dashboard" />}
				>
					<HugeiconsIcon icon={ArrowLeft01Icon} />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">New Analysis</h1>
					<p className="text-muted-foreground">
						Select a repository and rubric to start a code review analysis.
					</p>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				{/* Repository Selection */}
				<Card>
					<CardHeader>
						<CardTitle>1. Select Repository</CardTitle>
						<CardDescription>
							Choose a connected repository or analyze a public repository by
							URL.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs
							value={analysisMode}
							onValueChange={(v) =>
								setAnalysisMode(v as "connected" | "one-off")
							}
						>
							<TabsList className="grid w-full grid-cols-2">
								<TabsTrigger value="one-off">Public URL</TabsTrigger>
								<TabsTrigger value="connected">Connected Repos</TabsTrigger>
							</TabsList>
							<TabsContent value="connected" className="mt-4">
								<RepositorySelector
									value={selectedRepository ?? undefined}
									onValueChange={setSelectedRepository}
								/>
							</TabsContent>
							<TabsContent value="one-off" className="mt-4">
								<OneOffAnalysisForm
									onValidData={handleValidData}
									onInvalidData={handleInvalidData}
								/>
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>

				{/* Rubric Selection */}
				<Card>
					<CardHeader>
						<CardTitle>2. Select Rubric</CardTitle>
						<CardDescription>
							Choose the evaluation rubric to use for the analysis.
						</CardDescription>
					</CardHeader>
					<CardContent>
						{rubrics === undefined ? (
							<div className="flex items-center justify-center py-8">
								<Spinner className="size-6" />
							</div>
						) : rubrics.length === 0 ? (
							<div className="text-center py-8">
								<p className="text-sm text-muted-foreground mb-4">
									No rubrics available. Create a rubric first.
								</p>
								<Button
									variant="outline"
									render={<Link href="/dashboard/rubrics" />}
								>
									Manage Rubrics
								</Button>
							</div>
						) : (
							<div className="space-y-4">
								<Select
									value={selectedRubric ?? "none"}
									onValueChange={(value) =>
										setSelectedRubric(value === "none" ? null : value)
									}
								>
									<SelectTrigger className="w-full">
										<SelectValue>
											{selectedRubric
												? (rubrics.find((r) => r._id === selectedRubric)
														?.name ?? "Select a rubric")
												: "Select a rubric"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent className="w-(--radix-select-trigger-width) min-w-[300px]">
										{rubrics.map((rubric) => (
											<SelectItem key={rubric._id} value={rubric._id}>
												<div className="flex items-center gap-2">
													<span className="truncate">{rubric.name}</span>
													{rubric.isSystemTemplate && (
														<Badge
															variant="secondary"
															className="text-xs shrink-0"
														>
															Template
														</Badge>
													)}
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>

								{selectedRubric && (
									<RubricPreview rubricId={selectedRubric as Id<"rubrics">} />
								)}
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Start Analysis Button */}
			<div className="flex justify-end">
				<Button size="lg" onClick={handleStartAnalysis} disabled={!canStart}>
					{isStarting ? (
						<>
							<Spinner className="size-4" />
							Starting Analysis...
						</>
					) : (
						<>
							Start Analysis
							<HugeiconsIcon icon={ArrowRight01Icon} data-icon="inline-end" />
						</>
					)}
				</Button>
			</div>
		</div>
	);
}

function RubricPreview({ rubricId }: { rubricId: Id<"rubrics"> }) {
	const rubric = useQuery(api.rubrics.getRubric, { rubricId });
	const evaluationTypeLabels: Record<string, string> = {
		yes_no: "Yes/No",
		range: "Range",
		comments: "Comments",
		code_examples: "Code Examples",
		options: "Options",
	};

	if (!rubric) {
		return (
			<div className="flex items-center justify-center py-4">
				<Spinner className="size-4" />
			</div>
		);
	}

	return (
		<div className="rounded-lg border p-4 space-y-3">
			<div>
				<h4 className="font-medium">{rubric.name}</h4>
				<p className="text-sm text-muted-foreground">{rubric.description}</p>
			</div>
			<div className="text-sm">
				<span className="text-muted-foreground">Items: </span>
				<span className="font-medium">{rubric.items?.length ?? 0}</span>
			</div>
			{rubric.items && rubric.items.length > 0 && (
				<div className="space-y-1">
					<p className="text-xs text-muted-foreground">Evaluation criteria:</p>
					<ul className="text-xs space-y-1">
						{rubric.items.slice(0, 5).map((item) => (
							<li key={item._id} className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-primary" />
								<span className="truncate">{item.name}</span>
								<Badge variant="outline" className="text-[10px] px-1">
									{evaluationTypeLabels[item.evaluationType] ??
										item.evaluationType}
								</Badge>
							</li>
						))}
						{rubric.items.length > 5 && (
							<li className="text-muted-foreground">
								+{rubric.items.length - 5} more items
							</li>
						)}
					</ul>
				</div>
			)}
		</div>
	);
}
