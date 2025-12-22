# Technology Stack

## Core Framework
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript 5** - Type safety

## Backend & Data
- **Convex** - Real-time database and backend functions. Handles data persistence, real-time subscriptions, and API endpoints.
- **Clerk** - User authentication and session management.

## Background Processing & AI
- **Trigger.dev v3** - Background job processing for long-running analysis tasks.
    - Manages the orchestration of parallel AI evaluations.
    - Handles GitHub API interaction (fetching repository content).
- **Vercel AI SDK** - Standard interface for LLM interactions.
- **Google Gemini** - Current model used for evaluation (`google/gemini-2.5-flash`).

## UI & Styling
- **shadcn/ui** - Component library.
- **Tailwind CSS 4** - Utility-first CSS framework.
- **Base UI** - Headless UI primitives.
- **Hugeicons** - Icon library.
- **next-themes** - Dark mode support.

## Development Tools
- **Biome** - Fast linter and formatter.
- **pnpm** - Package manager.
