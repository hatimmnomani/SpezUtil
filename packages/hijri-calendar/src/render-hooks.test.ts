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

/**
 * Review finding (Important): every test above either mounts a single event/cell or returns
 * identical content for every item, so a post-render *keying* regression (e.g. `lastTimedCol[i]`
 * swapped for `lastTimedCol[i+1]`, or the `lastCells[seg.weekIndex*7+seg.startCol]` lookup for
 * month chips breaking) would pass the whole suite silently — the wrong event's content would
 * render into the right event's button, a bug that looks like a data problem, not a rendering
 * one. These tests make the hook output identity-bearing (`ctx.event.id` / the cell's own date)
 * and cross-check it against an attribute the *default* renderer set independently at the
 * initial `innerHTML` pass — `title`/`aria-label` for events, `data-date` for month cells — which
 * the post-render hook pass never touches (it only replaces `innerHTML`, never attributes). A
 * mis-keyed pass would make the hook-rendered identity disagree with that untouched attribute.
 */
describe("<hijri-calendar> render hook post-render keying (no cross-item mix-ups)", () => {
  function idFromTitle(el: Element): string {
    const title = el.getAttribute("title") ?? el.getAttribute("aria-label") ?? "";
    const m = /^Event (\S+),/.exec(title);
    expect(m, `expected a "Event <id>, ..." title, got ${JSON.stringify(title)}`).toBeTruthy();
    return m![1]!;
  }

  it("month chips (data-ev): each button's hook-rendered event.id matches its own title, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00"), ev("b", "2026-07-20T14:00")];
    el.renderEvent = (ctx) => ctx.event.id;
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBe(2);
    const ids = new Set<string>();
    chips.forEach((c) => {
      const expected = idFromTitle(c);
      expect(c.textContent).toBe(expected);
      ids.add(expected);
    });
    expect(ids).toEqual(new Set(["a", "b"]));
  });

  it("all-day chips (data-aev): each button's hook-rendered event.id matches its own title, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      ev("a", "2026-07-06", { allDay: true }),
      ev("b", "2026-07-08", { allDay: true }),
    ];
    el.renderEvent = (ctx) => ctx.event.id;
    const chips = sr(el).querySelectorAll("[data-aev]");
    expect(chips.length).toBe(2);
    const ids = new Set<string>();
    chips.forEach((c) => {
      const expected = idFromTitle(c);
      expect(c.textContent).toBe(expected);
      ids.add(expected);
    });
    expect(ids).toEqual(new Set(["a", "b"]));
  });

  it("timed blocks (data-tev): each button's hook-rendered event.id matches its own title, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [ev("a", "2026-07-06T09:00"), ev("b", "2026-07-07T14:00")];
    el.renderEvent = (ctx) => ctx.event.id;
    const blocks = sr(el).querySelectorAll("[data-tev]");
    expect(blocks.length).toBe(2);
    const ids = new Set<string>();
    blocks.forEach((b) => {
      const expected = idFromTitle(b);
      expect(b.textContent).toBe(expected);
      ids.add(expected);
    });
    expect(ids).toEqual(new Set(["a", "b"]));
  });

  it("agenda items (data-gev): each button's hook-rendered event.id matches its own title, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [ev("a", "2026-07-06T10:00"), ev("b", "2026-07-08T09:00")];
    el.renderEvent = (ctx) => ctx.event.id;
    const items = sr(el).querySelectorAll('[part~="agenda-item"]');
    expect(items.length).toBe(2);
    const ids = new Set<string>();
    items.forEach((i) => {
      const expected = idFromTitle(i);
      expect(i.textContent).toBe(expected);
      ids.add(expected);
    });
    expect(ids).toEqual(new Set(["a", "b"]));
  });

  it("month-cell buttons (data-i): each button's hook-rendered cell date matches its own data-date, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06" });
    el.renderDayCell = (ctx) => ctx.cell.gregorian.toISOString().slice(0, 10);
    const buttons = sr(el).querySelectorAll<HTMLElement>("[data-i]");
    expect(buttons.length).toBe(42);
    const seen = new Set<string>();
    buttons.forEach((b) => {
      expect(b.textContent).toBe(b.dataset.date);
      seen.add(b.textContent!);
    });
    // All 42 dates distinct confirms no two cells collapsed onto the same lookup by accident.
    expect(seen.size).toBe(42);
  });

  it("time-grid column heads (data-col): each head's hook-rendered cell date matches its actual calendar-day position in the week, not a neighbour's", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.renderDayCell = (ctx) => ctx.cell.gregorian.toISOString().slice(0, 10);
    const heads = Array.from(sr(el).querySelectorAll<HTMLElement>(".tg-col-head"));
    expect(heads.length).toBe(7);
    // Ground truth computed independently of the component: 2026-07-06 is a Monday
    // (getUTCDay()===1), and the default week-start is 0 (Sunday), so the week-start-aligned
    // first day is Sunday 2026-07-05 — the same math range-change.test.ts and others rely on.
    const weekStartIso = "2026-07-05";
    const expectedDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(`${weekStartIso}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + i);
      return d.toISOString().slice(0, 10);
    });
    heads.forEach((h, i) => {
      expect(h.textContent!.trim()).toBe(expectedDates[i]);
    });
  });
});
