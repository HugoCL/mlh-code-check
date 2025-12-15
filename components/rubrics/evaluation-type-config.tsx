"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type EvaluationType = "yes_no" | "range" | "comments" | "code_examples";

interface RubricItemConfig {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
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
			return <YesNoConfig config={config} onChange={onChange} />;
		case "range":
			return <RangeConfig config={config} onChange={onChange} />;
		case "comments":
			return <CommentsConfig />;
		case "code_examples":
			return <CodeExamplesConfig config={config} onChange={onChange} />;
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
	return (
		<div className="grid grid-cols-2 gap-4">
			<Field>
				<FieldLabel htmlFor="min-value">Minimum Value</FieldLabel>
				<Input
					id="min-value"
					type="number"
					value={config.minValue ?? ""}
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
					value={config.maxValue ?? ""}
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
				value={config.maxExamples ?? ""}
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
