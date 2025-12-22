# Product Overview

This is an **AI-powered code review application** that analyzes code repositories against customizable rubrics. The system allows users to define specific criteria for evaluating code quality, security, and best practices, and uses AI agents to perform detailed reviews in parallel.

## Core Value Proposition
- **Automated Code Review**: Scale code reviews with AI agents that check for specific criteria.
- **Customizable Rubrics**: Define exactly what matters for your project (e.g., "Must use TypeScript strict mode", "No console.logs").
- **Parallel Execution**: Leverages Trigger.dev to run evaluations for multiple rubric items simultaneously.
- **Deep Insights**: Returns not just pass/fail, but detailed justifications, range-based scores, and specific code examples.

## Key Features

### 1. Rubric Management
- Create custom rubrics with multiple evaluation items.
- Supports various evaluation types:
    - **Yes/No**: Boolean validation with justification.
    - **Range**: Numeric scoring (e.g., 1-10) with guidance.
    - **Comments**: Free-form feedback.
    - **Code Examples**: AI finds and highlights relevant code snippets.
    - **Options**: Select from a predefined list of options.

### 2. Repository Analysis
- **Connected Repositories**: Authenticate with GitHub to browse and select repositories.
- **One-Off Analysis**: Analyze public repositories via URL without connecting them.
- **Branch Selection**: Choose specific branches to review.

### 3. Real-Time Results
- **Live Progress**: Watch as individual rubric items are evaluated in real-time.
- **Streaming Updates**: UI updates instantly as background tasks complete (powered by Convex).

### 4. System Templates
- Built-in templates for common review scenarios (e.g., "Security Audit", "React Best Practices").
