/**
 * TypeScript types matching the Convex schema validators
 */
export type EvaluationType = "yes_no" | "range" | "comments" | "code_examples";

export type RubricItemConfig = {
	requireJustification?: boolean;
	minValue?: number;
	maxValue?: number;
	maxExamples?: number;
};

/**
 * System template configuration format.
 * These templates are loaded into the database on application initialization.
 */
export interface SystemTemplateConfig {
	/** Stable identifier for the template - used for references */
	id: string;
	/** Display name for the template */
	name: string;
	/** Description of what this template evaluates */
	description: string;
	/** Array of rubric items in this template */
	items: Array<{
		name: string;
		description: string;
		evaluationType: EvaluationType;
		config: RubricItemConfig;
	}>;
}

/**
 * Pre-defined system rubric templates.
 * These cover common code review scenarios and best practices.
 */
export const SYSTEM_TEMPLATES: SystemTemplateConfig[] = [
	{
		id: "code-quality-basic",
		name: "Code Quality Basics",
		description:
			"Fundamental code quality checks including readability, maintainability, and basic best practices.",
		items: [
			{
				name: "Code Readability",
				description:
					"Evaluate if the code is well-structured, properly formatted, and easy to understand with clear variable and function names.",
				evaluationType: "range",
				config: {
					minValue: 1,
					maxValue: 10,
				},
			},
			{
				name: "Documentation Quality",
				description:
					"Check if functions, classes, and complex logic are properly documented with comments and docstrings.",
				evaluationType: "yes_no",
				config: {
					requireJustification: true,
				},
			},
			{
				name: "Code Duplication",
				description:
					"Identify instances of duplicated code that could be refactored into reusable functions or modules.",
				evaluationType: "code_examples",
				config: {
					maxExamples: 5,
				},
			},
			{
				name: "Error Handling",
				description:
					"Assess whether the code properly handles potential errors and edge cases.",
				evaluationType: "comments",
				config: {},
			},
		],
	},
	{
		id: "security-review",
		name: "Security Review",
		description:
			"Security-focused evaluation covering common vulnerabilities and secure coding practices.",
		items: [
			{
				name: "Input Validation",
				description:
					"Check if user inputs are properly validated and sanitized to prevent injection attacks.",
				evaluationType: "yes_no",
				config: {
					requireJustification: true,
				},
			},
			{
				name: "Authentication & Authorization",
				description:
					"Evaluate if authentication and authorization mechanisms are properly implemented and secure.",
				evaluationType: "range",
				config: {
					minValue: 1,
					maxValue: 5,
				},
			},
			{
				name: "Sensitive Data Handling",
				description:
					"Identify how sensitive data (passwords, tokens, personal info) is stored, transmitted, and processed.",
				evaluationType: "code_examples",
				config: {
					maxExamples: 3,
				},
			},
			{
				name: "Security Vulnerabilities",
				description:
					"Look for common security vulnerabilities like SQL injection, XSS, CSRF, or insecure dependencies.",
				evaluationType: "comments",
				config: {},
			},
		],
	},
	{
		id: "best-practices",
		name: "Development Best Practices",
		description:
			"Comprehensive review of software development best practices including architecture, testing, and maintainability.",
		items: [
			{
				name: "SOLID Principles Adherence",
				description:
					"Evaluate how well the code follows SOLID principles (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion).",
				evaluationType: "range",
				config: {
					minValue: 1,
					maxValue: 10,
				},
			},
			{
				name: "Test Coverage",
				description:
					"Assess if the code has adequate test coverage including unit tests, integration tests, and edge cases.",
				evaluationType: "yes_no",
				config: {
					requireJustification: true,
				},
			},
			{
				name: "Performance Considerations",
				description:
					"Identify potential performance bottlenecks, inefficient algorithms, or resource usage issues.",
				evaluationType: "code_examples",
				config: {
					maxExamples: 4,
				},
			},
			{
				name: "Dependency Management",
				description:
					"Review how external dependencies are managed, including version pinning, security updates, and avoiding unnecessary dependencies.",
				evaluationType: "comments",
				config: {},
			},
			{
				name: "Code Architecture",
				description:
					"Evaluate the overall architecture, separation of concerns, and modularity of the codebase.",
				evaluationType: "range",
				config: {
					minValue: 1,
					maxValue: 10,
				},
			},
		],
	},
];
