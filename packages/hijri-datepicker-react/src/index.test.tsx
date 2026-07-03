import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { HijriDatepicker } from "./index";

describe("HijriDatepicker (React)", () => {
  it("forwards the value prop to the element", () => {
    const { container } = render(
      React.createElement(HijriDatepicker, { value: "2024-03-15" })
    );
    const el = container.querySelector("hijri-datepicker")!;
    expect(el.getAttribute("value")).toBe("2024-03-15");
  });

  it("fires a typed onChange when a day is clicked", () => {
    const onChange = vi.fn();
    const { container } = render(
      React.createElement(HijriDatepicker, { value: "2024-03-15", onChange })
    );
    const el = container.querySelector("hijri-datepicker")!;
    const btn = el.shadowRoot!.querySelector(
      ".cell:not(.out):not([disabled])"
    ) as HTMLButtonElement;
    btn.click();
    expect(onChange).toHaveBeenCalledTimes(1);
    const detail = (onChange.mock.calls[0]![0] as CustomEvent).detail;
    expect(detail.mode).toBe("single");
    expect(typeof detail.gregorian).toBe("string");
  });
});
