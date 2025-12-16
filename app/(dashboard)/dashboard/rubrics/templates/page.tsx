"use client";

import { Copy01Icon, FileEditIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
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
	const currentUser = useQuery(api.users.getCurrentUser);
	const rubrics = useQuery(
		api.rubrics.listRubrics,
		currentUser ? { userId: currentUser._id } : "skip",
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
			<div>
				<h1 className="text-2xl font-bold">Rubric Templates</h1>
				<p className="text-muted-foreground">
					Browse pre-built evaluation templates. Duplicate a template to
					customize it for your needs.
				</p>
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
						/>
					))}
				</div>
			)}
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
}

function TemplateCard({ template, onDuplicate }: TemplateCardProps) {
	const rubric = useQuery(api.rubrics.getRubric, { rubricId: template._id });

	return (
		<Card size="sm">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					{template.name}
					<Badge variant="secondary">Template</Badge>
				</CardTitle>
				<CardAction>
					<Button
						variant="ghost"
						size="icon-sm"
						onClick={() => onDuplicate(template._id)}
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
