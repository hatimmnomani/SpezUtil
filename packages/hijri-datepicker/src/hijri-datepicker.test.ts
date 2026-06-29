import { beforeAll, describe, expect, it } from "vitest";
import "./index";
import type { HijriDatepicker } from "./hijri-datepicker";

function mount(attrs: Record<string, string> = {}): HijriDatepicker {
  const el = document.createElement("hijri-datepicker") as HijriDatepicker;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

describe("<hijri-datepicker>", () => {
  beforeAll(() => {
    expect(customElements.get("hijri-datepicker")).toBeTruthy();
  });

  it("renders a grid of day cells in its shadow root", () => {
    const el = mount({ value: "2024-03-15" });
    const cells = el.shadowRoot!.querySelectorAll(".cell");
    expect(cells.length).toBe(42);
  });

  it("emits a change event with hijri + gregorian detail on click", () => {
    const el = mount({ value: "2024-03-15" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const inMonth = el.shadowRoot!.querySelector(
      '.cell:not(.out):not([disabled])'
    ) as HTMLButtonElement;
    inMonth.click();
    expect(detail).toBeTruthy();
    expect(detail.hijri).toMatchObject({ year: expect.any(Number) });
    expect(typeof detail.gregorian).toBe("string");
  });

  it("respects min/max by disabling out-of-range cells", () => {
    const el = mount({ value: "2024-03-15", min: "2024-03-10", max: "2024-03-20" });
    const disabled = el.shadowRoot!.querySelectorAll(".cell[disabled]");
    expect(disabled.length).toBeGreaterThan(0);
  });

  it("ArrowRight moves roving tabindex one cell forward", () => {
    const el = mount({ value: "2024-03-15" });
    const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
    const before = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const initial = before.findIndex((b) => b.tabIndex === 0);
    grid.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    const after = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const moved = after.findIndex((b) => b.tabIndex === 0);
    expect(initial).toBeGreaterThanOrEqual(0);
    expect(moved).toBe(initial + 1);
  });

  it("Enter on a focused day button selects that exact cell", () => {
    const el = mount({ value: "2024-03-15" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const btn = el.shadowRoot!.querySelector(
      '.cell:not(.out):not([disabled])'
    ) as HTMLButtonElement;
    const labelDate = btn.getAttribute("aria-label")!.match(/\((\d{4}-\d{2}-\d{2})\)/)![1];
    btn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(detail).toBeTruthy();
    expect(detail.gregorian).toBe(labelDate);
  });

  it("range mode: two clicks set start/end and emit a range change", () => {
    const el = mount({ mode: "range", start: "2024-03-15" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const enabled = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    const startBtn = enabled.find((b) => b.classList.contains("range-start"))!;
    const startIdx = enabled.indexOf(startBtn);
    const endBtn = enabled[startIdx + 3]!;
    endBtn.click();
    expect(detail).toBeTruthy();
    expect(detail.mode).toBe("range");
    expect(detail.start.gregorian).toBe("2024-03-15");
    expect(detail.end.gregorian).toBe(endBtn.getAttribute("aria-label")!.match(/\((\d{4}-\d{2}-\d{2})\)/)![1]);
    expect(el.getAttribute("end")).toBe(detail.end.gregorian);
  });

  it("range mode: hovering after start paints an in-range band", () => {
    const el = mount({ mode: "range", start: "2024-03-15" });
    const enabled = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    const startIdx = enabled.findIndex((b) => b.classList.contains("range-start"));
    const hoverBtn = enabled[startIdx + 4]!;
    hoverBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const band = el.shadowRoot!.querySelectorAll(".cell.in-range");
    expect(band.length).toBeGreaterThan(0);
  });

  it("multiple mode: clicking toggles dates and emits the full list", () => {
    const el = mount({ mode: "multiple" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const cells = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    cells[0]!.click();
    cells[2]!.click();
    expect(detail.mode).toBe("multiple");
    expect(detail.gregorian.length).toBe(2);
    expect(el.getAttribute("value")!.split(",").length).toBe(2);
    cells[0]!.click();
    expect(detail.gregorian.length).toBe(1);
  });

  it("time picker: changing the hour updates value to a datetime and emits time", () => {
    const el = mount({ value: "2024-03-15", "enable-time": "", "time-format": "24" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const hour = el.shadowRoot!.querySelector('[data-time="hour"]') as HTMLInputElement;
    expect(hour).toBeTruthy();
    hour.value = "14";
    hour.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.getAttribute("value")).toBe("2024-03-15T14:00");
    expect(detail.mode).toBe("single");
    expect(detail.time).toEqual({ hour: 14, minute: 0 });
  });

  it("12h time picker shows an AM/PM toggle", () => {
    const el = mount({ value: "2024-03-15", "enable-time": "", "time-format": "12" });
    const ampm = el.shadowRoot!.querySelector('[data-time="meridiem"]');
    expect(ampm).toBeTruthy();
  });

  it("reflects properties to attributes", () => {
    const el = document.createElement("hijri-datepicker") as any;
    el.value = "2024-03-15";
    el.mode = "range";
    el.min = "2024-01-01";
    el.enableTime = true;
    el.timeFormat = "12";
    el.disabledWeekdays = "5,6";
    expect(el.getAttribute("value")).toBe("2024-03-15");
    expect(el.getAttribute("mode")).toBe("range");
    expect(el.getAttribute("min")).toBe("2024-01-01");
    expect(el.hasAttribute("enable-time")).toBe(true);
    expect(el.getAttribute("time-format")).toBe("12");
    expect(el.getAttribute("disabled-weekdays")).toBe("5,6");
    el.value = null;
    el.enableTime = false;
    expect(el.hasAttribute("value")).toBe(false);
    expect(el.hasAttribute("enable-time")).toBe(false);
  });
});
