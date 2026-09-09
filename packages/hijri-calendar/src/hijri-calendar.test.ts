import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createCalendar, translitMonthNames, arMonthNames } from "@spezutil/hijri-core";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement } from "./hijri-calendar";

const cal = createCalendar();

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

const ev = (id: string, start: string, extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
  id,
  title: `Event ${id}`,
  start,
  ...extra,
});

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<hijri-calendar> shell", () => {
  it("renders a month grid by default", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelector('[role="grid"]')).toBeTruthy();
    expect(sr(el).querySelectorAll('[data-i]').length).toBe(42);
  });

  it("shows the Hijri month title with a Gregorian subtitle", () => {
    const el = mount({ date: "2026-07-06" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    const title = sr(el).querySelector('[part="title"]')!.textContent!;
    expect(title).toContain(translitMonthNames[h.month - 1]);
    expect(title).toContain(String(h.year));
  });

  it("renders Arabic month names when locale=ar", () => {
    const el = mount({ date: "2026-07-06", locale: "ar" });
    const h = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      arMonthNames[h.month - 1]
    );
  });

  it("navigates to the next Hijri month and fires date-change", () => {
    const el = mount({ date: "2026-07-06" });
    const before = cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6)));
    let detail: { date: string } | null = null;
    el.addEventListener("date-change", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part="nav-next"]') as HTMLButtonElement).click();
    expect(detail).not.toBeNull();
    const after = cal.gregorianToHijri(new Date(detail!.date + "T00:00Z"));
    expect(after.month === before.month + 1 || (before.month === 12 && after.month === 1)).toBe(
      true
    );
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      translitMonthNames[after.month - 1]
    );
  });

  it("returns to today via the today button", () => {
    const el = mount({ date: "2020-01-01" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    const todayHijri = cal.gregorianToHijri(new Date());
    expect(sr(el).querySelector('[part="title"]')!.textContent).toContain(
      translitMonthNames[todayHijri.month - 1]
    );
  });

  it("switches views via the view switcher and fires view-change", () => {
    const el = mount({ date: "2026-07-06" });
    let detail: { view: string } | null = null;
    el.addEventListener("view-change", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[data-view="week"]') as HTMLButtonElement).click();
    expect(detail).toEqual({ view: "week" });
    expect(el.getAttribute("view")).toBe("week");
  });

  it("reflects camelCase properties to attributes", () => {
    const el = mount({ date: "2026-07-06" });
    el.locale = "ar";
    el.dayStart = 8;
    el.dayEnd = 18;
    el.weekStart = 1;
    el.maxEvents = 5;
    el.timeFormat = "24";
    expect(el.getAttribute("locale")).toBe("ar");
    expect(el.getAttribute("day-start")).toBe("8");
    expect(el.getAttribute("day-end")).toBe("18");
    expect(el.getAttribute("week-start")).toBe("1");
    expect(el.getAttribute("max-events")).toBe("5");
    expect(el.getAttribute("time-format")).toBe("24");
    expect(el.locale).toBe("ar");
    expect(el.dayStart).toBe(8);
    expect(el.dayEnd).toBe(18);
  });

  it("applies rtl direction", () => {
    const el = mount({ date: "2026-07-06", dir: "rtl" });
    expect(el.getAttribute("dir")).toBe("rtl");
  });

  it("reflects the timezone property to an attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.timezone = "Asia/Kolkata";
    expect(el.getAttribute("timezone")).toBe("Asia/Kolkata");
    expect(el.timezone).toBe("Asia/Kolkata");
  });
});

describe("<hijri-calendar> timezone-aware today", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("resolves the today button using the local calendar day, not UTC", () => {
    vi.useFakeTimers();
    // 00:30 UTC on 20 July 2026, but only 13:30 on 19 July in UTC-11 (Pago Pago).
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 0, 30)));
    const el = mount({ date: "2020-01-01", timezone: "Pacific/Pago_Pago" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    expect(el.date).toBe("2026-07-19");
  });

  it("resolves the today button forward across the UTC day boundary when the zone is ahead", () => {
    vi.useFakeTimers();
    // 23:30 UTC on 20 July 2026 is already 13:30 on 21 July in UTC+14 (Kiritimati).
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 20, 23, 30)));
    const el = mount({ date: "2020-01-01", timezone: "Pacific/Kiritimati" });
    (sr(el).querySelector('[part="nav-today"]') as HTMLButtonElement).click();
    expect(el.date).toBe("2026-07-21");
  });
});

describe("<hijri-calendar> month view events", () => {
  it("renders event chips for supplied events", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBe(1);
    expect(chips[0]!.textContent).toContain("Event a");
  });

  it("applies the event color to the chip", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00", { color: "rgb(200, 0, 0)" })];
    const chip = sr(el).querySelector('[part~="event"]') as HTMLElement;
    expect(chip.style.getPropertyValue("--_ev-color")).toBe("rgb(200, 0, 0)");
  });

  it("fires event-click with event, hijri and gregorian detail", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00", { data: { n: 1 } })];
    let detail: { event: CalendarEvent; gregorian: string } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part~="event"]') as HTMLButtonElement).click();
    expect(detail!.event.id).toBe("a");
    expect(detail!.gregorian).toBe("2026-07-06T10:00");
    expect(detail!.event.data).toEqual({ n: 1 });
  });

  it("fires date-click when a day cell is clicked", () => {
    const el = mount({ date: "2026-07-06" });
    let detail: { gregorian: string; hijri: { day: number } } | null = null;
    el.addEventListener("date-click", (e) => (detail = (e as CustomEvent).detail));
    const target = Array.from(sr(el).querySelectorAll<HTMLElement>("[data-i]")).find(
      (b) => b.dataset.date === "2026-07-06"
    )!;
    target.click();
    expect(detail!.gregorian).toBe("2026-07-06");
    expect(detail!.hijri).toEqual(cal.gregorianToHijri(new Date(Date.UTC(2026, 6, 6))));
  });

  it("collapses events beyond max-events into a +N more link firing more-click", () => {
    const el = mount({ date: "2026-07-06", "max-events": "2" });
    el.events = [
      ev("a", "2026-07-06T08:00"),
      ev("b", "2026-07-06T09:00"),
      ev("c", "2026-07-06T10:00"),
    ];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(2);
    const more = sr(el).querySelector('[part="more-link"]') as HTMLButtonElement;
    expect(more.textContent).toContain("1");
    let detail: { events: CalendarEvent[]; gregorian: string } | null = null;
    el.addEventListener("more-click", (e) => (detail = (e as CustomEvent).detail));
    more.click();
    expect(detail!.gregorian).toBe("2026-07-06");
    expect(detail!.events.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });
});

describe("<hijri-calendar> Phase 0 tokenised styles", () => {
  it("declares --hcal-font-family on :host and uses it for the base font", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-font-family: system-ui, sans-serif;");
    expect(css).toContain("font-family: var(--hcal-font-family);");
  });

  it("tokenises previously hard-coded sizes", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-cell-min-height: 96px;");
    expect(css).toContain("--hcal-body-max-height: 640px;");
    expect(css).toContain("--hcal-button-radius: 6px;");
    expect(css).toContain("--hcal-switch-bg: transparent;");
    expect(css).toContain("--hcal-switch-active-bg: var(--hcal-accent);");
    expect(css).toContain("--hcal-switch-active-fg: var(--hcal-accent-fg);");
    expect(css).toContain("--hcal-switch-active-shadow: none;");
    expect(css).toContain("min-height: var(--hcal-cell-min-height);");
    expect(css).toContain("max-height: var(--hcal-body-max-height);");
  });
});

describe("<hijri-calendar> Phase 0 native title on events", () => {
  it("carries a title on the all-day and timed time-grid event blocks", () => {
    const el = mount({ date: "2026-07-06", view: "week" });
    el.events = [
      { id: "a", title: "Event a", start: "2026-07-06", allDay: true },
      { id: "b", title: "Event b", start: "2026-07-06T10:00" },
    ];
    const allDayChip = sr(el).querySelector('[data-aev]') as HTMLElement;
    expect(allDayChip.getAttribute("title")).toBe("Event a, All day");
    const timedBlock = sr(el).querySelector('[data-tev]') as HTMLElement;
    expect(timedBlock.getAttribute("title")).toBe("Event b, 10 AM");
  });

  it("carries a title on agenda items", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" });
    el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    const item = sr(el).querySelector('[part~="agenda-item"]') as HTMLElement;
    expect(item.getAttribute("title")).toBe("Event a, 10 AM");
  });
});

describe("<hijri-calendar> eventFields mapping", () => {
  it("renders unmodified events as before when eventFields is unset", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [ev("a", "2026-07-06T10:00")];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("maps a differently-named start field before rendering", () => {
    const el = mount({ date: "2026-07-06" });
    el.eventFields = { start: "start_at" };
    el.events = [
      { id: "a", title: "Check", start_at: "2026-07-06T09:30", attendees: [{ id: "x" }] },
    ] as unknown as CalendarEvent[];
    const chips = sr(el).querySelectorAll('[part~="event"]');
    expect(chips.length).toBe(1);
    expect(chips[0]!.textContent).toContain("Check");
  });

  it("re-derives events when eventFields is set after events", () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [
      { id: "a", title: "Check", start_at: "2026-07-06T09:30" },
    ] as unknown as CalendarEvent[];
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(0);
    el.eventFields = { start: "start_at" };
    expect(sr(el).querySelectorAll('[part~="event"]').length).toBe(1);
  });

  it("attaches the original raw object as data for click handlers", () => {
    const el = mount({ date: "2026-07-06" });
    el.eventFields = { start: "start_at" };
    const raw = { id: "a", title: "Check", start_at: "2026-07-06T09:30", attendees: [{ id: "x" }] };
    el.events = [raw] as unknown as CalendarEvent[];
    let detail: { event: CalendarEvent } | null = null;
    el.addEventListener("event-click", (e) => (detail = (e as CustomEvent).detail));
    (sr(el).querySelector('[part~="event"]') as HTMLButtonElement).click();
    expect(detail!.event.data).toBe(raw);
  });
});

describe("<hijri-calendar> loading", () => {
  it('sets aria-busy="true" on the grid and renders a part="loading" overlay', () => {
    const el = mount({ date: "2026-07-06", loading: "" });
    expect(el.loading).toBe(true);
    expect(sr(el).querySelector('[role="grid"]')!.getAttribute("aria-busy")).toBe("true");
    const overlay = sr(el).querySelector('[part="loading"]');
    expect(overlay).toBeTruthy();
    expect(overlay!.textContent).toBe("Loading…");
  });

  it("removing the attribute removes aria-busy and the overlay", () => {
    const el = mount({ date: "2026-07-06", loading: "" });
    el.removeAttribute("loading");
    expect(el.loading).toBe(false);
    expect(sr(el).querySelector('[role="grid"]')!.hasAttribute("aria-busy")).toBe(false);
    expect(sr(el).querySelector('[part="loading"]')).toBeNull();
  });

  it("applies aria-busy to .timegrid and .agenda bodies too", () => {
    const week = mount({ date: "2026-07-06", view: "week", loading: "" });
    expect(sr(week).querySelector(".timegrid")!.getAttribute("aria-busy")).toBe("true");
    const agenda = mount({ date: "2026-07-06", view: "agenda", loading: "" });
    expect(sr(agenda).querySelector(".agenda")!.getAttribute("aria-busy")).toBe("true");
  });

  it("the loading slot falls back to loc.loadingLabel and can be overridden by light-DOM slotting", () => {
    const el = mount({ date: "2026-07-06", loading: "" });
    const slot = sr(el).querySelector('slot[name="loading"]') as HTMLSlotElement;
    expect(slot).toBeTruthy();
    const span = document.createElement("span");
    span.slot = "loading";
    span.textContent = "Fetching…";
    el.appendChild(span);
    expect(slot.assignedNodes()[0]!.textContent).toBe("Fetching…");
  });

  it("reflects the loading property to the attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.loading = true;
    expect(el.getAttribute("loading")).toBe("");
    el.loading = false;
    expect(el.hasAttribute("loading")).toBe(false);
  });

  it(".body-wrap (needed to give the loading overlay a positioning context) contributes no box of its own — no padding/border/margin — and carries the flex:1 its children (.month/.timegrid/.agenda) previously relied on directly under .cal", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    const rule = css.match(/\.body-wrap\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    const decls = rule![1]!;
    expect(decls).toMatch(/flex:\s*1\b/);
    expect(decls).not.toMatch(/padding/);
    expect(decls).not.toMatch(/border/);
    expect(decls).not.toMatch(/margin/);
  });
});

// D8 (WCAG 2 AA color-contrast fix): jsdom computes no cascaded custom properties, so every
// assertion below reads the *declared* token values out of the `styles` string, never
// getComputedStyle. See docs/plans/hijri-calendar-events-parity.md §5.4 D8 and
// apps/docs/docs/calendar/api.md's "Accepted visual changes" section for the narrative.
describe("<hijri-calendar> WCAG AA contrast (D8)", () => {
  // A ~15-line relative-luminance/contrast helper, local to this test file on purpose — see the
  // task brief: no dependency, and this must never be exported from the package.
  function hexToRgb(hex: string): [number, number, number] {
    const h = hex.replace("#", "");
    const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
    const num = Number.parseInt(full, 16);
    return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
  }
  function channelLuminance(c: number): number {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }
  function relativeLuminance(hex: string): number {
    const [r, g, b] = hexToRgb(hex);
    return 0.2126 * channelLuminance(r) + 0.7152 * channelLuminance(g) + 0.0722 * channelLuminance(b);
  }
  function contrastRatio(hex1: string, hex2: string): number {
    const L1 = relativeLuminance(hex1);
    const L2 = relativeLuminance(hex2);
    const [lighter, darker] = L1 >= L2 ? [L1, L2] : [L2, L1];
    return (lighter + 0.05) / (darker + 0.05);
  }
  // Mirrors `color-mix(in srgb, var(--hcal-accent) 10%, transparent)` composited over
  // --hcal-bg, i.e. the actual default --hcal-today-bg surface (jsdom can't evaluate
  // color-mix() itself, so this is done by hand from the declared token values).
  function alphaOverWhite(fgHex: string, alpha: number): string {
    const [r, g, b] = hexToRgb(fgHex);
    const [wr, wg, wb] = hexToRgb("#ffffff");
    const mix = [r, g, b].map((c, i) => Math.round(alpha * c + (1 - alpha) * [wr, wg, wb][i]!));
    return "#" + mix.map((c) => c.toString(16).padStart(2, "0")).join("");
  }

  const AA_NORMAL_TEXT = 4.5;

  it("declares the darkened --hcal-muted default (was #9aa0a6, ≈2.64:1 on white)", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-muted: #5b6572;");
    expect(css).not.toContain("--hcal-muted: #9aa0a6;");
  });

  it("--hcal-muted clears 4.5:1 against both --hcal-bg (#fff) and the default --hcal-today-bg tint", () => {
    const muted = "#5b6572";
    const todayBgTint = alphaOverWhite("#0b7d3e", 0.1); // --hcal-accent at 10%, per --hcal-today-bg
    expect(contrastRatio(muted, "#ffffff")).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
    expect(contrastRatio(muted, todayBgTint)).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("darkens --hcal-now-color so the now-label text clears 4.5:1 on white (was #ea4335, ≈3.92:1)", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-now-color: #c5321f;");
    expect(css).not.toContain("--hcal-now-color: #ea4335;");
    expect(contrastRatio("#c5321f", "#ffffff")).toBeGreaterThanOrEqual(AA_NORMAL_TEXT);
  });

  it("declares a dedicated --hcal-cell-out-fg token defaulting to --hcal-muted", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-cell-out-fg: var(--hcal-muted);");
  });

  it("out-of-month day numbers are de-emphasised via color, not opacity: .day-head.out no longer carries an opacity declaration", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).not.toMatch(/\.day-head\.out\s*\{\s*opacity:/);
    expect(css).toContain(
      '.day-head.out .num-primary,\n.day-head.out .num-secondary,\n.day-head.out [part~="day-month-marker"] { color: var(--hcal-cell-out-fg); }',
    );
  });

  it("the out-of-month day-head rule actually renders on out-of-month cells", () => {
    const el = mount({ date: "2026-07-06" });
    const outHead = sr(el).querySelector(".day-head.out");
    expect(outHead).toBeTruthy();
    expect(outHead!.querySelector(".num-primary")).toBeTruthy();
  });

  it("the bilingual weekday secondary label no longer compounds opacity on top of the muted color", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    const rule = css.match(/\.dow \[part~="weekday-secondary"\]\s*\{([^}]*)\}/);
    expect(rule).toBeTruthy();
    expect(rule![1]!).not.toMatch(/opacity/);
  });

  it("--hcal-cell-out-opacity is still declared (for any host CSS still referencing it) but is no longer consumed anywhere in styles.ts", () => {
    const el = mount({ date: "2026-07-06" });
    const css = sr(el).querySelector("style")!.textContent!;
    expect(css).toContain("--hcal-cell-out-opacity: 0.45;");
    const consumers = css.match(/var\(--hcal-cell-out-opacity\)/g) ?? [];
    expect(consumers.length).toBe(0);
  });
});
