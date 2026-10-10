import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Own the static preview lifecycle: concurrent development reloads must not
// reset execution midway through a regression. Freeze dist into this directory
// after a successful build; it is outside other sessions' build output.
const port = Number(process.env.BOOK_TEST_PORT || "4357");
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid test port");
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  ...base,
  use: { ...base.use, baseURL },
  webServer: {
    command: `npm run preview -- --port ${port} --outDir /tmp/dsa-part-v-validation --host 127.0.0.1`,
    url: baseURL,
    reuseExistingServer: false,
    env: { ASTRO_TELEMETRY_DISABLED: "1" },
  },
});
