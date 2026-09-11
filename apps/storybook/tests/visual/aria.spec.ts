import { test, expect, type Page } from "@playwright/test";
import path from "node:path";

/**
 * Real axe audit of `<hijri-calendar>`'s ARIA structure, in Chromium.
 *
 * Why this exists: the month view shipped a **Critical** `aria-required-children` violation —
 * `.week[role="row"]` owned the event-chip buttons, the "+N more" buttons and the 42 `day-cell`
 * background divs, none of which is a permitted child of `role="row"`. The fix (per-day
 * `role="gridcell"` wrappers, the spanning event layer moved into its own `role="row"` inside a
 * `role="rowgroup"` week wrapper) is asserted structurally in jsdom too
 * (packages/hijri-calendar/src/aria-structure.test.ts), but those walkers re-implement the ARIA
 * rules by hand. This spec runs the actual audit tool that found the bug, so the fix is verified
 * against axe's own interpretation rather than ours.
 *
 * Scope: `cat.aria` rules only — every rule in the category the violation belonged to
 * (`aria-required-children`, `aria-required-parent`, `aria-allowed-attr`, `aria-roles`,
 * `nested-interactive`, …). Colour-contrast and document-structure rules are deliberately not
 * run here: the stories set their own editorial palette, so those would audit the *story's*
 * theme, not the component's (the component's own default palette is covered by the D8 token
 * assertions in hijri-calendar.test.ts).
 *
 * `axe-core` is an exact-pinned devDependency of this (private, unpublished) app — it was already
 * in the dependency graph as a transitive dependency of `@storybook/addon-a11y`, and no published
 * package gains a dependency from this. It is injected into the page as a plain script; the
 * `@axe-core/playwright` wrapper adds nothing this needs.
 */

// axe-core is a direct devDependency of this app, so pnpm links it into this app's own
// node_modules — a stable path, unlike anything under the .pnpm store.
const AXE_PATH = path.resolve(__dirname, "../../node_modules/axe-core/axe.min.js");

interface AxeNode {
  target: string[];
  failureSummary?: string;
}
interface AxeResult {
  id: string;
  impact?: string | null;
  help: string;
  nodes: AxeNode[];
}
interface AxeRun {
  violations: AxeResult[];
  incomplete: AxeResult[];
  passes: AxeResult[];
}

declare global {
  // eslint-disable-next-line no-var
  var axe: {
    run: (ctx: Element, opts: unknown) => Promise<AxeRun>;
  };
}

async function auditCalendar(page: Page): Promise<AxeRun> {
  await page.addScriptTag({ path: AXE_PATH });
  return page.evaluate(async () => {
    const host = document.querySelector("hijri-calendar");
    if (!host) throw new Error("hijri-calendar not found");
    // axe pierces open shadow roots on its own, so the host element is the whole context.
    const run = await globalThis.axe.run(host, {
      runOnly: { type: "tag", values: ["cat.aria"] },
      resultTypes: ["violations", "incomplete"],
    });
    const strip = (r: AxeRun["violations"]): AxeRun["violations"] =>
      r.map((v) => ({
        id: v.id,
        impact: v.impact ?? null,
        help: v.help,
        nodes: v.nodes.map((n) => ({ target: n.target, failureSummary: n.failureSummary })),
      }));
    return {
      violations: strip(run.violations),
      incomplete: strip(run.incomplete),
      // resultTypes trims node lists on passes, but the rule ids are what matter here.
      passes: run.passes.map((p) => ({ id: p.id, help: p.help, nodes: p.nodes })),
    };
  });
}

/** [story id, viewport width, attributes applied to the host before auditing] */
const CASES: Array<[string, string, number, Record<string, string>]> = [
  ["month", "editorial--month", 1200, {}],
  ["month with overflow more-links", "editorial--month", 1200, { "max-events": "1" }],
  ["month rtl", "editorial--month", 1200, { dir: "rtl" }],
  ["month narrow (dot mode)", "editorial--month", 420, {}],
  ["month narrow (scrolling chips)", "editorial--month", 420, { "narrow-events": "scroll" }],
  ["month loading", "editorial--month", 1200, { loading: "" }],
  ["week", "editorial--week", 1200, {}],
  ["day", "editorial--day", 1200, {}],
  ["day with banner header", "editorial--day", 1200, { "day-header": "banner" }],
  ["agenda", "editorial--month", 1200, { view: "agenda" }],
];

test.describe("hijri-calendar ARIA audit (axe-core, cat.aria)", () => {
  for (const [name, id, width, attrs] of CASES) {
    test(`${name}: no ARIA violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(`/iframe.html?id=${id}&viewMode=story`);
      await page.waitForSelector("hijri-calendar");
      await page.evaluate(() => document.fonts.ready);
      if (Object.keys(attrs).length > 0) {
        await page.locator("hijri-calendar").evaluate((el, a) => {
          for (const [k, v] of Object.entries(a as Record<string, string>)) el.setAttribute(k, v);
        }, attrs);
        // The size band is measured by a ResizeObserver, so let the re-render land.
        await page.waitForTimeout(150);
      }

      const { violations, passes } = await auditCalendar(page);
      // Report the full failure summary, not just a count, when this ever goes red.
      expect(
        violations.map((v) => `${v.id} (${v.impact}): ${v.help} @ ${v.nodes
          .map((n) => n.target.join(" "))
          .join(", ")}`),
      ).toEqual([]);
      // Non-vacuous: the two rules the month view used to fail must actually have run and passed
      // against real nodes, otherwise a structure that dropped its roles entirely would be
      // "clean" here.
      const passIds = passes.map((p) => p.id);
      expect(passIds).toContain("aria-allowed-attr");
      if (id === "editorial--month" && attrs.view !== "agenda") {
        expect(passIds).toContain("aria-required-children");
        expect(passIds).toContain("aria-required-parent");
      }
    });
  }
});
