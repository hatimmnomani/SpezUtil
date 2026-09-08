import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { HijriCalendarElement } from "./hijri-calendar";

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

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("<hijri-calendar> views attribute", () => {
  it("renders exactly the requested view buttons, in order", () => {
    const el = mount({ date: "2026-07-06", views: "day week month" });
    const btns = Array.from(sr(el).querySelectorAll('[part~="view-btn"]'));
    expect(btns.map((b) => b.getAttribute("data-view"))).toEqual(["day", "week", "month"]);
  });

  it("always includes the active view even when absent from the list", () => {
    const el = mount({ date: "2026-07-06", views: "week", view: "month" });
    const btns = Array.from(sr(el).querySelectorAll('[part~="view-btn"]'));
    expect(btns.map((b) => b.getAttribute("data-view"))).toEqual(["week", "month"]);
  });

  it("defaults to all four views in the canonical order", () => {
    const el = mount({ date: "2026-07-06" });
    const btns = Array.from(sr(el).querySelectorAll('[part~="view-btn"]'));
    expect(btns.map((b) => b.getAttribute("data-view"))).toEqual(["month", "week", "day", "agenda"]);
  });

  it("reflects the views property to the attribute", () => {
    const el = mount({ date: "2026-07-06" });
    el.views = ["day", "agenda"];
    expect(el.getAttribute("views")).toBe("day agenda");
  });
});

describe("<hijri-calendar> toolbar attribute", () => {
  it('toolbar="none" removes the toolbar but keeps the subheader slot', () => {
    const el = mount({ date: "2026-07-06", toolbar: "none" });
    expect(sr(el).querySelector('[part~="toolbar"]')).toBeNull();
    expect(sr(el).querySelector('slot[name="subheader"]')).toBeTruthy();
  });

  it('toolbar="full" (default) renders the toolbar', () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelector('[part~="toolbar"]')).toBeTruthy();
  });
});

describe("<hijri-calendar> slots", () => {
  it("renders toolbar-start, toolbar-end and subheader slots", () => {
    const el = mount({ date: "2026-07-06" });
    expect(sr(el).querySelector('slot[name="toolbar-start"]')).toBeTruthy();
    expect(sr(el).querySelector('slot[name="toolbar-end"]')).toBeTruthy();
    expect(sr(el).querySelector('slot[name="subheader"]')).toBeTruthy();
  });

  it("slotted light-DOM content persists across re-render", () => {
    const el = mount({ date: "2026-07-06" });
    const span = document.createElement("span");
    span.slot = "toolbar-start";
    span.textContent = "Host content";
    el.appendChild(span);
    // Force a re-render.
    el.setAttribute("view", "week");
    const slot = sr(el).querySelector<HTMLSlotElement>('slot[name="toolbar-start"]')!;
    expect(slot.assignedElements()).toContain(span);
  });
});

describe("<hijri-calendar> nav-group", () => {
  it('contains prev, today and next in DOM order (D1)', () => {
    const el = mount({ date: "2026-07-06" });
    const group = sr(el).querySelector('[part="nav-group"]')!;
    const parts = Array.from(group.querySelectorAll("[part]")).map((b) => b.getAttribute("part"));
    expect(parts).toEqual(["nav-prev", "nav-today", "nav-next"]);
  });
});

describe("<hijri-calendar> part=calendar", () => {
  it('the root .cal element carries part="calendar" plus the current size-band token (task 2: additive, so existing ::part(calendar) selectors keep matching)', () => {
    const el = mount({ date: "2026-07-06" });
    // No ResizeObserver in this jsdom environment, so the band falls back to "wide" (task 1).
    const parts = (sr(el).querySelector(".cal")!.getAttribute("part") ?? "").split(/\s+/);
    expect(parts).toContain("calendar");
    expect(parts).toContain("wide");
  });
});

describe("<hijri-calendar> event title attribute", () => {
  it('a month chip has a native title="<title>, <time>" string', () => {
    const el = mount({ date: "2026-07-06" });
    el.events = [{ id: "a", title: "Event a", start: "2026-07-06T10:00" }];
    const chip = sr(el).querySelector('[part~="event"]') as HTMLElement;
    expect(chip.getAttribute("title")).toBe("Event a, 10 AM");
  });
});
