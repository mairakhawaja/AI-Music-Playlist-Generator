import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    host: '127.0.0.1',
    https: true,
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        lines: 80,
      },
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "node_modules/**",
        "dist/**",
        "coverage/**",
        "**/*.config.{ts,js}",
        "**/*.d.ts",
        "src/main.tsx",
      ],
    },
  },
} as Parameters<typeof defineConfig>[0]);
