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

describe("<hijri-calendar> month day-cell background layer", () => {
  it("renders exactly 42 [part~=day-cell] layers per month", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelectorAll('[part~="day-cell"]').length).toBe(42);
  });

  it("gives every day-cell an unbounded row span so it isn't collapsed to the head row (fix: `.week` has no explicit row tracks, so `-1` used to resolve to line 1)", () => {
    // jsdom performs no layout, so it cannot see whether the *rendered* box actually covers the
    // chip/more-link rows below the head row (that assertion belongs to the Playwright visual
    // suite, against .day-cell's measured height vs .week's). What we can honestly assert here
    // is the emitted inline style itself: it must not be the collapsing `1 / -1` form, and it
    // must span far enough (`span 999`) to reach past any real row count (`maxEvents + 2`).
    const el = mount({ date: "2026-07-06", "max-events": "3" });
    const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-cell]"));
    expect(cells.length).toBeGreaterThan(0);
    for (const cell of cells) {
      const gridRow = cell.style.gridRow;
      expect(gridRow).not.toBe("1 / -1");
      const match = gridRow.match(/^1\s*\/\s*span\s+(\d+)$/);
      expect(match).toBeTruthy();
      expect(Number(match![1])).toBeGreaterThanOrEqual(3 /* maxEvents */ + 2);
    }
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
    const week = sr(el).querySelector(".week")!;
    const firstButtonIdx = Array.from(week.children).findIndex(
      (c) => c.tagName === "BUTTON" && partTokens(c as HTMLElement).includes("day")
    );
    expect(firstButtonIdx).toBeGreaterThanOrEqual(7);
  });

  it("precedes its column's day button in DOM order within every week row (R1)", () => {
    const el = mount({ date: "2026-07-06" });
    const weeks = Array.from(sr(el).querySelectorAll(".week"));
    expect(weeks.length).toBe(6);
    for (const week of weeks) {
      const children = Array.from(week.children) as HTMLElement[];
      const firstSeven = children.slice(0, 7);
      expect(
        firstSeven.every((c) => c.tagName === "DIV" && partTokens(c).includes("day-cell"))
      ).toBe(true);
      const firstButtonIdx = children.findIndex(
        (c) => c.tagName === "BUTTON" && partTokens(c).includes("day")
      );
      expect(firstButtonIdx).toBeGreaterThanOrEqual(7);
    }
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
});
