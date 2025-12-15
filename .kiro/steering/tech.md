# Technology Stack

## Core Framework
- **Next.js 16.0.10** - React framework with App Router
- **React 19.2.1** - UI library with latest features
- **TypeScript 5** - Type safety and developer experience

## UI & Styling
- **shadcn/ui** - Component library with base-maia style
- **Base UI (@base-ui/react)** - Headless UI primitives
- **Tailwind CSS 4** - Utility-first CSS framework
- **Hugeicons** - Icon library for consistent iconography
- **next-themes** - Theme switching support

## Development Tools
- **Biome** - Fast linter and formatter (replaces ESLint + Prettier)
- **pnpm** - Package manager (required, specified in packageManager field)
- **ESLint** - Additional linting with Next.js config

## Backend Integration
- **Convex** - Real-time backend platform (configured but minimal usage)

## Build & Development Commands

### Essential Commands
```bash
# Install dependencies (use pnpm only)
pnpm install

# Development server
pnpm dev

# Production build
pnpm build

# Production server (requires build first)
pnpm start

# Linting
pnpm lint

# Format and lint with Biome
pnpm biome check .
pnpm biome format .
```

### Code Quality
- Biome enforces tabs for indentation and double quotes
- TypeScript strict mode enabled
- No CommonJS allowed (ES modules only)
- Accessibility rules enabled for React components