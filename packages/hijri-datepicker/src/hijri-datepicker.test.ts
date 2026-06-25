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

  it("moves focus with arrow keys and selects with Enter", () => {
    const el = mount({ value: "2024-03-15" });
    const grid = el.shadowRoot!.querySelector(".grid") as HTMLElement;
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));

    // Find the initially focused button (the one with tabIndex=0)
    const dayButtons = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const initialFocusedIdx = dayButtons.findIndex((b) => b.tabIndex === 0);

    grid.dispatchEvent(
      new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })
    );

    // jsdom has incomplete focus tracking inside shadow roots.
    // Instead of checking shadowRoot.activeElement (which jsdom doesn't track reliably),
    // we verify roving tabindex: exactly one button should have tabIndex=0 and it
    // should differ from the initial focused button.
    const updatedButtons = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const newFocusedIdx = updatedButtons.findIndex((b) => b.tabIndex === 0);
    expect(newFocusedIdx).not.toBe(-1);
    // The focused button should have moved (ArrowRight moves +1, skipping disabled)
    expect(newFocusedIdx).not.toBe(initialFocusedIdx);
    const focusedBtn = updatedButtons[newFocusedIdx]!;
    expect(focusedBtn.classList.contains("cell")).toBe(true);

    // Now simulate Enter on the focused button to trigger selection
    focusedBtn.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    expect(detail).toBeTruthy();
  });
});
