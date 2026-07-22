// @ts-check
// Backend workspace — extends root config with Node-specific rules
import rootConfig from "../../eslint.config.js";

/** @type {import("eslint").Linter.FlatConfig[]} */
export default [
  ...rootConfig,
  {
    files: ["src/**/*.ts"],
    rules: {
      // Allow console in backend (structured logger is used, but console as fallback is acceptable)
      "no-console": "off",
    },
  },
];
