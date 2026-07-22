import { defineConfig } from "vitest/config";

// Root-level base config — workspace packages extend this via `mergeConfig`
export default defineConfig({
  test: {
    // Default environment; overridden per workspace (backend: node, frontend: jsdom)
    environment: "node",
    // Glob patterns for test files
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Coverage configuration shared by all workspaces
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
      },
      // Exclude generated / config files from coverage
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "src/main.tsx",
        "src/main.ts",
      ],
    },
  },
});
