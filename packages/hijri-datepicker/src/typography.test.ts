import { beforeEach, describe, expect, it } from "vitest";
import { createCalendar, formatNumerals, arMonthNames, translitMonthNames } from "@spezutil/hijri-core";
import { HijriDatepicker } from "./hijri-datepicker";

const cal = createCalendar();

if (!customElements.get("hijri-datepicker")) {
  customElements.define("hijri-datepicker", HijriDatepicker);
}

beforeEach(() => {
  document.body.innerHTML = "";
});

function mount(attrs: Record<string, string> = {}): HijriDatepicker {
  const el = document.createElement("hijri-datepicker") as HijriDatepicker;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}
const sr = (el: HTMLElement) => el.shadowRoot!;
const text = (el: HTMLElement, sel: string) => (sr(el).querySelector(sel)?.textContent ?? "").trim();

describe("numerals / names / weekday-format", () => {
  const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 2, 15)));

  it("renders Hijri day numbers and year in Arabic-Indic digits by default", () => {
    const el = mount({ value: "2024-03-15" });
    expect(el.numerals).toBe("arab");
    const selected = sr(el).querySelector('[aria-selected="true"] [part="day-primary"]')!;
    expect(selected.textContent).toBe(formatNumerals(h.day, "arab"));
    expect(selected.getAttribute("dir")).toBe("rtl");
    expect(text(el, '[part="title-primary"]')).toBe(`${translitMonthNames[h.month - 1]} ${formatNumerals(h.year, "arab")}`);
    // Gregorian stays Latin.
    expect(text(el, '[aria-selected="true"] [part="day-secondary"]')).toBe("15");
    expect(text(el, '[part="title-secondary"]')).toBe("March 2024");
  });

  it("numerals=latn restores Latin Hijri digits", () => {
    const el = mount({ value: "2024-03-15", numerals: "latn" });
    expect(text(el, '[aria-selected="true"] [part="day-primary"]')).toBe(String(h.day));
    expect(text(el, '[part="title-primary"]')).toBe(`${translitMonthNames[h.month - 1]} ${h.year}`);
  });

  it("numerals-gregorian=arab transliterates Gregorian digits but not month names", () => {
    const el = mount({ value: "2024-03-15", "numerals-gregorian": "arab" });
    expect(text(el, '[aria-selected="true"] [part="day-secondary"]')).toBe(formatNumerals(15, "arab"));
    expect(text(el, '[part="title-secondary"]')).toBe(`March ${formatNumerals(2024, "arab")}`);
    const firstOfApril = Array.from(sr(el).querySelectorAll('[part="day-secondary"]')).map((n) => n.textContent);
    expect(firstOfApril).toContain(`${formatNumerals(1, "arab")} Apr`);
  });

  it("names=ar uses Arabic month and weekday names, weekday labels drop the article", () => {
    const el = mount({ value: "2024-03-15", names: "ar" });
    expect(text(el, '[part="title-primary"]')).toBe(`${arMonthNames[h.month - 1]} ${formatNumerals(h.year, "arab")}`);
    const dows = Array.from(sr(el).querySelectorAll('[part="weekday"]')).map((n) => n.textContent);
    expect(dows).toEqual(["أحد", "اثنين", "ثلاثاء", "أربعاء", "خميس", "جمعة", "سبت"]);
    expect(sr(el).querySelector('[part="weekday"]')!.getAttribute("dir")).toBe("rtl");
  });

  it("weekday-format narrow/short for transliterated names", () => {
    const narrow = Array.from(sr(mount()).querySelectorAll('[part="weekday"]')).map((n) => n.textContent);
    expect(narrow.slice(0, 2)).toEqual(["Su", "Mo"]);
    const short = Array.from(sr(mount({ "weekday-format": "short" })).querySelectorAll('[part="weekday"]')).map((n) => n.textContent);
    expect(short.slice(0, 2)).toEqual(["Sun", "Mon"]);
  });

  it("reflects the new properties", () => {
    const el = mount();
    el.numerals = "latn"; el.numeralsGregorian = "arab"; el.names = "ar"; el.weekdayFormat = "short";
    expect(el.getAttribute("numerals")).toBe("latn");
    expect(el.getAttribute("numerals-gregorian")).toBe("arab");
    expect(el.getAttribute("names")).toBe("ar");
    expect(el.getAttribute("weekday-format")).toBe("short");
  });
});
