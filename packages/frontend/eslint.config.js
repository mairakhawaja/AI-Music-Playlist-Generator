// @ts-check
// Frontend workspace — extends root config with React-specific rules
import rootConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...rootConfig,
  {
    files: ["src/**/*.{ts,tsx}"],
    rules: {
      // React-specific overrides (react/jsx-* rules added when react eslint plugin is installed in task 1.3)
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
];
