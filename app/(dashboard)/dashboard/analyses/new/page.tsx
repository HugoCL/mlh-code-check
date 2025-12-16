"use client";

import { ArrowLeft01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function NewAnalysisPage() {
	const router = useRouter();
	const [selectedRepository, setSelectedRepository] = useState<string | null>(
		null,
	);
	const [selectedRubric, setSelectedRubric] = useState<string | null>(null);
	const [isStarting, setIsStarting] = useState(false);

	const currentUser = useQuery(api.users.getCurrentUser);
	const rubrics = useQuery(
		api.rubrics.listRubrics,
		currentUser ? { userId: currentUser._id } : "skip",
	);

	const createAnalysis = useMutation(api.analyses.createAnalysis);

	const handleStartAnalysis = async () => {
		if (!selectedRepository || !selectedRubric) return;

		setIsStarting(true);
		try {
			const analysisId = await createAnalysis({
				repositoryId: selectedRepository as Id<"repositories">,
				rubricId: selectedRubric as Id<"rubrics">,
			});
			router.push(`/dashboard/analyses/${analysisId}/progress`);
		} catch (error) {
			console.error("Failed to start analysis:", error);
			setIsStarting(false);
		}
	};

	const canStart = selectedRepository && selectedRubric && !isStarting;

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
							Choose the GitHub repository you want to analyze.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<RepositorySelector
							value={selectedRepository ?? undefined}
							onValueChange={setSelectedRepository}
						/>
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
									<SelectTrigger>
										<SelectValue>
											{selectedRubric
												? (rubrics.find((r) => r._id === selectedRubric)
														?.name ?? "Select a rubric")
												: "Select a rubric"}
										</SelectValue>
									</SelectTrigger>
									<SelectContent>
										{rubrics.map((rubric) => (
											<SelectItem key={rubric._id} value={rubric._id}>
												<div className="flex items-center gap-2">
													<span>{rubric.name}</span>
													{rubric.isSystemTemplate && (
														<Badge variant="secondary" className="text-xs">
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
									{item.evaluationType.replace("_", "/")}
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
