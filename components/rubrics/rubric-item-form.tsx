"use client";

import { useForm } from "@tanstack/react-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
	Field,
	FieldContent,
	FieldDescription,
	FieldError,
	FieldGroup,
	FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { EvaluationTypeConfig } from "./evaluation-type-config";

type EvaluationType = "yes_no" | "range" | "comments" | "code_examples";

interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	rangeGuidance?: string;
	maxExamples?: number;
}

interface RubricItemFormProps {
	initialData?: {
		name: string;
		description: string;
		evaluationType: EvaluationType;
		config?: RubricItemConfig;
	};
	onSubmit: (data: {
		name: string;
		description: string;
		evaluationType: EvaluationType;
		config?: RubricItemConfig;
	}) => Promise<void>;
	onCancel: () => void;
}

const formSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be at most 100 characters"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(500, "Description must be at most 500 characters"),
	evaluationType: z.enum(["yes_no", "range", "comments", "code_examples"]),
	config: z
		.object({
			requireJustification: z.boolean().optional(),
			minValue: z.number().optional(),
			maxValue: z.number().optional(),
			rangeGuidance: z.string().optional(),
			maxExamples: z.number().optional(),
		})
		.refine(
			(data) => {
				if (data.minValue !== undefined && data.maxValue !== undefined) {
					return data.minValue < data.maxValue;
				}
				return true;
			},
			{ message: "Minimum value must be less than maximum value" },
		),
}).superRefine((data, ctx) => {
	if (data.evaluationType === "range") {
		if (!data.config.rangeGuidance || data.config.rangeGuidance.trim().length === 0) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Score guidance is required for range evaluation type",
				path: ["config", "rangeGuidance"],
			});
		}
	}
});

export function RubricItemForm({
	initialData,
	onSubmit,
	onCancel,
}: RubricItemFormProps) {
	const form = useForm({
		defaultValues: {
			name: initialData?.name ?? "",
			description: initialData?.description ?? "",
			evaluationType:
				initialData?.evaluationType ?? ("yes_no" as EvaluationType),
			config: initialData?.config ?? ({} as RubricItemConfig),
		},
		validators: {
			onSubmit: formSchema,
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				name: value.name.trim(),
				description: value.description.trim(),
				evaluationType: value.evaluationType,
				config: value.config,
			});
		},
	});

	return (
		<form
			onSubmit={(e) => {
				e.preventDefault();
				form.handleSubmit();
			}}
			className="border-border space-y-4 rounded-lg border p-4"
		>
			<FieldGroup>
				<form.Field name="name">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldLabel htmlFor={field.name}>Item Name</FieldLabel>
								<Input
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="e.g., Code Documentation"
									aria-invalid={isInvalid}
									autoComplete="off"
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
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
									Describe what this criterion evaluates
								</FieldDescription>
								<Textarea
									id={field.name}
									name={field.name}
									value={field.state.value}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder="Evaluate whether the code has adequate documentation..."
									rows={2}
									aria-invalid={isInvalid}
								/>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="evaluationType">
					{(field) => {
						const isInvalid =
							field.state.meta.isTouched && !field.state.meta.isValid;
						return (
							<Field data-invalid={isInvalid}>
								<FieldContent>
									<FieldLabel htmlFor="evaluation-type">
										Evaluation Type
									</FieldLabel>
									<FieldDescription>
										Choose how the AI should respond to this criterion
									</FieldDescription>
								</FieldContent>
								<Select
									name={field.name}
									value={field.state.value}
									onValueChange={(value) => {
										if (value) {
											field.handleChange(value as EvaluationType);
											// Reset config when type changes
											form.setFieldValue("config", {});
										}
									}}
								>
									<SelectTrigger
										id="evaluation-type"
										className="w-full"
										aria-invalid={isInvalid}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="yes_no">Yes/No</SelectItem>
										<SelectItem value="range">Range (Score)</SelectItem>
										<SelectItem value="comments">Comments</SelectItem>
										<SelectItem value="code_examples">Code Examples</SelectItem>
									</SelectContent>
								</Select>
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						);
					}}
				</form.Field>

				<form.Field name="config">
					{(field) => (
						<EvaluationTypeConfig
							evaluationType={form.getFieldValue("evaluationType")}
							config={field.state.value}
							onChange={field.handleChange}
						/>
					)}
				</form.Field>

				<form.Subscribe selector={(state) => [state.isSubmitting]}>
					{([isSubmitting]) => (
						<div className="flex justify-end gap-2 pt-2">
							<Button type="button" variant="outline" onClick={onCancel}>
								Cancel
							</Button>
							<Button type="submit" disabled={isSubmitting}>
								{isSubmitting && <Spinner className="size-4" />}
								{initialData ? "Update Item" : "Add Item"}
							</Button>
						</div>
					)}
				</form.Subscribe>
			</FieldGroup>
		</form>
	);
}
