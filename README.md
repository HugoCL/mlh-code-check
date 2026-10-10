# MLH Code Inspector

AI code review for GitHub repositories, driven by rubrics you define. Built to help reviewers evaluate many code samples against the same criteria, such as fellowship applications.

[![License: AGPL-3.0](https://img.shields.io/badge/license-AGPL--3.0-blue)](LICENSE)
[![Demo](https://img.shields.io/badge/demo-vercel-black)](https://mlh-code-inspector.vercel.app)
![Next.js 16](https://img.shields.io/badge/Next.js-16-black)
![Convex](https://img.shields.io/badge/backend-Convex-orange)

Demo: <https://mlh-code-inspector.vercel.app> (requires signing in).

## What it does

- **Rubrics.** A rubric is an ordered list of criteria. Each item has a name, a description and an evaluation type: yes/no, numeric range, free-form comments, code examples (file path, line range, snippet and explanation) or options (single or multiple choice).
- **System templates.** Ships with ready-made rubrics (Fellowship Code Reviewer, Code Quality Basics, Security Review, Development Best Practices). Duplicate one and edit it.
- **Analyses.** Paste one or more GitHub repository URLs, one per line, pick a rubric and start. Branch and `/tree/...` URLs are parsed. Each rubric item is evaluated by its own AI call, in parallel.
- **Live progress.** Progress streams from the background job to the UI while the analysis runs. A failed item does not fail the whole analysis.
- **Connected repositories.** Save repositories you review often and reuse them.
- **History and filters.** Browse past analyses and filter by repository, rubric, status and date range.
- **Export.** Download any result as JSON or Markdown.

## How it works

1. The user starts an analysis from the dashboard. A Convex mutation creates the analysis record and a server action triggers the Trigger.dev task `analyze-repository`.
2. The task reads the repository through the GitHub API. It skips dependency, build and cache directories, and caps the content at 50 files, 100 KB per file and 500 KB total.
3. It fans out one `evaluate-rubric-item` task per rubric item. Each one calls `google/gemini-2.5-flash` through the Vercel AI SDK with a typed schema (`generateObject`) for that evaluation type.
4. Results are written back to Convex, and the UI updates through Convex's reactive queries.

## Stack

| Piece | Used for |
| --- | --- |
| Next.js 16 (App Router), React 19, TypeScript | Web app |
| Tailwind CSS 4, shadcn/ui, Base UI, Hugeicons | UI |
| Convex | Database, queries, mutations, HTTP endpoint for Clerk webhooks |
| Clerk | Authentication; Convex validates its JWTs |
| Trigger.dev v4 | Background jobs and run progress |
| Vercel AI SDK | Model calls with structured output |
| Vitest, fast-check, convex-test | Unit, property-based and integration tests |
| Biome | Lint and format |

Key folders:

```text
app/            Next.js routes: sign-in, sign-up, (dashboard)/dashboard/{analyses,rubrics,repositories}
app/actions/    Server actions that start analyses and issue Trigger.dev tokens
components/     Feature components (analysis, rubrics, results, history, repositories) and ui/
convex/         Schema, queries, mutations, auth config, Clerk webhook (http.ts)
trigger/        Trigger.dev tasks (analyze.ts)
lib/            GitHub URL parser, system rubric templates, JSON/Markdown export
__tests__/      Property-based and integration tests
.kiro/          Product specs and steering notes
```

## Run locally

Requirements: Node.js 20+, [pnpm](https://pnpm.io) 9, and free accounts on Convex, Clerk and Trigger.dev, plus a Vercel AI Gateway key.

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` (see the table below), then start the three processes in separate terminals:

```bash
# 1. Convex backend (creates a deployment, writes NEXT_PUBLIC_CONVEX_URL)
npx convex dev

# 2. Next.js
pnpm dev

# 3. Trigger.dev worker
npx trigger.dev@latest dev
```

Setup notes:

- In Clerk, create a JWT template named `convex` (the server action requests a token with that name) and set `CLERK_JWT_ISSUER_DOMAIN` in the Convex dashboard to your Clerk frontend API URL.
- Optional: add a Clerk webhook pointing to your Convex site URL at `/clerk-webhook` for `user.created` and `user.updated` events, so users are synced to Convex. Requests are verified with the Svix signature headers, so copy the endpoint's Signing Secret (Clerk Dashboard > Webhooks > endpoint) into the Convex deployment: `npx convex env set CLERK_WEBHOOK_SECRET whsec_...`. Without it the endpoint returns 500 for every event.
- `trigger.config.ts` has the author's Trigger.dev project id. Replace `project` with your own.
- Trigger.dev tasks run in their own environment. Set `NEXT_PUBLIC_CONVEX_URL`, `GITHUB_TOKEN` and `AI_GATEWAY_API_KEY` in your Trigger.dev project, not only in `.env.local`.

### Environment variables

| Name | Where | Purpose | Required |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local`, Trigger.dev | Convex deployment URL | Yes |
| `CONVEX_DEPLOYMENT` | `.env.local` | Deployment name used by the Convex CLI | Yes, written by `convex dev` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` | Clerk publishable key | Yes |
| `CLERK_SECRET_KEY` | `.env.local` | Clerk secret key | Yes |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex dashboard | Clerk issuer domain for validating JWTs | Yes |
| `CLERK_WEBHOOK_SECRET` | Convex dashboard | Svix signing secret that verifies Clerk webhook requests | Only if you use the webhook |
| `TRIGGER_SECRET_KEY` | `.env.local` | Lets the server action trigger tasks and create run tokens | Yes |
| `GITHUB_TOKEN` | Trigger.dev | Raises GitHub API rate limits and allows private repositories | Recommended |
| `AI_GATEWAY_API_KEY` | Trigger.dev | Vercel AI Gateway key used to call the model | Yes |

### Scripts

```bash
pnpm dev          # Next.js dev server
pnpm build        # Production build
pnpm start        # Run the production build
pnpm test         # Run the test suite once (Vitest)
pnpm test:watch   # Vitest in watch mode
pnpm biome check .  # Lint and format check
```

## Deploy

The demo runs on Vercel. Deploy the app there with the same variables, run `npx convex deploy` for the production Convex backend, and `npx trigger.dev@latest deploy` for the tasks.

## License

Code under GNU AGPL-3.0. You can use, modify and distribute it, including commercially, but if you modify it and offer it as a network service you must publish your source code under the same license. See [LICENSE](LICENSE).

## Author

Hugo Castro. [GitHub](https://github.com/HugoCL) · [hugocastro.dev](https://hugocastro.dev)
