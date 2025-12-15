# Project Structure

## Directory Organization

### Core Application
- `app/` - Next.js App Router structure
  - `page.tsx` - Main entry point (renders ComponentExample)
  - `layout.tsx` - Root layout with fonts and metadata
  - `globals.css` - Global styles and Tailwind configuration
  - `favicon.ico` - Application icon

### Components
- `components/` - Reusable React components
  - `component-example.tsx` - Main showcase component
  - `example.tsx` - Example wrapper components
  - `ui/` - shadcn/ui component library
    - All UI primitives (button, card, dialog, etc.)
    - Follows shadcn naming conventions
    - Built on Base UI primitives

### Utilities & Configuration
- `lib/` - Utility functions
  - `utils.ts` - Common helpers (clsx, tailwind-merge)
- `public/` - Static assets (SVG icons)
- `convex/` - Backend integration (minimal usage)
  - `_generated/` - Auto-generated Convex files (do not edit)

### Configuration Files
- `components.json` - shadcn/ui configuration
- `biome.json` - Linting and formatting rules
- `tsconfig.json` - TypeScript configuration with path aliases
- `next.config.ts` - Next.js configuration
- `tailwind.config.*` - Tailwind CSS setup
- `.env.local` - Environment variables (not committed)

## Import Patterns
- Use `@/` alias for all internal imports
- Components from `@/components/ui/` for UI primitives
- Utilities from `@/lib/utils`
- Hugeicons imported from `@hugeicons/react` and `@hugeicons/core-free-icons`

## File Naming Conventions
- Components: PascalCase (`ComponentExample.tsx`)
- Utilities: camelCase (`utils.ts`)
- Pages: lowercase (`page.tsx`, `layout.tsx`)
- All TypeScript files use `.tsx` for components, `.ts` for utilities