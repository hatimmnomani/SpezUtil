import { test, expect, type Locator, type Page } from "@playwright/test";

/**
 * Screenshot baselines for the "Editorial" stories (task-6-brief.md, Part 1 task 2). Covers
 * `Editorial/Month`, `Week` and `Day` at the three §5.9 size-band viewports; `Week` gets a second,
 * scrolled shot at `medium`/`narrow` proving the sticky time gutter (see wireStickyGutter() in
 * hijri-calendar.ts) stays pinned while the grid body scrolls underneath it.
 *
 * Per Ruling E (task-6b), this suite generates **no baseline images** in this environment —
 * baselines are generated only inside the pinned CI container (see ../README.md). Every test here
 * is expected to fail locally with "A snapshot doesn't exist" rather than a selector/navigation
 * error; that failure mode is itself the local verification (see task-6b-report.md).
 *
 * The story×viewport matrix is data (`STORIES` × `BANDS`) rather than nine copy-pasted blocks, per
 * this repo's first Playwright suite setting the shape others will copy.
 */

type Band = "wide" | "medium" | "narrow";
type Story = "month" | "week" | "day";

// §5.9 thresholds: wide >= 900, medium 600-899, narrow < 600. The Editorial stories wrap the
// calendar in a `<div style="width: <hostWidth>px; max-width: 100%">` capped at 900px by default
// (stories/editorial.stories.ts) and the calendar itself is `display: block; max-width: 100%`, so
// it always shrinks to fit that wrapper — which in turn shrinks to fit the viewport once the
// viewport is narrower than 900px. These three viewports were verified (see task-6b-report.md) to
// land the component's own ResizeObserver-driven size band on wide/medium/narrow respectively.
const VIEWPORTS: Record<Band, { width: number; height: number }> = {
  wide: { width: 1200, height: 800 },
  medium: { width: 768, height: 1024 },
  narrow: { width: 420, height: 900 },
};

const STORIES: Story[] = ["month", "week", "day"];
const BANDS: Band[] = ["wide", "medium", "narrow"];

/**
 * Locates the shadow-internal `.cal` root that carries `part="calendar <band>"` (§5.9). Waiting
 * for this — rather than a fixed delay — is the real readiness signal: the component classifies
 * its own width via `ResizeObserver` and only then stamps the band token, so the token's
 * appearance is proof the responsive layout has settled.
 *
 * `part` lives on an element inside `<hijri-calendar>`'s shadow root, not in the light DOM.
 * Playwright's default `css` selector engine pierces open shadow roots automatically, so a plain
 * attribute selector reaches it directly — verified empirically while writing this suite (see
 * task-6b-report.md) rather than assumed.
 */
function calendarRoot(page: Page, band: Band): Locator {
  return page.locator(`[part~="calendar"][part~="${band}"]`);
}

async function openStory(page: Page, story: Story, band: Band): Promise<void> {
  await page.setViewportSize(VIEWPORTS[band]);
  await page.goto(`/iframe.html?id=editorial--${story}&viewMode=story`);
  await expect(calendarRoot(page, band)).toHaveCount(1);
  // Per ../README.md ("Determinism"): the vendored fonts use font-display: block, but every spec
  // in this directory should still wait on document.fonts.ready before its first screenshot so a
  // shot is never taken before they've actually finished loading.
  await page.evaluate(() => document.fonts.ready);
}

for (const story of STORIES) {
  for (const band of BANDS) {
    const { width, height } = VIEWPORTS[band];

    test(`editorial--${story} @ ${width}x${height} (${band} band) matches baseline`, async ({ page }) => {
      await openStory(page, story, band);
      await expect(page).toHaveScreenshot(`${story}-${width}.png`);
    });
  }
}

// Week view only: per §5.9's responsive model, only week's 7 columns overflow into
// `part="scroll"` at the medium/narrow bands (day view is a single column and never scrolls
// horizontally at any band), so only week gets a second, scrolled shot.
for (const band of ["medium", "narrow"] as const) {
  const { width, height } = VIEWPORTS[band];

  test(`editorial--week @ ${width}x${height} (${band} band) gutter stays pinned when scrolled`, async ({
    page,
  }) => {
    await openStory(page, "week", band);
    const scroller = page.locator('[part~="scroll"]');
    await expect(scroller).toHaveCount(1);
    await scroller.evaluate((el) => {
      (el as HTMLElement).scrollLeft = 200;
    });
    // wireStickyGutter() (hijri-calendar.ts) only applies its translateX() correction once it
    // measures a non-zero gap on the container's `scroll` event; wait for that transform to land
    // instead of a fixed delay, so the shot is never taken mid-sync.
    await expect(page.locator('[part~="time-gutter"]')).not.toHaveCSS("transform", "none");
    await expect(page).toHaveScreenshot(`week-${width}-scrolled.png`);
  });
}
