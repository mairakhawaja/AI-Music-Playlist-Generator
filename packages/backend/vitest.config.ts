import { mergeConfig } from "vitest/config";
import rootConfig from "../../vitest.config";

// Backend extends the root config with Node environment
export default mergeConfig(rootConfig, {
  test: {
    environment: "node",
    coverage: {
      // Include backend source files only
      include: ["src/**/*.{ts,js}"],
    },
  },
});
