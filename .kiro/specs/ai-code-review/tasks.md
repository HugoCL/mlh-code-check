# Implementation Plan

- [x] 1. Set up authentication and database foundation
  - [x] 1.1 Install and configure Clerk authentication
    - Install `@clerk/nextjs` package
    - Create Clerk application and configure environment variables
    - Set up ClerkProvider in app layout
    - Create sign-in and sign-up pages
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 1.2 Configure Convex with Clerk integration
    - Install `convex` and `@clerk/clerk-react` packages
    - Set up ConvexProviderWithClerk wrapper
    - Configure Convex authentication with Clerk JWT
    - _Requirements: 1.2_

  - [x] 1.3 Create Convex schema and user management
    - Define schema.ts with users table
    - Create user sync mutation triggered on Clerk webhook
    - Implement getOrCreateUser query
    - _Requirements: 1.2_
  - [x] 1.4 Write property test for user synchronization
    - **Property 1: User record synchronization**
    - **Validates: Requirements 1.2**

- [x] 2. Implement rubric management
  - [x] 2.1 Create rubric data model and basic CRUD
    - Add rubrics and rubricItems tables to schema
    - Implement createRubric mutation
    - Implement updateRubric mutation
    - Implement deleteRubric mutation (soft delete)
    - Implement listRubrics and getRubric queries
    - _Requirements: 2.1, 2.7, 2.8_
  - [x] 2.2 Write property tests for rubric operations
    - **Property 2: Rubric creation persistence**
    - **Property 5: Rubric update persistence**
    - **Property 6: Soft delete preserves history**
    - **Validates: Requirements 2.1, 2.7, 2.8**
  - [x] 2.3 Implement rubric item management
    - Create addRubricItem mutation with validation
    - Create updateRubricItem mutation
    - Create deleteRubricItem mutation
    - Create reorderRubricItems mutation
    - _Requirements: 2.2, 2.3, 2.4, 2.5, 2.6_
  - [x] 2.4 Write property test for rubric item validation
    - **Property 3: Rubric item validation**
    - **Validates: Requirements 2.2**
  - [x] 2.5 Build rubric management UI components
    - Create RubricList component
    - Create RubricForm component for create/edit
    - Create RubricItemForm with evaluation type selector
    - Create EvaluationTypeConfig components for each type
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [x] 3. Implement system rubric templates
  - [x] 3.1 Create template configuration and loader
    - Define template configuration format in lib/templates.ts
    - Create sample templates (code quality, security, best practices)
    - Implement Convex internal function to load templates on init
    - Add systemTemplateId field for stable references
    - _Requirements: 3.1, 3.5_
  - [x] 3.2 Implement template listing and usage
    - Update listRubrics to include system templates
    - Add isSystemTemplate flag to UI display
    - Implement duplicateSystemTemplate mutation
    - _Requirements: 3.2, 3.3, 3.4_
  - [x] 3.3 Write property tests for template operations
    - **Property 7: Rubric listing includes both types**
    - **Property 8: System template direct usage**
    - **Property 9: Template duplication creates user copy**
    - **Validates: Requirements 3.2, 3.3, 3.4**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement repository connection
  - [x] 5.1 Create repository data model and storage
    - Add repositories table to schema
    - Implement connectRepository mutation
    - Implement listRepositories query
    - Implement disconnectRepository mutation
    - _Requirements: 4.2_
  - [x] 5.2 Write property test for repository storage
    - **Property 10: Repository storage completeness**
    - **Validates: Requirements 4.2**
  - [x] 5.3 Build repository connection UI
    - Create RepositoryList component
    - Create RepositorySelector component for analysis
    - Implement repository search/filter
    - _Requirements: 4.1, 4.2_
- [x] 6. Implement analysis execution with Trigger.dev
  - [x] 6.1 Set up Trigger.dev configuration
    - Configure trigger.config.ts for the project
    - Set up environment variables for Trigger.dev
    - Install @trigger.dev/sdk and @trigger.dev/react-hooks
    - _Requirements: 5.2_
  - [x] 6.2 Create analysis data model
    - Add analyses and analysisResults tables to schema
    - Implement createAnalysis mutation
    - Implement updateAnalysisProgress mutation
    - Implement updateItemResult mutation
    - Implement completeAnalysis and failAnalysis mutations
    - _Requirements: 5.1, 5.4, 5.5_
  - [x] 6.3 Write property tests for analysis state management
    - **Property 11: Analysis creation with pending status**
    - **Property 12: Result storage completeness**
    - **Property 13: Analysis completion status**
    - **Validates: Requirements 5.1, 5.4, 5.5**
  - [x] 6.4 Implement analysis orchestrator task
    - Create analyzeRepository task in trigger/analyze.ts
    - Implement repository content fetching via GitHub MCP
    - Set up metadata for real-time progress updates
    - Trigger parallel rubric item evaluations using batch.triggerByTaskAndWait
    - Handle completion and error aggregation
    - _Requirements: 5.2, 5.3, 5.5, 5.6_
  - [x] 6.5 Implement rubric item evaluation worker task
    - Create evaluateRubricItem task
    - Implement AI prompt construction per evaluation type
    - Integrate Vercel AI SDK for model calls
    - Return structured results matching evaluation type
    - _Requirements: 5.3, 5.4_
  - [x] 6.6 Write property test for evaluation result structure
    - **Property 4: Evaluation result structure matches type**
    - **Validates: Requirements 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4**
  - [x] 6.7 Write property test for partial failure handling
    - **Property 14: Partial failure isolation**
    - **Validates: Requirements 5.6**

- [x] 7. Implement real-time progress tracking
  - [x] 7.1 Create progress tracking components
    - Create AnalysisProgress component using useRealtimeTaskTrigger
    - Create ItemStatusList component showing individual item states
    - Create ProgressBar component with completion percentage
    - _Requirements: 6.1, 6.3_
  - [x] 7.2 Implement analysis trigger and subscription
    - Create startAnalysis server action
    - Wire up useRealtimeTaskTrigger hook in UI
    - Handle metadata updates for progress display
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 7.3 Write property test for progress tracking
    - **Property 15: Progress tracking accuracy**
    - **Validates: Requirements 6.1, 6.3, 6.4**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement results display
  - [x] 9.1 Create result display components

    - Create ResultsView container component
    - Create YesNoResultCard component
    - Create RangeResultCard component with score visualization
    - Create CommentsResultCard component with markdown rendering
    - Create CodeExamplesResultCard with syntax highlighting
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 9.2 Implement export functionality

    - Create exportAsJSON function
    - Create exportAsMarkdown function
    - Add export buttons to results view
    - _Requirements: 7.5_

  - [x] 9.3 Write property test for export validity
    - **Property 16: Export format validity**
    - **Validates: Requirements 7.5**

- [x] 10. Implement analysis history


  - [x] 10.1 Create history queries and UI

    - Implement listAnalyses query with sorting
    - Implement getAnalysisWithResults query
    - Create AnalysisHistory component
    - Create AnalysisCard component for list items
    - _Requirements: 8.1, 8.2_

  - [x] 10.2 Write property tests for history operations

    - **Property 17: History sorting**
    - **Property 18: Historical data immutability**
    - **Validates: Requirements 8.1, 8.2**
  - [x] 10.3 Implement history filtering


    - Add filter parameters to listAnalyses query
    - Create FilterPanel component
    - Implement date range picker
    - Implement repository and rubric selectors
    - Implement status filter
    - _Requirements: 8.3_

  - [x] 10.4 Write property test for filter correctness

    - **Property 19: Filter correctness**
    - **Validates: Requirements 8.3**

- [x] 11. Build main application pages






  - [x] 11.1 Create dashboard page

    - Build dashboard layout with navigation
    - Add recent analyses section
    - Add quick actions (new analysis, manage rubrics)
    - _Requirements: 8.1_

  - [x] 11.2 Create analysis workflow pages

    - Build new analysis page with repository and rubric selection
    - Build analysis progress page
    - Build analysis results page
    - _Requirements: 5.1, 6.1, 7.1, 7.2, 7.3, 7.4_

  - [x] 11.3 Create rubric management pages

    - Build rubrics list page
    - Build rubric editor page
    - Build template browser page
    - _Requirements: 2.1, 3.2_

- [x] 12. Final Checkpoint - Ensure all tests pass

  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Implement one-off public repository analysis

  - [x] 13.1 Create GitHub URL parser utility
    - Create lib/github-url.ts with parseGitHubUrl function
    - Support https://github.com/owner/repo format
    - Support https://github.com/owner/repo/tree/branch format
    - Support git@github.com:owner/repo.git format
    - Return parsed owner, repo, and optional branch
    - Return error for invalid/non-GitHub URLs
    - _Requirements: 9.1, 9.5, 9.6_

  - [x] 13.2 Write property tests for URL parsing
    - **Property 20: GitHub URL parsing correctness**
    - **Property 21: GitHub URL parsing round-trip**
    - **Property 23: Branch default behavior**
    - **Property 24: Invalid URL error handling**
    - **Validates: Requirements 9.1, 9.5, 9.6**

  - [x] 13.3 Update Convex schema for one-off analyses
    - Make repositoryId optional in analyses table
    - Add repositoryUrl field for one-off analyses
    - Add repositoryOwner, repositoryName, branch fields
    - Update indexes as needed
    - _Requirements: 9.3_

  - [x] 13.4 Create one-off analysis mutations
    - Implement createOneOffAnalysis mutation
    - Validate URL format before creating analysis
    - Store repositoryUrl instead of repositoryId
    - Populate owner/name/branch from parsed URL
    - _Requirements: 9.2, 9.3_

  - [x] 13.5 Write property test for one-off storage
    - **Property 22: One-off analysis storage structure**
    - **Validates: Requirements 9.3**

  - [x] 13.6 Update analysis orchestrator for one-off
    - Modify analyzeRepository task to accept repositoryUrl
    - Fetch public repo content without authentication
    - Handle branch resolution for default branch
    - _Requirements: 9.2, 9.4, 9.5_

  - [x] 13.7 Build one-off analysis UI
    - Create OneOffAnalysisForm component with URL input
    - Add URL validation with real-time feedback
    - Add branch input (optional, defaults to main/master)
    - Integrate with rubric selector
    - Add to new analysis page as alternative to connected repos
    - _Requirements: 9.1, 9.2, 9.5, 9.6_

  - [x] 13.8 Update analysis history for one-off
    - Update listAnalyses query to include one-off analyses
    - Update AnalysisCard to display repository URL for one-off
    - Add visual distinction between one-off and connected analyses
    - _Requirements: 9.7_

  - [x] 13.9 Write property test for history identification
    - **Property 25: One-off analysis history identification**
    - **Validates: Requirements 9.7**

- [x] 14. Implement range evaluation guidance requirement
  - [x] 14.1 Update Convex schema for range guidance
    - Add rangeGuidance field to rubricItems config in schema.ts
    - Field should be optional in schema but required for range type items
    - _Requirements: 2.4_

  - [x] 14.2 Update rubric item validation for range type
    - Modify addRubricItem mutation to require rangeGuidance for range type
    - Modify updateRubricItem mutation to validate rangeGuidance for range type
    - Return validation error if range type lacks guidance text
    - _Requirements: 2.4_

  - [x] 14.3 Write property test for range guidance validation
    - **Property 4.1: Range item requires guidance text**
    - **Validates: Requirements 2.4**

  - [x] 14.4 Update EvaluationTypeConfig UI for range type
    - Add textarea field for rangeGuidance in RangeConfig component
    - Add placeholder text explaining expected format (e.g., "1 = No tests, 5 = Comprehensive coverage")
    - Make field required with validation feedback
    - _Requirements: 2.4_

  - [x] 14.5 Update RubricItemConfig interface
    - Add rangeGuidance?: string to RubricItemConfig type
    - Update any type definitions that reference this interface
    - _Requirements: 2.4_

  - [x] 14.6 Update AI prompt for range evaluation
    - Modify evaluateRubricItem task to include rangeGuidance in prompt
    - Ensure AI uses guidance to determine appropriate score
    - _Requirements: 2.4_

  - [x] 14.7 Update system templates with range guidance
    - Add rangeGuidance to any existing range-type items in templates
    - Ensure templates pass validation
    - _Requirements: 2.4, 3.1_

- [ ] 15. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
