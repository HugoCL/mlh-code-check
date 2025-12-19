"use client";

import {
	Cancel01Icon,
	Copy01Icon,
	FileEditIcon,
	ViewIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
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
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function TemplatesPage() {
	const router = useRouter();
	const { isAuthenticated } = useConvexAuth();
	const [viewingTemplateId, setViewingTemplateId] =
		useState<Id<"rubrics"> | null>(null);
	const [isSyncing, setIsSyncing] = useState(false);
	const syncTemplates = useMutation(api.rubrics.syncSystemTemplates);
	const currentUser = useQuery(
		api.users.getCurrentUser,
		isAuthenticated ? {} : "skip",
	);
	const rubrics = useQuery(
		api.rubrics.listRubrics,
		isAuthenticated && currentUser ? { userId: currentUser._id } : "skip",
	);
	const duplicateTemplate = useMutation(api.rubrics.duplicateSystemTemplate);

	const systemTemplates = rubrics?.filter((r) => r.isSystemTemplate) ?? [];

	const handleDuplicate = async (templateId: Id<"rubrics">) => {
		if (!currentUser) return;
		const newRubricId = await duplicateTemplate({
			userId: currentUser._id,
			systemTemplateId: templateId,
		});
		router.push(`/dashboard/rubrics/${newRubricId}`);
	};

	const handleView = (templateId: Id<"rubrics">) => {
		setViewingTemplateId(templateId);
	};

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

	if (currentUser === undefined || rubrics === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (currentUser === null) {
		return (
			<div className="text-center py-12">
				<p className="text-muted-foreground">
					Please sign in to view templates.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-2xl font-bold">Rubric Templates</h1>
					<p className="text-muted-foreground">
						Browse pre-built evaluation templates. Duplicate a template to
						customize it for your needs.
					</p>
				</div>
				<Button onClick={handleSyncTemplates} disabled={isSyncing}>
					{isSyncing && <Spinner className="size-4" />}
					Sync Templates
				</Button>
			</div>

			{systemTemplates.length === 0 ? (
				<Empty>
					<EmptyHeader>
						<EmptyMedia>
							<HugeiconsIcon icon={FileEditIcon} className="size-12" />
						</EmptyMedia>
						<EmptyTitle>No templates available</EmptyTitle>
						<EmptyDescription>
							System templates will appear here when configured.
						</EmptyDescription>
					</EmptyHeader>
				</Empty>
			) : (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{systemTemplates.map((template) => (
						<TemplateCard
							key={template._id}
							template={template}
							onDuplicate={handleDuplicate}
							onView={handleView}
						/>
					))}
				</div>
			)}

			<TemplateViewDialog
				templateId={viewingTemplateId}
				onClose={() => setViewingTemplateId(null)}
				onDuplicate={handleDuplicate}
			/>
		</div>
	);
}

interface TemplateCardProps {
	template: {
		_id: Id<"rubrics">;
		name: string;
		description: string;
	};
	onDuplicate: (templateId: Id<"rubrics">) => void;
	onView: (templateId: Id<"rubrics">) => void;
}

function TemplateCard({ template, onDuplicate, onView }: TemplateCardProps) {
	const rubric = useQuery(api.rubrics.getRubric, { rubricId: template._id });

	return (
		<Card
			size="sm"
			className="cursor-pointer hover:border-primary/50 transition-colors"
			onClick={() => onView(template._id)}
		>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{template.name}
					<Badge variant="secondary">Template</Badge>
				</CardTitle>
				<CardAction className="flex gap-1">
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={(e) => {
							e.stopPropagation();
							onView(template._id);
						}}
						title="View template"
					>
						<HugeiconsIcon icon={ViewIcon} />
					</Button>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={(e) => {
							e.stopPropagation();
							onDuplicate(template._id);
						}}
						title="Duplicate template"
					>
						<HugeiconsIcon icon={Copy01Icon} />
					</Button>
				</CardAction>
				<CardDescription className="line-clamp-2">
					{template.description || "No description"}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="text-muted-foreground text-xs">
					{rubric?.items?.length ?? 0} evaluation criteria
				</div>
			</CardContent>
		</Card>
	);
}

interface TemplateViewDialogProps {
	templateId: Id<"rubrics"> | null;
	onClose: () => void;
	onDuplicate: (templateId: Id<"rubrics">) => void;
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
		if (templateId) {
			onDuplicate(templateId);
			onClose();
		}
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
											{item.evaluationType.replace("_", "/")}
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
					<Button onClick={handleDuplicate}>
						<HugeiconsIcon icon={Copy01Icon} data-icon="inline-start" />
						Duplicate & Customize
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
