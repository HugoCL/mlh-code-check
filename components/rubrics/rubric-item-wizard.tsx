"use client";

import { ArrowLeft02Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useForm } from "@tanstack/react-form";
import { useEffect, useState } from "react";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Checkbox } from "@/components/ui/checkbox";
import { formatOptionList, parseOptionList } from "@/lib/utils";

type EvaluationType =
	| "yes_no"
	| "range"
	| "comments"
	| "code_examples"
	| "options";

interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	rangeGuidance?: string;
	maxExamples?: number;
	options?: string[];
	allowMultiple?: boolean;
	maxSelections?: number;
}

interface RubricItemWizardProps {
	onSubmit: (data: {
		name: string;
		description: string;
		evaluationType: EvaluationType;
		config?: RubricItemConfig;
	}) => Promise<void>;
	onCancel: () => void;
}

const baseSchema = z.object({
	name: z
		.string()
		.min(1, "Name is required")
		.max(100, "Name must be at most 100 characters"),
	description: z
		.string()
		.min(1, "Description is required")
		.max(500, "Description must be at most 500 characters"),
});

const yesNoConfigSchema = z.object({
	requireJustification: z.boolean().optional(),
});

const rangeConfigSchema = z
	.object({
		minValue: z.number().optional(),
		maxValue: z.number().optional(),
		rangeGuidance: z
			.string()
			.min(1, "Score guidance is required for range evaluation type"),
	})
	.refine(
		(data) => {
			if (data.minValue !== undefined && data.maxValue !== undefined) {
				return data.minValue < data.maxValue;
			}
			return true;
		},
		{ message: "Minimum value must be less than maximum value" },
	);

const codeExamplesConfigSchema = z.object({
	maxExamples: z.number().min(1).max(20).optional(),
});

const optionsConfigSchema = z
	.object({
		options: z.array(z.string()).min(1, "At least one option is required"),
		allowMultiple: z.boolean().optional(),
		maxSelections: z.number().optional(),
	})
	.superRefine((data, ctx) => {
		if (data.maxSelections !== undefined) {
			if (!data.allowMultiple) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Enable multiple selections to set a maximum",
					path: ["allowMultiple"],
				});
			} else if (data.maxSelections < 1) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Maximum selections must be at least 1",
					path: ["maxSelections"],
				});
			} else if (data.options.length > 0 && data.maxSelections > data.options.length) {
				ctx.addIssue({
					code: z.ZodIssueCode.custom,
					message: "Maximum selections cannot exceed the number of options",
					path: ["maxSelections"],
				});
			}
		}
	});

export function RubricItemWizard({
	onSubmit,
	onCancel,
}: RubricItemWizardProps) {
	const [step, setStep] = useState<"type" | "details">("type");
	const [selectedType, setSelectedType] = useState<EvaluationType | null>(null);

	const handleTypeSelection = (type: EvaluationType) => {
		setSelectedType(type);
		setStep("details");
	};

	const handleBack = () => {
		if (step === "details") {
			setStep("type");
			setSelectedType(null);
		} else {
			onCancel();
		}
	};

	if (step === "type") {
		return (
			<TypeSelectionStep onSelect={handleTypeSelection} onCancel={onCancel} />
		);
	}

	if (step === "details" && selectedType) {
		return (
			<ItemDetailsStep
				evaluationType={selectedType}
				onSubmit={onSubmit}
				onBack={handleBack}
			/>
		);
	}

	return null;
}

function TypeSelectionStep({
	onSelect,
	onCancel,
}: {
	onSelect: (type: EvaluationType) => void;
	onCancel: () => void;
}) {
	const evaluationTypes = [
		{
			value: "yes_no" as const,
			label: "Yes/No",
			description:
				"AI provides a binary yes/no answer with optional justification",
		},
		{
			value: "range" as const,
			label: "Range (Score)",
			description: "AI provides a numeric score within a defined range",
		},
		{
			value: "comments" as const,
			label: "Comments",
			description: "AI provides free-form text feedback",
		},
		{
			value: "code_examples" as const,
			label: "Code Examples",
			description: "AI provides specific code examples from the repository",
		},
		{
			value: "options" as const,
			label: "Options",
			description: "AI selects from a predefined list of options",
		},
	];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={onCancel}>
						<HugeiconsIcon icon={ArrowLeft02Icon} />
					</Button>
					<CardTitle>Choose Evaluation Type</CardTitle>
				</div>
			</CardHeader>
			<CardContent>
				<div className="space-y-3">
					<p className="text-muted-foreground text-sm">
						Select how the AI should evaluate this criterion:
					</p>
					{evaluationTypes.map((type) => (
						<button
							key={type.value}
							type="button"
							onClick={() => onSelect(type.value)}
							className="border-border hover:bg-muted w-full rounded-lg border p-4 text-left transition-colors"
						>
							<div className="font-medium">{type.label}</div>
							<div className="text-muted-foreground text-sm">
								{type.description}
							</div>
						</button>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

function ItemDetailsStep({
	evaluationType,
	onSubmit,
	onBack,
}: {
	evaluationType: EvaluationType;
	onSubmit: (data: {
		name: string;
		description: string;
		evaluationType: EvaluationType;
		config?: RubricItemConfig;
	}) => Promise<void>;
	onBack: () => void;
}) {
	const getValidationSchema = () => {
		const configSchema = (() => {
			switch (evaluationType) {
				case "yes_no":
					return yesNoConfigSchema;
				case "range":
					return rangeConfigSchema;
				case "code_examples":
					return codeExamplesConfigSchema;
				case "options":
					return optionsConfigSchema;
				default:
					return z.object({});
			}
		})();

		return baseSchema.extend({ config: configSchema });
	};

	const getDefaultConfig = (): RubricItemConfig => {
		switch (evaluationType) {
			case "yes_no":
				return { requireJustification: false };
			case "range":
				return { minValue: undefined, maxValue: undefined, rangeGuidance: "" };
			case "code_examples":
				return { maxExamples: undefined };
			case "options":
				return { options: [], allowMultiple: false };
			default:
				return {};
		}
	};

	const form = useForm({
		defaultValues: {
			name: "",
			description: "",
			config: getDefaultConfig(),
		},
		validators: {
			onSubmit: getValidationSchema(),
		},
		onSubmit: async ({ value }) => {
			await onSubmit({
				name: value.name.trim(),
				description: value.description.trim(),
				evaluationType,
				config: value.config,
			});
		},
	});

	const typeLabels: Record<EvaluationType, string> = {
		yes_no: "Yes/No",
		range: "Range (Score)",
		comments: "Comments",
		code_examples: "Code Examples",
		options: "Options",
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center gap-4">
					<Button variant="ghost" size="icon" onClick={onBack}>
						<HugeiconsIcon icon={ArrowLeft02Icon} />
					</Button>
					<div>
						<CardTitle>Add {typeLabels[evaluationType]} Item</CardTitle>
						<p className="text-muted-foreground text-sm">
							Configure the details for this evaluation criterion
						</p>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<form
					onSubmit={(e) => {
						e.preventDefault();
						form.handleSubmit();
					}}
					className="space-y-4"
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
										{isInvalid && (
											<FieldError errors={field.state.meta.errors} />
										)}
									</Field>
								);
							}}
						</form.Field>

						<form.Field name="config">
							{(field) => (
								<ConfigSection
									evaluationType={evaluationType}
									config={field.state.value}
									onChange={field.handleChange}
								/>
							)}
						</form.Field>

						<form.Subscribe selector={(state) => [state.isSubmitting]}>
							{([isSubmitting]) => (
								<div className="flex justify-end gap-2 pt-2">
									<Button type="button" variant="outline" onClick={onBack}>
										Back
									</Button>
									<Button type="submit" disabled={isSubmitting}>
										{isSubmitting && <Spinner className="size-4" />}
										Add Item
									</Button>
								</div>
							)}
						</form.Subscribe>
					</FieldGroup>
				</form>
			</CardContent>
		</Card>
	);
}

function ConfigSection({
	evaluationType,
	config,
	onChange,
}: {
	evaluationType: EvaluationType;
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}) {
	switch (evaluationType) {
		case "yes_no":
			return (
				<Field orientation="horizontal">
					<Checkbox
						id="require-justification"
						checked={config.requireJustification ?? false}
						onCheckedChange={(checked) =>
							onChange({ ...config, requireJustification: checked === true })
						}
					/>
					<FieldLabel htmlFor="require-justification">
						Require justification
					</FieldLabel>
					<FieldDescription>
						AI will provide reasoning for its yes/no answer
					</FieldDescription>
				</Field>
			);

		case "range":
			return (
				<div className="space-y-4">
					<div className="grid grid-cols-2 gap-4">
						<Field>
							<FieldLabel htmlFor="min-value">Minimum Value</FieldLabel>
							<Input
								id="min-value"
								type="number"
								value={config.minValue?.toString() ?? ""}
								onChange={(e) =>
									onChange({
										...config,
										minValue: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="0"
							/>
						</Field>
						<Field>
							<FieldLabel htmlFor="max-value">Maximum Value</FieldLabel>
							<Input
								id="max-value"
								type="number"
								value={config.maxValue?.toString() ?? ""}
								onChange={(e) =>
									onChange({
										...config,
										maxValue: e.target.value
											? Number(e.target.value)
											: undefined,
									})
								}
								placeholder="10"
							/>
						</Field>
					</div>
					<Field>
						<FieldLabel htmlFor="range-guidance">
							Score Guidance <span className="text-destructive">*</span>
						</FieldLabel>
						<FieldDescription>
							Describe when each score level should be selected (required)
						</FieldDescription>
						<Textarea
							id="range-guidance"
							value={config.rangeGuidance ?? ""}
							onChange={(e) =>
								onChange({
									...config,
									rangeGuidance: e.target.value,
								})
							}
							placeholder="1 = No tests present&#10;2 = Basic tests with minimal coverage&#10;3 = Moderate test coverage&#10;4 = Good test coverage with edge cases&#10;5 = Comprehensive test suite"
							rows={4}
							className={
								!config.rangeGuidance ||
								config.rangeGuidance.trim().length === 0
									? "border-destructive"
									: ""
							}
						/>
						{(!config.rangeGuidance ||
							config.rangeGuidance.trim().length === 0) && (
							<p className="text-destructive text-sm">
								Score guidance is required for range evaluation type
							</p>
						)}
					</Field>
				</div>
			);

		case "code_examples":
			return (
				<Field>
					<FieldLabel htmlFor="max-examples">Maximum Examples</FieldLabel>
					<FieldDescription>
						Limit the number of code examples returned
					</FieldDescription>
					<Input
						id="max-examples"
						type="number"
						value={config.maxExamples?.toString() ?? ""}
						onChange={(e) =>
							onChange({
								...config,
								maxExamples: e.target.value
									? Number(e.target.value)
									: undefined,
							})
						}
						placeholder="5"
						min={1}
						max={20}
					/>
				</Field>
			);

		case "options":
			return (
				<OptionsConfigSection config={config} onChange={onChange} />
			);

		case "comments":
			return (
				<div className="text-muted-foreground text-sm">
					The AI will provide free-form text feedback for this criterion.
				</div>
			);

		default:
			return null;
	}
}

function OptionsConfigSection({
	config,
	onChange,
}: {
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}) {
	const [optionsText, setOptionsText] = useState(() =>
		formatOptionList(config.options),
	);

	useEffect(() => {
		setOptionsText(formatOptionList(config.options));
	}, [config.options]);

	const options = config.options ?? [];
	const allowMultiple = config.allowMultiple ?? false;

	return (
		<div className="space-y-4">
			<Field>
				<FieldLabel htmlFor="options-list">
					Options <span className="text-destructive">*</span>
				</FieldLabel>
				<FieldDescription>
					Enter one option per line (commas are also supported).
				</FieldDescription>
				<Textarea
					id="options-list"
					value={optionsText}
					onChange={(e) => {
						const value = e.target.value;
						setOptionsText(value);
						onChange({
							...config,
							options: parseOptionList(value),
						});
					}}
					placeholder="JavaScript&#10;TypeScript&#10;Python&#10;Other"
					rows={4}
					className={options.length === 0 ? "border-destructive" : ""}
				/>
				{options.length === 0 && (
					<p className="text-destructive text-sm">
						At least one option is required
					</p>
				)}
			</Field>

			<Field orientation="horizontal">
				<Checkbox
					id="allow-multiple"
					checked={allowMultiple}
					onCheckedChange={(checked) => {
						onChange({
							...config,
							allowMultiple: checked === true,
							maxSelections:
								checked === true ? config.maxSelections : undefined,
						});
					}}
				/>
				<FieldLabel htmlFor="allow-multiple">
					Allow multiple selections
				</FieldLabel>
				<FieldDescription>
					Let the AI choose more than one option if needed
				</FieldDescription>
			</Field>

			{allowMultiple && (
				<Field>
					<FieldLabel htmlFor="max-selections">
						Maximum Selections
					</FieldLabel>
					<FieldDescription>
						Optional cap on how many options can be selected
					</FieldDescription>
					<Input
						id="max-selections"
						type="number"
						value={config.maxSelections?.toString() ?? ""}
						onChange={(e) =>
							onChange({
								...config,
								maxSelections: e.target.value
									? Number(e.target.value)
									: undefined,
							})
						}
						placeholder="2"
						min={1}
						max={options.length || undefined}
					/>
				</Field>
			)}
		</div>
	);
}
