import { mergeConfig } from "vitest/config";
import rootConfig from "../../vitest.config";

// Frontend extends the root config with jsdom environment for React component tests
export default mergeConfig(rootConfig, {
  test: {
    environment: "jsdom",
    // React Testing Library setup file (created in task 1.3)
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      // Include frontend source files only
      include: ["src/**/*.{ts,tsx}"],
    },
  },
});
