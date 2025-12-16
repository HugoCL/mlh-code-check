# Requirements Document

## Introduction

This document specifies the requirements for an AI-powered code review application that analyzes code repositories against customizable rubrics. The system leverages GitHub's remote MCP for repository access, Trigger.dev for parallelized AI agent execution, the AI SDK for model interactions, Clerk for authentication, and Convex for real-time data management. Users can define custom rubrics with various evaluation types and monitor analysis progress in real-time.

## Glossary

- **Code_Review_System**: The application that orchestrates AI-based code analysis against user-defined rubrics
- **Rubric**: A customizable evaluation framework containing multiple criteria items for assessing code quality
- **Rubric_Item**: A single evaluation criterion within a rubric, specifying what to evaluate and the expected response format
- **Evaluation_Type**: The format of response expected for a rubric item (yes/no, range, comments, code examples)
- **Analysis_Job**: A single execution of code review against a repository using a specific rubric
- **Trigger_Task**: A background job executed via Trigger.dev that performs parallelized code analysis
- **Progress_Reporter**: The component that streams analysis status updates from Trigger tasks to the UI
- **One_Off_Analysis**: An analysis performed on a public repository by URL without requiring the user to connect the repository to their account

## Requirements

### Requirement 1: User Authentication

**User Story:** As a user, I want to securely authenticate with the application, so that I can access my rubrics and analysis history.

#### Acceptance Criteria

1. WHEN a user visits the application without authentication THEN the Code_Review_System SHALL redirect the user to the Clerk sign-in page
2. WHEN a user successfully authenticates via Clerk THEN the Code_Review_System SHALL create or retrieve the user record in Convex and establish a session
3. WHEN a user signs out THEN the Code_Review_System SHALL terminate the session and redirect to the public landing page
4. WHEN an authenticated user's session expires THEN the Code_Review_System SHALL prompt for re-authentication before allowing protected actions

### Requirement 2: Rubric Management

**User Story:** As a user, I want to create and manage custom rubrics, so that I can define the criteria for evaluating code repositories.

#### Acceptance Criteria

1. WHEN a user creates a new rubric THEN the Code_Review_System SHALL store the rubric with a name, description, and empty item list in Convex
2. WHEN a user adds a rubric item THEN the Code_Review_System SHALL require a name, description, evaluation type, and optional configuration parameters
3. WHEN a user selects "yes/no" as evaluation type THEN the Code_Review_System SHALL configure the item to return a boolean response with optional justification
4. WHEN a user selects "range" as evaluation type THEN the Code_Review_System SHALL require minimum and maximum values, and guidance text describing when each score level should be selected, and return a numeric score within that range
5. WHEN a user selects "comments" as evaluation type THEN the Code_Review_System SHALL configure the item to return free-form text feedback
6. WHEN a user selects "code_examples" as evaluation type THEN the Code_Review_System SHALL configure the item to return relevant code snippets from the repository with explanations
7. WHEN a user edits an existing rubric THEN the Code_Review_System SHALL update the rubric in Convex and reflect changes immediately
8. WHEN a user deletes a rubric THEN the Code_Review_System SHALL remove the rubric from Convex and preserve historical analysis results that used it

### Requirement 3: System Rubric Templates

**User Story:** As a platform administrator, I want to declare rubric templates programmatically, so that all users can access pre-built evaluation criteria without creating them manually.

#### Acceptance Criteria

1. WHEN the application starts THEN the Code_Review_System SHALL load rubric templates from a configuration source and store them in Convex as system templates
2. WHEN a user views available rubrics THEN the Code_Review_System SHALL display both user-created rubrics and system templates with clear visual distinction
3. WHEN a user selects a system template for analysis THEN the Code_Review_System SHALL use the template directly without requiring duplication
4. WHEN a user wants to customize a system template THEN the Code_Review_System SHALL create a copy in the user's personal rubrics with the modifications
5. WHEN a system template is updated in configuration THEN the Code_Review_System SHALL reflect the changes for all users on next application load while preserving historical analysis results

### Requirement 4: Repository Connection

**User Story:** As a user, I want to connect GitHub repositories for analysis, so that the AI agents can access the code content.

#### Acceptance Criteria

1. WHEN a user initiates repository connection THEN the Code_Review_System SHALL use GitHub's remote MCP to authenticate and list accessible repositories
2. WHEN a user selects a repository THEN the Code_Review_System SHALL validate access permissions and store the repository reference
3. WHEN repository access is revoked externally THEN the Code_Review_System SHALL detect the failure during analysis and notify the user with a clear error message

### Requirement 9: One-Off Public Repository Analysis

**User Story:** As a user, I want to analyze a public GitHub repository by pasting its URL, so that I can quickly evaluate code without connecting the repository to my account.

#### Acceptance Criteria

1. WHEN a user enters a valid GitHub repository URL in the one-off analysis form THEN the Code_Review_System SHALL parse the URL and extract the owner, repository name, and optional branch
2. WHEN a user submits a one-off analysis request THEN the Code_Review_System SHALL validate that the repository is publicly accessible before starting the analysis
3. WHEN a one-off analysis is created THEN the Code_Review_System SHALL store the analysis with a reference to the repository URL rather than a connected repository ID
4. WHEN a one-off analysis completes THEN the Code_Review_System SHALL display results identically to connected repository analyses
5. WHEN a user does not specify a branch in the URL THEN the Code_Review_System SHALL default to the repository's main or master branch
6. WHEN a user enters an invalid or inaccessible repository URL THEN the Code_Review_System SHALL display a clear error message indicating the URL is invalid or the repository is not publicly accessible
7. WHEN viewing analysis history THEN the Code_Review_System SHALL display one-off analyses with the repository URL and distinguish them from connected repository analyses

### Requirement 5: Analysis Execution

**User Story:** As a user, I want to run code analysis on a repository using my rubric, so that I can receive AI-generated evaluations.

#### Acceptance Criteria

1. WHEN a user starts an analysis THEN the Code_Review_System SHALL create an Analysis_Job record with "pending" status in Convex
2. WHEN an Analysis_Job is created THEN the Code_Review_System SHALL trigger a Trigger_Task that fetches repository content via GitHub MCP
3. WHEN processing rubric items THEN the Code_Review_System SHALL execute AI evaluations in parallel using separate Trigger subtasks for each item
4. WHEN an AI evaluation completes for a rubric item THEN the Code_Review_System SHALL store the result in Convex with the item reference and response data
5. WHEN all rubric items complete evaluation THEN the Code_Review_System SHALL update the Analysis_Job status to "completed" and aggregate results
6. IF a Trigger_Task fails during execution THEN the Code_Review_System SHALL mark the affected item as "failed" with error details and continue processing remaining items
7. WHEN an analysis encounters a rate limit THEN the Code_Review_System SHALL implement exponential backoff and retry the affected operations

### Requirement 6: Real-time Progress Tracking

**User Story:** As a user, I want to see the progress of my analysis in real-time, so that I can monitor the evaluation status.

#### Acceptance Criteria

1. WHEN an Analysis_Job starts THEN the Code_Review_System SHALL display a progress indicator showing total items and completed count
2. WHEN a Trigger_Task updates progress THEN the Code_Review_System SHALL report the update to Convex and reflect it in the UI within 2 seconds
3. WHEN viewing an in-progress analysis THEN the Code_Review_System SHALL display which rubric items are pending, processing, completed, or failed
4. WHEN an analysis completes THEN the Code_Review_System SHALL display a summary with overall completion status and any failures

### Requirement 7: Results Display

**User Story:** As a user, I want to view detailed analysis results, so that I can understand the AI's evaluation of my code.

#### Acceptance Criteria

1. WHEN viewing results for a "yes/no" item THEN the Code_Review_System SHALL display the boolean result with the AI's justification text
2. WHEN viewing results for a "range" item THEN the Code_Review_System SHALL display the numeric score, the configured range, and supporting rationale
3. WHEN viewing results for a "comments" item THEN the Code_Review_System SHALL display the full feedback text with proper formatting
4. WHEN viewing results for a "code_examples" item THEN the Code_Review_System SHALL display code snippets with syntax highlighting and explanatory annotations
5. WHEN viewing completed analysis THEN the Code_Review_System SHALL allow exporting results as JSON or Markdown format

### Requirement 8: Analysis History

**User Story:** As a user, I want to access my previous analyses, so that I can track code quality over time.

#### Acceptance Criteria

1. WHEN a user views their dashboard THEN the Code_Review_System SHALL display a list of past Analysis_Jobs sorted by creation date
2. WHEN a user selects a historical analysis THEN the Code_Review_System SHALL display the full results as they were at completion time
3. WHEN a user filters analysis history THEN the Code_Review_System SHALL support filtering by repository, rubric, date range, and status
