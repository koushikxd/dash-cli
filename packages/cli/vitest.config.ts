import { defineConfig } from "vitest/config";
import { resolve } from "path";

export default defineConfig({
  test: {
    include: ["tests/specs/**/*.ts"],
    exclude: ["tests/utils.ts"],
    pool: "threads",
  },
  resolve: {
    alias: {
      "~": resolve(__dirname, "src"),
    },
  },
});
