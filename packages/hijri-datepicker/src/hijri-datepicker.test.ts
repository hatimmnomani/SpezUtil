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
});
