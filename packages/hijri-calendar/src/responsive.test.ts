import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement, SIZE_BANDS } from "./hijri-calendar";

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
});

/**
 * Minimal `ResizeObserver` stub, per the task-5 brief: `observe()` invokes the callback
 * synchronously (real browsers do it asynchronously, after layout — see the doc comment on
 * `setupResizeObserver()` in hijri-calendar.ts for why the component tolerates either). Extended
 * with `trigger()` so a test can simulate a later resize after mount, and `instances`/`nextWidth`
 * so `mount()` below can control the width a freshly-constructed element measures.
 */
class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];
  static nextWidth = 900;
  width: number;
  cb: ResizeObserverCallback;
  disconnected = false;
  constructor(cb: ResizeObserverCallback) {
    this.cb = cb;
    this.width = ResizeObserverStub.nextWidth;
    ResizeObserverStub.instances.push(this);
  }
  observe(): void {
    this.trigger(this.width);
  }
  disconnect(): void {
    this.disconnected = true;
  }
  trigger(width: number): void {
    this.width = width;
    this.cb([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
  }
}

beforeEach(() => {
  document.body.innerHTML = "";
  ResizeObserverStub.instances = [];
  ResizeObserverStub.nextWidth = 900;
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
});

function mount(attrs: Record<string, string> = {}, width = 900): HijriCalendarElement {
  ResizeObserverStub.nextWidth = width;
  const el = document.createElement("hijri-calendar") as HijriCalendarElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  return el;
}

function sr(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

/** The `ResizeObserverStub` instance created for the most recently mounted element. */
function lastObserver(): ResizeObserverStub {
  return ResizeObserverStub.instances[ResizeObserverStub.instances.length - 1]!;
}

const ev = (id: string, start: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  ...extra,
});

describe("<hijri-calendar> size bands (§5.9)", () => {
  it("SIZE_BANDS exposes the documented fixed thresholds", () => {
    expect(SIZE_BANDS).toEqual({ medium: 600, wide: 900 });
  });

  it("1000px classifies as wide and carries the token on part=calendar", () => {
    const el = mount({ date: "2026-07-06" }, 1000);
    expect(el.size).toBe("wide");
    const parts = (sr(el).querySelector(".cal")!.getAttribute("part") ?? "").split(/\s+/);
    expect(parts).toEqual(["calendar", "wide"]);
  });

  it("700px classifies as medium", () => {
    const el = mount({ date: "2026-07-06" }, 700);
    expect(el.size).toBe("medium");
    const parts = (sr(el).querySelector(".cal")!.getAttribute("part") ?? "").split(/\s+/);
    expect(parts).toContain("medium");
  });

  it("400px classifies as narrow", () => {
    const el = mount({ date: "2026-07-06" }, 400);
    expect(el.size).toBe("narrow");
    const parts = (sr(el).querySelector(".cal")!.getAttribute("part") ?? "").split(/\s+/);
    expect(parts).toContain("narrow");
  });

  it("the boundary values themselves land in the band above (>= wins)", () => {
    expect(mount({ date: "2026-07-06" }, 900).size).toBe("wide");
    expect(mount({ date: "2026-07-06" }, 600).size).toBe("medium");
    expect(mount({ date: "2026-07-06" }, 599).size).toBe("narrow");
  });
});

describe("<hijri-calendar> re-renders only when the band changes", () => {
  it("700 -> 720 stays medium and does not call render again", () => {
    const el = mount({ date: "2026-07-06" }, 700);
    const spy = vi.spyOn(el as unknown as { render: () => void }, "render");
    lastObserver().trigger(720);
    expect(el.size).toBe("medium");
    expect(spy).not.toHaveBeenCalled();
  });

  it("700 -> 590 crosses into narrow and re-renders exactly once", () => {
    const el = mount({ date: "2026-07-06" }, 700);
    const spy = vi.spyOn(el as unknown as { render: () => void }, "render");
    lastObserver().trigger(590);
    expect(el.size).toBe("narrow");
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("a band-change re-render does not emit range-change (the visible view/range is unchanged)", () => {
    const el = mount({ date: "2026-07-06" }, 700);
    const rangeEvents: unknown[] = [];
    el.addEventListener("range-change", (e) => rangeEvents.push((e as CustomEvent).detail));
    lastObserver().trigger(400);
    expect(el.size).toBe("narrow");
    expect(rangeEvents.length).toBe(0);
  });

  it("the synchronous first ResizeObserver callback (fired from connectedCallback, before render('init')) does not cause a second render", () => {
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    ResizeObserverStub.nextWidth = 400;
    const spy = vi.spyOn(
      HijriCalendarElement.prototype as unknown as { render: () => void },
      "render"
    );
    document.body.appendChild(el);
    expect(el.size).toBe("narrow");
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
});

describe("<hijri-calendar> no ResizeObserver available", () => {
  it("falls back to wide with no thrown errors", () => {
    const saved = (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    delete (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    try {
      let el: HijriCalendarElement | undefined;
      expect(() => {
        el = document.createElement("hijri-calendar") as HijriCalendarElement;
        el.setAttribute("date", "2026-07-06");
        document.body.appendChild(el);
      }).not.toThrow();
      expect(el!.size).toBe("wide");
    } finally {
      (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = saved;
    }
  });
});

describe("<hijri-calendar> ResizeObserver lifecycle", () => {
  it("disconnects the observer in disconnectedCallback", () => {
    const el = mount({ date: "2026-07-06" }, 900);
    const observer = lastObserver();
    el.remove();
    expect(observer.disconnected).toBe(true);
  });

  it("a stray callback after removal does not throw (defensive — real ResizeObserver never calls back once disconnected)", () => {
    const el = mount({ date: "2026-07-06" }, 900);
    const observer = lastObserver();
    el.remove();
    expect(() => observer.trigger(400)).not.toThrow();
  });
});

describe('<hijri-calendar> narrow-events="dots" (default) at the narrow band', () => {
  function fourEvents(): CalendarEvent[] {
    return [
      ev("a", "2026-07-06T09:00", { color: "#111111" }),
      ev("b", "2026-07-06T10:00", { color: "#222222" }),
      ev("c", "2026-07-06T11:00", { color: "#333333" }),
      ev("d", "2026-07-06T12:00", { color: "#444444" }),
    ];
  }

  function cellFor(el: HijriCalendarElement, iso: string): HTMLElement {
    const dayBtn = sr(el).querySelector(`[data-date="${iso}"]`)!;
    const i = dayBtn.getAttribute("data-i");
    return sr(el).querySelector(`[data-cell="${i}"]`) as HTMLElement;
  }

  it("emits up to max-events dot spans plus a non-interactive +N overflow span, and zero chip buttons anywhere in the grid", () => {
    const el = mount({ date: "2026-07-06", "max-events": "2" }, 400);
    el.events = fourEvents();
    const cell = cellFor(el, "2026-07-06");
    const dots = cell.querySelectorAll('span[part~="event"][part~="dot"]');
    expect(dots.length).toBe(2);
    // Non-interactive: a <span>, never a <button>.
    expect(cell.querySelectorAll('button[part~="dot"]').length).toBe(0);
    const more = cell.querySelector('[part="more-link"]')!;
    expect(more.tagName).toBe("SPAN");
    expect(more.textContent).toBe("+2");
    // No lane chips and no desktop more-link buttons anywhere in the month grid.
    expect(sr(el).querySelectorAll('button[part~="event"]').length).toBe(0);
    expect(sr(el).querySelectorAll("button.more").length).toBe(0);
  });

  it("no overflow span when every event on the day fits within max-events", () => {
    const el = mount({ date: "2026-07-06", "max-events": "6" }, 400);
    el.events = fourEvents();
    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelectorAll('span[part~="event"][part~="dot"]').length).toBe(4);
    expect(cell.querySelector('[part="more-link"]')).toBeNull();
  });

  it("clicking the day-cell layer fires date-click; event-click can never fire (no event buttons exist to click)", () => {
    const el = mount({ date: "2026-07-06" }, 400);
    el.events = [ev("a", "2026-07-06T09:00")];
    const dateClicks: unknown[] = [];
    const eventClicks: unknown[] = [];
    el.addEventListener("date-click", (e) => dateClicks.push((e as CustomEvent).detail));
    el.addEventListener("event-click", (e) => eventClicks.push((e as CustomEvent).detail));
    expect(sr(el).querySelectorAll('button[part~="event"]').length).toBe(0);
    const cell = cellFor(el, "2026-07-06");
    cell.click();
    expect(dateClicks.length).toBe(1);
    expect(eventClicks.length).toBe(0);
  });

  it("appends loc.moreDotsLabel(n) to the day button's aria-label when the day has events, and leaves it alone when it has none", () => {
    const el = mount({ date: "2026-07-06" }, 400);
    el.events = [ev("a", "2026-07-06T09:00"), ev("b", "2026-07-06T10:00")];
    const withEvents = sr(el).querySelector('[data-date="2026-07-06"]')!;
    expect(withEvents.getAttribute("aria-label")).toMatch(/, 2 events$/);
    const withoutEvents = sr(el).querySelector('[data-date="2026-07-07"]')!;
    expect(withoutEvents.getAttribute("aria-label")).not.toMatch(/events$/);
  });

  it('max-events="0" falls back to the documented default (3) everywhere, including dot mode — never divides the dot cap by zero or renders a negative overflow', () => {
    const el = mount({ date: "2026-07-06", "max-events": "0" }, 400);
    expect(el.maxEvents).toBe(3);
    el.events = [1, 2, 3, 4, 5].map((n) => ev(String(n), `2026-07-06T0${n}:00`));
    const cell = cellFor(el, "2026-07-06");
    expect(cell.querySelectorAll('span[part~="event"][part~="dot"]').length).toBe(3);
    expect(cell.querySelector('[part="more-link"]')!.textContent).toBe("+2");
  });

  it("has no effect outside the narrow band — wide keeps the desktop chip layout", () => {
    const el = mount({ date: "2026-07-06" }, 900);
    el.events = fourEvents();
    expect(sr(el).querySelectorAll('button[part~="event"]').length).toBeGreaterThan(0);
    expect(sr(el).querySelectorAll('[part~="dot"]').length).toBe(0);
  });
});

describe('<hijri-calendar> narrow-events="scroll" at the narrow band', () => {
  it("keeps the desktop chip layout and wraps .month in part=scroll", () => {
    const el = mount({ date: "2026-07-06", "narrow-events": "scroll" }, 400);
    el.events = [ev("a", "2026-07-06T09:00")];
    expect(sr(el).querySelectorAll('button[part~="event"]').length).toBeGreaterThan(0);
    const scroll = sr(el).querySelector('[part="scroll"]')!;
    expect(scroll).toBeTruthy();
    expect(scroll.querySelector(".month")).toBeTruthy();
  });

  it("does not wrap .month in part=scroll outside the narrow band", () => {
    const el = mount({ date: "2026-07-06", "narrow-events": "scroll" }, 900);
    const scrollWrappers = Array.from(sr(el).querySelectorAll('[part="scroll"]')).filter((n) =>
      n.querySelector(".month")
    );
    expect(scrollWrappers.length).toBe(0);
  });
});

describe("<hijri-calendar> week/day scroll container (Ruling B)", () => {
  it("with an all-day event present, part=scroll contains .tg-head, .tg-allday and .tg-body", () => {
    const el = mount({ date: "2026-07-06", view: "week" }, 400);
    el.events = [ev("a", "2026-07-06", { end: "2026-07-07" })];
    const scroll = sr(el).querySelector('[part="scroll"]')!;
    expect(scroll.querySelector(".tg-head")).toBeTruthy();
    expect(scroll.querySelector(".tg-allday")).toBeTruthy();
    expect(scroll.querySelector(".tg-body")).toBeTruthy();
  });

  it('with allday-row="always" and no events, part=scroll still contains all three', () => {
    const el = mount({ date: "2026-07-06", view: "week", "allday-row": "always" }, 400);
    const scroll = sr(el).querySelector('[part="scroll"]')!;
    expect(scroll.querySelector(".tg-head")).toBeTruthy();
    expect(scroll.querySelector(".tg-allday")).toBeTruthy();
    expect(scroll.querySelector(".tg-body")).toBeTruthy();
  });

  it("with no all-day row rendered at all, part=scroll still wraps .tg-head and .tg-body", () => {
    const el = mount({ date: "2026-07-06", view: "week", "allday-row": "auto" }, 400);
    expect(sr(el).querySelector(".tg-allday")).toBeNull();
    const scroll = sr(el).querySelector('[part="scroll"]')!;
    expect(scroll.querySelector(".tg-head")).toBeTruthy();
    expect(scroll.querySelector(".tg-body")).toBeTruthy();
  });

  it("also wraps the day-view banner head (day-header=banner) together with .tg-body", () => {
    const el = mount({ date: "2026-07-06", view: "day", "day-header": "banner" }, 400);
    const scroll = sr(el).querySelector('[part="scroll"]')!;
    expect(scroll.querySelector('[part~="day-banner"]')).toBeTruthy();
    expect(scroll.querySelector(".tg-body")).toBeTruthy();
  });

  it("the styles string declares sticky positioning for the gutter/allday-label/head-first-cell group and the head row", () => {
    const el = mount({ date: "2026-07-06", view: "week" }, 400);
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(
      /\.tg-gutter,\s*\.tg-allday-label,\s*\.tg-head\s*>\s*:first-child\s*\{[^}]*position:\s*sticky[^}]*inset-inline-start:\s*0/
    );
    expect(css).toMatch(/\.tg-head\s*\{\s*position:\s*sticky;\s*top:\s*0/);
  });

  it("day columns get a min-width floor at medium/narrow but not at wide (Global Constraint 1: wide is unchanged)", () => {
    const wide = mount({ date: "2026-07-06", view: "week" }, 1000);
    const wideHead = sr(wide).querySelector(".tg-head") as HTMLElement;
    expect(wideHead.getAttribute("style")).toContain("repeat(7, 1fr)");
    expect(wideHead.getAttribute("style")).not.toContain("--hcal-column-min-width");

    const narrow = mount({ date: "2026-07-06", view: "week" }, 400);
    const narrowHead = sr(narrow).querySelector(".tg-head") as HTMLElement;
    expect(narrowHead.getAttribute("style")).toContain(
      "repeat(7, minmax(var(--hcal-column-min-width), 1fr))"
    );
  });
});

describe("<hijri-calendar> weekday-format render-time downgrade at narrow (§5.9 task 3)", () => {
  it('"bilingual" drops weekday-secondary entirely at narrow, in the DOM (not just CSS) — primary keeps the full name', () => {
    const el = mount({ date: "2026-07-06", "weekday-format": "bilingual" }, 400);
    expect(sr(el).querySelectorAll('[part~="weekday-secondary"]').length).toBe(0);
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent).toBe("Sunday");
  });

  it('"bilingual" still renders both primary and secondary at wide/medium — the downgrade is narrow-only', () => {
    const wide = mount({ date: "2026-07-06", "weekday-format": "bilingual" }, 900);
    expect(sr(wide).querySelectorAll('[part~="weekday-secondary"]').length).toBe(7);
    const medium = mount({ date: "2026-07-06", "weekday-format": "bilingual" }, 700);
    expect(sr(medium).querySelectorAll('[part~="weekday-secondary"]').length).toBe(7);
  });

  it('"long" downgrades to the 3-letter abbreviation at narrow', () => {
    const el = mount({ date: "2026-07-06", "weekday-format": "long" }, 400);
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent).toBe("Sun");
  });

  it('"long" keeps the full name at wide', () => {
    const el = mount({ date: "2026-07-06", "weekday-format": "long" }, 900);
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent).toBe("Sunday");
  });

  it('"short" (default) is unaffected by the band either way', () => {
    const el = mount({ date: "2026-07-06" }, 400);
    const first = sr(el).querySelectorAll('[part~="weekday-primary"]')[0]!;
    expect(first.textContent!.length).toBe(3);
  });
});

describe("<hijri-calendar> title forced stacked at narrow, at render time (§5.9 task 3)", () => {
  it('title-layout="inline" loses the inline data-layout hook at narrow — title-secondary still renders', () => {
    const el = mount({ date: "2026-07-06", "title-layout": "inline" }, 400);
    const title = sr(el).querySelector('[part="title"]')!;
    expect(title.getAttribute("data-layout")).toBe("stacked");
    expect(title.getAttribute("data-layout")).not.toBe("inline");
    expect(sr(el).querySelector('[part="title-secondary"]')).toBeTruthy();
  });

  it('title-layout="inline" keeps the inline hook at wide, and title-secondary still renders there too', () => {
    const el = mount({ date: "2026-07-06", "title-layout": "inline" }, 900);
    const title = sr(el).querySelector('[part="title"]')!;
    expect(title.getAttribute("data-layout")).toBe("inline");
    expect(sr(el).querySelector('[part="title-secondary"]')).toBeTruthy();
  });

  it("the default stacked layout is unaffected by the band", () => {
    const el = mount({ date: "2026-07-06" }, 400);
    const title = sr(el).querySelector('[part="title"]')!;
    expect(title.getAttribute("data-layout")).toBe("stacked");
  });
});

describe("<hijri-calendar> day banner and agenda stacking at narrow (§5.9 task 6, CSS)", () => {
  it("styles narrow-band-stacks the day banner via flex-direction: column", () => {
    const el = mount({ date: "2026-07-06", view: "day", "day-header": "banner" }, 400);
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\[data-size="narrow"\]\s*\[part~="day-banner"\]\s*\{[^}]*flex-direction:\s*column/);
  });

  it("styles narrow-band-stacks the agenda date above its items via flex-direction: column", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" }, 400);
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/\[data-size="narrow"\]\s*\.agenda-day\s*\{[^}]*flex-direction:\s*column/);
  });
});

describe("<hijri-calendar> :host containment (§5.9 task 7, CSS)", () => {
  it("declares max-width: 100%, min-width: 0 and overflow: hidden on :host", () => {
    const el = mount({ date: "2026-07-06" }, 400);
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toMatch(/:host\s*\{[^}]*max-width:\s*100%/);
    expect(css).toMatch(/:host\s*\{[^}]*min-width:\s*0/);
    expect(css).toMatch(/:host\s*\{[^}]*overflow:\s*hidden/);
  });
});
