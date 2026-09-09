import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendar, formatNumerals, translitMonthNames } from "@spezutil/hijri-core";
import { HijriCalendarElement } from "./hijri-calendar";

const cal = createCalendar();

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
});

beforeEach(() => {
  document.body.innerHTML = "";
});

function mount(attrs: Record<string, string> = {}): HijriCalendarElement {
  const el = document.createElement("hijri-calendar") as HijriCalendarElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function sr(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

function cellFor(el: HijriCalendarElement, iso: string): HTMLElement {
  return sr(el).querySelector(`[data-date="${iso}"]`) as HTMLElement;
}

function partTokens(el: Element): string[] {
  return (el.getAttribute("part") ?? "").split(/\s+/).filter(Boolean);
}

/**
 * R1 (background layer behind the button, in DOM as well as stacking order), re-expressed for
 * the per-day `role="gridcell"` structure the ARIA fix introduced: a week row's children are
 * exactly 7 gridcells, and inside each one the `day-cell` background div is the first child and
 * its `day` button the second. Before that fix the same invariant read "the row's first seven
 * children are the 7 day-cell divs, and no `day` button appears before index 7" — the day-cell
 * still precedes its own column's button, it is just now scoped to the cell rather than the row
 * (the flat form was also weaker: it only checked that *some* button came after all seven
 * layers, not that each layer precedes *its own* button).
 */
function expectCellPrecedesItsButton(week: Element): void {
  const cells = Array.from(week.children) as HTMLElement[];
  expect(cells.length).toBe(7);
  for (const cell of cells) {
    expect(cell.getAttribute("role")).toBe("gridcell");
    const children = Array.from(cell.children) as HTMLElement[];
    expect(children.length).toBe(2);
    expect(children[0]!.tagName).toBe("DIV");
    expect(partTokens(children[0]!)).toContain("day-cell");
    expect(children[1]!.tagName).toBe("BUTTON");
    expect(partTokens(children[1]!)).toContain("day");
    // Same column: the layer's data-cell index and the button's data-i index must agree.
    expect(children[0]!.dataset.cell).toBe(children[1]!.dataset.i);
  }
}

describe("<hijri-calendar> month day-cell background layer", () => {
  it("renders exactly 42 [part~=day-cell] layers per month", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelectorAll('[part~="day-cell"]').length).toBe(42);
  });

  it("takes each day-cell out of grid placement (--_col only, no grid-row/grid-column) so it can be positioned to fill .week-wrap's real rendered box rather than a track-bounded grid area", () => {
    // Fix history: the week wrapper has `min-height: var(--hcal-cell-min-height)`, so any week
    // whose real content (day row + chip lanes + more-link row) is shorter than that min-height
    // has leftover space sitting *after* the last grid line of the rows inside it — nothing
    // placed via grid-row, at any span (`1 / -1` or `1 / span 999`), can reach into it, since a
    // grid item's box is bounded by the tracks it spans. The layer is therefore not a grid item
    // at all: no `grid-row`/`grid-column` in its inline style (a definite grid position would
    // make an absolutely-positioned element use that grid *area*, not its nearest positioned
    // ancestor's padding box, as its containing block — see styles.ts's `.day-cell` comment).
    // Since the ARIA fix the positioned ancestor is `.week-wrap` (role="rowgroup") rather than
    // `.week` itself, because `.week` is now only the day row; the mechanism is otherwise
    // unchanged. jsdom performs no layout, so it cannot see whether the rendered box actually
    // reaches the wrapper's real height — that's a Playwright-only assertion (see
    // apps/storybook/tests/visual/day-cell-height.spec.ts) — but it CAN honestly see that no
    // grid placement was emitted, and that the CSS declares the absolute/inset mechanism, that
    // `.week-wrap` is the positioned box, and that neither `.week` nor `.week-cell` is.
    const el = mount({ date: "2026-07-06" });
    const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-cell]"));
    expect(cells.length).toBe(42);
    for (let d = 0; d < 7; d++) {
      const cell = cells[d]!;
      expect(cell.style.getPropertyValue("--_col")).toBe(String(d));
      expect(cell.style.gridRow).toBe("");
      expect(cell.style.gridColumn).toBe("");
    }
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\.day-cell\s*\{[^}]*position:\s*absolute/);
    expect(css).toMatch(/\.day-cell\s*\{[^}]*top:\s*0\b/);
    expect(css).toMatch(/\.day-cell\s*\{[^}]*bottom:\s*0\b/);
    expect(css).toMatch(/\.day-cell\s*\{[^}]*inset-inline-start:\s*calc\(var\(--_col/);
    // The containing block: .week-wrap is positioned and carries the min-height; the day row and
    // the day gridcell must not be positioned, or .day-cell would be re-bounded to the day row.
    expect(css).toMatch(/\.week-wrap\s*\{[^}]*min-height:\s*var\(--hcal-cell-min-height\)/);
    expect(css).toMatch(/\.week-wrap\s*\{[^}]*position:\s*relative/);
    expect(css).not.toMatch(/\.week\s*\{[^}]*position:/);
    expect(css).not.toMatch(/\.week-cell\s*\{[^}]*position:/);
  });

  it("marks the out token consistently with its column's day-head button (out-of-Hijri-month cells)", () => {
    const el = mount({ date: "2026-07-06" });
    const buttons = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-i]"));
    const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-cell]"));
    expect(buttons.length).toBe(42);
    expect(cells.length).toBe(42);
    // Sanity: some cells are out-of-month (a Hijri month is 29 or 30 days, never a full 42-cell
    // 6-week grid), so this isn't a vacuous check.
    expect(buttons.some((b) => b.classList.contains("out"))).toBe(true);
    for (let i = 0; i < 42; i++) {
      expect(partTokens(cells[i]!).includes("out")).toBe(buttons[i]!.classList.contains("out"));
    }
  });

  it('marks exactly one day-cell as today when today is inside the visible grid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 12, 0)));
    try {
      const el = mount({ date: "2026-07-06" });
      const cells = Array.from(sr(el).querySelectorAll<HTMLElement>('[part~="day-cell"]'));
      const todayCells = cells.filter((c) => partTokens(c).includes("today"));
      expect(todayCells.length).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('weekend-days="5 6" lands the weekend token on columns 6 and 7 (Fri/Sat) for week-start="0"', () => {
    const el = mount({ date: "2026-07-06", "weekend-days": "5 6" });
    const firstWeekCells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-cell]")).slice(
      0,
      7
    );
    const weekendIdx = firstWeekCells
      .map((c, i) => (partTokens(c).includes("weekend") ? i : -1))
      .filter((i) => i !== -1);
    expect(weekendIdx).toEqual([5, 6]);
  });

  it('moves the weekend day-cell columns to match week-start="1" (Mon-first), same as the weekday header', () => {
    const el = mount({ date: "2026-07-06", "week-start": "1" });
    const firstWeekCells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-cell]")).slice(
      0,
      7
    );
    const weekendIdx = firstWeekCells
      .map((c, i) => (partTokens(c).includes("weekend") ? i : -1))
      .filter((i) => i !== -1);
    // Default weekend-days="0 6" (Sun/Sat); with Monday-first columns those land at the end.
    expect(weekendIdx).toEqual([5, 6]);
    // Every day-cell still precedes its own column's button, exactly as under week-start=0.
    expectCellPrecedesItsButton(sr(el).querySelector(".week")!);
  });

  it("precedes its column's day button in DOM order within every week row (R1)", () => {
    const el = mount({ date: "2026-07-06" });
    const weeks = Array.from(sr(el).querySelectorAll(".week"));
    expect(weeks.length).toBe(6);
    for (const week of weeks) expectCellPrecedesItsButton(week);
  });

  it("gives .day-head a z-index and a visible :focus-visible ring, not outline:none (R1)", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\.day-head\s*\{[^}]*z-index:\s*1/);
    const focusVisible = css.match(/\.day-head:focus-visible\s*\{([^}]*)\}/);
    expect(focusVisible).toBeTruthy();
    expect(focusVisible![1]).not.toMatch(/outline:\s*none/);
  });
});

describe("<hijri-calendar> day-cell click forwarding", () => {
  it("fires date-click with the same detail as clicking its button", () => {
    const el = mount({ date: "2026-07-06" });
    const button = cellFor(el, "2026-07-06");
    const div = sr(el).querySelector(`[data-cell="${button.dataset.i}"]`) as HTMLElement;
    let detail: { gregorian: string; hijri: { day: number } } | null = null;
    el.addEventListener("date-click", (e) => (detail = (e as CustomEvent).detail));
    div.click();
    expect(detail).not.toBeNull();
    expect(detail!.gregorian).toBe("2026-07-06");
    expect(detail!.hijri).toEqual(cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6))));
  });

  it("does not fire date-click when the underlying button is disabled", () => {
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    el.isDateDisabled = (_h, g) => g.toISOString().slice(0, 10) === "2026-07-06";
    document.body.appendChild(el);

    const button = cellFor(el, "2026-07-06");
    expect(button.hasAttribute("disabled")).toBe(true);
    const div = sr(el).querySelector(`[data-cell="${button.dataset.i}"]`) as HTMLElement;
    let fired = false;
    el.addEventListener("date-click", () => (fired = true));
    div.click();
    expect(fired).toBe(false);
  });
});

describe("<hijri-calendar> today-marker", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('"dot" renders exactly one [part="today-indicator"] when today is in the grid', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 12, 0)));
    const el = mount({ date: "2026-07-06", "today-marker": "dot" });
    expect(sr(el).querySelectorAll('[part="today-indicator"]').length).toBe(1);
  });

  it('"none" renders zero today-indicators', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 12, 0)));
    const el = mount({ date: "2026-07-06", "today-marker": "none" });
    expect(sr(el).querySelectorAll('[part="today-indicator"]').length).toBe(0);
  });

  it('default ("pill") renders zero today-indicators and keeps .day-head.today .num-primary', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 6, 12, 0)));
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelectorAll('[part="today-indicator"]').length).toBe(0);
    expect(sr(el).querySelector(".day-head.today .num-primary")).toBeTruthy();
  });
});

describe("<hijri-calendar> month-marker", () => {
  it('"hijri" marks the cell whose hijri.day===1 with [part="day-month-marker"] and the month name', () => {
    const el = mount({ date: "2026-07-06", "month-marker": "hijri" });
    const buttons = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-i]"));
    const hijriFirst = buttons.find(
      (b) => cal.gregorianToHijri(new Date(`${b.dataset.date}T00:00:00Z`)).day === 1
    )!;
    expect(hijriFirst).toBeTruthy();
    const marker = hijriFirst.querySelector('[part="day-month-marker"]');
    expect(marker).toBeTruthy();
    const h = cal.gregorianToHijri(new Date(`${hijriFirst.dataset.date}T00:00:00Z`));
    expect(marker!.textContent).toBe(translitMonthNames[h.month - 1]);
  });

  it('"both" keeps "1 Jul" in day-secondary and also marks the Hijri first-of-month cell', () => {
    const el = mount({ date: "2026-07-06", "month-marker": "both" });
    const gregFirst = cellFor(el, "2026-07-01");
    expect(gregFirst.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("1 Jul");

    const buttons = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-i]"));
    const hijriFirst = buttons.find(
      (b) => cal.gregorianToHijri(new Date(`${b.dataset.date}T00:00:00Z`)).day === 1
    )!;
    expect(hijriFirst.querySelector('[part="day-month-marker"]')).toBeTruthy();
  });

  it('"hijri" with numerals-gregorian="arab" renders a bare, transliterated day-secondary digit with dir="rtl" on the Gregorian first-of-month (gregHasMonthMarker mirrors the actual rendered condition, not just "is the 1st")', () => {
    // Regression coverage for the gregHasMonthMarker fix: under month-marker="hijri" the
    // Gregorian "1 Jul" name never renders, so 2026-07-01's day-secondary is a bare digit and
    // must get the same dir="rtl" treatment as any other bare Arabic-Indic digit — previously
    // gregHasMonthMarker checked only `date === 1`, which wrongly suppressed dir here.
    const el = mount({ date: "2026-07-06", "month-marker": "hijri", "numerals-gregorian": "arab" });
    const gregFirst = cellFor(el, "2026-07-01");
    const secondary = gregFirst.querySelector('[part="day-secondary"]')!;
    expect(secondary.textContent!.trim()).toBe(formatNumerals("1", "arab"));
    expect(secondary.getAttribute("dir")).toBe("rtl");
  });

  it('"none" shows bare numbers: day-secondary is bare "1" on 2026-07-01, no marker spans at all', () => {
    const el = mount({ date: "2026-07-06", "month-marker": "none" });
    const gregFirst = cellFor(el, "2026-07-01");
    expect(gregFirst.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("1");
    expect(sr(el).querySelector('[part="day-month-marker"]')).toBeNull();
  });
});

describe("<hijri-calendar> month grid keyboard navigation (unaffected by the day-cell layer)", () => {
  it("ArrowRight/ArrowDown move the roving tabindex across the day buttons", () => {
    const el = mount({ date: "2026-07-06" });
    const buttons = Array.from(sr(el).querySelectorAll<HTMLButtonElement>("[data-i]"));
    expect(buttons[0]!.tabIndex).toBe(0);

    buttons[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(buttons[0]!.tabIndex).toBe(-1);
    expect(buttons[1]!.tabIndex).toBe(0);

    buttons[1]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
    expect(buttons[1]!.tabIndex).toBe(-1);
    expect(buttons[8]!.tabIndex).toBe(0);
  });

  it("Enter on a day button activates that day, and defaults-prevents the key", () => {
    const el = mount({ date: "2026-07-06" });
    const dates: string[] = [];
    el.addEventListener("date-click", (e) => dates.push((e as CustomEvent).detail.gregorian));
    const btn = sr(el).querySelector<HTMLButtonElement>('[data-date="2026-07-15"]')!;
    const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    btn.dispatchEvent(ev);
    expect(dates).toEqual(["2026-07-15"]);
    // Enter on a <button> also fires a native click; the handler clicks explicitly, so it must
    // suppress the native one or the day would be activated twice.
    expect(ev.defaultPrevented).toBe(true);
  });
});

/**
 * The grid's keydown listener sits on `[role="grid"]`, so *every* key event inside the month grid
 * bubbles to it — including ones from the event chips and `part="more-link"` buttons, which are
 * real focusable buttons in their own gridcells (the ARIA restructure deliberately kept them in
 * the accessibility tree rather than hiding them). The listener used to fall back to the roving
 * day button whenever the event did not originate in a day cell, so `Enter` on a focused chip
 * called `preventDefault()` and emitted `date-click` for an unrelated day — never `event-click`.
 * Every chip was reachable by Tab and impossible to activate.
 *
 * jsdom does not implement a `<button>`'s default activation behaviour (a dispatched
 * `keydown` never turns into a `click`), so what these tests pin is the half that is ours: the
 * grid handler must not consume the key and must not fire the wrong event. `defaultPrevented`
 * staying false is exactly what lets the browser's native activation reach `wireEventChips()`;
 * the resulting `event-click`/`more-click` is verified with real key presses in Chromium.
 */
describe("<hijri-calendar> month grid keyboard: keys from chips and more-links are left to the button", () => {
  const EVENTS = [
    { id: "a", title: "Standup", start: "2026-07-15T09:00", end: "2026-07-15T09:30" },
    { id: "b", title: "Review", start: "2026-07-15T11:00", end: "2026-07-15T12:00" },
    { id: "c", title: "Retro", start: "2026-07-15T14:00", end: "2026-07-15T15:00" },
    { id: "d", title: "Long", start: "2026-07-13", end: "2026-07-17", allDay: true },
  ];

  function mountWithEvents(attrs: Record<string, string> = {}): HijriCalendarElement {
    const el = mount({ date: "2026-07-06", ...attrs });
    el.events = EVENTS;
    return el;
  }

  for (const key of ["Enter", " "]) {
    it(`${key === " " ? "Space" : key} on a chip is not consumed by the grid and emits no date-click`, () => {
      const el = mountWithEvents();
      const seen: string[] = [];
      el.addEventListener("date-click", () => seen.push("date-click"));
      el.addEventListener("event-click", () => seen.push("event-click"));
      const chip = sr(el).querySelector<HTMLButtonElement>("[data-ev]")!;
      expect(chip).toBeTruthy();
      const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      chip.dispatchEvent(ev);
      expect(ev.defaultPrevented).toBe(false);
      expect(seen).toEqual([]);
      // The chip's own click wiring is what the native activation reaches.
      chip.click();
      expect(seen).toEqual(["event-click"]);
    });
  }

  it("Enter on a more-link is not consumed by the grid and emits no date-click", () => {
    const el = mountWithEvents({ "max-events": "1" });
    const seen: string[] = [];
    el.addEventListener("date-click", () => seen.push("date-click"));
    el.addEventListener("more-click", () => seen.push("more-click"));
    const more = sr(el).querySelector<HTMLButtonElement>("[data-more]")!;
    expect(more).toBeTruthy();
    const ev = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    more.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(seen).toEqual([]);
    more.click();
    expect(seen).toEqual(["more-click"]);
  });

  it("arrow keys from a chip neither move the roving tabindex nor get consumed", () => {
    const el = mountWithEvents();
    const buttons = Array.from(sr(el).querySelectorAll<HTMLButtonElement>("[data-i]"));
    const before = buttons.findIndex((b) => b.tabIndex === 0);
    const chip = sr(el).querySelector<HTMLButtonElement>("[data-ev]")!;
    const ev = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    chip.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(false);
    expect(buttons.findIndex((b) => b.tabIndex === 0)).toBe(before);
  });

  it("a key the grid does not handle is never defaults-prevented, even from a day button", () => {
    const el = mountWithEvents();
    const btn = sr(el).querySelector<HTMLButtonElement>("[data-i]")!;
    for (const key of ["a", "Tab", "Escape", "Home", "PageDown"]) {
      const ev = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
      btn.dispatchEvent(ev);
      expect(ev.defaultPrevented, key).toBe(false);
    }
  });
});
