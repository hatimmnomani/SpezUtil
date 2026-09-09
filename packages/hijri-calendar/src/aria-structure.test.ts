import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { CalendarEvent } from "@spezutil/hijri-view-core";
import { HijriCalendarElement } from "./hijri-calendar";

/**
 * Structural ARIA invariants for every view, table-driven.
 *
 * Written for a **Critical** axe finding against the month view: `.week[role="row"]` contained
 * the event-chip buttons, the "+N more" buttons and the 42 `day-cell` background divs, none of
 * which is a permitted child of `role="row"` (only `cell`/`gridcell`/`columnheader`/`rowheader`
 * are). The fix wraps the day button in a per-day `role="gridcell"` and moves the spanning event
 * layer into a sibling `role="row"` inside a `role="rowgroup"` week wrapper — deliberately
 * *without* hiding the chips from assistive tech, which would have silenced the audit while
 * making the component less accessible (the chips are real, focusable buttons).
 *
 * The two walkers below re-implement the two ARIA rules that were broken — "required owned
 * elements" (axe `aria-required-children`) and "required context role" (axe
 * `aria-required-parent`) — over the whole shadow tree, so any view that grows a new role, or
 * puts interactive content back inside a row, fails here rather than in an external audit. They
 * are intentionally strict about role-less wrappers: axe treats a wrapper with no role as
 * transparent and keeps looking down, so a `<button>` nested one div deeper inside a row is
 * still a violation, and is still caught here.
 */

beforeAll(() => {
  if (!customElements.get("hijri-calendar")) {
    customElements.define("hijri-calendar", HijriCalendarElement);
  }
});

beforeEach(() => {
  document.body.innerHTML = "";
});

// ---- the ARIA rules (ARIA 1.2 §5.3, only the roles this component can emit) -----------------

/** Roles that restrict which roles may be their owned children. */
const ALLOWED_CHILD_ROLES: Record<string, string[]> = {
  grid: ["row", "rowgroup"],
  rowgroup: ["row"],
  row: ["cell", "gridcell", "columnheader", "rowheader"],
  table: ["row", "rowgroup"],
  treegrid: ["row", "rowgroup"],
  list: ["listitem"],
};

/** Roles that require a particular context (owner) role. */
const REQUIRED_PARENT_ROLES: Record<string, string[]> = {
  gridcell: ["row"],
  cell: ["row"],
  columnheader: ["row"],
  rowheader: ["row"],
  row: ["grid", "rowgroup", "table", "treegrid"],
  rowgroup: ["grid", "table", "treegrid"],
  listitem: ["list"],
};

/**
 * Implicit roles for the element types this component emits. Only what matters for the rules
 * above: the point is that a `<button>` inside a `role="row"` is a `button` child, which is not
 * a permitted one, whether or not anybody wrote `role` on it.
 */
function implicitRole(el: Element): string | null {
  switch (el.tagName) {
    case "BUTTON":
      return "button";
    case "A":
      return el.hasAttribute("href") ? "link" : null;
    case "UL":
    case "OL":
      return "list";
    case "LI":
      return "listitem";
    case "INPUT":
    case "SELECT":
    case "TEXTAREA":
      return "textbox";
    case "IMG":
      return "img";
    case "SLOT":
    case "STYLE":
    case "SPAN":
    case "DIV":
      return null;
    default:
      return null;
  }
}

function roleOf(el: Element): string | null {
  return el.getAttribute("role") ?? implicitRole(el);
}

function describeEl(el: Element): string {
  const cls = el.getAttribute("class");
  const part = el.getAttribute("part");
  return `<${el.tagName.toLowerCase()}${cls ? ` class="${cls}"` : ""}${part ? ` part="${part}"` : ""}>`;
}

/**
 * Every violation of "required owned elements": for each element carrying a child-restricted
 * role, every owned child must have a permitted role. Children with no role of their own are
 * transparent (axe looks through them), so the walk descends into those instead of accepting
 * them.
 */
function requiredChildrenViolations(root: ParentNode): string[] {
  const out: string[] = [];
  const visit = (el: Element): void => {
    const role = roleOf(el);
    const allowed = role ? ALLOWED_CHILD_ROLES[role] : undefined;
    if (allowed) {
      const check = (parentDesc: string, node: Element): void => {
        for (const child of Array.from(node.children)) {
          const childRole = roleOf(child);
          if (childRole === null) {
            check(parentDesc, child); // transparent wrapper: keep looking down
            continue;
          }
          if (!allowed.includes(childRole)) {
            out.push(
              `${parentDesc} (role="${role}") has child ${describeEl(child)} with role ` +
                `"${childRole}" — allowed: ${allowed.join(", ")}`
            );
          }
        }
      };
      check(describeEl(el), el);
    }
    for (const child of Array.from(el.children)) visit(child);
  };
  for (const child of Array.from(root.children ?? [])) visit(child as Element);
  return out;
}

/** Every violation of "required context role": nearest role-bearing ancestor must be permitted. */
function requiredParentViolations(root: ParentNode): string[] {
  const out: string[] = [];
  const visit = (el: Element, ancestorRole: string | null): void => {
    const role = roleOf(el);
    const required = role ? REQUIRED_PARENT_ROLES[role] : undefined;
    if (required && (ancestorRole === null || !required.includes(ancestorRole))) {
      out.push(
        `${describeEl(el)} (role="${role}") is owned by ` +
          `${ancestorRole === null ? "no role at all" : `role="${ancestorRole}"`} — requires one ` +
          `of: ${required.join(", ")}`
      );
    }
    const nextAncestor = role ?? ancestorRole;
    for (const child of Array.from(el.children)) visit(child, nextAncestor);
  };
  for (const child of Array.from(root.children ?? [])) visit(child as Element, null);
  return out;
}

// ---- fixtures -------------------------------------------------------------------------------

const TIMED: CalendarEvent = { id: "t", title: "Timed", start: "2026-07-06T10:00", end: "2026-07-06T11:00" };
const TIMED_2: CalendarEvent = { id: "t2", title: "Second", start: "2026-07-06T12:00", end: "2026-07-06T13:00" };
const TIMED_3: CalendarEvent = { id: "t3", title: "Third", start: "2026-07-06T14:00", end: "2026-07-06T15:00" };
const ALL_DAY: CalendarEvent = { id: "a", title: "All day", start: "2026-07-06", allDay: true };
/** Spans the whole visible July 2026 grid, so its chips span columns and continue past the edges. */
const SPANNING: CalendarEvent = { id: "s", title: "Long", start: "2026-06-01", end: "2026-08-31", allDay: true };
const DENSE = [TIMED, TIMED_2, TIMED_3, ALL_DAY, SPANNING];

function mount(
  attrs: Record<string, string> = {},
  events?: CalendarEvent[],
  width?: number
): HijriCalendarElement {
  const el = document.createElement("hijri-calendar") as HijriCalendarElement;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  if (width === undefined) {
    document.body.appendChild(el);
  } else {
    // Same synchronous ResizeObserver stub responsive.test.ts / parts.test.ts use: jsdom has
    // none, so the band-gated DOM (dot mode, the narrow scroll wrapper) is otherwise unreachable.
    class ResizeObserverStub {
      cb: ResizeObserverCallback;
      constructor(cb: ResizeObserverCallback) {
        this.cb = cb;
      }
      observe(): void {
        this.cb(
          [{ contentRect: { width } } as ResizeObserverEntry],
          this as unknown as ResizeObserver
        );
      }
      disconnect(): void {}
    }
    const restore = (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver;
    (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
    try {
      document.body.appendChild(el);
    } finally {
      (globalThis as unknown as { ResizeObserver?: unknown }).ResizeObserver = restore;
    }
  }
  if (events) el.events = events;
  return el;
}

/** [name, factory] — every view/config whose ARIA structure must hold. */
const VIEWS: [string, () => HijriCalendarElement][] = [
  ["month (empty)", () => mount({ date: "2026-07-06" })],
  ["month (events, spanning chips)", () => mount({ date: "2026-07-06" }, DENSE)],
  [
    "month (overflow more-links)",
    () => mount({ date: "2026-07-06", "max-events": "1" }, DENSE),
  ],
  [
    "month (disabled days)",
    () => {
      const el = document.createElement("hijri-calendar") as HijriCalendarElement;
      el.setAttribute("date", "2026-07-06");
      el.isDateDisabled = () => true;
      document.body.appendChild(el);
      return el;
    },
  ],
  ["month (loading)", () => mount({ date: "2026-07-06", loading: "" }, DENSE)],
  ["month (names=ar, numerals=arab)", () => mount({ date: "2026-07-06", names: "ar", numerals: "arab" }, DENSE)],
  ["month (week-start=1)", () => mount({ date: "2026-07-06", "week-start": "1" }, DENSE)],
  ["month narrow dots", () => mount({ date: "2026-07-06", "narrow-events": "dots" }, DENSE, 420)],
  ["month narrow scroll", () => mount({ date: "2026-07-06", "narrow-events": "scroll" }, DENSE, 420)],
  ["month medium", () => mount({ date: "2026-07-06" }, DENSE, 700)],
  ["week", () => mount({ date: "2026-07-06", view: "week" }, DENSE)],
  ["week (allday-row=never)", () => mount({ date: "2026-07-06", view: "week", "allday-row": "never" }, DENSE)],
  ["week narrow", () => mount({ date: "2026-07-06", view: "week" }, DENSE, 420)],
  ["day", () => mount({ date: "2026-07-06", view: "day" }, DENSE)],
  ["day (banner header)", () => mount({ date: "2026-07-06", view: "day", "day-header": "banner" }, DENSE)],
  ["agenda", () => mount({ date: "2026-07-06", view: "agenda" }, DENSE)],
  ["agenda (empty)", () => mount({ date: "2026-07-06", view: "agenda" })],
];

// ---- the rules, over every view -------------------------------------------------------------

describe("<hijri-calendar> ARIA structure", () => {
  it.each(VIEWS)("%s: every role's owned children are permitted", (_name, factory) => {
    const el = factory();
    expect(requiredChildrenViolations(el.shadowRoot!)).toEqual([]);
  });

  it.each(VIEWS)("%s: every role has a permitted context role", (_name, factory) => {
    const el = factory();
    expect(requiredParentViolations(el.shadowRoot!)).toEqual([]);
  });

  it.each(VIEWS)("%s: no interactive element is a direct child of a row", (_name, factory) => {
    const el = factory();
    const offenders = Array.from(el.shadowRoot!.querySelectorAll('[role="row"]')).flatMap((row) =>
      Array.from(row.children)
        .filter((c) => c.tagName === "BUTTON" || c.tagName === "A")
        .map((c) => `${describeEl(row)} > ${describeEl(c)}`)
    );
    expect(offenders).toEqual([]);
  });

  it.each(VIEWS)("%s: nothing in the calendar is hidden from assistive tech", (_name, factory) => {
    // The rejected cheap fix for the row violation was aria-hidden="true" on the chip layer.
    // The chips are focusable buttons, so hiding them would have made the component *less*
    // accessible while silencing the audit — this guards against that regression anywhere.
    const el = factory();
    const hidden = Array.from(el.shadowRoot!.querySelectorAll('[aria-hidden="true"]')).map(
      describeEl
    );
    expect(hidden).toEqual([]);
  });
});

// ---- the month grid's own shape --------------------------------------------------------------

describe("<hijri-calendar> month grid ARIA shape", () => {
  it("is a grid of a columnheader row plus one rowgroup per week, each with a 7-gridcell day row", () => {
    const el = mount({ date: "2026-07-06" }, DENSE);
    const grid = el.shadowRoot!.querySelector('[role="grid"]')!;
    expect(grid.getAttribute("aria-colcount")).toBe("7");

    const children = Array.from(grid.children);
    // 1 dow-row + 6 week rowgroups.
    expect(children.map((c) => c.getAttribute("role"))).toEqual([
      "row",
      ...Array(6).fill("rowgroup"),
    ]);

    const headers = Array.from(children[0]!.children);
    expect(headers.length).toBe(7);
    headers.forEach((h, i) => {
      expect(h.getAttribute("role")).toBe("columnheader");
      expect(h.getAttribute("aria-colindex")).toBe(String(i + 1));
    });

    for (const group of children.slice(1)) {
      const dayRow = group.querySelector(":scope > .week")!;
      expect(dayRow.getAttribute("role")).toBe("row");
      const cells = Array.from(dayRow.children);
      expect(cells.length).toBe(7);
      cells.forEach((cell, d) => {
        expect(cell.getAttribute("role")).toBe("gridcell");
        expect(cell.getAttribute("aria-colindex")).toBe(String(d + 1));
        // The day button stays focusable, inside its cell (never the cell itself).
        const btn = cell.querySelector<HTMLButtonElement>('button[part~="day"]')!;
        expect(btn).toBeTruthy();
        expect(btn.getAttribute("role")).toBeNull(); // native button role, not gridcell
        expect(btn.tabIndex).toBeGreaterThanOrEqual(-1);
      });
    }
  });

  it("keeps the roving tabindex on the day buttons: exactly one is tabbable", () => {
    const el = mount({ date: "2026-07-06" }, DENSE);
    const buttons = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    expect(buttons.length).toBe(42);
    expect(buttons.filter((b) => b.tabIndex === 0).length).toBe(1);
  });

  it("puts every chip and more-link in its own gridcell of the week's event row, carrying the columns it covers", () => {
    const el = mount({ date: "2026-07-06", "max-events": "1" }, DENSE);
    const chips = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('button[part~="event"], button[part~="more-link"]')
    );
    expect(chips.length).toBeGreaterThan(0);
    for (const chip of chips) {
      // Focusable and labelled — the whole point of not hiding this layer.
      expect(chip.tabIndex).toBeGreaterThanOrEqual(0);
      expect(chip.textContent!.trim().length || chip.getAttribute("aria-label")).toBeTruthy();
      const cell = chip.parentElement!;
      expect(cell.getAttribute("role")).toBe("gridcell");
      const colIndex = Number(cell.getAttribute("aria-colindex"));
      expect(colIndex).toBeGreaterThanOrEqual(1);
      expect(colIndex).toBeLessThanOrEqual(7);
      const row = cell.parentElement!;
      expect(row.getAttribute("role")).toBe("row");
      expect(row.classList.contains("lanes")).toBe(true);
      expect(row.parentElement!.getAttribute("role")).toBe("rowgroup");
    }
  });

  it("gives a multi-day chip an aria-colspan matching the columns it spans, and single-day chips none", () => {
    const el = mount({ date: "2026-07-06" }, [SPANNING, TIMED]);
    const cells = Array.from(el.shadowRoot!.querySelectorAll(".lanes > [role='gridcell']"));
    const spanning = cells.filter((c) => c.querySelector('[part~="continues-after"], [part~="continues-before"]'));
    expect(spanning.length).toBeGreaterThan(0);
    for (const cell of spanning) {
      const colspan = Number(cell.getAttribute("aria-colspan"));
      expect(colspan).toBeGreaterThan(1);
      expect(colspan).toBeLessThanOrEqual(7);
      // aria-colindex + aria-colspan must stay inside the 7 declared columns.
      expect(Number(cell.getAttribute("aria-colindex")) + colspan - 1).toBeLessThanOrEqual(7);
    }
    const single = cells.find((c) => c.querySelector(`[data-ev][aria-label^="Timed"]`))!;
    expect(single).toBeTruthy();
    expect(single.hasAttribute("aria-colspan")).toBe(false);
  });

  it("emits no event row at all for a week with no chips and no more-links (never an empty row)", () => {
    const el = mount({ date: "2026-07-06" });
    expect(el.shadowRoot!.querySelectorAll(".lanes").length).toBe(0);
    const rows = Array.from(el.shadowRoot!.querySelectorAll('[role="row"]'));
    for (const row of rows) expect(row.children.length).toBeGreaterThan(0);
  });

  it('narrow dot mode emits no event row either — the dots live in the day cell, and the day button\'s label carries the count', () => {
    const el = mount({ date: "2026-07-06", "narrow-events": "dots" }, DENSE, 420);
    expect(el.shadowRoot!.querySelectorAll(".lanes").length).toBe(0);
    expect(el.shadowRoot!.querySelectorAll('button[part~="event"]').length).toBe(0);
    const dot = el.shadowRoot!.querySelector('[part~="dot"]')!;
    expect(dot.closest('[role="gridcell"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-date="2026-07-06"]')!.getAttribute("aria-label")).toMatch(
      /events$/
    );
  });
});

// ---- week/day and agenda ----------------------------------------------------------------------

describe("<hijri-calendar> week/day and agenda ARIA", () => {
  it("the time grid claims no grid/row/cell semantics at all, so its clickable slots and column heads own no unsatisfiable roles", () => {
    for (const view of ["week", "day"]) {
      const el = mount({ date: "2026-07-06", view }, DENSE);
      const body = el.shadowRoot!.querySelector(".timegrid")!;
      expect(body.querySelectorAll("[role]").length).toBe(0);
      // Regression guard: the weekday cell markup is shared with the month view's dow-row,
      // where it *is* a columnheader inside a role="row". Reusing it here with that role would
      // be a columnheader with no row owner (an axe "required parent" violation).
      expect(body.querySelectorAll('[role="columnheader"]').length).toBe(0);
      expect(body.querySelectorAll(".dow").length).toBeGreaterThan(0);
    }
  });

  it("the agenda claims no roles either, and its items stay focusable buttons", () => {
    const el = mount({ date: "2026-07-06", view: "agenda" }, DENSE);
    const agenda = el.shadowRoot!.querySelector(".agenda")!;
    expect(agenda.querySelectorAll("[role]").length).toBe(0);
    const items = Array.from(agenda.querySelectorAll<HTMLButtonElement>('[part~="agenda-item"]'));
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.tagName).toBe("BUTTON");
      expect(item.tabIndex).toBeGreaterThanOrEqual(0);
    }
  });

  it("keeps the month dow-row's weekday cells as columnheaders (that one was already correct)", () => {
    const el = mount({ date: "2026-07-06" });
    const dowRow = el.shadowRoot!.querySelector(".dow-row")!;
    expect(dowRow.getAttribute("role")).toBe("row");
    expect(dowRow.parentElement!.getAttribute("role")).toBe("grid");
    const cells = Array.from(dowRow.children);
    expect(cells.length).toBe(7);
    for (const cell of cells) expect(cell.getAttribute("role")).toBe("columnheader");
  });
});

// ---- the walkers themselves --------------------------------------------------------------------

describe("ARIA structure walkers (self-check)", () => {
  function fragment(html: string): HTMLElement {
    const host = document.createElement("div");
    host.innerHTML = html;
    return host;
  }

  it("reports a button that is a direct child of a row — the exact shape axe flagged", () => {
    const el = fragment(
      `<div role="grid"><div role="row"><button aria-label="chip">x</button></div></div>`
    );
    expect(requiredChildrenViolations(el)).toHaveLength(1);
    expect(requiredChildrenViolations(el)[0]).toContain('with role "button"');
  });

  it("looks through a role-less wrapper, exactly as axe does", () => {
    const el = fragment(
      `<div role="grid"><div role="row"><div><button>x</button></div></div></div>`
    );
    expect(requiredChildrenViolations(el)).toHaveLength(1);
  });

  it("reports a gridcell with no row owner", () => {
    const el = fragment(`<div><div role="gridcell">x</div></div>`);
    expect(requiredParentViolations(el)).toHaveLength(1);
  });

  it("accepts the structure this component now emits", () => {
    const el = fragment(
      `<div role="grid" aria-colcount="7">
         <div role="row"><div role="columnheader" aria-colindex="1">Sun</div></div>
         <div role="rowgroup">
           <div role="row"><div role="gridcell" aria-colindex="1"><button>1</button></div></div>
           <div role="row"><div role="gridcell" aria-colindex="1" aria-colspan="3"><button>Event</button></div></div>
         </div>
       </div>`
    );
    expect(requiredChildrenViolations(el)).toEqual([]);
    expect(requiredParentViolations(el)).toEqual([]);
  });
});
