import {
  createCalendar,
  formatHijri,
  translitMonthNames,
  weekdayNames,
  zonedTodayUtc,
  type HijriCalendar,
  type HijriDate,
} from "@spezutil/hijri-core";
import { buildMonthModel, sameHijri, type DayCell } from "./render";
import { isMode, parseIsoList, type Mode } from "./selection";
import {
  combineDateTime,
  from12,
  splitDateTime,
  to12,
  type Time,
} from "./time";
import { styles } from "./styles";

export interface SingleChangeDetail {
  mode: "single";
  hijri: HijriDate;
  gregorian: string;
  time?: Time;
}
export interface RangeEndpoint {
  hijri: HijriDate;
  gregorian: string;
}
export interface RangeChangeDetail {
  mode: "range";
  start: RangeEndpoint | null;
  end: RangeEndpoint | null;
}
export interface MultipleChangeDetail {
  mode: "multiple";
  hijri: HijriDate[];
  gregorian: string[];
}
export type ChangeDetail =
  | SingleChangeDetail
  | RangeChangeDetail
  | MultipleChangeDetail;

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export type SecondaryPosition = "end" | "start" | "above" | "below" | "hidden";
const SECONDARY_POSITIONS: SecondaryPosition[] = ["end", "start", "above", "below", "hidden"];

function parseIsoUtc(s: string | null): Date | null {
  if (!s || !ISO.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
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
      "primary",
      "secondary-position",
      "timezone",
    ];
  }

  private cal: HijriCalendar = createCalendar();
  private root: ShadowRoot;
  private view: { year: number; month: number };

  private _mode: Mode = "single";
  private selected: HijriDate | null = null; // single
  private selectedList: HijriDate[] = []; // multiple
  private rangeStart: HijriDate | null = null;
  private rangeEnd: HijriDate | null = null;
  private hoverDate: HijriDate | null = null;
  private time: Time | null = null; // single + enable-time

  private lastCells: DayCell[] = [];
  private suppress = false;

  public isDateDisabled?: (hijri: HijriDate, gregorian: Date) => boolean;

  private reflect(name: string, v: string | null): void {
    if (v === null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  }

  get value(): string | null { return this.getAttribute("value"); }
  set value(v: string | null) { this.reflect("value", v); }
  get start(): string | null { return this.getAttribute("start"); }
  set start(v: string | null) { this.reflect("start", v); }
  get end(): string | null { return this.getAttribute("end"); }
  set end(v: string | null) { this.reflect("end", v); }
  get mode(): string | null { return this.getAttribute("mode"); }
  set mode(v: string | null) { this.reflect("mode", v); }
  get min(): string | null { return this.getAttribute("min"); }
  set min(v: string | null) { this.reflect("min", v); }
  get max(): string | null { return this.getAttribute("max"); }
  set max(v: string | null) { this.reflect("max", v); }
  get timeFormat(): string | null { return this.getAttribute("time-format"); }
  set timeFormat(v: string | null) { this.reflect("time-format", v); }
  get disabledWeekdays(): string | null { return this.getAttribute("disabled-weekdays"); }
  set disabledWeekdays(v: string | null) { this.reflect("disabled-weekdays", v); }
  get enableTime(): boolean { return this.hasAttribute("enable-time"); }
  set enableTime(v: boolean) {
    if (v) this.setAttribute("enable-time", "");
    else this.removeAttribute("enable-time");
  }
  get primary(): "hijri" | "gregorian" {
    return this.getAttribute("primary") === "gregorian" ? "gregorian" : "hijri";
  }
  set primary(v: string) { this.reflect("primary", v); }
  get secondaryPosition(): SecondaryPosition {
    const v = this.getAttribute("secondary-position");
    return SECONDARY_POSITIONS.includes(v as SecondaryPosition)
      ? (v as SecondaryPosition)
      : "below";
  }
  set secondaryPosition(v: string) { this.reflect("secondary-position", v); }
  /** IANA timezone (e.g. "Asia/Kolkata") used to resolve "today". Defaults to the viewer's local zone. */
  get timezone(): string | undefined { return this.getAttribute("timezone") ?? undefined; }
  set timezone(v: string | null | undefined) { this.reflect("timezone", v ?? null); }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    const todayHijri = this.cal.gregorianToHijri(zonedTodayUtc(this.timezone));
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
    try {
      fn();
    } finally {
      this.suppress = false;
    }
  }

  private syncFromAttrs(): void {
    this._mode = isMode(this.getAttribute("mode"));
    if (this._mode === "range") {
      const s = parseIsoUtc(this.getAttribute("start"));
      const e = parseIsoUtc(this.getAttribute("end"));
      this.rangeStart = s ? this.g2h(s) : null;
      this.rangeEnd = e ? this.g2h(e) : null;
      this.hoverDate = null;
      if (this.rangeStart) this.view = { year: this.rangeStart.year, month: this.rangeStart.month };
    } else if (this._mode === "multiple") {
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
      this.time = time ?? this.time;
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

  private emit(detail: ChangeDetail): void {
    this.dispatchEvent(
      new CustomEvent("change", { bubbles: true, composed: true, detail })
    );
  }

  private select(cell: DayCell): void {
    if (cell.disabled) return;
    if (this._mode === "range") return this.selectRange(cell);
    if (this._mode === "multiple") return this.selectMultiple(cell);
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
      start: { hijri: this.rangeStart!, gregorian: startIso },
      end: { hijri: this.rangeEnd!, gregorian: endIso },
    });
  }

  private setTime(t: Time): void {
    this.time = t;
    if (this.selected) {
      const iso = this.h2iso(this.selected);
      const value = combineDateTime(iso, t);
      this.applyAttrs(() => this.setAttribute("value", value));
      this.emit({ mode: "single", hijri: this.selected!, gregorian: value, time: t });
    }
  }

  private paintRange(hoverHijri: HijriDate | null): void {
    if (this._mode !== "range" || !this.rangeStart || this.rangeEnd) return;
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

  /** Gregorian day number, with "1 Mar"-style month marker on the first of a month. */
  private gregDayLabel(g: Date): string {
    const d = g.getUTCDate();
    if (d !== 1) return String(d);
    return `1 ${g.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;
  }

  /** Primary/secondary day-number spans honoring `primary` and `secondary-position`. */
  private dayNumbersHtml(cell: DayCell): string {
    const gregLabel = this.gregDayLabel(cell.gregorian);
    const hijriLabel = String(cell.hijri.day);
    const [prim, sec] =
      this.primary === "gregorian" ? [gregLabel, hijriLabel] : [hijriLabel, gregLabel];
    const primarySpan = `<span class="num-primary" part="day-primary">${prim}</span>`;
    if (this.secondaryPosition === "hidden") return primarySpan;
    return `${primarySpan}<span class="num-secondary" part="day-secondary">${sec}</span>`;
  }

  private renderTimeRow(): string {
    if (this._mode !== "single" || !this.hasAttribute("enable-time")) return "";
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
    });
  }

  private render(): void {
    const model = buildMonthModel(this.cal, this.view, {
      selected: this._mode === "single" ? this.selected : null,
      selectedList: this._mode === "multiple" ? this.selectedList : undefined,
      rangeStart: this._mode === "range" ? this.rangeStart : null,
      rangeEnd: this._mode === "range" ? this.rangeEnd ?? this.hoverDate : null,
      isDisabled: this.buildDisabledFn(),
      today: zonedTodayUtc(this.timezone),
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
                    ${this.dayNumbersHtml(cell)}
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
      if (this._mode === "range" && this.rangeStart && !this.rangeEnd) {
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
      if (this._mode === "range" && this.rangeStart && !this.rangeEnd) {
        this.hoverDate = null;
        this.paintRange(null);
      }
    });
  }
}
