import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement } from "./hijri-calendar";

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

function partTokens(el: Element): string[] {
  return (el.getAttribute("part") ?? "").split(/\s+/).filter(Boolean);
}

describe("<hijri-calendar> event-style", () => {
  it('defaults to "solid" (today\'s behaviour): chip carries no tinted/outline token', () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00" }];
    const chip = sr(el).querySelector('[part~="event"]')!;
    const tokens = partTokens(chip);
    expect(tokens).toContain("event");
    expect(tokens).toContain("solid");
    expect(tokens).not.toContain("tinted");
    expect(tokens).not.toContain("outline");
  });

  it('event-style="tinted" puts "tinted" on the chip part', () => {
    const el = mount({ date: "2026-07-06", "event-style": "tinted" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00" }];
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(partTokens(chip)).toContain("tinted");
  });

  it("a per-event style overrides the component's event-style attribute", () => {
    const el = mount({ date: "2026-07-06", "event-style": "tinted" });
    el.events = [
      { id: "a", title: "A", start: "2026-07-06T10:00", style: "outline" } as CalendarEvent,
    ];
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(partTokens(chip)).toContain("outline");
    expect(partTokens(chip)).not.toContain("tinted");
  });

  it("applies to all-day chips too", () => {
    const el = mount({ date: "2026-07-06", view: "week", "event-style": "outline" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06", allDay: true }];
    const chip = sr(el).querySelector("[data-aev]")!;
    expect(partTokens(chip)).toContain("outline");
  });

  it("tinted/outline CSS rules key off the part attribute and use the documented tokens", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\[part~="event"\]\[part~="tinted"\]/);
    expect(css).toMatch(/\[part~="event"\]\[part~="outline"\]/);
    expect(css).toContain("var(--hcal-event-tint-alpha)");
    expect(css).toContain("var(--hcal-event-border-width)");
    expect(css).toContain("--hcal-event-tint-alpha: 18%;");
    expect(css).toContain("--hcal-event-border-width: 2px;");
  });
});

describe("<hijri-calendar> variant", () => {
  it('a valid variant becomes "variant-<v>" on part and data-variant', () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [
      { id: "a", title: "A", start: "2026-07-06T10:00", variant: "draft" } as CalendarEvent,
    ];
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(partTokens(chip)).toContain("variant-draft");
    expect(chip.getAttribute("data-variant")).toBe("draft");
  });

  it("an event with no variant gets no variant-* token and no data-variant attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00" }];
    const chip = sr(el).querySelector('[part~="event"]')!;
    expect(partTokens(chip).some((t) => t.startsWith("variant-"))).toBe(false);
    expect(chip.hasAttribute("data-variant")).toBe(false);
  });

  it("a hostile variant reaching the component through the public events property produces no attribute syntax in the rendered part and no extra attributes on the element (Ruling P)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const el = mount({ date: "2026-07-06" });
      el.events = [
        {
          id: "hostile-1",
          title: "A",
          start: "2026-07-06T10:00",
          variant: '"><img src=x onerror=alert(1)>',
        } as CalendarEvent,
      ];
      const chip = sr(el).querySelector('[part~="event"]') as HTMLElement;
      expect(chip).toBeTruthy();

      const partAttr = chip.getAttribute("part") ?? "";
      expect(partAttr).not.toMatch(/[<>"]/);
      expect(partAttr.split(/\s+/).every((t) => /^[a-z0-9-]+$/.test(t))).toBe(true);

      expect(chip.hasAttribute("data-variant")).toBe(false);
      expect(chip.hasAttribute("src")).toBe(false);
      expect(chip.hasAttribute("onerror")).toBe(false);
      expect(sr(el).querySelector("img")).toBeNull();
      expect(sr(el).innerHTML).not.toContain("<img");
      expect(sr(el).innerHTML).not.toContain("onerror=");

      expect(warn).toHaveBeenCalled();
    } finally {
      warn.mockRestore();
    }
  });
});

describe("<hijri-calendar> event-time", () => {
  it('month view default ("auto") renders no [part="event-time"]', () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00" }];
    expect(sr(el).querySelector('[part="event-time"]')).toBeNull();
  });

  it('event-time="start" in month view renders the start time', () => {
    const el = mount({ date: "2026-07-06", "event-time": "start" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00" }];
    const timeEl = sr(el).querySelector('[part="event-time"]');
    expect(timeEl).not.toBeNull();
    expect(timeEl!.textContent).toBe("10 AM");
  });

  it('event-time="start-duration" in week view shows "<start> · <duration>" (12h default)', () => {
    const el = mount({ date: "2026-07-06", view: "week", "event-time": "start-duration" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00", durationMinutes: 90 }];
    const timeEl = sr(el).querySelector('[part="event-time"]');
    expect(timeEl!.textContent).toBe("10 AM · 90m");
  });

  it('...in 24h time-format shows "10:00 · 90m"', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "event-time": "start-duration",
      "time-format": "24",
    });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00", durationMinutes: 90 }];
    const timeEl = sr(el).querySelector('[part="event-time"]');
    expect(timeEl!.textContent).toBe("10:00 · 90m");
  });

  it('...with numerals-gregorian="arab" transliterates the clock digits but leaves the duration unit as loc.durationLabel defines it, and never sets dir on the mixed-content span (Ruling K/M)', () => {
    const el = mount({
      date: "2026-07-06",
      view: "week",
      "event-time": "start-duration",
      "time-format": "24",
      "numerals-gregorian": "arab",
    });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00", durationMinutes: 90 }];
    const timeEl = sr(el).querySelector('[part="event-time"]')!;
    expect(timeEl.textContent).toBe("١٠:٠٠ · 90m");
    expect(timeEl.getAttribute("dir")).toBeNull();
  });

  it('event-time="range" shows "<start> – <end>"', () => {
    const el = mount({ date: "2026-07-06", view: "week", "event-time": "range" });
    el.events = [{ id: "a", title: "A", start: "2026-07-06T10:00", end: "2026-07-06T11:30" }];
    const timeEl = sr(el).querySelector('[part="event-time"]');
    expect(timeEl!.textContent).toBe("10 AM – 11:30 AM");
  });

  it("renders event-subtitle only when the event has a subtitle", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      { id: "a", title: "A", start: "2026-07-06T10:00", subtitle: "Room 2" },
      { id: "b", title: "B", start: "2026-07-06T12:00" },
    ];
    const blocks = Array.from(sr(el).querySelectorAll('[part~="event"]'));
    const withSub = blocks.find((b) => b.querySelector('[part="event-subtitle"]'));
    expect(withSub).toBeTruthy();
    expect(withSub!.querySelector('[part="event-subtitle"]')!.textContent).toBe("Room 2");
    const withoutSub = blocks.find((b) => !b.querySelector('[part="event-subtitle"]'));
    expect(withoutSub).toBeTruthy();
  });

  it("every chip/block content includes an event-title span", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      { id: "a", title: "Timed", start: "2026-07-06T10:00" },
      { id: "b", title: "All day", start: "2026-07-06", allDay: true },
    ];
    const titles = Array.from(sr(el).querySelectorAll('[part="event-title"]')).map(
      (s) => s.textContent
    );
    expect(titles.sort()).toEqual(["All day", "Timed"]);
  });
});

describe("<hijri-calendar> eventFields function mapping", () => {
  it("a function-valued eventFields.color derives --_ev-color per chip from the raw object", () => {
    const TONES: Record<string, string> = { meeting: "#D62246", personal: "#2F6E54" };
    const el = mount({ date: "2026-07-06" });
    el.eventFields = { color: (r) => TONES[r.event_type as string] ?? "#000000" };
    el.events = [
      { id: "a", title: "Standup", start: "2026-07-06T09:00", event_type: "meeting" },
      { id: "b", title: "Lunch", start: "2026-07-06T12:00", event_type: "personal" },
    ] as unknown as CalendarEvent[];
    const chips = Array.from(sr(el).querySelectorAll<HTMLElement>('[part~="event"]'));
    expect(chips.length).toBe(2);
    expect(chips[0]!.style.getPropertyValue("--_ev-color")).toBe(TONES.meeting);
    expect(chips[1]!.style.getPropertyValue("--_ev-color")).toBe(TONES.personal);
  });
});

describe("<hijri-calendar> durationMinutes positioning", () => {
  it("durationMinutes derives the same block height/top as an equivalent explicit end, in the default 0-24 window", () => {
    const elDuration = mount({ date: "2026-07-06", view: "week" });
    elDuration.events = [{ id: "a", title: "A", start: "2026-07-06T10:00", durationMinutes: 90 }];
    const durationBlock = sr(elDuration).querySelector('[part~="event"]') as HTMLElement;

    const elEnd = mount({ date: "2026-07-06", view: "week" });
    elEnd.events = [{ id: "b", title: "B", start: "2026-07-06T10:00", end: "2026-07-06T11:30" }];
    const endBlock = sr(elEnd).querySelector('[part~="event"]') as HTMLElement;

    expect(durationBlock.style.height).toBe("6.25%");
    expect(durationBlock.style.top).toBe(endBlock.style.top);
    expect(durationBlock.style.height).toBe(endBlock.style.height);
  });

  it("an explicit end still wins over durationMinutes when both are present", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      {
        id: "a",
        title: "A",
        start: "2026-07-06T10:00",
        end: "2026-07-06T12:00",
        durationMinutes: 90,
      },
    ];
    const block = sr(el).querySelector('[part~="event"]') as HTMLElement;
    // 2h (120min), not 90min: (120/1440)*100 = 8.333...%
    expect(block.style.height).toBe(`${(120 / 1440) * 100}%`);
  });
});
