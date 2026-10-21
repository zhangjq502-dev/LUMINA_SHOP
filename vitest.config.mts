import react from "@vitejs/plugin-react";
import {fileURLToPath,URL} from "node:url";
import { defineConfig } from "vitest/config";
import { testDatabaseUrl } from "./tests/config.ts";
export default defineConfig({
  plugins:[react()],
  resolve:{alias:{"@":fileURLToPath(new URL("./src",import.meta.url))}},
  test: {
    include: ["tests/**/*.test.{ts,tsx}"],
    globalSetup: ["./tests/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 30000,
    env: { TEST_DATABASE_URL: testDatabaseUrl },
  },
});
