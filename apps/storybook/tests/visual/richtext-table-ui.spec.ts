import { test, expect, type Page } from "@playwright/test";

/**
 * Real-Chromium behaviour of the editor's overlay UI: the More menu, the table grips / resize strips and
 * the table bar next to a pinned toolbar. jsdom has no layout, pointer hit-testing or real focus, so
 * none of this can be expressed there. No screenshots: pure assertions, runnable on a developer machine.
 */

const story = (id: string) => `/iframe.html?id=components-spezrichtext-tables--${id}&viewMode=story`;

async function open(page: Page, id: string): Promise<void> {
  await page.setViewportSize({ width: 1000, height: 700 });
  await page.goto(story(id));
  await page.locator("spez-richtext table").first().waitFor();
}

const tables = (page: Page) => page.locator("spez-richtext table.spez-rte-table");

test.describe("More menu Escape", () => {
  test("closes after a mouse open while focus is still in the editor", async ({ page }) => {
    await open(page, "default-toolbar");
    await page.locator("spez-richtext .spez-rte-editor p").first().click();
    await page.locator(".spez-rte-more__btn").click();
    await expect(page.locator(".spez-rte-more__panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".spez-rte-more__panel")).toBeHidden();
    await expect(page.locator(".spez-rte-more__btn")).toBeFocused();
    await expect(page.locator(".spez-rte-more__btn")).toHaveAttribute("aria-expanded", "false");
  });

  test("closes after a mouse open with nothing focused", async ({ page }) => {
    await open(page, "default-toolbar");
    await page.locator(".spez-rte-more__btn").click();
    await expect(page.locator(".spez-rte-more__panel")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".spez-rte-more__panel")).toBeHidden();
    await expect(page.locator(".spez-rte-more__btn")).toBeFocused();
  });

  test("Escape does not leak to the editor's own Escape handling (the caret stays in the table)", async ({ page }) => {
    await open(page, "default-toolbar");
    await tables(page).first().locator("td").first().click();
    await page.locator(".spez-rte-more__btn").click();
    await page.keyboard.press("Escape");
    await expect(page.locator(".spez-rte-more__panel")).toBeHidden();
    await expect(page.locator(".spez-rte-tbar")).toBeVisible();
  });
});

test.describe("table menus Escape", () => {
  test("bar menu closes on Escape after a mouse open", async ({ page }) => {
    await open(page, "basic");
    await tables(page).first().locator("td").first().click();
    await page.locator('.spez-rte-tbar button[aria-label="Cell background"]').click();
    await expect(page.locator(".spez-rte-tmenu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".spez-rte-tmenu")).toHaveCount(0);
  });

  test("grip menu closes on Escape after a mouse open", async ({ page }) => {
    await open(page, "basic");
    const cell = tables(page).first().locator("td").first();
    await cell.click();
    await cell.hover();
    await page.locator(".spez-rte-tgrip").first().click();
    await expect(page.locator(".spez-rte-tmenu")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.locator(".spez-rte-tmenu")).toHaveCount(0);
  });
});

test.describe("table menus Escape when focus is lost inside the menu", () => {
  test("grip menu closes on Escape after pressing its padding", async ({ page }) => {
    await open(page, "basic");
    const cell = tables(page).first().locator("td").first();
    await cell.click();
    await cell.hover();
    await page.locator(".spez-rte-tgrip").first().click();
    const menu = page.locator(".spez-rte-tmenu");
    await expect(menu).toBeVisible();
    const box = (await menu.boundingBox())!;
    // The menu's own padding: not a button, so focus falls to <body>.
    await page.mouse.click(box.x + 1, box.y + 1);
    await page.keyboard.press("Escape");
    await expect(menu).toHaveCount(0);
  });
});

test.describe("hover-driven grips and resize strips", () => {
  test("strips and grips show on hover after Escape leaves the table", async ({ page }) => {
    await open(page, "basic");
    const cell = tables(page).first().locator("td").first();
    await cell.click();
    await page.keyboard.press("Escape");
    await page.mouse.move(5, 5);
    await expect(page.locator(".spez-rte-tresize")).toHaveCount(0);
    await cell.hover();
    await expect(page.locator(".spez-rte-tresize").first()).toBeVisible();
    await expect(page.locator(".spez-rte-tgrip").first()).toBeVisible();
  });

  test("strips and grips show on hover when the caret is in no table at all", async ({ page }) => {
    await open(page, "basic");
    await page.locator("spez-richtext .spez-rte-editor p").first().click();
    await page.mouse.move(5, 5);
    await tables(page).first().locator("td").nth(1).hover();
    await expect(page.locator(".spez-rte-tresize").first()).toBeVisible();
    await expect(page.locator(".spez-rte-tgrip").first()).toBeVisible();
    await expect(page.locator(".spez-rte-tbar")).toBeHidden();
  });

  test("strips follow the pointer after Escape from the table bar and from the toolbar", async ({ page }) => {
    await open(page, "basic");
    const cell = tables(page).first().locator("td").first();
    const focusIn = (sel: string) =>
      page.evaluate((q) => !!document.activeElement?.closest(q), sel);
    await cell.click();
    await expect(page.locator(".spez-rte-tbar")).toBeVisible();
    await page.keyboard.press("Alt+F9");
    expect(await focusIn(".spez-rte-tbar")).toBe(true);
    await page.keyboard.press("Escape");
    expect(await focusIn(".spez-rte-editor")).toBe(true);
    await page.keyboard.press("Alt+F10");
    expect(await focusIn(".spez-rte-toolbar")).toBe(true);
    await page.keyboard.press("Escape");
    expect(await focusIn(".spez-rte-editor")).toBe(true);
    // Escape in the text steps out of the table: the caret is no longer in it, the pointer still is.
    await page.keyboard.press("Escape");
    await page.mouse.move(5, 5);
    await cell.hover();
    await expect(page.locator(".spez-rte-tresize").first()).toBeVisible();
    await expect(page.locator(".spez-rte-tgrip").first()).toBeVisible();
    await expect(page.locator(".spez-rte-tbar")).toBeHidden();
  });

  test("hovering a second table shows that table's handles, not the caret table's", async ({ page }) => {
    await open(page, "two-tables");
    const [a, b] = [tables(page).nth(0), tables(page).nth(1)];
    await a.locator("td").first().click();
    await b.locator("td").first().hover();
    const bBox = (await b.boundingBox())!;
    const strip = page.locator(".spez-rte-tresize").first();
    await expect(strip).toBeVisible();
    const sBox = (await strip.boundingBox())!;
    expect(sBox.y).toBeGreaterThanOrEqual(bBox.y - 2);
    expect(sBox.y + sBox.height).toBeLessThanOrEqual(bBox.y + bBox.height + 2);
  });

  test("a hover-opened resize drag still resizes the column", async ({ page }) => {
    await open(page, "basic");
    const table = tables(page).first();
    await page.locator("spez-richtext .spez-rte-editor p").first().click();
    await table.locator("td").first().hover();
    const strip = page.locator(".spez-rte-tresize").first();
    await expect(strip).toBeVisible();
    const col = table.locator("colgroup col").first();
    const before = (await table.locator("th").first().boundingBox())!.width;
    const sb = (await strip.boundingBox())!;
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.mouse.down();
    await page.mouse.move(sb.x + sb.width / 2 + 60, sb.y + sb.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect.poll(async () => (await table.locator("th").first().boundingBox())!.width).toBeGreaterThan(before + 40);
    expect(await col.getAttribute("style")).toContain("width");
  });

  test("does not rebuild the overlay while the pointer moves inside one table", async ({ page }) => {
    await open(page, "basic");
    const table = tables(page).first();
    await table.locator("td").first().hover();
    await expect(page.locator(".spez-rte-tresize").first()).toBeVisible();
    const marker = await page.evaluate(() => {
      const el = document.querySelector(".spez-rte-tresize") as HTMLElement;
      el.dataset.mark = "1";
      return true;
    });
    expect(marker).toBe(true);
    const box = (await table.boundingBox())!;
    for (let i = 0; i < 8; i++) await page.mouse.move(box.x + 20 + i * 12, box.y + 20 + (i % 3) * 5);
    await page.waitForTimeout(100);
    expect(await page.locator('.spez-rte-tresize[data-mark="1"]').count()).toBe(1);
  });
});

test.describe("table bar and a pinned toolbar", () => {
  test("the bar never sits under or over the stuck toolbar", async ({ page }) => {
    await open(page, "sticky-toolbar");
    const table = tables(page).first();
    await table.locator("td").nth(4).click();
    for (const scrollBy of [0, 60, 120, 200]) {
      await page.evaluate((y) => window.scrollTo(0, y), scrollBy);
      await page.waitForTimeout(80);
      const r = await page.evaluate(() => {
        const rect = (s: string) => document.querySelector(s)!.getBoundingClientRect();
        const bar = document.querySelector(".spez-rte-tbar") as HTMLElement;
        const tb = rect(".spez-rte-toolbar");
        const b = rect(".spez-rte-tbar");
        const t = rect("spez-richtext table");
        return { hidden: bar.hidden, tbBottom: tb.bottom, tbTop: tb.top, barTop: b.top, barBottom: b.bottom, tableTop: t.top, tableBottom: t.bottom };
      });
      expect(r.hidden).toBe(false);
      // The bar's box does not intersect the toolbar's box.
      const overlap = r.barTop < r.tbBottom && r.barBottom > r.tbTop;
      expect(overlap, JSON.stringify({ scrollBy, ...r })).toBe(false);
      // And what is painted at the bar's centre is the bar, so it is reachable.
      const reachable = await page.evaluate(() => {
        const b = document.querySelector(".spez-rte-tbar")!.getBoundingClientRect();
        const hit = document.elementFromPoint(b.left + b.width / 2, b.top + b.height / 2);
        return hit !== null && !!hit.closest(".spez-rte-tbar");
      });
      expect(reachable, `scrollBy ${scrollBy}`).toBe(true);
    }
  });
});
