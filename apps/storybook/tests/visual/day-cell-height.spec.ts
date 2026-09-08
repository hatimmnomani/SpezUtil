import { test, expect, type Page } from "@playwright/test";

/**
 * Ruling R (task-6b, not in the original task-6-brief.md list): a permanent, non-screenshot
 * regression check for the month-view `day-cell` background layer.
 *
 * That layer shipped broken twice because jsdom performs no layout, so unit tests never caught
 * either failure: first `grid-row: 1 / -1` collapsed to the head row (measured 24px against a
 * 96px `.week`), then `grid-row: 1 / span 999` still fell short because `min-height` slack sits
 * outside every grid track (22px empty / 39px two-chip / 88px densest, against 96px). The fix
 * (packages/hijri-calendar/src/styles.ts `.day-cell`) takes the layer out of grid math entirely:
 * absolutely positioned via a `--_col` custom property inside a `position: relative` `.week`.
 *
 * This spec pins the resulting invariant directly in a real browser (Chromium, via Playwright) —
 * for every week row in the month view, `.day-cell`'s rendered height equals `.week`'s — at both
 * the default `--hcal-cell-min-height` and a content-driven case where that min-height is
 * collapsed to near-zero, across both empty and event-dense weeks. It needs no baseline image and
 * is expected to run green immediately, without ever touching Playwright's screenshot comparison
 * (see task-6b-report.md for the observed run output).
 */

const VIEWPORT = { width: 1200, height: 800 }; // "wide" band — matches editorial.spec.ts's wide entry

async function openMonth(page: Page): Promise<void> {
  await page.setViewportSize(VIEWPORT);
  await page.goto("/iframe.html?id=editorial--month&viewMode=story");
  await expect(page.locator('[part~="calendar"][part~="wide"]')).toHaveCount(1);
  await page.evaluate(() => document.fonts.ready);
}

/**
 * For every `.week` row in the month grid, reads the row's own rendered height and the rendered
 * height of each `.day-cell` absolutely positioned inside it. Runs inside the page, piercing into
 * `<hijri-calendar>`'s shadow root manually via `shadowRoot` — plain `document.querySelector`
 * does not pierce shadow roots the way Playwright's own locators do. Returns plain numbers
 * (`getBoundingClientRect().height`), never an image, per this task's "never read image files
 * back" rule.
 */
function measureWeekRows(page: Page): Promise<Array<{ weekHeight: number; cellHeights: number[] }>> {
  return page.evaluate(() => {
    const host = document.querySelector("hijri-calendar");
    const root = host?.shadowRoot;
    if (!root) throw new Error("hijri-calendar shadow root not found");
    return Array.from(root.querySelectorAll(".week")).map((week) => ({
      weekHeight: week.getBoundingClientRect().height,
      cellHeights: Array.from(week.querySelectorAll(".day-cell")).map(
        (cell) => cell.getBoundingClientRect().height,
      ),
    }));
  });
}

function assertEveryCellMatchesItsWeek(rows: Array<{ weekHeight: number; cellHeights: number[] }>): void {
  expect(rows.length).toBeGreaterThan(0);
  for (const row of rows) {
    expect(row.cellHeights.length).toBe(7); // every week row is 7 days
    for (const cellHeight of row.cellHeights) {
      expect(Math.abs(cellHeight - row.weekHeight)).toBeLessThan(0.5);
    }
  }
}

test.describe("month day-cell height invariant (Ruling R)", () => {
  test("at the default --hcal-cell-min-height, every day-cell matches its week's rendered height", async ({
    page,
  }) => {
    await openMonth(page);
    const rows = await measureWeekRows(page);
    assertEveryCellMatchesItsWeek(rows);

    // The Editorial/Month story's sampleEvents (stories/editorial.stories.ts) leave some weeks
    // fully empty and stack several overlapping events into the week of 2026-07-05, so this run
    // exercises the invariant against both shapes — but at this generous default min-height
    // (96px) every row still fits within it, so all seven day-cells across every row land on the
    // same rendered height. That itself is a useful data point (see task-6b-report.md): it is the
    // *next* test, with the min-height collapsed to near-zero, that actually forces content to
    // drive row height and is the one that would have caught the historical bug.
    const heights = rows.map((r) => r.weekHeight);
    expect(new Set(heights).size).toBe(1);
  });

  test("with --hcal-cell-min-height collapsed to near-zero, row height is content-driven and day-cell still tracks it", async ({
    page,
  }) => {
    await openMonth(page);
    // Override the min-height token directly on the host element so the row's rendered height
    // comes from grid content (`grid-auto-rows: min-content`) rather than the min-height floor —
    // this is exactly the code path task-2/task-5's two prior bugs escaped through in jsdom.
    await page.locator("hijri-calendar").evaluate((el) => {
      (el as HTMLElement).style.setProperty("--hcal-cell-min-height", "4px");
    });
    const rows = await measureWeekRows(page);
    assertEveryCellMatchesItsWeek(rows);

    const heights = rows.map((r) => r.weekHeight);
    // An "empty" week (no events) should shrink close to the near-zero floor...
    expect(Math.min(...heights)).toBeLessThan(40);
    // ...while an event-dense week grows well past it purely from stacked event content —
    // confirming this run actually forced the content-driven path, not just the min-height one
    // already covered by the test above.
    expect(Math.max(...heights)).toBeGreaterThan(40);
  });
});
