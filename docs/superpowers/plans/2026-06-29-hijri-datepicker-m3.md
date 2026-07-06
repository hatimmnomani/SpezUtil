# Hijri Datepicker M3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add range, multiple-date, and (single-mode) time-picker support to `@spezutil/hijri-datepicker`, keeping M2 single-date behavior fully backward-compatible.

**Architecture:** Extend the existing zero-dep Web Component. Pure logic moves to small testable modules: `render.ts` gains range/multi cell flags; new `selection.ts` (value encode/decode) and `time.ts` (clock parse/format, 12/24h). The element class gains a `mode` state machine, range hover painting (class-toggling, no full re-render), and a time-picker row.

**Tech Stack:** TypeScript, tsup, vitest + jsdom. No new deps.

**Spec:** `docs/superpowers/specs/2026-06-29-hijri-datepicker-m3-design.md`

---

## Task 1: Extend `render.ts` with range/multi flags

**Files:**
- Modify: `packages/hijri-datepicker/src/render.ts`
- Modify: `packages/hijri-datepicker/src/render.test.ts`

- [ ] **Step 1: Add failing tests** (append inside the existing `describe("buildMonthModel", ...)`)

```ts
  it("marks multiple-selected cells from selectedList", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      selectedList: [
        { year: 1445, month: 9, day: 3 },
        { year: 1445, month: 9, day: 8 },
      ],
    });
    const sel = model.weeks.flat().filter((c) => c.selected && c.inCurrentMonth);
    expect(sel.map((c) => c.hijri.day).sort((a, b) => a - b)).toEqual([3, 8]);
  });

  it("marks range endpoints and the in-between band", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      rangeStart: { year: 1445, month: 9, day: 5 },
      rangeEnd: { year: 1445, month: 9, day: 9 },
    });
    const cells = model.weeks.flat();
    expect(cells.some((c) => c.rangeStart && c.hijri.day === 5)).toBe(true);
    expect(cells.some((c) => c.rangeEnd && c.hijri.day === 9)).toBe(true);
    const band = cells.filter((c) => c.inRange && c.inCurrentMonth).map((c) => c.hijri.day);
    expect(band.sort((a, b) => a - b)).toEqual([6, 7, 8]);
  });

  it("normalizes a reversed range (end before start)", () => {
    const model = buildMonthModel(cal, { year: 1445, month: 9 }, {
      rangeStart: { year: 1445, month: 9, day: 9 },
      rangeEnd: { year: 1445, month: 9, day: 5 },
    });
    const band = model.weeks.flat().filter((c) => c.inRange && c.inCurrentMonth).map((c) => c.hijri.day);
    expect(band.sort((a, b) => a - b)).toEqual([6, 7, 8]);
  });
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @spezutil/hijri-datepicker test render`
Expected: FAIL (rangeStart/selectedList not handled).

- [ ] **Step 3: Replace `render.ts` with the extended version**

```ts
import type { HijriCalendar, HijriDate } from "@spezutil/hijri-core";

export interface DayCell {
  hijri: HijriDate;
  gregorian: Date;
  inCurrentMonth: boolean;
  selected: boolean;
  disabled: boolean;
  isToday: boolean;
  rangeStart: boolean;
  rangeEnd: boolean;
  inRange: boolean;
}

export interface MonthModel {
  year: number;
  month: number;
  weeks: DayCell[][];
}

export interface BuildOptions {
  selected?: HijriDate | null;
  selectedList?: HijriDate[];
  rangeStart?: HijriDate | null;
  /** Effective end (committed end or hover preview); range band is drawn start..end inclusive of endpoints. */
  rangeEnd?: HijriDate | null;
  isDisabled?: (h: HijriDate, g: Date) => boolean;
  today?: Date;
}

function sameHijri(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 86400000);
}

export function buildMonthModel(
  cal: HijriCalendar,
  view: { year: number; month: number },
  opts: BuildOptions
): MonthModel {
  const firstGreg = cal.hijriToGregorian({ year: view.year, month: view.month, day: 1 });
  const startOffset = firstGreg.getUTCDay();
  const gridStart = addDaysUtc(firstGreg, -startOffset);
  const todayHijri = opts.today ? cal.gregorianToHijri(opts.today) : null;

  const startT = opts.rangeStart ? cal.hijriToGregorian(opts.rangeStart).getTime() : null;
  const endT = opts.rangeEnd ? cal.hijriToGregorian(opts.rangeEnd).getTime() : null;
  const lo = startT !== null && endT !== null ? Math.min(startT, endT) : null;
  const hi = startT !== null && endT !== null ? Math.max(startT, endT) : null;

  const weeks: DayCell[][] = [];
  for (let w = 0; w < 6; w++) {
    const week: DayCell[] = [];
    for (let d = 0; d < 7; d++) {
      const g = addDaysUtc(gridStart, w * 7 + d);
      const t = g.getTime();
      const hijri = cal.gregorianToHijri(g);
      const selected =
        (opts.selected ? sameHijri(hijri, opts.selected) : false) ||
        (opts.selectedList ? opts.selectedList.some((s) => sameHijri(hijri, s)) : false);
      week.push({
        hijri,
        gregorian: g,
        inCurrentMonth: hijri.year === view.year && hijri.month === view.month,
        selected,
        disabled: opts.isDisabled ? opts.isDisabled(hijri, g) : false,
        isToday: todayHijri ? sameHijri(hijri, todayHijri) : false,
        rangeStart: startT !== null && t === startT,
        rangeEnd: endT !== null && t === endT,
        inRange: lo !== null && hi !== null && t > lo && t < hi,
      });
    }
    weeks.push(week);
  }
  return { year: view.year, month: view.month, weeks };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @spezutil/hijri-datepicker test render`
Expected: PASS (all render tests, old + new).

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): range/multi cell flags in grid model"
```

---

## Task 2: Create `selection.ts` (pure value helpers)

**Files:**
- Create: `packages/hijri-datepicker/src/selection.ts`, `packages/hijri-datepicker/src/selection.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import { isMode, parseIsoList, toggleIso } from "./selection";

describe("selection helpers", () => {
  it("normalizes mode attribute", () => {
    expect(isMode("range")).toBe("range");
    expect(isMode("multiple")).toBe("multiple");
    expect(isMode("single")).toBe("single");
    expect(isMode(null)).toBe("single");
    expect(isMode("bogus")).toBe("single");
  });

  it("parses and filters a comma ISO list", () => {
    expect(parseIsoList("2024-03-10, 2024-03-12 ,bad")).toEqual([
      "2024-03-10",
      "2024-03-12",
    ]);
    expect(parseIsoList(null)).toEqual([]);
    expect(parseIsoList("")).toEqual([]);
  });

  it("toggles an iso in/out and keeps the list sorted", () => {
    expect(toggleIso(["2024-03-12"], "2024-03-10")).toEqual([
      "2024-03-10",
      "2024-03-12",
    ]);
    expect(toggleIso(["2024-03-10", "2024-03-12"], "2024-03-12")).toEqual([
      "2024-03-10",
    ]);
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @spezutil/hijri-datepicker test selection`
Expected: FAIL — cannot resolve `./selection`.

- [ ] **Step 3: Implement `selection.ts`**

```ts
export type Mode = "single" | "range" | "multiple";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isMode(v: string | null): Mode {
  return v === "range" || v === "multiple" ? v : "single";
}

export function parseIsoList(v: string | null): string[] {
  if (!v) return [];
  return v
    .split(",")
    .map((s) => s.trim())
    .filter((s) => ISO_DATE.test(s));
}

export function toggleIso(list: string[], iso: string): string[] {
  const next = list.includes(iso) ? list.filter((x) => x !== iso) : [...list, iso];
  return next.sort();
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @spezutil/hijri-datepicker test selection`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): pure selection value helpers"
```

---

## Task 3: Create `time.ts` (pure clock helpers)

**Files:**
- Create: `packages/hijri-datepicker/src/time.ts`, `packages/hijri-datepicker/src/time.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  parseTime,
  formatTime24,
  to12,
  from12,
  combineDateTime,
  splitDateTime,
} from "./time";

describe("time helpers", () => {
  it("parses valid times and rejects invalid", () => {
    expect(parseTime("14:30")).toEqual({ hour: 14, minute: 30 });
    expect(parseTime("9:05")).toEqual({ hour: 9, minute: 5 });
    expect(parseTime("24:00")).toBeNull();
    expect(parseTime("12:60")).toBeNull();
    expect(parseTime("nope")).toBeNull();
    expect(parseTime(null)).toBeNull();
  });

  it("formats 24h with padding", () => {
    expect(formatTime24({ hour: 9, minute: 5 })).toBe("09:05");
  });

  it("converts to/from 12h", () => {
    expect(to12(0)).toEqual({ hour12: 12, meridiem: "AM" });
    expect(to12(13)).toEqual({ hour12: 1, meridiem: "PM" });
    expect(from12(12, "AM")).toBe(0);
    expect(from12(1, "PM")).toBe(13);
    expect(from12(12, "PM")).toBe(12);
  });

  it("combines and splits date+time", () => {
    expect(combineDateTime("2024-03-15", { hour: 14, minute: 30 })).toBe(
      "2024-03-15T14:30"
    );
    expect(splitDateTime("2024-03-15T14:30")).toEqual({
      date: "2024-03-15",
      time: { hour: 14, minute: 30 },
    });
    expect(splitDateTime("2024-03-15")).toEqual({ date: "2024-03-15", time: null });
    expect(splitDateTime(null)).toEqual({ date: null, time: null });
  });
});
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @spezutil/hijri-datepicker test time`
Expected: FAIL — cannot resolve `./time`.

- [ ] **Step 3: Implement `time.ts`**

```ts
export interface Time {
  hour: number; // 0-23
  minute: number; // 0-59
}

export type Meridiem = "AM" | "PM";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

export function parseTime(s: string | null): Time | null {
  if (!s) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export function formatTime24(t: Time): string {
  return `${pad2(t.hour)}:${pad2(t.minute)}`;
}

export function to12(hour: number): { hour12: number; meridiem: Meridiem } {
  const meridiem: Meridiem = hour < 12 ? "AM" : "PM";
  let h = hour % 12;
  if (h === 0) h = 12;
  return { hour12: h, meridiem };
}

export function from12(hour12: number, meridiem: Meridiem): number {
  let h = hour12 % 12;
  if (meridiem === "PM") h += 12;
  return h;
}

export function combineDateTime(dateIso: string, t: Time): string {
  return `${dateIso}T${formatTime24(t)}`;
}

export function splitDateTime(value: string | null): {
  date: string | null;
  time: Time | null;
} {
  if (!value) return { date: null, time: null };
  const [d, tt] = value.split("T");
  return { date: d ?? null, time: tt ? parseTime(tt) : null };
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @spezutil/hijri-datepicker test time`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): pure clock-time helpers"
```

---

## Task 4: Rewrite the component with mode state machine + time + hover

**Files:**
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.ts` (full rewrite)
- Modify: `packages/hijri-datepicker/src/hijri-datepicker.test.ts` (append tests)

- [ ] **Step 1: Append failing tests** (inside the existing describe block; keep the M2 tests intact)

```ts
  it("range mode: two clicks set start/end and emit a range change", () => {
    const el = mount({ mode: "range", start: "2024-03-15" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const enabled = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    const startBtn = enabled.find((b) => b.classList.contains("range-start"))!;
    // pick a cell a few positions after start in the same month
    const startIdx = enabled.indexOf(startBtn);
    const endBtn = enabled[startIdx + 3]!;
    endBtn.click();
    expect(detail).toBeTruthy();
    expect(detail.mode).toBe("range");
    expect(detail.start.gregorian).toBe("2024-03-15");
    expect(detail.end.gregorian).toBe(endBtn.getAttribute("aria-label")!.match(/\((\d{4}-\d{2}-\d{2})\)/)![1]);
    expect(el.getAttribute("end")).toBe(detail.end.gregorian);
  });

  it("range mode: hovering after start paints an in-range band", () => {
    const el = mount({ mode: "range", start: "2024-03-15" });
    const enabled = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    const startIdx = enabled.findIndex((b) => b.classList.contains("range-start"));
    const hoverBtn = enabled[startIdx + 4]!;
    hoverBtn.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
    const band = el.shadowRoot!.querySelectorAll(".cell.in-range");
    expect(band.length).toBeGreaterThan(0);
  });

  it("multiple mode: clicking toggles dates and emits the full list", () => {
    const el = mount({ mode: "multiple" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const cells = Array.from(
      el.shadowRoot!.querySelectorAll<HTMLButtonElement>('.cell:not(.out):not([disabled])')
    );
    cells[0]!.click();
    cells[2]!.click();
    expect(detail.mode).toBe("multiple");
    expect(detail.gregorian.length).toBe(2);
    expect(el.getAttribute("value")!.split(",").length).toBe(2);
    // toggle off the first
    cells[0]!.click();
    expect(detail.gregorian.length).toBe(1);
  });

  it("time picker: changing the hour updates value to a datetime and emits time", () => {
    const el = mount({ value: "2024-03-15", "enable-time": "", "time-format": "24" });
    let detail: any = null;
    el.addEventListener("change", (e) => (detail = (e as CustomEvent).detail));
    const hour = el.shadowRoot!.querySelector('[data-time="hour"]') as HTMLInputElement;
    expect(hour).toBeTruthy();
    hour.value = "14";
    hour.dispatchEvent(new Event("change", { bubbles: true }));
    expect(el.getAttribute("value")).toBe("2024-03-15T14:00");
    expect(detail.mode).toBe("single");
    expect(detail.time).toEqual({ hour: 14, minute: 0 });
  });

  it("12h time picker shows an AM/PM toggle", () => {
    const el = mount({ value: "2024-03-15", "enable-time": "", "time-format": "12" });
    const ampm = el.shadowRoot!.querySelector('[data-time="meridiem"]');
    expect(ampm).toBeTruthy();
  });
```

- [ ] **Step 2: Run, confirm fail**

Run: `pnpm --filter @spezutil/hijri-datepicker test hijri-datepicker`
Expected: FAIL (mode/time not implemented).

- [ ] **Step 3: Replace `hijri-datepicker.ts` entirely with:**

```ts
import {
  createCalendar,
  formatHijri,
  translitMonthNames,
  weekdayNames,
  type HijriCalendar,
  type HijriDate,
} from "@spezutil/hijri-core";
import { buildMonthModel, type DayCell } from "./render";
import { isMode, parseIsoList, type Mode } from "./selection";
import {
  combineDateTime,
  from12,
  splitDateTime,
  to12,
  type Time,
} from "./time";
import { styles } from "./styles";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function parseIsoUtc(s: string | null): Date | null {
  if (!s || !ISO.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function sameHijri(a: HijriDate, b: HijriDate): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export class HijriDatepicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "value",
      "start",
      "end",
      "min",
      "max",
      "dir",
      "disabled-weekdays",
      "mode",
      "enable-time",
      "time-format",
    ];
  }

  private cal: HijriCalendar = createCalendar();
  private root: ShadowRoot;
  private view: { year: number; month: number };

  private mode: Mode = "single";
  private selected: HijriDate | null = null; // single
  private selectedList: HijriDate[] = []; // multiple
  private rangeStart: HijriDate | null = null;
  private rangeEnd: HijriDate | null = null;
  private hoverDate: HijriDate | null = null;
  private time: Time | null = null; // single + enable-time

  private lastCells: DayCell[] = [];
  private suppress = false;

  public isDateDisabled?: (hijri: HijriDate, gregorian: Date) => boolean;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    const todayHijri = this.cal.gregorianToHijri(new Date());
    this.view = { year: todayHijri.year, month: todayHijri.month };
  }

  connectedCallback(): void {
    this.syncFromAttrs();
    this.render();
  }

  attributeChangedCallback(): void {
    if (!this.root || this.suppress) return;
    this.syncFromAttrs();
    this.render();
  }

  private g2h(d: Date): HijriDate {
    return this.cal.gregorianToHijri(d);
  }

  private h2iso(h: HijriDate): string {
    return toIso(this.cal.hijriToGregorian(h));
  }

  private applyAttrs(fn: () => void): void {
    this.suppress = true;
    fn();
    this.suppress = false;
  }

  private syncFromAttrs(): void {
    this.mode = isMode(this.getAttribute("mode"));
    if (this.mode === "range") {
      const s = parseIsoUtc(this.getAttribute("start"));
      const e = parseIsoUtc(this.getAttribute("end"));
      this.rangeStart = s ? this.g2h(s) : null;
      this.rangeEnd = e ? this.g2h(e) : null;
      this.hoverDate = null;
      if (this.rangeStart) this.view = { year: this.rangeStart.year, month: this.rangeStart.month };
    } else if (this.mode === "multiple") {
      const isos = parseIsoList(this.getAttribute("value"));
      this.selectedList = isos
        .map((iso) => parseIsoUtc(iso))
        .filter((d): d is Date => d !== null)
        .map((d) => this.g2h(d));
      const first = this.selectedList[0];
      if (first) this.view = { year: first.year, month: first.month };
    } else {
      const { date, time } = splitDateTime(this.getAttribute("value"));
      const d = parseIsoUtc(date);
      this.selected = d ? this.g2h(d) : null;
      this.time = time;
      if (this.selected) this.view = { year: this.selected.year, month: this.selected.month };
    }
  }

  private buildDisabledFn(): (h: HijriDate, g: Date) => boolean {
    const min = parseIsoUtc(this.getAttribute("min"));
    const max = parseIsoUtc(this.getAttribute("max"));
    const dowAttr = this.getAttribute("disabled-weekdays");
    const disabledDows = dowAttr ? dowAttr.split(",").map((n) => Number(n.trim())) : [];
    return (h, g) => {
      if (min && g.getTime() < min.getTime()) return true;
      if (max && g.getTime() > max.getTime()) return true;
      // weekday numbers are UTC-based (0=Sunday..6=Saturday)
      if (disabledDows.includes(g.getUTCDay())) return true;
      if (this.isDateDisabled && this.isDateDisabled(h, g)) return true;
      return false;
    };
  }

  private navigate(delta: number): void {
    let { year, month } = this.view;
    month += delta;
    if (month < 1) {
      month = 12;
      year -= 1;
    } else if (month > 12) {
      month = 1;
      year += 1;
    }
    this.view = { year, month };
    this.render();
  }

  private emit(detail: Record<string, unknown>): void {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, composed: true, detail })
    );
  }

  private select(cell: DayCell): void {
    if (cell.disabled) return;
    if (this.mode === "range") return this.selectRange(cell);
    if (this.mode === "multiple") return this.selectMultiple(cell);
    return this.selectSingle(cell);
  }

  private selectSingle(cell: DayCell): void {
    this.selected = cell.hijri;
    const iso = toIso(cell.gregorian);
    const value = this.time ? combineDateTime(iso, this.time) : iso;
    this.applyAttrs(() => this.setAttribute("value", value));
    this.render();
    this.emit({
      mode: "single",
      hijri: cell.hijri,
      gregorian: value,
      ...(this.time ? { time: this.time } : {}),
    });
  }

  private selectMultiple(cell: DayCell): void {
    const idx = this.selectedList.findIndex((h) => sameHijri(h, cell.hijri));
    if (idx >= 0) this.selectedList.splice(idx, 1);
    else this.selectedList.push(cell.hijri);
    this.selectedList.sort(
      (a, b) => this.cal.hijriToGregorian(a).getTime() - this.cal.hijriToGregorian(b).getTime()
    );
    const isos = this.selectedList.map((h) => this.h2iso(h));
    this.applyAttrs(() => {
      if (isos.length) this.setAttribute("value", isos.join(","));
      else this.removeAttribute("value");
    });
    this.render();
    this.emit({ mode: "multiple", hijri: this.selectedList.slice(), gregorian: isos });
  }

  private selectRange(cell: DayCell): void {
    const startingNew = !this.rangeStart || (this.rangeStart && this.rangeEnd);
    if (startingNew) {
      this.rangeStart = cell.hijri;
      this.rangeEnd = null;
      this.hoverDate = null;
      this.applyAttrs(() => {
        this.setAttribute("start", toIso(cell.gregorian));
        this.removeAttribute("end");
      });
      this.render();
      return; // no change event until the range is complete
    }
    // complete the range, normalizing order
    const startG = this.cal.hijriToGregorian(this.rangeStart!).getTime();
    if (cell.gregorian.getTime() < startG) {
      this.rangeEnd = this.rangeStart;
      this.rangeStart = cell.hijri;
    } else {
      this.rangeEnd = cell.hijri;
    }
    const startIso = this.h2iso(this.rangeStart!);
    const endIso = this.h2iso(this.rangeEnd!);
    this.applyAttrs(() => {
      this.setAttribute("start", startIso);
      this.setAttribute("end", endIso);
    });
    this.render();
    this.emit({
      mode: "range",
      start: { hijri: this.rangeStart, gregorian: startIso },
      end: { hijri: this.rangeEnd, gregorian: endIso },
    });
  }

  private setTime(t: Time): void {
    this.time = t;
    if (this.selected) {
      const iso = this.h2iso(this.selected);
      const value = combineDateTime(iso, t);
      this.applyAttrs(() => this.setAttribute("value", value));
      this.emit({ mode: "single", hijri: this.selected, gregorian: value, time: t });
    }
  }

  private paintRange(hoverHijri: HijriDate | null): void {
    if (this.mode !== "range" || !this.rangeStart || this.rangeEnd) return;
    const startT = this.cal.hijriToGregorian(this.rangeStart).getTime();
    const endT = hoverHijri ? this.cal.hijriToGregorian(hoverHijri).getTime() : startT;
    const lo = Math.min(startT, endT);
    const hi = Math.max(startT, endT);
    this.root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((btn) => {
      const cell = this.lastCells[Number(btn.dataset.i)];
      if (!cell) return;
      const t = cell.gregorian.getTime();
      btn.classList.toggle("in-range", t > lo && t < hi);
      btn.classList.toggle("range-end", hoverHijri ? t === hi && t !== startT : false);
    });
  }

  private renderTimeRow(): string {
    if (this.mode !== "single" || !this.hasAttribute("enable-time")) return "";
    const t: Time = this.time ?? { hour: 0, minute: 0 };
    const is12 = this.getAttribute("time-format") === "12";
    if (is12) {
      const { hour12, meridiem } = to12(t.hour);
      return `<div class="time-row" part="time">
        <input data-time="hour" type="number" min="1" max="12" value="${hour12}" aria-label="Hour" />
        <span>:</span>
        <input data-time="minute" type="number" min="0" max="59" value="${String(t.minute).padStart(2, "0")}" aria-label="Minute" />
        <button type="button" data-time="meridiem" aria-pressed="${meridiem === "PM"}" aria-label="Toggle AM/PM">${meridiem}</button>
      </div>`;
    }
    return `<div class="time-row" part="time">
      <input data-time="hour" type="number" min="0" max="23" value="${String(t.hour).padStart(2, "0")}" aria-label="Hour" />
      <span>:</span>
      <input data-time="minute" type="number" min="0" max="59" value="${String(t.minute).padStart(2, "0")}" aria-label="Minute" />
    </div>`;
  }

  private wireTimeRow(): void {
    const is12 = this.getAttribute("time-format") === "12";
    const hourEl = this.root.querySelector<HTMLInputElement>('[data-time="hour"]');
    const minEl = this.root.querySelector<HTMLInputElement>('[data-time="minute"]');
    const ampmEl = this.root.querySelector<HTMLButtonElement>('[data-time="meridiem"]');
    if (!hourEl || !minEl) return;

    const current = (): Time => this.time ?? { hour: 0, minute: 0 };

    const commit = (): void => {
      const minute = Math.max(0, Math.min(59, Number(minEl.value) || 0));
      let hour: number;
      if (is12) {
        const h12 = Math.max(1, Math.min(12, Number(hourEl.value) || 12));
        const meridiem = ampmEl?.getAttribute("aria-pressed") === "true" ? "PM" : "AM";
        hour = from12(h12, meridiem);
      } else {
        hour = Math.max(0, Math.min(23, Number(hourEl.value) || 0));
      }
      this.setTime({ hour, minute });
    };

    hourEl.addEventListener("change", commit);
    minEl.addEventListener("change", commit);
    ampmEl?.addEventListener("click", () => {
      const isPm = ampmEl.getAttribute("aria-pressed") === "true";
      ampmEl.setAttribute("aria-pressed", String(!isPm));
      ampmEl.textContent = !isPm ? "PM" : "AM";
      commit();
      void current; // keep reference for clarity; commit reads inputs directly
    });
  }

  private render(): void {
    const model = buildMonthModel(this.cal, this.view, {
      selected: this.mode === "single" ? this.selected : null,
      selectedList: this.mode === "multiple" ? this.selectedList : undefined,
      rangeStart: this.mode === "range" ? this.rangeStart : null,
      rangeEnd: this.mode === "range" ? this.rangeEnd ?? this.hoverDate : null,
      isDisabled: this.buildDisabledFn(),
      today: new Date(),
    });
    this.lastCells = model.weeks.flat();

    const headerGreg = this.cal.hijriToGregorian({
      year: this.view.year,
      month: this.view.month,
      day: 1,
    });
    const title = `${translitMonthNames[this.view.month - 1] ?? ""} ${this.view.year}`;
    const subtitle = headerGreg.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    this.root.innerHTML = `<style>${styles}</style>
      <div class="cal" role="application" aria-label="Hijri date picker">
        <div class="header">
          <button type="button" part="nav-prev" aria-label="Previous month" data-nav="-1">‹</button>
          <div class="title">${title}<small>${subtitle}</small></div>
          <button type="button" part="nav-next" aria-label="Next month" data-nav="1">›</button>
        </div>
        <div class="grid" role="grid">
          <div class="dow-row" role="row">
            ${weekdayNames.map((d) => `<div class="dow" role="columnheader">${d.slice(0, 2)}</div>`).join("")}
          </div>
          ${model.weeks
            .map((week, w) => {
              const cells = week
                .map((cell, d) => {
                  const i = w * 7 + d;
                  const cls = [
                    "cell",
                    cell.inCurrentMonth ? "" : "out",
                    cell.isToday ? "today" : "",
                    cell.rangeStart ? "range-start" : "",
                    cell.rangeEnd ? "range-end" : "",
                    cell.inRange ? "in-range" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const ariaSelected = cell.selected || cell.rangeStart || cell.rangeEnd;
                  const label = `${formatHijri(cell.hijri, "D MMMM YYYY")} (${toIso(cell.gregorian)})`;
                  return `<button type="button" part="day" class="${cls}" role="gridcell"
                    data-i="${i}" aria-selected="${ariaSelected}" aria-label="${label}"
                    tabindex="-1" ${cell.disabled ? "disabled" : ""}>
                    <span class="hijri">${cell.hijri.day}</span>
                    <span class="greg">${cell.gregorian.getUTCDate()}</span>
                  </button>`;
                })
                .join("");
              return `<div class="week" role="row">${cells}</div>`;
            })
            .join("")}
        </div>
        ${this.renderTimeRow()}
      </div>`;

    const flat = this.lastCells;
    this.root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(Number(btn.dataset.nav)));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((btn) => {
      const cell = flat[Number(btn.dataset.i)]!;
      btn.addEventListener("click", () => this.select(cell));
      if (this.mode === "range" && this.rangeStart && !this.rangeEnd) {
        btn.addEventListener("mouseenter", () => {
          this.hoverDate = cell.hijri;
          this.paintRange(cell.hijri);
        });
      }
    });

    this.wireTimeRow();

    const dayButtons = Array.from(
      this.root.querySelectorAll<HTMLButtonElement>("[data-i]")
    );
    const selectedIdx = dayButtons.findIndex(
      (b) => b.getAttribute("aria-selected") === "true"
    );
    const initialIdx =
      selectedIdx !== -1 ? selectedIdx : dayButtons.findIndex((b) => !b.disabled);
    dayButtons.forEach((b, i) => (b.tabIndex = i === initialIdx ? 0 : -1));

    const moveFocus = (from: number, delta: number): void => {
      let i = from + delta;
      while (i >= 0 && i < dayButtons.length && dayButtons[i]?.disabled) i += delta;
      const target = dayButtons[i];
      if (target) {
        dayButtons.forEach((b) => (b.tabIndex = -1));
        target.tabIndex = 0;
        target.focus();
      }
    };

    const grid = this.root.querySelector(".grid") as HTMLElement;
    grid.addEventListener("keydown", (e: KeyboardEvent) => {
      const active = this.root.activeElement as HTMLElement | null;
      const fromEl = (
        active && active.matches?.("[data-i]")
          ? active
          : (e.target as HTMLElement | null)?.closest?.("[data-i]") ?? null
      ) as HTMLButtonElement | null;
      const idx = fromEl ? dayButtons.indexOf(fromEl) : -1;
      const deltas: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: 7,
        ArrowUp: -7,
      };
      if (e.key in deltas) {
        e.preventDefault();
        moveFocus(idx === -1 ? initialIdx : idx, deltas[e.key] ?? 0);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const useIdx = idx === -1 ? initialIdx : idx;
        if (useIdx >= 0) {
          const cell = flat[Number(dayButtons[useIdx]?.dataset.i)];
          if (cell) this.select(cell);
        }
      }
    });

    grid.addEventListener("mouseleave", () => {
      if (this.mode === "range" && this.rangeStart && !this.rangeEnd) {
        this.hoverDate = null;
        this.paintRange(null);
      }
    });
  }
}
```

- [ ] **Step 4: Run, confirm pass**

Run: `pnpm --filter @spezutil/hijri-datepicker test hijri-datepicker`
Expected: PASS — M2 tests + the 5 new M3 tests. If a test fails, fix production code (not by weakening assertions). If lint flags an unused `current`/`void current` line, remove that line (it is only a clarity placeholder).

- [ ] **Step 5: Lint**

Run: `pnpm --filter @spezutil/hijri-datepicker lint`
Expected: clean. Fix any `noUncheckedIndexedAccess` issues with the same `!`/`?? ""` patterns already used in the file.

- [ ] **Step 6: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): range, multiple, and single-mode time picker"
```

---

## Task 5: Styles for range band + time row

**Files:**
- Modify: `packages/hijri-datepicker/src/styles.ts`

- [ ] **Step 1: Add the following rules before the closing backtick of the `styles` template** (after the `.cell[disabled]` rule, before the `:host([dir="rtl"])` rule)

```css
.cell.in-range { background: color-mix(in srgb, var(--dtp-accent) 16%, transparent); border-radius: 0; }
.cell.range-start { background: var(--dtp-accent); color: var(--dtp-accent-fg); border-top-right-radius: 0; border-bottom-right-radius: 0; }
.cell.range-end { background: var(--dtp-accent); color: var(--dtp-accent-fg); border-top-left-radius: 0; border-bottom-left-radius: 0; }
.cell.range-start .greg, .cell.range-end .greg { color: var(--dtp-accent-fg); }
.time-row { display: flex; align-items: center; gap: 4px; margin-top: 8px; justify-content: center; }
.time-row input { width: 44px; text-align: center; padding: 4px; border: 1px solid #e0e0e0; border-radius: 6px; font: inherit; }
.time-row button { border: 1px solid var(--dtp-accent); background: none; color: var(--dtp-accent); border-radius: 6px; padding: 4px 8px; cursor: pointer; font: inherit; }
.time-row button[aria-pressed="true"] { background: var(--dtp-accent); color: var(--dtp-accent-fg); }
```

- [ ] **Step 2: Build to confirm the CSS string still compiles into the bundle**

Run: `pnpm --filter @spezutil/hijri-datepicker build`
Expected: build success (no TS errors — it is a template string).

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(hijri-datepicker): range band and time-row styles"
```

---

## Task 6: Storybook stories for the new modes

**Files:**
- Modify: `apps/storybook/stories/hijri-datepicker.stories.ts`

- [ ] **Step 1: Replace the stories file with:**

```ts
import { html } from "lit-html";
import "@spezutil/hijri-datepicker";

export default {
  title: "Components/HijriDatepicker",
  argTypes: {
    mode: { control: "radio", options: ["single", "range", "multiple"] },
    value: { control: "text" },
    start: { control: "text" },
    end: { control: "text" },
    min: { control: "text" },
    max: { control: "text" },
    enableTime: { control: "boolean" },
    timeFormat: { control: "radio", options: ["24", "12"] },
    dir: { control: "radio", options: ["ltr", "rtl"] },
  },
};

interface Args {
  mode?: string;
  value?: string;
  start?: string;
  end?: string;
  min?: string;
  max?: string;
  enableTime?: boolean;
  timeFormat?: string;
  dir?: string;
}

const Template = (args: Args) => html`
  <hijri-datepicker
    mode=${args.mode ?? "single"}
    value=${args.value ?? ""}
    start=${args.start ?? ""}
    end=${args.end ?? ""}
    min=${args.min ?? ""}
    max=${args.max ?? ""}
    time-format=${args.timeFormat ?? "24"}
    dir=${args.dir ?? "ltr"}
    ?enable-time=${args.enableTime ?? false}
  ></hijri-datepicker>
`;

export const Default = Template.bind({});
(Default as any).args = { value: "2024-03-15" };

export const Range = Template.bind({});
(Range as any).args = { mode: "range", start: "2024-03-10", end: "2024-03-18" };

export const Multiple = Template.bind({});
(Multiple as any).args = { mode: "multiple", value: "2024-03-05,2024-03-12,2024-03-20" };

export const WithTime = Template.bind({});
(WithTime as any).args = { value: "2024-03-15", enableTime: true, timeFormat: "12" };

export const RightToLeft = Template.bind({});
(RightToLeft as any).args = { value: "2024-03-15", dir: "rtl" };
```

- [ ] **Step 2: Verify Storybook builds**

Run: `pnpm --filter @spezutil/hijri-datepicker build && pnpm --filter @spezutil/storybook build`
Expected: `storybook-static/` produced, no errors.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat(storybook): range, multiple, and time stories"
```

---

## Task 7: Full verification + README update

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Run full pipeline**

Run: `pnpm build && pnpm test`
Expected: all packages build; all vitest suites pass (hijri-core 13 + hijri-datepicker, now larger).

- [ ] **Step 2: Update the README "Quick start (Web Component)" and "Status" sections**

In `README.md`, replace the `## Status` section body with:

```markdown
Milestone M0–M3 complete: monorepo, `hijri-core` engine, and `<hijri-datepicker>` with single,
range, multiple, and single-mode time-picker modes. React/Angular wrappers, Docusaurus, and the
npm release pipeline are planned follow-on milestones.
```

And add this usage snippet right after the existing single-date Quick start block:

```markdown
### Modes

```html
<!-- range -->
<hijri-datepicker mode="range" start="2024-03-10" end="2024-03-18"></hijri-datepicker>

<!-- multiple -->
<hijri-datepicker mode="multiple" value="2024-03-05,2024-03-12"></hijri-datepicker>

<!-- single with time -->
<hijri-datepicker value="2024-03-15" enable-time time-format="12"></hijri-datepicker>
```
```

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "docs: document M3 modes in README"
```

---

## Self-Review Notes

- **Spec coverage:** mode attribute + state machine (Task 4); range two-click + hover preview
  (Task 4 selectRange/paintRange + Task 5 styles); multiple toggle + comma value (Task 4
  selectMultiple + Task 2 helpers); time picker single-mode 12/24h + AM/PM (Task 4 renderTimeRow/
  wireTimeRow + Task 3 helpers + Task 5 styles); unified `change` detail (Task 4 emit); render flags
  (Task 1); Storybook (Task 6); backward-compat verified by retaining M2 tests (Task 4).
- **Type consistency:** `Mode` from selection.ts and `Time` from time.ts used consistently in the
  component. `DayCell` extended fields (`rangeStart`/`rangeEnd`/`inRange`) produced in Task 1 and
  consumed in Task 4 render/paintRange.
- **Non-goals honored:** time only in single mode (guarded in renderTimeRow + render opts); no
  seconds; no presets.
```
