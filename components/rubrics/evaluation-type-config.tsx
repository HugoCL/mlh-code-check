"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type EvaluationType = "yes_no" | "range" | "comments" | "code_examples";

interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	rangeGuidance?: string;
	maxExamples?: number;
}

interface EvaluationTypeConfigProps {
	evaluationType: EvaluationType;
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}

export function EvaluationTypeConfig({
	evaluationType,
	config,
	onChange,
}: EvaluationTypeConfigProps) {
	switch (evaluationType) {
		case "yes_no":
			return <YesNoConfig key="yes_no" config={config} onChange={onChange} />;
		case "range":
			return <RangeConfig key="range" config={config} onChange={onChange} />;
		case "comments":
			return <CommentsConfig key="comments" />;
		case "code_examples":
			return (
				<CodeExamplesConfig
					key="code_examples"
					config={config}
					onChange={onChange}
				/>
			);
		default:
			return null;
	}
}

function YesNoConfig({
	config,
	onChange,
}: {
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}) {
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
}

function RangeConfig({
	config,
	onChange,
}: {
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}) {
	const hasGuidanceError =
		!config.rangeGuidance || config.rangeGuidance.trim().length === 0;

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
								minValue: e.target.value ? Number(e.target.value) : undefined,
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
								maxValue: e.target.value ? Number(e.target.value) : undefined,
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
					Describe when each score level should be selected
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
					className={hasGuidanceError ? "border-destructive" : ""}
				/>
				{hasGuidanceError && (
					<p className="text-destructive text-sm">
						Score guidance is required for range evaluation type
					</p>
				)}
			</Field>
		</div>
	);
}

function CommentsConfig() {
	return (
		<div className="text-muted-foreground text-sm">
			The AI will provide free-form text feedback for this criterion.
		</div>
	);
}

function CodeExamplesConfig({
	config,
	onChange,
}: {
	config: RubricItemConfig;
	onChange: (config: RubricItemConfig) => void;
}) {
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
						maxExamples: e.target.value ? Number(e.target.value) : undefined,
					})
				}
				placeholder="5"
				min={1}
				max={20}
			/>
		</Field>
	);
}
