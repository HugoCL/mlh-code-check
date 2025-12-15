# Repository Guidelines

## Project Structure & Module Organization
- `app/` holds the Next.js App Router entry (`page.tsx`) and shell (`layout.tsx`) plus global styles in `globals.css`.
- `components/` contains shared React pieces; `components/ui/` houses the shadcn-style primitives used across screens; `component-example.tsx` is the current showcase.
- `lib/utils.ts` stores small helpers; prefer adding misc utilities here over scattering them in components.
- `convex/` contains generated Convex client/server bindings; avoid manual edits and regenerate after Convex schema changes.
- `public/` is for static assets; build output lands in `.next/`.

## Build, Test, and Development Commands
- Install deps: `pnpm install` (Node 18+ recommended for Next 16).
- Local dev server: `pnpm dev` (http://localhost:3000).
- Production bundle: `pnpm build`; starts from app router and writes to `.next/`.
- Run prod server: `pnpm start` (requires prior build).
- Lint: `pnpm lint` uses ESLint with `eslint-config-next` rules; add `--fix` for autofixes.
- Format & secondary linting: `pnpm biome check .` (uses `biome.json`); `biome format .` enforces tabs and double quotes.

## Coding Style & Naming Conventions
- TypeScript-first, React 19 functional components; keep hooks at top level and avoid `any`, `var`, or `ts-ignore` (Biome enforces).
- Indentation is tabs; quotes are double by default. Stick to ES modules—CommonJS is blocked.
- Component files should use `PascalCase` (`ButtonGroup.tsx`); utility modules `camelCase` (`formatDate.ts`).
- Co-locate styles with components via Tailwind classes; prefer theme tokens defined in `app/globals.css` instead of ad-hoc colors.

## Testing Guidelines
- No automated tests are configured yet. When adding, place unit/component specs beside code in `__tests__` folders (e.g., `components/Button/__tests__/Button.test.tsx`).
- Prefer Vitest + Testing Library for React units and Playwright for critical flows. Document any new scripts in `package.json` and keep coverage expectations explicit in PRs.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.); current history uses `feat: initialize project` as precedent.
- Keep changes scoped; separate formatting-only commits when practical.
- PRs should include: concise summary, linked issue/task, screenshots or screen recordings for UI changes, and a short “Verification” list (e.g., `pnpm lint`, `pnpm build`).
- Mention if Convex artifacts were regenerated and which commands were run.

## Environment & Configuration
- Keep secrets in `.env.local`; do not commit it. Use `NEXT_PUBLIC_*` only for values safe to expose to the client.
- If Convex is enabled, ensure local env vars match the Convex dashboard before running `pnpm dev`.
