import { defineConfig } from "@playwright/test";

// Visual regression tests against the built Storybook. Baselines are generated and compared
// only inside the CI container (see tests/visual/README.md) — never on a developer machine —
// because Playwright's screenshot comparison is sensitive to the OS/font-rendering stack, and
// CI runs `mcr.microsoft.com/playwright:v1.63.0-jammy` (pinned identically to the
// @playwright/test devDependency version in package.json).
export default defineConfig({
  testDir: "./tests/visual",
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  projects: [{ name: "chromium" }],
  // baseURL lets specs navigate with a path only (e.g. "/iframe.html?id=...&viewMode=story"),
  // matching the webServer's url below.
  use: {
    baseURL: "http://127.0.0.1:6007",
  },
  // Serve the static Storybook build (faster and more deterministic than `storybook dev`) —
  // the CI `visual` job builds it first (see .github/workflows/ci.yml).
  webServer: {
    command: "pnpm exec http-server storybook-static -p 6007 -s",
    url: "http://127.0.0.1:6007",
  },
});
