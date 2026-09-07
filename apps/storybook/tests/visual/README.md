# Visual regression tests

Playwright screenshot tests against the built Storybook (`editorial.spec.ts` — see the P5/task-2
dispatch that adds it; this README covers the workflow around it, which already applies to any spec
placed in this directory).

## Why baselines are never generated locally

Playwright's screenshot comparison is sensitive to the OS font-rendering stack (subpixel hinting,
anti-aliasing), so a baseline PNG captured on macOS will not byte-for-byte match one captured on the
Linux container CI runs in — every CI run would fail against a macOS-generated baseline. Baselines are
therefore generated, updated and reviewed **only** inside the same container image CI uses:
`mcr.microsoft.com/playwright:v1.63.0-jammy` — pinned identically to the `@playwright/test`
devDependency version in `../../package.json` (a mismatch there means the container's bundled browser
binaries don't match the version driving them).

## Updating baselines

1. Make your change (a story, a component style, a new spec).
2. Run the update inside the container, from the repo root:

   ```sh
   docker run --rm -v "$PWD":/work -w /work mcr.microsoft.com/playwright:v1.63.0-jammy \
     pnpm --filter @spezutil/storybook test:visual:update
   ```

   This rebuilds nothing by itself — run `pnpm build --filter @spezutil/storybook...` first (or let
   `pnpm turbo run test:visual` do it, since the turbo task depends on `build`) so the Storybook static
   build the tests screenshot is current.
3. Review the new/changed PNGs under `editorial.spec.ts-snapshots/` as you would any other diff —
   `git diff --stat` shows which images changed; open them to confirm the change is expected.
4. If the run finds *unexpected* diffs against existing baselines, Playwright writes actual/expected/
   diff images plus an HTML report to `../../playwright-report/index.html` — `playwright.config.ts`
   configures the `html` reporter explicitly with that `outputFolder` (Playwright's own default
   reporter, `dot` in CI or `list` locally, never writes this directory, so it has to be turned on).
   Locally, open `../../playwright-report/index.html` directly in a browser. In CI, that same folder
   is uploaded as the `playwright-report` artifact whenever the `visual` job fails (see
   `.github/workflows/ci.yml`) — download it from the failed run's Summary page, unzip it, and open
   `index.html` to see the actual/expected/diff images for what changed.
5. Commit the updated baselines in their own commit, prefixed `test(visual):`, with no changeset (this
   phase carries no package version).

## Running the suite

- `pnpm --filter @spezutil/storybook test:visual` — run once against whatever is already at
  `storybook-static/` (the config's `webServer` serves it with `http-server`; build first with
  `pnpm --filter @spezutil/storybook build` if it's stale).
- `pnpm turbo run test:visual` — same, but lets turbo build `@spezutil/storybook` (and its workspace
  dependencies) first, since the turbo task depends on `build`.
- `pnpm --filter @spezutil/storybook test:visual:update` — regenerate baselines. **Only meaningful
  inside the container** (step 2 above) — run bare on a developer machine and every image will differ
  from what CI expects.

## Determinism

The `Editorial` stories fix `date="2026-07-06"` and hide the live now-line (`now-indicator="none"`) so
screenshots don't drift by the minute, and the reference type ramp (Newsreader / Public Sans / JetBrains
Mono) is vendored locally under `../../public/fonts/` with `@font-face` rules in
`../../.storybook/preview-head.html` — the suite never depends on a Google Fonts network fetch. See
`playwright.config.ts` for the `expect.toHaveScreenshot` defaults (`maxDiffPixelRatio: 0.01`,
`animations: "disabled"`, `caret: "hide"`) that keep comparisons stable against minor anti-aliasing
noise.

The vendored `@font-face` rules use `font-display: block`, not the more common `swap`: `swap` lets the
browser paint a fallback font first and swap in the real one once it loads, which is a race a
screenshot can land on either side of — the opposite of what a baseline comparison wants. `block`
makes the browser wait briefly for the real font instead. Belt and braces, **any new spec in this
directory should still `await page.evaluate(() => document.fonts.ready)` (or equivalent) before its
first `toHaveScreenshot()` call**, so a screenshot is never taken before the vendored fonts have
actually finished loading.
