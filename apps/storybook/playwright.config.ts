import { defineConfig } from "@playwright/test";

// Visual regression tests against the built Storybook. Baselines are generated and compared
// only inside the CI container (see tests/visual/README.md) — never on a developer machine —
// because Playwright's screenshot comparison is sensitive to the OS/font-rendering stack, and
// CI runs `mcr.microsoft.com/playwright:v1.63.0-jammy` (pinned identically to the
// @playwright/test devDependency version in package.json).
export default defineConfig({
  testDir: "./tests/visual",
  // Playwright's built-in default reporter (`dot` in CI, `list` locally) never writes
  // playwright-report/ — only the "html" reporter does. The CI `visual` job uploads
  // apps/storybook/playwright-report on failure, so it must be configured explicitly here or
  // that upload step silently finds nothing. `open: "never"` stops it trying to launch a
  // browser in CI/headless environments.
  reporter: [["dot"], ["html", { outputFolder: "playwright-report", open: "never" }]],
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
