# Repository Guidelines

## Project Overview
This is an **AI-powered code review application**. It allows users to define custom "Rubrics" (sets of criteria) and run AI agents to evaluate GitHub repositories against those rubrics.

## Architecture & Tech Stack

### Frontend
- **Framework**: Next.js 16 (App Router).
- **Styling**: Tailwind CSS 4 + shadcn/ui.
- **State/Data**: Convex React Client (`convex/react`). Real-time updates are core to the UX.

### Backend (Convex)
- **Database**: Convex provides a reactive database.
- **Functions**:
  - `queries`: Read data (fast, reactive).
  - `mutations`: Write data (transactional).
  - `actions`: Call third-party APIs (e.g., Clerk).
- **Schema**: Defined in `convex/schema.ts`.

### Background Jobs (Trigger.dev)
- **Orchestration**: Trigger.dev (v3) manages the analysis workflows.
- **Location**: `trigger/` directory.
- **Logic**:
  - Fetching repository content from GitHub.
  - Parallel execution of AI evaluations for each rubric item.
  - Interacting with Convex to update status/results.

### AI & LLMs
- **SDK**: Vercel AI SDK (`ai`).
- **Models**: Google Gemini (`google/gemini-2.5-flash`) is currently used in `trigger/analyze.ts`.

## Project Structure

- `app/` - Next.js App Router.
  - `(dashboard)/` - Protected routes (dashboard, analysis, rubrics).
  - `api/` - API routes (e.g., for webhooks).
- `components/` - React components.
  - `ui/` - shadcn/ui primitives.
- `convex/` - Convex backend code.
  - `schema.ts` - Database schema.
  - `*.ts` - Query/Mutation modules.
- `trigger/` - Trigger.dev background tasks.
  - `analyze.ts` - Main analysis logic.
- `lib/` - Shared utilities.
- `.kiro/` - Documentation and specs.

## Development Guidelines

### 1. Database & Schema (Convex)
- **Schema Changes**: Edit `convex/schema.ts`. Convex automatically pushes changes in dev.
- **Data Access**: Always use `query` for reading and `mutation` for writing.
- **Type Safety**: Use `v` from `convex/values` to define validators.

### 2. Background Tasks (Trigger.dev)
- **Task Definition**: Define tasks in `trigger/` using `task()`.
- **Convex Interaction**: Use `ConvexHttpClient` inside Trigger tasks to read/write to Convex.
- **Testing**: Trigger tasks can be tested using the Trigger.dev dashboard or local dev tools.

### 3. UI Components
- **Style**: Use Tailwind utility classes.
- **Components**: Re-use `components/ui` elements.
- **Icons**: Use `@hugeicons/react`.

### 4. Code Quality
- **Linting/Formatting**: Run `pnpm biome check .` before committing.
- **Imports**: Use `@/` alias for root-relative imports.

## Build & Test Commands

- **Install**: `pnpm install`
- **Dev**: `pnpm dev` (Runs Next.js + Convex). Trigger.dev requires a separate process (`npx trigger.dev@latest dev`).
- **Lint**: `pnpm biome check .`
- **Build**: `pnpm build`

## Feature Implementation Status
Refer to `.kiro/specs/ai-code-review/requirements.md` for detailed feature specifications.
The current implementation supports:
- Auth (Clerk)
- Rubric Management (CRUD)
- Repository Connection (GitHub) & One-off Analysis
- Analysis Execution (Trigger.dev) with streaming results
