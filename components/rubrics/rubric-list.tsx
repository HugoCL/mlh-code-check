"use client";

import {
	Add01Icon,
	Copy01Icon,
	Delete02Icon,
	Edit02Icon,
	FileEditIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useQuery } from "convex/react";
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
	const rubrics = useQuery(api.rubrics.listRubrics, { userId });

	if (rubrics === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	if (rubrics.length === 0) {
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
					<h2 className="text-lg font-semibold">System Templates</h2>
					<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{systemTemplates.map((rubric) => (
							<Card key={rubric._id} size="sm">
								<CardHeader>
									<CardTitle className="flex items-center gap-2">
										{rubric.name}
										<Badge variant="secondary">Template</Badge>
									</CardTitle>
									{onDuplicate && (
										<CardAction>
											<Button
												variant="ghost"
												size="icon-sm"
												onClick={() => onDuplicate(rubric._id)}
												title="Duplicate template"
											>
												<HugeiconsIcon icon={Copy01Icon} />
											</Button>
										</CardAction>
									)}
									<CardDescription className="line-clamp-2">
										{rubric.description || "No description"}
									</CardDescription>
								</CardHeader>
							</Card>
						))}
					</div>
				</>
			)}
		</div>
	);
}
