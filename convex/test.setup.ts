// This file sets up the modules for convex-test
// It uses import.meta.glob to load all convex modules
// @ts-expect-error - Vite's import.meta.glob is available at runtime
export const modules = import.meta.glob("./**/*.ts");
