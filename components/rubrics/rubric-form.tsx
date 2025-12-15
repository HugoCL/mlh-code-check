"use client";

import {
	Add01Icon,
	ArrowLeft02Icon,
	Delete02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Field,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { RubricItemForm } from "./rubric-item-form";

interface RubricFormProps {
	userId: Id<"users">;
	rubricId?: Id<"rubrics">;
	onBack: () => void;
	onSaved?: (rubricId: Id<"rubrics">) => void;
}

const rubricSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be at most 100 characters"),
	description: z
		.string()
		.max(500, "Description must be at most 500 characters"),
});

export function RubricForm({
	userId,
	rubricId,
	onBack,
	onSaved,
}: RubricFormProps) {
	const isEditing = !!rubricId;
	const existingRubric = useQuery(
		api.rubrics.getRubric,
		rubricId ? { rubricId } : "skip",
	);

	const createRubric = useMutation(api.rubrics.createRubric);
	const updateRubric = useMutation(api.rubrics.updateRubric);
	const addRubricItem = useMutation(api.rubrics.addRubricItem);

	const [showAddItem, setShowAddItem] = useState(false);
	const [initialized, setInitialized] = useState(false);

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
		},
		validators: {
			onSubmit: rubricSchema,
		},
		onSubmit: async ({ value }) => {
			if (isEditing && rubricId) {
				await updateRubric({
					rubricId,
					name: value.name.trim(),
					description: value.description.trim(),
				});
				onSaved?.(rubricId);
			} else {
				const newRubricId = await createRubric({
					userId,
					name: value.name.trim(),
					description: value.description.trim(),
				});
				onSaved?.(newRubricId);
			}
		},
	});

	// Initialize form with existing data
	if (existingRubric && !initialized) {
		form.setFieldValue("name", existingRubric.name);
		form.setFieldValue("description", existingRubric.description);
		setInitialized(true);
	}

	const handleAddItem = async (itemData: {
		name: string;
		description: string;
		evaluationType: "yes_no" | "range" | "comments" | "code_examples";
		config?: {
			requireJustification?: boolean;
			minValue?: number;
			maxValue?: number;
			maxExamples?: number;
		};
	}) => {
		if (!rubricId) return;

		await addRubricItem({
			rubricId,
			...itemData,
		});
		setShowAddItem(false);
	};

	if (isEditing && existingRubric === undefined) {
		return (
			<div className="flex items-center justify-center py-12">
				<Spinner className="size-8" />
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="ghost" size="icon" onClick={onBack}>
					<HugeiconsIcon icon={ArrowLeft02Icon} />
				</Button>
				<h2 className="text-lg font-semibold">
					{isEditing ? "Edit Rubric" : "Create Rubric"}
				</h2>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Rubric Details</CardTitle>
				</CardHeader>
				<CardContent>
					<form
						onSubmit={(e) => {
							e.preventDefault();
							form.handleSubmit();
						}}
					>
						<FieldGroup>
							<form.Field name="name">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Name</FieldLabel>
											<Input
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="e.g., Code Quality Review"
												aria-invalid={isInvalid}
												autoComplete="off"
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Field name="description">
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid;
									return (
										<Field data-invalid={isInvalid}>
											<FieldLabel htmlFor={field.name}>Description</FieldLabel>
											<FieldDescription>
												Describe what this rubric evaluates
											</FieldDescription>
											<Textarea
												id={field.name}
												name={field.name}
												value={field.state.value}
												onBlur={field.handleBlur}
												onChange={(e) => field.handleChange(e.target.value)}
												placeholder="A comprehensive review of code quality, best practices, and maintainability..."
												rows={3}
												aria-invalid={isInvalid}
											/>
											{isInvalid && (
												<FieldError errors={field.state.meta.errors} />
											)}
										</Field>
									);
								}}
							</form.Field>

							<form.Subscribe selector={(state) => [state.isSubmitting]}>
								{([isSubmitting]) => (
									<div className="flex justify-end gap-2 pt-4">
										<Button type="button" variant="outline" onClick={onBack}>
											Cancel
										</Button>
										<Button type="submit" disabled={isSubmitting}>
											{isSubmitting && <Spinner className="size-4" />}
											{isEditing ? "Save Changes" : "Create Rubric"}
										</Button>
									</div>
								)}
							</form.Subscribe>
						</FieldGroup>
					</form>
				</CardContent>
			</Card>

			{isEditing && rubricId && (
				<Card>
					<CardHeader>
						<CardTitle>Rubric Items</CardTitle>
					</CardHeader>
					<CardContent>
						{existingRubric?.items && existingRubric.items.length > 0 ? (
							<div className="space-y-4">
								{existingRubric.items.map((item) => (
									<RubricItemCard
										key={item._id}
										item={item}
										rubricId={rubricId}
									/>
								))}
							</div>
						) : (
							<p className="text-muted-foreground text-sm">
								No items yet. Add your first evaluation criterion.
							</p>
						)}

						{showAddItem ? (
							<div className="mt-4">
								<RubricItemForm
									onSubmit={handleAddItem}
									onCancel={() => setShowAddItem(false)}
								/>
							</div>
						) : (
							<Button
								type="button"
								variant="outline"
								className="mt-4"
								onClick={() => setShowAddItem(true)}
							>
								<HugeiconsIcon icon={Add01Icon} data-icon="inline-start" />
								Add Item
							</Button>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

// Sub-component for displaying rubric items
function RubricItemCard({
	item,
}: {
	item: {
		_id: Id<"rubricItems">;
		name: string;
		description: string;
		evaluationType: "yes_no" | "range" | "comments" | "code_examples";
		config: {
			requireJustification?: boolean;
			minValue?: number;
			maxValue?: number;
			maxExamples?: number;
		};
		order: number;
	};
	rubricId: Id<"rubrics">;
}) {
	const deleteItem = useMutation(api.rubrics.deleteRubricItem);
	const [deleting, setDeleting] = useState(false);

	const handleDelete = async () => {
		setDeleting(true);
		try {
			await deleteItem({ itemId: item._id });
		} catch (error) {
			console.error("Failed to delete item:", error);
		} finally {
			setDeleting(false);
		}
	};

	const evalTypeLabels: Record<string, string> = {
		yes_no: "Yes/No",
		range: "Range",
		comments: "Comments",
		code_examples: "Code Examples",
	};

	return (
		<div className="border-border flex items-start justify-between rounded-lg border p-4">
			<div className="space-y-1">
				<div className="flex items-center gap-2">
					<span className="font-medium">{item.name}</span>
					<span className="bg-muted text-muted-foreground rounded px-2 py-0.5 text-xs">
						{evalTypeLabels[item.evaluationType]}
					</span>
				</div>
				<p className="text-muted-foreground text-sm">{item.description}</p>
				{item.evaluationType === "range" &&
					item.config.minValue !== undefined &&
					item.config.maxValue !== undefined && (
						<p className="text-muted-foreground text-xs">
							Range: {item.config.minValue} - {item.config.maxValue}
						</p>
					)}
			</div>
			<Button
				variant="ghost"
				size="icon-sm"
				onClick={handleDelete}
				disabled={deleting}
			>
				{deleting ? (
					<Spinner className="size-4" />
				) : (
					<HugeiconsIcon icon={Delete02Icon} />
				)}
			</Button>
		</div>
	);
}
