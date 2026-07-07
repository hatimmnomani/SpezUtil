import { beforeEach, describe, expect, it } from "vitest";
import { createCalendar } from "@spezutil/hijri-core";
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

function sr(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

function cells(el: HijriDatepicker): HTMLElement[] {
  return Array.from(sr(el).querySelectorAll("[data-i]"));
}

describe("gregorian month-change marker", () => {
  it("shows the abbreviated month on the first of a Gregorian month", () => {
    // value 2024-03-15 -> Ramadan 1445 grid spans the Mar/Apr 2024 boundary
    const el = mount({ value: "2024-03-15" });
    const secondaries = cells(el).map(
      (c) => c.querySelector('[part="day-secondary"]')!.textContent!.trim()
    );
    expect(secondaries).toContain("1 Apr");
    expect(secondaries.filter((s) => s.includes("Apr"))).toHaveLength(1);
  });
});

describe("primary / secondary-position", () => {
  it("defaults to Hijri primary with Gregorian secondary", () => {
    const el = mount({ value: "2024-03-15" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2024, 2, 15)));
    const selected = sr(el).querySelector('[aria-selected="true"]')!;
    expect(selected.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe(
      String(h.day)
    );
    expect(selected.querySelector('[part="day-secondary"]')!.textContent!.trim()).toBe("15");
  });

  it("swaps numbers when primary=gregorian", () => {
    const el = mount({ value: "2024-03-15", primary: "gregorian" });
    const selected = sr(el).querySelector('[aria-selected="true"]')!;
    expect(selected.querySelector('[part="day-primary"]')!.textContent!.trim()).toBe("15");
  });

  it("omits the secondary number when secondary-position=hidden", () => {
    const el = mount({ value: "2024-03-15", "secondary-position": "hidden" });
    const selected = sr(el).querySelector('[aria-selected="true"]')!;
    expect(selected.querySelector('[part="day-secondary"]')).toBeNull();
  });

  it("reflects camelCase properties", () => {
    const el = mount({ value: "2024-03-15" });
    el.primary = "gregorian";
    el.secondaryPosition = "end";
    expect(el.getAttribute("primary")).toBe("gregorian");
    expect(el.getAttribute("secondary-position")).toBe("end");
  });
});
