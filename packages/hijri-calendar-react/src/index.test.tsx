import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { HijriCalendar } from "./index";

describe("HijriCalendar (React)", () => {
  it("forwards attributes and the events property to the element", () => {
    const { container } = render(
      React.createElement(HijriCalendar, {
        date: "2026-07-06",
        view: "month",
        events: [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }],
      })
    );
    const el = container.querySelector("hijri-calendar")!;
    expect(el.getAttribute("date")).toBe("2026-07-06");
    expect(el.shadowRoot!.querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("fires typed onEventClick when a chip is clicked", () => {
    const onEventClick = vi.fn();
    const { container } = render(
      React.createElement(HijriCalendar, {
        date: "2026-07-06",
        events: [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }],
        onEventClick,
      })
    );
    const el = container.querySelector("hijri-calendar")!;
    (el.shadowRoot!.querySelector('[part~="event"]') as HTMLButtonElement).click();
    expect(onEventClick).toHaveBeenCalledTimes(1);
    expect((onEventClick.mock.calls[0]![0] as CustomEvent).detail.event.id).toBe("a");
  });

  it("fires onViewChange when the view switcher is used", () => {
    const onViewChange = vi.fn();
    const { container } = render(
      React.createElement(HijriCalendar, { date: "2026-07-06", onViewChange })
    );
    const el = container.querySelector("hijri-calendar")!;
    (el.shadowRoot!.querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect((onViewChange.mock.calls[0]![0] as CustomEvent).detail).toEqual({ view: "week" });
  });
});
