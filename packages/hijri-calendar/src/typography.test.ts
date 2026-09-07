import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { arMonthNames, createCalendar, formatNumerals, translitMonthNames } from "@spezutil/hijri-core";
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
    expect(titlePrimary.getAttribute("dir")).toBe("rtl");

    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("6");
    expect(cell.querySelector('[part="day-secondary"]')!.getAttribute("dir")).toBeNull();
  });

  it('numerals-gregorian="arab" alone transliterates the Gregorian day number, leaving the Hijri title Latin', () => {
    const el = mount({ date: "2026-07-06", "numerals-gregorian": "arab" });
    const first = cellFor(el, "2026-07-01");
    expect(first.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("١ Jul");
    expect(first.querySelector('[part="day-secondary"]')!.getAttribute("dir")).toBe("rtl");

    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!;
    expect(ARABIC_INDIC.test(titlePrimary.textContent!)).toBe(false);
    expect(titlePrimary.getAttribute("dir")).toBeNull();
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
    expect(julHead!.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe(
      `${formatNumerals("1", "arab")} Jul`
    );

    const gutterFirst = sr(el).querySelectorAll(".tg-gutter span")[0]!.textContent;
    expect(gutterFirst).toBe(formatNumerals("00:00", "arab"));

    const titlePrimary = sr(el).querySelector('[part="title-primary"]')!.textContent!;
    expect(ASCII_DIGIT.test(titlePrimary)).toBe(false);
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
});
