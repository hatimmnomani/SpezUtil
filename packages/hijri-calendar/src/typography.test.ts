import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  arMonthNames,
  arWeekdayNames,
  createCalendar,
  formatNumerals,
  translitMonthNames,
} from "@spezutil/hijri-core";
import { HijriCalendarElement } from "./hijri-calendar";

const cal = createCalendar();
const ARABIC_INDIC = /[٠-٩]/;
const ASCII_DIGIT = /[0-9]/;

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

describe("<hijri-calendar> numerals", () => {
  it('numerals="arab" transliterates the Hijri title, leaving Gregorian day numbers Latin', () => {
    const el = mount({ date: "2026-07-06", numerals: "arab" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    expect(titlePrimary.textContent).toContain(formatNumerals(h.year, "arab"));
    expect(ASCII_DIGIT.test(titlePrimary.textContent!)).toBe(false);
    // Ruling M: `numerals="arab"` alone (names stays "translit") mixes a Latin month name with
    // Arabic-Indic year digits ("Ramadan ١٤٤٧") — that mix must never carry dir="rtl", or bidi
    // would reorder it under an RTL base direction. See the dedicated gate tests below.
    expect(titlePrimary.getAttribute("dir")).toBeNull();

    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("6");
    expect(cell.querySelector('[part="day-secondary"]')!.getAttribute("dir")).toBeNull();
  });

  it('numerals-gregorian="arab" alone (numerals explicitly "latn") transliterates the Gregorian day number, leaving the Hijri title Latin', () => {
    const el = mount({ date: "2026-07-06", numerals: "latn", "numerals-gregorian": "arab" });
    const first = cellFor(el, "2026-07-01");
    expect(first.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("١ Jul");
    // "١ Jul" mixes an Arabic-Indic numeral with a Latin month abbreviation; under an RTL
    // base direction the bidi algorithm would reorder that mix to "Jul ١", so this span must
    // never carry `dir` even though its digit is Arabic-Indic.
    expect(first.querySelector('[part="day-secondary"]')!.getAttribute("dir")).toBeNull();

    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    expect(ARABIC_INDIC.test(titlePrimary.textContent!)).toBe(false);
    expect(titlePrimary.getAttribute("dir")).toBeNull();
  });

  it('numerals-gregorian="arab" transliterates a bare (non-month-marker) Gregorian day number and does carry dir="rtl"', () => {
    const el = mount({ date: "2026-07-06", "numerals-gregorian": "arab" });
    const cell = cellFor(el, "2026-07-06");
    const secondary = cell.querySelector('[part="day-secondary"]')!;
    expect(secondary.textContent!.trim()).toBe("٦");
    expect(secondary.getAttribute("dir")).toBe("rtl");
  });

  it('never sets dir on the "N Jul"-style month-marker span, even when it is the primary span (primary="gregorian")', () => {
    const el = mount({
      date: "2026-07-06",
      primary: "gregorian",
      "numerals-gregorian": "arab",
    });
    const first = cellFor(el, "2026-07-01");
    const primarySpan = first.querySelector('[part="day-primary"]')!;
    expect(primarySpan.textContent!.trim()).toBe("١ Jul");
    expect(primarySpan.getAttribute("dir")).toBeNull();
  });

  it('numerals="arab" alone leaves week-view gutter labels (Gregorian clock digits) Latin', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      numerals: "arab",
      "time-format": "24",
      "day-start": "8",
    });
    const labels = Array.from(sr(el).querySelectorAll(".tg-gutter span")).map((s) => s.textContent);
    expect(labels[0]).toBe("08:00");
  });

  it('numerals-gregorian="arab" alone transliterates week-view gutter labels', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "numerals-gregorian": "arab",
      "time-format": "24",
      "day-start": "8",
    });
    const labels = Array.from(sr(el).querySelectorAll(".tg-gutter span")).map((s) => s.textContent);
    expect(labels[0]).toBe("٠٨:٠٠");
  });

  it("applies both numeral systems independently, never transliterating month abbreviations", () => {
    const el = mount({
      date: "2026-06-29",
      view: "week",
      numerals: "arab",
      "numerals-gregorian": "arab",
      "time-format": "24",
    });

    const heads = Array.from(sr(el).querySelectorAll(".tg-col-head"));
    for (const head of heads) {
      const primary = head.querySelector('[part="day-primary"]')!.textContent!;
      expect(ASCII_DIGIT.test(primary)).toBe(false);
    }
    // The Gregorian month-change marker cell (2026-07-01) reads "<arabic-1> Jul": the day
    // number transliterates, the month abbreviation never does.
    const julHead = heads.find((h) =>
      h.querySelector('[part="day-secondary"]')!.textContent!.includes("Jul")
    );
    expect(julHead).toBeTruthy();
    const julSecondary = julHead!.querySelector('[part="day-secondary"]')!;
    expect(julSecondary.textContent!.trim()).toBe(`${formatNumerals("1", "arab")} Jul`);
    // Mixed Arabic-Indic-numeral + Latin-abbreviation content never carries `dir`.
    expect(julSecondary.getAttribute("dir")).toBeNull();

    const gutterFirst = sr(el).querySelectorAll(".tg-gutter span")[0]!.textContent;
    expect(gutterFirst).toBe(formatNumerals("00:00", "arab"));

    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!.textContent!;
    expect(ASCII_DIGIT.test(titlePrimary)).toBe(false);
  });

  it('numerals="latn" numerals-gregorian="latn" (both explicit) is the pre-0.3.0 all-Latin combination', () => {
    const el = mount({
      date: "2026-07-06",
      numerals: "latn",
      "numerals-gregorian": "latn",
    });
    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    expect(ARABIC_INDIC.test(titlePrimary.textContent!)).toBe(false);
    expect(ASCII_DIGIT.test(titlePrimary.textContent!)).toBe(true);

    const cell = cellFor(el, "2026-07-06");
    const primary = cell.querySelector('[part="day-primary"]')!.textContent!;
    expect(ARABIC_INDIC.test(primary)).toBe(false);
    const secondary = cell.querySelector('[part="day-secondary"]')!.textContent!;
    expect(ARABIC_INDIC.test(secondary)).toBe(false);
  });

  it('D9: defaults to numerals="arab" with no numerals attribute set — Hijri day numbers, the Hijri year/title-primary render Arabic-Indic out of the box; numerals="latn" restores the pre-0.3.0 Latin look', () => {
    const bare = mount({ date: "2026-07-06" });
    expect(bare.numerals).toBe("arab");
    const bareCell = cellFor(bare, "2026-07-06");
    const barePrimary = bareCell.querySelector('[part="day-primary"]')!.textContent!;
    expect(ARABIC_INDIC.test(barePrimary)).toBe(true);
    expect(ASCII_DIGIT.test(barePrimary)).toBe(false);
    const bareTitle = sr(bare).querySelector('[part="title-primary"]')!.textContent!;
    expect(ARABIC_INDIC.test(bareTitle)).toBe(true);
    // numerals-gregorian is unaffected by the new default and stays Latin.
    const bareSecondary = bareCell.querySelector('[part="day-secondary"]')!.textContent!;
    expect(ARABIC_INDIC.test(bareSecondary)).toBe(false);

    const latin = mount({ date: "2026-07-06", numerals: "latn" });
    const latinCell = cellFor(latin, "2026-07-06");
    const latinPrimary = latinCell.querySelector('[part="day-primary"]')!.textContent!;
    expect(ASCII_DIGIT.test(latinPrimary)).toBe(true);
    expect(ARABIC_INDIC.test(latinPrimary)).toBe(false);
  });
});

/**
 * D9 made the component default (`numerals: "arab"`) and `formatHijri()`'s own default
 * (`opts?.numerals ?? "latn"`, hijri-core/src/format.ts) deliberately *disagree*. Before D9 they
 * agreed, so the day-cell `aria-label` staying Latin was accidental and unbreakable; now the only
 * thing keeping Arabic-Indic digits out of an otherwise-English screen-reader announcement is that
 * one call site passing `{ monthNames }` and no `numerals`. Both the plan (§5.4, D9) and
 * `apps/docs/docs/calendar/api.md` promise this behaviour to consumers, so it needs a test rather
 * than a convention: adding `numerals: this.numerals` to that call — an entirely reasonable-looking
 * edit — must fail here.
 */
describe("<hijri-calendar> aria-label digits stay Latin under the arab default (D9)", () => {
  it("labels a day cell with Latin Hijri digits on a bare mount, exactly as documented", () => {
    const el = mount({ date: "2026-07-06" });
    expect(el.numerals).toBe("arab"); // the default that makes this non-trivial
    // The grid is a *Hijri* month grid: date="2026-07-06" renders Safar 1448, whose visible
    // range runs 2026-06-14 .. 2026-07-25. This is its last cell.
    const label = cellFor(el, "2026-07-25").getAttribute("aria-label")!;
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 25)));
    expect(label).toBe(
      `${h.day} ${translitMonthNames[h.month - 1]} ${h.year} (2026-07-25)`
    );
    expect(ASCII_DIGIT.test(label)).toBe(true);
    expect(ARABIC_INDIC.test(label)).toBe(false);
  });

  it("keeps the day-cell label Latin for all 42 cells, with numerals=arab explicit and under names=ar", () => {
    for (const attrs of [
      { date: "2026-07-06" },
      { date: "2026-07-06", numerals: "arab" },
      { date: "2026-07-06", numerals: "arab", names: "ar" },
      { date: "2026-07-06", numerals: "arab", "numerals-gregorian": "arab" },
    ]) {
      const el = mount(attrs);
      const labels = Array.from(sr(el).querySelectorAll("[data-i]")).map(
        (b) => b.getAttribute("aria-label")!
      );
      expect(labels.length).toBe(42);
      for (const label of labels) {
        expect(ARABIC_INDIC.test(label), `${JSON.stringify(attrs)}: ${label}`).toBe(false);
        expect(ASCII_DIGIT.test(label), `${JSON.stringify(attrs)}: ${label}`).toBe(true);
      }
    }
  });

  it("leaves every aria-label in every view digit-Latin, except the grid's own, which mirrors the visible title", () => {
    // The day banner's and the agenda's Hijri dates are *visible text*, so they follow `numerals`
    // like every other truth-table site — they carry no aria-label of their own. The month grid's
    // aria-label is the one deliberate exception: it reuses the visible title, so it must match
    // what a sighted user reads (title primary is a truth-table site). See api.md's D9 entry.
    const events = [
      { id: "e", title: "Standup", start: "2026-07-06T09:00", end: "2026-07-06T09:30" },
      { id: "f", title: "Trip", start: "2026-07-04", end: "2026-07-09", allDay: true },
    ];
    for (const attrs of [
      { date: "2026-07-06" },
      { date: "2026-07-06", view: "week" },
      { date: "2026-07-06", view: "day", "day-header": "banner" },
      { date: "2026-07-06", view: "agenda" },
      { date: "2026-07-06", "max-events": "1" },
    ]) {
      const el = mount(attrs);
      el.events = events;
      const labelled = Array.from(sr(el).querySelectorAll("[aria-label]"));
      expect(labelled.length).toBeGreaterThan(0);
      for (const node of labelled) {
        const label = node.getAttribute("aria-label")!;
        if (node.getAttribute("role") === "grid") {
          // Non-vacuous: this one *does* carry Arabic-Indic digits (the Hijri year), by design.
          expect(ARABIC_INDIC.test(label), `grid label: ${label}`).toBe(true);
          continue;
        }
        expect(ARABIC_INDIC.test(label), `${JSON.stringify(attrs)}: ${label}`).toBe(false);
      }
    }
  });
});

describe("<hijri-calendar> title-primary dir gate (Ruling M)", () => {
  it('names="translit" numerals="arab" never marks title-primary rtl, even though the year digits are Arabic-Indic', () => {
    const el = mount({ date: "2026-07-06", names: "translit", numerals: "arab" });
    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    // "Ramadan ١٤٤٧": a Latin month name plus Arabic-Indic year digits. Bidi would reorder
    // that mix under an RTL base direction, so dir must be gated on the name script
    // (`names`), never on the numeral system.
    expect(ARABIC_INDIC.test(titlePrimary.textContent!)).toBe(true);
    expect(titlePrimary.getAttribute("dir")).toBeNull();
  });

  it('names="ar" still marks title-primary rtl regardless of numerals', () => {
    const el = mount({ date: "2026-07-06", names: "ar", numerals: "latn" });
    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    expect(titlePrimary.getAttribute("dir")).toBe("rtl");
  });
});

describe("<hijri-calendar> names", () => {
  it('names="ar" swaps the Hijri month name but keeps UI strings from locale', () => {
    const el = mount({ date: "2026-07-06", names: "ar" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector('[part="title-primary"]')!.textContent).toContain(
      arMonthNames[h.month - 1]
    );
    expect(sr(el).querySelector('[part="nav-today"]')!.textContent).toBe("Today");
  });

  it("defaults to following locale when unset", () => {
    const el = mount({ date: "2026-07-06", locale: "ar" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector('[part="title-primary"]')!.textContent).toContain(
      arMonthNames[h.month - 1]
    );
    expect(el.names).toBe("ar");
  });

  it("can be set independently of locale", () => {
    const el = mount({ date: "2026-07-06", locale: "ar", names: "translit" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector('[part="title-primary"]')!.textContent).toContain(
      translitMonthNames[h.month - 1]
    );
    // UI strings still follow `locale`, independently of `names`.
    expect(sr(el).querySelector('[part="nav-today"]')!.textContent).toBe("اليوم");
  });
});

describe("<hijri-calendar> weekday-format", () => {
  it("short (default) renders only weekday-primary, truncated to 3 letters", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelectorAll('[part~="weekday-primary"]').length).toBe(7);
    expect(sr(el).querySelectorAll('[part~="weekday-secondary"]').length).toBe(0);
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent!.length).toBe(3);
  });

  it("bilingual renders 7 primary + 7 secondary weekday spans", () => {
    const el = mount({ date: "2026-07-06", "weekday-format": "bilingual" });
    expect(sr(el).querySelectorAll('[part~="weekday-primary"]').length).toBe(7);
    expect(sr(el).querySelectorAll('[part~="weekday-secondary"]').length).toBe(7);
    const secondary = sr(el).querySelectorAll('[part~="weekday-secondary"]')[0]!;
    expect(secondary.textContent!.length).toBe(3);
  });

  it("long renders the full weekday name", () => {
    const el = mount({ date: "2026-07-06", "weekday-format": "long" });
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent).toBe("Sunday");
    expect(sr(el).querySelectorAll('[part~="weekday-secondary"]').length).toBe(0);
  });

  it("bilingual's secondary is always the English abbreviation, even under names=ar", () => {
    const el = mount({ date: "2026-07-06", names: "ar", "weekday-format": "bilingual" });
    const secondaries = Array.from(sr(el).querySelectorAll('[part~="weekday-secondary"]')).map(
      (s) => s.textContent
    );
    expect(secondaries).toEqual(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
    const primaries = sr(el).querySelectorAll('[part~="weekday-primary"]');
    expect(primaries[0]!.getAttribute("dir")).toBe("rtl");
  });
});

describe("<hijri-calendar> title-layout", () => {
  it("defaults to stacked and reflects the property to the attribute", () => {
    const el = mount({ date: "2026-07-06" });
    expect(el.titleLayout).toBe("stacked");
    el.titleLayout = "inline";
    expect(el.getAttribute("title-layout")).toBe("inline");
    expect(el.titleLayout).toBe("inline");
  });

  it("renders title-secondary in both stacked and inline layouts", () => {
    const stacked = mount({ date: "2026-07-06" });
    expect(sr(stacked).querySelector('[part="title-secondary"]')).toBeTruthy();
    const inline = mount({ date: "2026-07-06", "title-layout": "inline" });
    expect(sr(inline).querySelector('[part="title-secondary"]')).toBeTruthy();
  });
});

describe("<hijri-calendar> font-family custom properties", () => {
  it("declares --hcal-font-family-display and --hcal-font-family-mono on :host", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-font-family-display: var(--hcal-font-family);");
    expect(css).toContain("--hcal-font-family-mono: var(--hcal-font-family);");
  });

  it("applies --hcal-font-family-display to the time-grid event title", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\.tg-event\s*\{[^}]*font-family:\s*var\(--hcal-font-family-display\)/);
  });

  it("does not apply --hcal-font-family-display to Gregorian day-number spans (P2 routes them through --hcal-day-secondary-font-family, still defaulting to --hcal-font-family-arabic)", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain(
      '.day-head .num-secondary, .tg-col-head .num-secondary { font-size: var(--hcal-day-secondary-font-size); color: var(--hcal-day-secondary-color); white-space: nowrap; font-family: var(--hcal-day-secondary-font-family); }'
    );
    expect(css).toContain("--hcal-day-secondary-font-family: var(--hcal-font-family-arabic);");
    expect(css).not.toMatch(/\.num-secondary[^}]*font-family:\s*var\(--hcal-font-family-display\)/);
  });
});

describe("<hijri-calendar> column order invariant (Arabic content must never reorder the grid)", () => {
  it('keeps weekday header cells and day-cell layers in Sun..Sat DOM order under names="ar" numerals="arab" (week-start="0" default), and never puts dir="rtl" on the grid, its rows, or the weekday header', () => {
    const el = mount({ date: "2026-07-06", names: "ar", numerals: "arab" });

    // Weekday header cells: DOM order must be Sun..Sat regardless of the Arabic name set —
    // column order is driven by week-start alone (`weekdayCellHtml((i + ws) % 7)`), never by
    // the content/script/digit system of what's rendered inside each cell. The full,
    // untruncated name lives in the cell's `title` attribute even under weekday-format="short"
    // (the default), so it's a reliable per-column identity check independent of truncation.
    const weekdayCells = Array.from(sr(el).querySelectorAll('[part~="weekday"]'));
    expect(weekdayCells.length).toBe(7);
    weekdayCells.forEach((cell, i) => {
      expect(cell.getAttribute("title")).toBe(arWeekdayNames[i]);
    });

    // Day-cell background layers (month view): first week's --_col must ascend 0..6 in DOM
    // order, unaffected by Arabic numerals/names.
    const dayCellLayers = Array.from(sr(el).querySelectorAll<HTMLElement>('[part~="day-cell"]')).slice(
      0,
      7
    );
    expect(dayCellLayers.length).toBe(7);
    dayCellLayers.forEach((cell, i) => {
      expect(cell.style.getPropertyValue("--_col")).toBe(String(i));
    });

    // Rulings K/M: dir="rtl" belongs only on single-script inner spans, never on a grid
    // container, a row, or the weekday header — those must stay direction-neutral so the
    // column order itself is never subject to bidi reordering.
    expect(sr(el).querySelector('[part~="calendar"]')!.getAttribute("dir")).toBeNull();
    expect(sr(el).querySelector(".dow-row")!.getAttribute("dir")).toBeNull();
    const weeks = Array.from(sr(el).querySelectorAll(".week"));
    expect(weeks.length).toBeGreaterThan(0);
    weeks.forEach((week) => {
      expect(week.getAttribute("dir")).toBeNull();
    });
  });

  it("holds the same invariant for week-view weekday/column-head order under the same Arabic attributes", () => {
    const el = mount({ date: "2026-07-06", view: "week", names: "ar", numerals: "arab" });
    const heads = Array.from(sr(el).querySelectorAll(".tg-col-head"));
    expect(heads.length).toBe(7);
    heads.forEach((head, i) => {
      expect(head.querySelector(".dow")!.getAttribute("title")).toBe(arWeekdayNames[i]);
    });
    expect(sr(el).querySelector('[part~="calendar"]')!.getAttribute("dir")).toBeNull();
    expect(sr(el).querySelector(".tg-head")!.getAttribute("dir")).toBeNull();
  });
});
