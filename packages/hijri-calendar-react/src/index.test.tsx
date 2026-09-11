import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import * as React from "react";
import { HijriCalendar } from "./index";
import type { HijriCalendarElement } from "@spezutil/hijri-calendar";

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

  // Note: @lit/react (createComponent) sets element properties and attaches event
  // listeners from a useLayoutEffect that runs *after* the underlying custom element
  // has already been inserted into the DOM and its connectedCallback has already run
  // synchronously — so the very first, connect-time "init" range-change (dispatched
  // before connectedCallback returns, per the component's own contract) is always
  // emitted before any React-attached listener exists to hear it. This is a documented
  // fact of life for React + custom-element wrappers, not a bug in the wiring below;
  // §5.3 of the spec accounts for it directly ("Hosts that attach listeners after mount
  // can read the same object from the visibleRange property instead"). The two tests
  // below cover what's actually reachable: the synchronous state via a ref, and the
  // event wiring for every range-change that happens after mount.
  it("exposes the connect-time range synchronously via the visibleRange property (mount-time event predates any listener)", () => {
    const ref = React.createRef<HijriCalendarElement>();
    render(React.createElement(HijriCalendar, { ref }));
    expect(ref.current!.visibleRange?.reason).toBe("init");
  });

  it('fires onRangeChange for range changes that happen after mount (e.g. navigation)', () => {
    const onRangeChange = vi.fn();
    const { container } = render(
      React.createElement(HijriCalendar, { date: "2026-07-06", onRangeChange })
    );
    onRangeChange.mockClear();
    const el = container.querySelector("hijri-calendar")!;
    (el.shadowRoot!.querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(onRangeChange).toHaveBeenCalledTimes(1);
    expect((onRangeChange.mock.calls[0]![0] as CustomEvent).detail.reason).toBe("navigate");
  });

  // renderEvent/renderDayCell are properties, not attributes (§5.1: "Property only") — @lit/react's
  // createComponent detects them via `"renderEvent" in element` (they're getters/setters on the
  // custom element class) and sets them as JS properties from a useLayoutEffect, so they reach the
  // shadow DOM without any special-casing in this wrapper.
  it("renderEvent reaches the shadow DOM and replaces chip content", () => {
    const { container } = render(
      React.createElement(HijriCalendar, {
        date: "2026-07-06",
        events: [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }],
        renderEvent: () => Object.assign(document.createElement("b"), { textContent: "X" }),
      })
    );
    const el = container.querySelector("hijri-calendar")!;
    const chip = el.shadowRoot!.querySelector('[part~="event"]')!;
    expect(chip.querySelector("b")).toBeTruthy();
    expect(chip.querySelector("b")!.textContent).toBe("X");
  });

  it("renderDayCell reaches the shadow DOM and replaces day-cell content", () => {
    const { container } = render(
      React.createElement(HijriCalendar, {
        date: "2026-07-06",
        renderDayCell: () => Object.assign(document.createElement("b"), { textContent: "D" }),
      })
    );
    const el = container.querySelector("hijri-calendar")!;
    const dayButtons = el.shadowRoot!.querySelectorAll('[part~="day"]');
    expect(dayButtons.length).toBeGreaterThan(0);
    dayButtons.forEach((btn) => expect(btn.querySelector("b")).toBeTruthy());
  });
});
