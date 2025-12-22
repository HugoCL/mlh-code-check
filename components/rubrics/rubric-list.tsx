"use client";

import {
	Add01Icon,
	Cancel01Icon,
	Copy01Icon,
	Delete02Icon,
	Edit02Icon,
	FileEditIcon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardAction,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import {
	Empty,
	EmptyContent,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

interface RubricListProps {
	userId: Id<"users">;
	onCreateNew: () => void;
	onEdit: (rubricId: Id<"rubrics">) => void;
	onDelete: (rubricId: Id<"rubrics">) => void;
	onDuplicate?: (rubricId: Id<"rubrics">) => void;
}

export function RubricList({
	userId,
	onCreateNew,
	onEdit,
	onDelete,
	onDuplicate,
}: RubricListProps) {
	const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
	const [viewingTemplateId, setViewingTemplateId] =
		useState<Id<"rubrics"> | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);
	const syncTemplates = useMutation(api.rubrics.syncSystemTemplates);
	const rubrics = useQuery(
		api.rubrics.listRubrics,
		isAuthenticated ? { userId } : "skip",
	);

	// Only show loading spinner when auth is done and data is actually loading
	const isDataLoading =
		!isAuthLoading && isAuthenticated && rubrics === undefined;

	if (isDataLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (!rubrics || rubrics.length === 0) {
		return (
			<Empty>
				<EmptyHeader>
					<EmptyMedia>
						<HugeiconsIcon icon={FileEditIcon} className="size-12" />
					</EmptyMedia>
					<EmptyTitle>No rubrics yet</EmptyTitle>
					<EmptyDescription>
						Create your first rubric to start evaluating code repositories.
					</EmptyDescription>
				</EmptyHeader>
				<EmptyContent>
					<Button onClick={onCreateNew}>
						<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
						Create Rubric
					</Button>
				</EmptyContent>
			</Empty>
		);
	}

	const userRubrics = rubrics.filter((r) => !r.isSystemTemplate);
	const systemTemplates = rubrics.filter((r) => r.isSystemTemplate);

	const handleSyncTemplates = async () => {
		if (isSyncing) return;
		setIsSyncing(true);
		try {
			await syncTemplates({});
			toast.success("System templates synced");
		} catch (error) {
			const message =
				error instanceof Error ? error.message : "Failed to sync templates";
			toast.error(message);
		} finally {
			setIsSyncing(false);
		}
	};

	return (
		<div className="space-y-8">
			<div className="flex items-center justify-between">
				<h2 className="text-lg font-semibold">Your Rubrics</h2>
				<Button onClick={onCreateNew}>
					<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
					Create Rubric
				</Button>
			</div>

			{userRubrics.length > 0 && (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{userRubrics.map((rubric) => (
						<Card key={rubric._id} size="sm">
							<CardHeader>
								<CardTitle>{rubric.name}</CardTitle>
								<CardAction className="flex gap-1">
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => onEdit(rubric._id)}
									>
										<HugeiconsIcon icon={Edit02Icon} />
									</Button>
									<Button
										variant="ghost"
										size="icon-sm"
										onClick={() => onDelete(rubric._id)}
									>
										<HugeiconsIcon icon={Delete02Icon} />
									</Button>
								</CardAction>
								<CardDescription className="line-clamp-2">
									{rubric.description || "No description"}
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="text-muted-foreground text-xs">
									Created {new Date(rubric.createdAt).toLocaleDateString()}
								</div>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{systemTemplates.length > 0 && (
				<>
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold">System Templates</h2>
						<Button
							variant="outline"
							size="sm"
							onClick={handleSyncTemplates}
							disabled={isSyncing}
						>
							{isSyncing && <Spinner className="size-4" />}
							Sync Templates
						</Button>
					</div>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{systemTemplates.map((rubric) => (
							<Card key={rubric._id} size="sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{rubric.name}
										<Badge variant="secondary">Template</Badge>
									</CardTitle>
									<CardAction className="flex gap-1">
										<Button
											variant="ghost"
											size="icon-sm"
											onClick={() => setViewingTemplateId(rubric._id)}
											title="View template items"
										>
											<HugeiconsIcon icon={ViewIcon} />
										</Button>
										{onDuplicate && (
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => onDuplicate(rubric._id)}
												title="Duplicate template"
											>
												<HugeiconsIcon icon={Copy01Icon} />
											</Button>
										)}
									</CardAction>
									<CardDescription className="line-clamp-2">
										{rubric.description || "No description"}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</>
			)}

			<TemplateViewDialog
				templateId={viewingTemplateId}
				onClose={() => setViewingTemplateId(null)}
				onDuplicate={onDuplicate}
			/>
		</div>
	);
}

interface TemplateViewDialogProps {
	templateId: Id<"rubrics"> | null;
	onClose: () => void;
	onDuplicate?: (templateId: Id<"rubrics">) => void;
}

function TemplateViewDialog({
	templateId,
	onClose,
	onDuplicate,
}: TemplateViewDialogProps) {
	const rubric = useQuery(
		api.rubrics.getRubric,
		templateId ? { rubricId: templateId } : "skip",
	);

	const handleDuplicate = () => {
		if (templateId && onDuplicate) {
			onDuplicate(templateId);
			onClose();
		}
	};

	const evaluationTypeLabels: Record<string, string> = {
		yes_no: "Yes/No",
		range: "Range",
		comments: "Comments",
		code_examples: "Code Examples",
		options: "Options",
	};

	return (
		<Dialog
			open={templateId !== null}
			onOpenChange={(open) => !open && onClose()}
		>
			<DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						{rubric?.name}
						<Badge variant="secondary">Template</Badge>
					</DialogTitle>
					<DialogDescription>{rubric?.description}</DialogDescription>
				</DialogHeader>

				{rubric === undefined ? (
					<div className="flex items-center justify-center py-8">
						<Spinner className="size-6" />
					</div>
				) : rubric === null ? (
					<div className="text-center py-8 text-muted-foreground">
						Template not found
					</div>
				) : (
					<div className="flex-1 overflow-y-auto space-y-4 pr-2">
						<div className="text-sm text-muted-foreground">
							{rubric.items?.length ?? 0} evaluation criteria
						</div>

						<div className="space-y-3">
							{rubric.items?.map((item, index) => (
								<div key={item._id} className="rounded-lg border p-4 space-y-2">
									<div className="flex items-start justify-between gap-2">
										<div className="flex items-center gap-2">
											<span className="text-muted-foreground text-sm">
												{index + 1}.
											</span>
											<span className="font-medium">{item.name}</span>
										</div>
										<Badge variant="outline" className="shrink-0">
											{evaluationTypeLabels[item.evaluationType] ??
												item.evaluationType}
										</Badge>
									</div>
									<p className="text-sm text-muted-foreground">
										{item.description}
									</p>
									{item.evaluationType === "range" && item.config && (
										<div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
											<span className="font-medium">Range:</span>{" "}
											{item.config.minValue ?? 0} - {item.config.maxValue ?? 10}
											{item.config.rangeGuidance && (
												<div className="mt-1 whitespace-pre-line">
													<span className="font-medium">Guidance:</span>{" "}
													{item.config.rangeGuidance}
												</div>
											)}
										</div>
									)}
									{item.evaluationType === "yes_no" &&
										item.config?.requireJustification && (
											<div className="text-xs text-muted-foreground">
												Requires justification
											</div>
										)}
									{item.evaluationType === "code_examples" &&
										item.config?.maxExamples && (
											<div className="text-xs text-muted-foreground">
												Max examples: {item.config.maxExamples}
											</div>
										)}
									{item.evaluationType === "options" &&
										item.config?.options && (
											<div className="text-xs text-muted-foreground">
												Options: {item.config.options.slice(0, 4).join(", ")}
												{item.config.options.length > 4
													? ` +${item.config.options.length - 4} more`
													: ""}
												{item.config.allowMultiple ? " (multi-select)" : ""}
												{item.config.maxSelections
													? `, max ${item.config.maxSelections}`
													: ""}
											</div>
										)}
								</div>
							))}
						</div>
					</div>
				)}

				<div className="flex justify-end gap-2 pt-4 border-t">
					<DialogClose render={<Button variant="outline" />}>
						<HugeiconsIcon icon={Cancel01Icon} data-icon="inline-start" />
						Close
					</DialogClose>
					{onDuplicate && (
						<Button onClick={handleDuplicate}>
							<HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
							Duplicate & Customize
						</Button>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
