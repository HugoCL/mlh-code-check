/**
 * TypeScript types matching the Convex schema validators
 */
export type EvaluationType = "yes_no" | "range" | "comments" | "code_examples";

export type RubricItemConfig = {
    requireJustification?: boolean;
    minValue?: number;
    maxValue?: number;
    rangeGuidance?: string;
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
        id: "fellowship-code-reviewer",
        name: "Fellowship Code Reviewer",
        description:
            "Comprehensive evaluation rubric for assessing GitHub profiles and code samples for Fellowship-level programming skill.",
        items: [
            {
                name: "Primary Language",
                description:
                    "Identify the primary programming language used in the code sample. Options: JavaScript, TypeScript, Python, Java, C++, or Other.",
                evaluationType: "comments",
                config: {},
            },
            {
                name: "Project Structure & Navigation",
                description:
                    "Evaluate if the project is easy to navigate. Consider: Is the file structure clear? Can you easily find what you're looking for? Does documentation explain the structure?",
                evaluationType: "range",
                config: {
                    minValue: 1,
                    maxValue: 3,
                    rangeGuidance:
                        "1 = Confusing structure, hard to navigate\n2 = Adequate structure, some organization\n3 = Clear, well-organized structure with good documentation",
                },
            },
            {
                name: "Naming Conventions",
                description:
                    "Assess the quality of naming throughout the codebase. Good naming is descriptive, unambiguous, pronounceable, and searchable.",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Function Quality",
                description:
                    "Evaluate function design: Are functions small? Do they do one thing? Do they have descriptive names? Are there no side effects?",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Comment Quality",
                description:
                    "Assess comment usage: Is the code mostly self-explanatory? Do comments explain intent rather than what the code does? Are comments not noisy?",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Code Structure",
                description:
                    "Evaluate code structure: Is the code DRY? Are concepts separated? Are variables declared near usage? Are lines short with proper whitespace and indentation?",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Library & API Usage",
                description:
                    "Check if the code uses libraries/APIs effectively, with one or more libraries interacting with each other.",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Object Orientation",
                description:
                    "Evaluate if object-oriented principles are used appropriately when applicable to the project.",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
            {
                name: "Originality",
                description:
                    "Assess if the code sample is original work. Consider: Is it generated from a template with no real change? Was a template used but clearly added to? Is it clearly new functionality or a unique project?",
                evaluationType: "range",
                config: {
                    minValue: 1,
                    maxValue: 3,
                    rangeGuidance:
                        "1 = Generated from template with no real changes\n2 = Template used but clearly added to with custom code\n3 = Clearly new functionality or unique project",
                },
            },
            {
                name: "Boilerplate Assessment",
                description:
                    "Evaluate the extent of boilerplate code. Consider: Is it mostly autogenerated/setup code? Does it include boilerplate plus other non-boilerplate components? Is it mostly unique components?",
                evaluationType: "range",
                config: {
                    minValue: 1,
                    maxValue: 3,
                    rangeGuidance:
                        "1 = Mostly autogenerated/setup code\n2 = Boilerplate plus some non-boilerplate components\n3 = Mostly unique, custom components",
                },
            },
            {
                name: "Documentation (README)",
                description:
                    "Assess README quality: Does it exist? Does it describe what's going on? Does it explain the project and include setup instructions?",
                evaluationType: "range",
                config: {
                    minValue: 1,
                    maxValue: 3,
                    rangeGuidance:
                        "1 = No README or minimal/empty README\n2 = README exists with basic description\n3 = Comprehensive README with project explanation and setup instructions",
                },
            },
            {
                name: "Testing Coverage",
                description:
                    "Evaluate test coverage: Are there no tests? Is there an attempt with basic tests? Do tests cover key functionality of the application?",
                evaluationType: "range",
                config: {
                    minValue: 1,
                    maxValue: 3,
                    rangeGuidance:
                        "1 = No tests present\n2 = Basic tests with minimal coverage\n3 = Tests cover key functionality of the application",
                },
            },
            {
                name: "Clean Code Examples",
                description:
                    "Identify specific code examples that demonstrate clean code practices or areas needing improvement.",
                evaluationType: "code_examples",
                config: {
                    maxExamples: 5,
                },
            },
            {
                name: "Final Determination",
                description:
                    "Make a final determination: Should this candidate be skipped (only if certain there is no evidence of Fellowship-level programming skill) or does the candidate need further assessment?",
                evaluationType: "yes_no",
                config: {
                    requireJustification: true,
                },
            },
        ],
    },
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
                    rangeGuidance:
                        "1-3 = Poor readability, inconsistent formatting, unclear naming\n4-6 = Adequate readability, some formatting issues\n7-8 = Good readability, well-formatted, clear naming\n9-10 = Excellent readability, consistent style, self-documenting code",
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
                    rangeGuidance:
                        "1 = No auth or severely flawed implementation\n2 = Basic auth with significant security gaps\n3 = Functional auth with some concerns\n4 = Well-implemented auth with minor improvements possible\n5 = Secure, properly implemented authentication and authorization",
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
                    rangeGuidance:
                        "1-3 = Poor adherence, violates multiple SOLID principles\n4-6 = Partial adherence, some principles followed\n7-8 = Good adherence, most principles followed with minor violations\n9-10 = Excellent adherence, clean architecture following all SOLID principles",
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
                    rangeGuidance:
                        "1-3 = Poor architecture, tightly coupled, no clear structure\n4-6 = Adequate architecture, some separation of concerns\n7-8 = Good architecture, clear modularity and separation\n9-10 = Excellent architecture, highly modular, well-designed layers",
                },
            },
        ],
    },
];
