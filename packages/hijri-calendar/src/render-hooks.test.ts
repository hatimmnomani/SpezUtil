import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement, type RenderDayCellContext, type RenderEventContext } from "./hijri-calendar";

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

const ev = (id: string, start: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  ...extra,
});

describe("<hijri-calendar> renderEvent", () => {
  it("a Node returned by the hook is appended inside every [part~='event'] chip/block/agenda item", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      ev("a", "2026-07-06T10:00"),
      ev("b", "2026-07-06", { allDay: true }),
    ];
    el.renderEvent = () => Object.assign(document.createElement("b"), { textContent: "X" });
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBeGreaterThan(0);
    chips.forEach((c) => {
      const b = c.querySelector("b");
      expect(b).toBeTruthy();
      expect(b!.textContent).toBe("X");
      // The default event-title/event-time spans are gone — the hook replaced them.
      expect(c.querySelector('[part="event-title"]')).toBeNull();
    });
  });

  it("also applies to month-view chips and agenda items", () => {
    const monthEl = mount({ date: "2026-07-06" });
    monthEl.events = [ev("a", "2026-07-06T10:00")];
    monthEl.renderEvent = () => Object.assign(document.createElement("b"), { textContent: "M" });
    expect(sr(monthEl).querySelector('[part~="event"] b')).toBeTruthy();

    const agendaEl = mount({ date: "2026-07-06", view: "agenda" });
    agendaEl.events = [ev("a", "2026-07-06T10:00")];
    agendaEl.renderEvent = () => Object.assign(document.createElement("b"), { textContent: "A" });
    expect(sr(agendaEl).querySelector('[part~="agenda-item"] b')).toBeTruthy();
  });

  it("returning null keeps the default spans", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    el.renderEvent = () => null;
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(chip.querySelector('[part="event-title"]')!.textContent).toBe("Event a");
  });

  it('a string return value is inserted as a text node — "<i>x</i>" appears literally, never parsed as HTML', () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    el.renderEvent = () => "<i>x</i>";
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(chip.querySelector("i")).toBeNull();
    expect(chip.textContent).toBe("<i>x</i>");
    expect(chip.innerHTML).toContain("&lt;i&gt;");
  });

  it("a plain string return value becomes a single text node", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    el.renderEvent = () => "plain";
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(chip.textContent).toBe("plain");
    expect(chip.childNodes.length).toBe(1);
    expect(chip.childNodes[0]!.nodeType).toBe(Node.TEXT_NODE);
  });

  it("a throwing hook falls back to the default spans and warns exactly once across many events", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const el = mount({ date: "2026-07-06" });
      el.events = [
        ev("a", "2026-07-01T10:00"),
        ev("b", "2026-07-02T10:00"),
        ev("c", "2026-07-03T10:00"),
        ev("d", "2026-07-04T10:00"),
        ev("e", "2026-07-05T10:00"),
      ];
      el.renderEvent = () => {
        throw new Error("boom");
      };
      const chips = sr(el).querySelectorAll('[part~="event"]');
      expect(chips.length).toBe(5);
      chips.forEach((c) => expect(c.querySelector('[part="event-title"]')).toBeTruthy());
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("passes a well-formed RenderEventContext (placement/labels/hijri/size)", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00", { durationMinutes: 60 })];
    let ctx: RenderEventContext | null = null;
    el.renderEvent = (c) => {
      ctx = c;
      return null;
    };
    expect(ctx).not.toBeNull();
    expect(ctx!.placement).toBe("month-chip");
    expect(ctx!.view).toBe("month");
    expect(ctx!.event.id).toBe("a");
    expect(ctx!.labels.start).toBeTruthy();
    expect(ctx!.hijri).toBeTruthy();
    expect(ctx!.size).toBe("wide");
    expect(ctx!.continuesBefore).toBe(false);
    expect(ctx!.continuesAfter).toBe(false);
  });
});

describe("<hijri-calendar> renderDayCell", () => {
  it("a Node returned by the hook replaces month-cell content, leaving day-cell/today-indicator/chips intact and the aria-label", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    el.renderDayCell = () => Object.assign(document.createElement("b"), { textContent: "D" });
    const buttons = sr(el).querySelectorAll('[part~="day"]');
    expect(buttons.length).toBe(42);
    buttons.forEach((btn) => {
      expect(btn.querySelector("b")).toBeTruthy();
      expect(btn.querySelector('[part="day-primary"]')).toBeNull();
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    });
    expect(sr(el).querySelectorAll('[part~="day-cell"]').length).toBe(42);
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("keyboard arrow navigation still works with the hook set", () => {
    const el = mount({ date: "2026-07-06" });
    el.renderDayCell = () => Object.assign(document.createElement("b"), { textContent: "D" });
    const buttons = Array.from(sr(el).querySelectorAll<HTMLButtonElement>("[data-i]"));
    expect(buttons[0]!.tabIndex).toBe(0);

    buttons[0]!.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect(buttons[0]!.tabIndex).toBe(-1);
    expect(buttons[1]!.tabIndex).toBe(0);
  });

  it("today-marker dot mode still renders the today-indicator alongside a hooked cell", () => {
    const todayIso = new Date().toISOString().slice(0, 10);
    const el = mount({ date: todayIso, "today-marker": "dot" });
    el.renderDayCell = () => Object.assign(document.createElement("b"), { textContent: "D" });
    expect(sr(el).querySelector('[part="today-indicator"]')).toBeTruthy();
  });

  it("returning null keeps the default day-numbers content", () => {
    const el = mount({ date: "2026-07-06" });
    el.renderDayCell = () => null;
    expect(sr(el).querySelector('[part="day-primary"]')).toBeTruthy();
  });

  it("replaces .tg-col-head content in week view, keyed by data-col", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.renderDayCell = () => Object.assign(document.createElement("b"), { textContent: "H" });
    const heads = sr(el).querySelectorAll(".tg-col-head");
    expect(heads.length).toBe(7);
    heads.forEach((h) => expect(h.querySelector("b")).toBeTruthy());
  });

  it("a throwing hook falls back to default content and warns exactly once across many cells", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const el = mount({ date: "2026-07-06" });
      el.renderDayCell = () => {
        throw new Error("boom");
      };
      const buttons = sr(el).querySelectorAll('[part~="day"]');
      expect(buttons.length).toBe(42);
      buttons.forEach((b) => expect(b.querySelector('[part="day-primary"]')).toBeTruthy());
      expect(warn).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
  });

  it("passes a well-formed RenderDayCellContext (placement/cell/events/labels/size)", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    let ctx: RenderDayCellContext | null = null;
    el.renderDayCell = (c) => {
      if (!ctx && c.events.length) ctx = c;
      return null;
    };
    expect(ctx).not.toBeNull();
    expect(ctx!.placement).toBe("month-cell");
    expect(ctx!.view).toBe("month");
    expect(ctx!.events[0]!.id).toBe("a");
    expect(ctx!.labels.primary).toBeTruthy();
    expect(ctx!.labels.weekday).toBeTruthy();
    expect(ctx!.size).toBe("wide");
  });

  it('column-head placement is reported for week/day views', () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    let placement: string | null = null;
    el.renderDayCell = (c) => {
      placement = c.placement;
      return null;
    };
    expect(placement).toBe("column-head");
  });
});
