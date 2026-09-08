import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { HijriCalendarElement, type RangeChangeDetail } from "./hijri-calendar";

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
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

function listen(el: HijriCalendarElement): RangeChangeDetail[] {
  const events: RangeChangeDetail[] = [];
  el.addEventListener("range-change", (e) => events.push((e as CustomEvent).detail));
  return events;
}

function daySpan(detail: RangeChangeDetail): number {
  const start = new Date(`${detail.start}T00:00:00Z`).getTime();
  const end = new Date(`${detail.end}T00:00:00Z`).getTime();
  return (end - start) / 86400000;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<hijri-calendar> range-change: initial fire", () => {
  it('fires exactly once on connect with reason "init" and the month grid bounds', () => {
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    const events = listen(el);
    document.body.appendChild(el); // triggers connectedCallback synchronously

    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("init");
    expect(events[0]!.view).toBe("month");

    const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-date]"));
    const firstDate = cells[0]!.dataset.date!;
    const lastDate = cells[cells.length - 1]!.dataset.date!;
    const expectedEnd = new Date(`${lastDate}T00:00:00Z`);
    expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);

    expect(events[0]!.start).toBe(firstDate);
    expect(events[0]!.end).toBe(expectedEnd.toISOString().slice(0, 10));
    expect(el.visibleRange).toEqual(events[0]);
  });
});

describe("<hijri-calendar> range-change: disconnect -> reconnect (Finding 4, task-5 review)", () => {
  it('emits exactly one range-change with reason "init" on reconnect, even when the reconnect crosses a size-band boundary in the same tick', () => {
    // Minimal synchronous ResizeObserver stub (same shape as responsive.test.ts's), scoped to
    // this test only: setupResizeObserver()'s callback must fire synchronously, in the same
    // tick as connectedCallback(), to reproduce the race Finding 4 describes — a real
    // ResizeObserver only fires asynchronously, so it can never observe this bug directly, but
    // hosts moving the element to a differently-sized container on reconnect can still hit it.
    class ResizeObserverStub {
      static nextWidth = 400;
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(): void {
        this.cb(
          [{ contentRect: { width: ResizeObserverStub.nextWidth } } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      }
      disconnect(): void {}
    }
    const restore = (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;

    try {
      const el = document.createElement("hijri-calendar") as HijriCalendarElement;
      el.setAttribute("date", "2026-07-06");
      ResizeObserverStub.nextWidth = 400; // narrow
      document.body.appendChild(el); // first connect: establishes _size = "narrow"

      el.remove(); // disconnect
      // Change the visible range while disconnected: attributeChangedCallback still runs
      // syncFromAttrs() (updates viewDate) but skips render() because !isConnected, so
      // lastRangeDetail is NOT updated here — the pending range change is only picked up by
      // whichever render fires first after reconnect.
      el.setAttribute("date", "2026-08-06");
      ResizeObserverStub.nextWidth = 900; // wide — crosses the narrow/medium/wide boundary

      const events = listen(el);
      document.body.appendChild(el); // reconnect: connectedCallback() re-runs

      expect(events.length).toBe(1);
      expect(events[0]!.reason).toBe("init");
      expect(events[0]!.view).toBe("month");

      // The range reflects the date set while disconnected (August), not the stale July range
      // from before disconnect — confirms this is a real, correctly-reasoned emission and not
      // a coincidental dedupe pass-through.
      const cells = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-date]"));
      const firstDate = cells[0]!.dataset.date!;
      const lastDate = cells[cells.length - 1]!.dataset.date!;
      const expectedEnd = new Date(`${lastDate}T00:00:00Z`);
      expectedEnd.setUTCDate(expectedEnd.getUTCDate() + 1);
      expect(events[0]!.start).toBe(firstDate);
      expect(events[0]!.end).toBe(expectedEnd.toISOString().slice(0, 10));
      // Confirms it's genuinely the August grid, not a stale July one carried over from before
      // disconnect (the risk this test guards against is a swallowed/misreasoned event, not a
      // wrong date — but pinning the rendered month name makes the scenario unambiguous).
      expect(sr(el).querySelector('[part="title-secondary"]')!.textContent).toContain("Aug");
    } finally {
      (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver = restore;
    }
  });
});

describe("<hijri-calendar> range-change: navigation", () => {
  it('nav-next fires reason "navigate"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("navigate");
  });

  it("nav-next then nav-prev round-trips A→B→A, emitting exactly two more events and never a duplicate", () => {
    const el = mount({ date: "2026-07-06" });
    const initialStart = el.visibleRange!.start;
    const events = listen(el);
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    (sr(el).querySelector('[part="nav-prev"]') as HTMLButtonElement).click();
    expect(events.length).toBe(2);
    expect(events[0]!.reason).toBe("navigate");
    expect(events[1]!.reason).toBe("navigate");
    expect(events[0]!.start).not.toBe(initialStart);
    expect(events[1]!.start).toBe(initialStart);
  });
});

describe("<hijri-calendar> range-change: no-ops", () => {
  it("setting events does not fire range-change", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    expect(events.length).toBe(0);
  });

  it("setting eventFields does not fire range-change", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.eventFields = { start: "start_at" };
    expect(events.length).toBe(0);
  });
});

describe("<hijri-calendar> range-change: view/attribute reasons", () => {
  it('an external view attribute change fires reason "attribute"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    el.setAttribute("view", "week");
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("attribute");
    expect(events[0]!.view).toBe("week");
  });

  it('clicking a view button fires reason "view"', () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(events.length).toBe(1);
    expect(events[0]!.reason).toBe("view");
    expect(events[0]!.view).toBe("week");
  });
});

describe("<hijri-calendar> range-change: per-view range length", () => {
  it("week view spans 7 days", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(7);
  });

  it("day view spans 1 day", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="day"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(1);
  });

  it("agenda view spans 30 days", () => {
    const el = mount({ date: "2026-07-06" });
    const events = listen(el);
    (sr(el).querySelector('[data-view="agenda"]') as HTMLButtonElement).click();
    expect(daySpan(events[0]!)).toBe(30);
  });
});

describe("<hijri-calendar> range-change: synchronous re-entrant handler (final-review finding 1)", () => {
  // The documented headline use of range-change (getting-started.md: key your data fetching by
  // {start, end}) plus a synchronous cache means a host assigns `events` from inside the handler,
  // re-entering render() while the outer call is still mid-flight. Before the fix, render()
  // emitted *before* wireView()/the hook passes, so the re-entrant pass built AND wired a fresh
  // subtree and the outer pass then wired that same subtree a second time — every listener bound
  // twice (one click => two date-click/event-click events, renderEvent run twice per chip).
  const seenStarts: string[] = [];

  function mountWithSyncCache(): HijriCalendarElement {
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    el.addEventListener("range-change", (e) => {
      seenStarts.push((e as CustomEvent<RangeChangeDetail>).detail.start);
      // Answering synchronously from a cache — the exact shape of the reported bug.
      el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    });
    document.body.appendChild(el);
    return el;
  }

  beforeEach(() => {
    seenStarts.length = 0;
  });

  it("fires exactly one date-click per day-button click", () => {
    const el = mountWithSyncCache();
    const clicks: unknown[] = [];
    el.addEventListener("date-click", (e) => clicks.push((e as CustomEvent).detail));
    sr(el).querySelector<HTMLButtonElement>("[data-date]")!.click();
    expect(clicks.length).toBe(1);
  });

  it("fires exactly one event-click per chip click", () => {
    const el = mountWithSyncCache();
    const clicks: unknown[] = [];
    el.addEventListener("event-click", (e) => clicks.push((e as CustomEvent).detail));
    const chip = sr(el).querySelector<HTMLButtonElement>('[part~="event"]');
    expect(chip).toBeTruthy();
    chip!.click();
    expect(clicks.length).toBe(1);
  });

  it("invokes renderEvent exactly once per rendered chip", () => {
    // Mount empty, then navigate: the "navigate" range-change is answered from the cache, which
    // re-enters render(). Before the fix this ran the hook twice per chip (once from the
    // re-entrant pass, once from the outer pass finishing on the same, replaced subtree — the
    // second call receiving the first's output as its fallbackHtml).
    const el = mount({ date: "2026-07-06" });
    const hook = vi.fn(() => null);
    el.renderEvent = hook;
    el.addEventListener("range-change", () => {
      el.events = [
        { id: "a", title: "Event a", start: "2026-08-10T10:00" },
        { id: "b", title: "Event b", start: "2026-08-11T10:00" },
      ];
    });
    hook.mockClear();
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(2);
    expect(hook).toHaveBeenCalledTimes(2);
  });

  it('still emits exactly one range-change with reason "init" on the first render', () => {
    const el = mountWithSyncCache();
    expect(seenStarts.length).toBe(1);
    expect(el.visibleRange!.reason).toBe("init");
  });

  it("exposes a correct visibleRange to the handler itself, before the handler returns", () => {
    const seen: (RangeChangeDetail | null)[] = [];
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    el.addEventListener("range-change", (e) => {
      seen.push(el.visibleRange);
      expect(el.visibleRange).toEqual((e as CustomEvent<RangeChangeDetail>).detail);
      el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    });
    document.body.appendChild(el);
    expect(seen.length).toBe(1);
    expect(seen[0]).not.toBeNull();
  });

  it("navigating from inside the handler settles with a warning instead of recursing forever", () => {
    // Pathological host: changes the visible range on every range-change. Before the guard this
    // blew the stack; now the drain is capped (MAX_RENDER_PASSES) and the last request is
    // dropped with one warning.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const el = document.createElement("hijri-calendar") as HijriCalendarElement;
      el.setAttribute("date", "2026-07-06");
      let n = 0;
      el.addEventListener("range-change", (e) => {
        n += 1;
        // Ping-pong between two views so every pass really does produce a different range (the
        // {view,start,end} dedupe would otherwise stop the loop by itself).
        const view = (e as CustomEvent<RangeChangeDetail>).detail.view;
        el.setAttribute("view", view === "month" ? "week" : "month");
      });
      document.body.appendChild(el);
      // One initial pass plus MAX_RENDER_PASSES (5) drained passes, then the cap trips once.
      expect(n).toBe(6);
      expect(warn).toHaveBeenCalledTimes(1);
      expect(String(warn.mock.calls[0]![0])).toContain("re-entered render()");
      // Still alive and rendering after the cap tripped.
      expect(sr(el).querySelector('[part~="calendar"]')).toBeTruthy();
    } finally {
      warn.mockRestore();
    }
  });
});
