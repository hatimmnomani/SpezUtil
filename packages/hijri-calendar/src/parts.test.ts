import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement } from "./hijri-calendar";

/**
 * Table-driven coverage of every documented `::part()` name and token (plan §5.6 /
 * apps/docs/docs/calendar/api.md "Parts").
 *
 * The final whole-branch review found six documented part names that nothing ever emitted
 * (`event-tag`, `event-dot`, `allday`, `timed`, `continues-before`, `continues-after`) — a
 * consumer following the docs wrote `::part()` CSS that silently did nothing. Every individual
 * phase's tests passed, because each only checked the parts *it* introduced. This file is the
 * missing whole-surface check: the tables below are the documentation, and each row must be
 * reachable in some configuration. Adding a documented part without emitting it (or renaming an
 * emitted one) fails here.
 *
 * `TOKENS` rows assert that the token appears *alongside* the part name it is documented as a
 * token of, so a token being emitted as a part name of its own (the `event-dot` vs. `event dot`
 * confusion this file was written for) does not satisfy the row.
 */

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
});

beforeEach(() => {
  document.body.innerHTML = "";
});

function mount(attrs: Record<string, string> = {}, events?: CalendarEvent[]): HijriCalendarElement {
  const el = document.createElement("hijri-calendar") as HijriCalendarElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  document.body.appendChild(el);
  if (events) el.events = events;
  return el;
}

/**
 * Mounts with a synchronous `ResizeObserver` stub reporting `width`, so band-gated parts/tokens
 * (`calendar medium|narrow`, and the `narrow-events="dots"` marker) are reachable — jsdom has no
 * `ResizeObserver`, which is why the component's documented fallback band is `wide`. The stub is
 * installed only for the duration of the mount, as in responsive.test.ts.
 */
function mountAtWidth(
  width: number,
  attrs: Record<string, string> = {},
  events?: CalendarEvent[]
): HijriCalendarElement {
  class ResizeObserverStub {
    cb: ResizeObserverCallback;
    constructor(cb: ResizeObserverCallback) {
      this.cb = cb;
    }
    observe(): void {
      this.cb([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver);
    }
    disconnect(): void {}
  }
  const restore = (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
  try {
    return mount(attrs, events);
  } finally {
    (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver = restore;
  }
}

/** Every element in the shadow root that carries `token` in its `part` attribute. */
function withToken(el: HijriCalendarElement, token: string): Element[] {
  return Array.from(el.shadowRoot!.querySelectorAll(`[part~="${token}"]`));
}

// ---- fixtures -------------------------------------------------------------------------------

const TIMED: CalendarEvent = { id: "t", title: "Timed", start: "2026-07-06T10:00", end: "2026-07-06T11:00" };
const ALL_DAY: CalendarEvent = { id: "a", title: "All day", start: "2026-07-06", allDay: true };
/** Spans the whole visible July 2026 month grid, so its month chips continue in both directions. */
const SPANNING: CalendarEvent = { id: "s", title: "Long", start: "2026-06-01", end: "2026-08-31", allDay: true };
const WITH_SUBTITLE: CalendarEvent = { ...TIMED, subtitle: "Room 2" };

/** Month view, one timed + one all-day + one month-spanning event. */
const month = (): HijriCalendarElement =>
  mount({ date: "2026-07-06" }, [TIMED, ALL_DAY, SPANNING]);
/** Week view (time grid): all-day row, timed blocks, gutter, slots. */
const week = (): HijriCalendarElement =>
  mount({ date: "2026-07-06", view: "week", "event-time": "start" }, [WITH_SUBTITLE, ALL_DAY]);
/** Day view with the banner header. */
const dayBanner = (): HijriCalendarElement =>
  mount(
    { date: "2026-07-06", view: "day", "day-header": "banner", "now-indicator": "line-label" },
    [TIMED]
  );
/**
 * The now line only renders on a column that *is* today (`col.isToday`, computed from the real
 * clock — see zonedTodayUtc), so its parts need a day view on the real current date.
 */
const TODAY_ISO = new Date().toISOString().slice(0, 10);
const dayToday = (): HijriCalendarElement =>
  mount({ date: TODAY_ISO, view: "day", "now-indicator": "line-label" });
const agenda = (): HijriCalendarElement =>
  mount({ date: "2026-07-06", view: "agenda" }, [TIMED, ALL_DAY]);

// ---- part names ----------------------------------------------------------------------------

/** [documented part name, a configuration that must emit it] */
const PART_NAMES: [string, () => HijriCalendarElement][] = [
  // Existing (kept) — plan §5.6 "Existing (kept)"
  ["toolbar", month],
  ["title", month],
  ["nav-today", month],
  ["nav-prev", month],
  ["nav-next", month],
  ["view-switch", month],
  ["view-btn", month],
  ["weekday", month],
  ["day", month],
  ["day-primary", month],
  ["day-secondary", month],
  ["event", month],
  ["more-link", () => mount({ date: "2026-07-06", "max-events": "1" }, [TIMED, ALL_DAY, SPANNING])],
  ["allday-row", week],
  ["time-gutter", week],
  ["slot", week],
  ["now-indicator", dayToday],
  ["agenda-day", agenda],
  ["agenda-item", agenda],
  // New — plan §5.6 "New parts"
  ["calendar", month],
  ["nav-group", month],
  ["title-primary", month],
  ["title-secondary", month],
  ["subheader", month],
  ["weekday-primary", () => mount({ date: "2026-07-06", "weekday-format": "bilingual" })],
  ["weekday-secondary", () => mount({ date: "2026-07-06", "weekday-format": "bilingual" })],
  ["day-cell", month],
  ["day-numbers", month],
  // `part="day-month-marker"` is the *Hijri* marker span; the Gregorian marker is inline text in
  // the day-secondary span ("1 Jul"), not a part of its own.
  ["day-month-marker", () => mount({ date: "2026-07-06", "month-marker": "hijri" })],
  ["today-indicator", () => mount({ date: new Date().toISOString().slice(0, 10), "today-marker": "dot" })],
  ["column-head", week],
  ["day-column", week],
  ["time-label", week],
  ["allday-label", week],
  ["event-time", week],
  ["event-title", week],
  ["event-subtitle", week],
  ["now-label", dayToday],
  ["day-banner", dayBanner],
  ["day-banner-primary", dayBanner],
  ["day-banner-secondary", dayBanner],
  ["day-banner-weekday", dayBanner],
  ["day-banner-summary", dayBanner],
  ["agenda-date", agenda],
  ["agenda-when", agenda],
  ["loading", () => mount({ date: "2026-07-06", loading: "" })],
  ["scroll", week],
];

describe("<hijri-calendar> documented ::part() names are all emitted", () => {
  it.each(PART_NAMES)('emits part="%s"', (name, factory) => {
    const el = factory();
    expect(withToken(el, name).length).toBeGreaterThan(0);
  });
});

// ---- tokens ---------------------------------------------------------------------------------

/** [token, the part name it is documented as a token of, a configuration that must emit it] */
const TOKENS: [string, string, () => HijriCalendarElement][] = [
  ["today", "day-cell", () => mount({ date: new Date().toISOString().slice(0, 10) })],
  ["out", "day-cell", month], // July 2026 grid always has leading/trailing days
  ["weekend", "weekday", month],
  [
    // `disabled` is a token of the day-cell background layer (the `day` button carries the real
    // `disabled` *attribute* instead, which is what styles.ts targets).
    "disabled",
    "day-cell",
    () => {
      const el = document.createElement("hijri-calendar") as HijriCalendarElement;
      el.setAttribute("date", "2026-07-06");
      el.isDateDisabled = () => true;
      document.body.appendChild(el);
      return el;
    },
  ],
  ["continues-before", "event", month],
  ["continues-after", "event", month],
  ["allday", "event", month],
  ["timed", "event", month],
  ["allday", "agenda-item", agenda],
  ["timed", "agenda-item", agenda],
  ["timed", "event", week], // the timed block in the time grid
  ["allday", "event", week], // the all-day row chip
  // Dot mode is gated on the narrow band, so this one needs a measured width.
  ["dot", "event", () => mountAtWidth(420, { date: "2026-07-06", "narrow-events": "dots" }, [TIMED])],
  ["solid", "event", month],
  ["tinted", "event", () => mount({ date: "2026-07-06", "event-style": "tinted" }, [TIMED])],
  ["outline", "event", () => mount({ date: "2026-07-06", "event-style": "outline" }, [TIMED])],
  ["variant-draft", "event", () => mount({ date: "2026-07-06" }, [{ ...TIMED, variant: "draft" }])],
  ["wide", "calendar", month], // jsdom has no ResizeObserver: the documented "wide" fallback
  ["medium", "calendar", () => mountAtWidth(768, { date: "2026-07-06" })],
  ["narrow", "calendar", () => mountAtWidth(420, { date: "2026-07-06" })],
];

describe("<hijri-calendar> documented ::part() tokens are all emitted", () => {
  it.each(TOKENS)('emits "%s" as a token of part="%s"', (token, partName, factory) => {
    const el = factory();
    const matches = withToken(el, token).filter((node) =>
      (node.getAttribute("part") ?? "").split(/\s+/).includes(partName)
    );
    expect(matches.length).toBeGreaterThan(0);
  });
});

// The `dot` token case above is the one the docs used to get wrong (they listed a part named
// `event-dot`, which nothing emits). Pin the shape explicitly so a future rename has to update
// both the emitted DOM and the docs together.
describe("<hijri-calendar> narrow-events dots", () => {
  it('emits part="event dot", never part="event-dot"', () => {
    const el = mountAtWidth(420, { date: "2026-07-06", "narrow-events": "dots" }, [TIMED]);
    expect(el.shadowRoot!.querySelector('[part~="event-dot"]')).toBeNull();
    const dot = el.shadowRoot!.querySelector('[part~="dot"]')!;
    expect((dot.getAttribute("part") ?? "").split(/\s+/)).toEqual(["event", "dot"]);
  });
});

// `CalendarEvent.tag` is deliberately hook-only (no `event-tag` part) — see plan §5.6.
describe("<hijri-calendar> CalendarEvent.tag", () => {
  it("renders no part for `tag`, but hands it to renderEvent as ctx.event.tag", () => {
    const tags: (string | undefined)[] = [];
    const el = document.createElement("hijri-calendar") as HijriCalendarElement;
    el.setAttribute("date", "2026-07-06");
    el.renderEvent = (ctx) => {
      tags.push(ctx.event.tag);
      return null;
    };
    document.body.appendChild(el);
    el.events = [{ ...TIMED, tag: "meeting" }];
    expect(el.shadowRoot!.querySelector('[part~="event-tag"]')).toBeNull();
    expect(el.shadowRoot!.innerHTML).not.toContain("meeting");
    expect(tags).toEqual(["meeting"]);
  });
});
