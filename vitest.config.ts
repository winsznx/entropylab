import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const packageEntry = (name: string): string =>
  fileURLToPath(new URL(`./packages/${name}/src/index.ts`, import.meta.url));

export default defineConfig({
  resolve: {
    // Mirrors the `paths` mapping in tsconfig.json so that a workspace import
    // resolves the same way for the type checker and the test runner.
    alias: {
      "@entropylab/core": packageEntry("core"),
      "@entropylab/fixtures": packageEntry("fixtures"),
      "@entropylab/report": packageEntry("report"),
    },
  },
  test: {
    include: ["packages/*/test/**/*.test.ts"],
    environment: "node",
  },
});
