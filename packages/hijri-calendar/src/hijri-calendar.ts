import {
  createCalendar,
  formatHijri,
  zonedNowMinutes,
  zonedTodayUtc,
  type HijriCalendar,
  type HijriDate,
} from "@spezutil/hijri-core";
import {
  buildAgendaModel,
  buildCalendarMonthModel,
  buildTimeGridModel,
  mapEventFields,
  normalizeEvent,
  type CalendarEvent,
  type DayCell,
  type EventFieldMap,
  type EventSegment,
  type NormalizedEvent,
  type PositionedEvent,
  type TimeGridColumn,
} from "@spezutil/hijri-view-core";
import { resolveLocale, type CalendarLocale } from "./locale";
import { styles } from "./styles";

export type CalendarView = "month" | "week" | "day" | "agenda";

export interface EventClickDetail {
  event: CalendarEvent;
  hijri: HijriDate;
  /** The event's own start value (Gregorian ISO). */
  gregorian: string;
}
export interface DateClickDetail {
  hijri: HijriDate;
  /** Day as Gregorian ISO date. */
  gregorian: string;
}
export interface SlotClickDetail {
  hijri: HijriDate;
  /** Slot start as Gregorian ISO datetime. */
  gregorian: string;
}
export interface MoreClickDetail {
  hijri: HijriDate;
  gregorian: string;
  /** Every event on that day, visible and hidden. */
  events: CalendarEvent[];
}
export interface ViewChangeDetail {
  view: CalendarView;
}
export interface DateChangeDetail {
  /** Focused date as Gregorian ISO date. */
  date: string;
}

const DAY_MS = 86400000;
const VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SecondaryPosition = "end" | "start" | "above" | "below" | "hidden";
const SECONDARY_POSITIONS: SecondaryPosition[] = ["end", "start", "above", "below", "hidden"];

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseIsoDateUtc(s: string | null): Date | null {
  if (!s || !ISO_DATE.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, d!));
}

function floorToDayUtc(date: Date): Date {
  return new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS);
}

function isView(v: string | null): CalendarView {
  return VIEWS.includes(v as CalendarView) ? (v as CalendarView) : "month";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export class HijriCalendarElement extends HTMLElement {
  static get observedAttributes(): string[] {
    return [
      "view",
      "date",
      "locale",
      "dir",
      "week-start",
      "day-start",
      "day-end",
      "time-format",
      "max-events",
      "primary",
      "secondary-position",
      "timezone",
    ];
  }

  private cal: HijriCalendar = createCalendar();
  private root: ShadowRoot;
  private viewDate: Date = zonedTodayUtc();
  private _events: CalendarEvent[] = [];
  private _rawEvents: unknown = [];
  private _eventFields: EventFieldMap | undefined;
  private suppress = false;
  private loc: CalendarLocale = resolveLocale(null);

  public isDateDisabled?: (hijri: HijriDate, gregorian: Date) => boolean;

  get events(): CalendarEvent[] {
    return this._events;
  }
  set events(v: unknown) {
    this._rawEvents = v;
    this._events = this.mapEvents(v);
    this.render();
  }

  /**
   * Optional field-name mapping applied to `events` before use, for hosts whose data
   * doesn't use CalendarEvent's field names (e.g. `{ start: "start_at" }`). Omitted keys
   * default to the same-named field. The original raw object is passed through as `data`.
   */
  get eventFields(): EventFieldMap | undefined {
    return this._eventFields;
  }
  set eventFields(v: EventFieldMap | undefined) {
    this._eventFields = v;
    this._events = this.mapEvents(this._rawEvents);
    this.render();
  }

  private mapEvents(v: unknown): CalendarEvent[] {
    const arr = Array.isArray(v) ? v : [];
    if (!this._eventFields) return arr as CalendarEvent[];
    const fields = this._eventFields;
    return arr.map((raw) => mapEventFields(raw as Record<string, unknown>, fields));
  }

  private reflect(name: string, v: string | null): void {
    if (v === null) this.removeAttribute(name);
    else this.setAttribute(name, v);
  }

  get view(): CalendarView {
    return isView(this.getAttribute("view"));
  }
  set view(v: CalendarView) {
    this.reflect("view", v);
  }
  get date(): string {
    return toIso(this.viewDate);
  }
  set date(v: string | null) {
    this.reflect("date", v);
  }
  get weekStart(): number {
    const n = Number(this.getAttribute("week-start"));
    return Number.isInteger(n) && n >= 0 && n <= 6 ? n : 0;
  }
  set weekStart(v: number) {
    this.reflect("week-start", String(v));
  }
  get dayStart(): number {
    const n = Number(this.getAttribute("day-start"));
    return Number.isInteger(n) && n >= 0 && n <= 23 ? n : 0;
  }
  set dayStart(v: number) {
    this.reflect("day-start", String(v));
  }
  get dayEnd(): number {
    const n = Number(this.getAttribute("day-end"));
    return Number.isInteger(n) && n >= 1 && n <= 24 ? n : 24;
  }
  set dayEnd(v: number) {
    this.reflect("day-end", String(v));
  }
  get locale(): "translit" | "ar" {
    return this.getAttribute("locale") === "ar" ? "ar" : "translit";
  }
  set locale(v: string) {
    this.reflect("locale", v);
  }
  get primary(): "hijri" | "gregorian" {
    return this.getAttribute("primary") === "gregorian" ? "gregorian" : "hijri";
  }
  set primary(v: string) {
    this.reflect("primary", v);
  }
  get secondaryPosition(): SecondaryPosition {
    const v = this.getAttribute("secondary-position");
    return SECONDARY_POSITIONS.includes(v as SecondaryPosition)
      ? (v as SecondaryPosition)
      : "end";
  }
  set secondaryPosition(v: string) {
    this.reflect("secondary-position", v);
  }
  get timeFormat(): "12" | "24" {
    return this.getAttribute("time-format") === "24" ? "24" : "12";
  }
  set timeFormat(v: string) {
    this.reflect("time-format", v);
  }
  get maxEvents(): number {
    const n = Number(this.getAttribute("max-events"));
    return Number.isInteger(n) && n > 0 ? n : 3;
  }
  set maxEvents(v: number) {
    this.reflect("max-events", String(v));
  }
  /** IANA timezone (e.g. "Asia/Kolkata") used to resolve "today"/"now". Defaults to the viewer's local zone. */
  get timezone(): string | undefined {
    return this.getAttribute("timezone") ?? undefined;
  }
  set timezone(v: string | null | undefined) {
    this.reflect("timezone", v ?? null);
  }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    this.syncFromAttrs();
    this.render();
  }

  disconnectedCallback(): void {
    this.stopNowTimer();
  }

  attributeChangedCallback(): void {
    if (!this.root || this.suppress) return;
    this.syncFromAttrs();
    if (this.isConnected) this.render();
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
    const d = parseIsoDateUtc(this.getAttribute("date"));
    if (d) this.viewDate = d;
    this.loc = resolveLocale(this.getAttribute("locale"));
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  private setViewDate(d: Date): void {
    this.viewDate = floorToDayUtc(d);
    const iso = toIso(this.viewDate);
    this.applyAttrs(() => this.setAttribute("date", iso));
    this.render();
    this.emit<DateChangeDetail>("date-change", { date: iso });
  }

  private navigate(delta: number): void {
    if (this.view === "month") {
      const h = this.cal.gregorianToHijri(this.viewDate);
      let { year, month } = h;
      month += delta;
      if (month < 1) {
        month = 12;
        year -= 1;
      } else if (month > 12) {
        month = 1;
        year += 1;
      }
      this.setViewDate(this.cal.hijriToGregorian({ year, month, day: 1 }));
      return;
    }
    const days = this.view === "week" ? 7 : this.view === "day" ? 1 : 30;
    this.setViewDate(new Date(this.viewDate.getTime() + delta * days * DAY_MS));
  }

  private setView(v: CalendarView): void {
    this.applyAttrs(() => this.setAttribute("view", v));
    this.render();
    this.emit<ViewChangeDetail>("view-change", { view: v });
  }

  private buildDisabledFn(): (h: HijriDate, g: Date) => boolean {
    return (h, g) => (this.isDateDisabled ? this.isDateDisabled(h, g) : false);
  }

  protected formatTimeLabel(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const mm = minute ? `:${String(minute).padStart(2, "0")}` : "";
    if (this.timeFormat === "24") {
      return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
    }
    const meridiem = hour < 12 ? "AM" : "PM";
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    return `${h12}${mm} ${meridiem}`;
  }

  private eventTimeLabel(event: CalendarEvent): string {
    const n = normalizeEvent(event);
    if (n.allDay) return this.loc.allDayLabel;
    const startMin = Math.round((n.startMs % DAY_MS) / 60000);
    return this.formatTimeLabel(startMin);
  }

  private gregSubtitle(first: Date, last: Date): string {
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric", timeZone: "UTC" };
    const a = first.toLocaleDateString("en-US", opts);
    const b = last.toLocaleDateString("en-US", opts);
    return a === b ? a : `${a} – ${b}`;
  }

  /** Gregorian day number, with "1 Jul"-style month marker on the first of a month. */
  private gregDayLabel(g: Date): string {
    const d = g.getUTCDate();
    if (d !== 1) return String(d);
    return `1 ${g.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`;
  }

  /** Primary/secondary day-number spans honoring `primary` and `secondary-position`. */
  private dayNumbersHtml(hijriDay: number, g: Date): string {
    const gregLabel = this.gregDayLabel(g);
    const hijriLabel = String(hijriDay);
    const [prim, sec] =
      this.primary === "gregorian" ? [gregLabel, hijriLabel] : [hijriLabel, gregLabel];
    const primarySpan = `<span class="num-primary" part="day-primary">${escapeHtml(prim)}</span>`;
    if (this.secondaryPosition === "hidden") return primarySpan;
    return `${primarySpan}<span class="num-secondary" part="day-secondary">${escapeHtml(sec)}</span>`;
  }

  private eventsOnDay(dayStartMs: number): CalendarEvent[] {
    return this._events.filter((e) => {
      const n = normalizeEvent(e);
      return n.startMs < dayStartMs + DAY_MS && n.endMs > dayStartMs;
    });
  }

  // ---- toolbar ----

  private renderToolbar(title: string, subtitle: string): string {
    const viewBtns = VIEWS.map(
      (v) =>
        `<button type="button" part="view-btn" data-view="${v}" aria-pressed="${v === this.view}">${this.loc.viewLabels[v]}</button>`
    ).join("");
    return `<div class="toolbar" part="toolbar">
      <button type="button" part="nav-today" data-today>${this.loc.todayLabel}</button>
      <div class="nav-group">
        <button type="button" part="nav-prev" data-nav="-1" aria-label="Previous">‹</button>
        <button type="button" part="nav-next" data-nav="1" aria-label="Next">›</button>
      </div>
      <div class="title" part="title">${escapeHtml(title)}<small>${escapeHtml(subtitle)}</small></div>
      <div class="view-switch" part="view-switch">${viewBtns}</div>
    </div>`;
  }

  private wireToolbar(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(Number(btn.dataset.nav)));
    });
    this.root.querySelector("[data-today]")?.addEventListener("click", () => {
      this.setViewDate(zonedTodayUtc(this.timezone));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((btn) => {
      btn.addEventListener("click", () => this.setView(isView(btn.dataset.view ?? null)));
    });
  }

  // ---- month view ----

  private lastCells: DayCell[] = [];
  private lastSegments: EventSegment[] = [];

  private renderMonth(): { title: string; subtitle: string; body: string } {
    const h = this.cal.gregorianToHijri(this.viewDate);
    const model = buildCalendarMonthModel(this.cal, { year: h.year, month: h.month }, this._events, {
      maxLanes: this.maxEvents,
      today: zonedTodayUtc(this.timezone),
      weekStart: this.weekStart,
      isDisabled: this.buildDisabledFn(),
    });
    this.lastCells = model.weeks.flat();
    this.lastSegments = model.segments;

    const inMonth = this.lastCells.filter((c) => c.inCurrentMonth);
    const title = `${this.loc.monthNames[h.month - 1] ?? ""} ${h.year}`;
    const subtitle = this.gregSubtitle(
      inMonth[0]!.gregorian,
      inMonth[inMonth.length - 1]!.gregorian
    );

    const ws = this.weekStart;
    const dowRow = Array.from({ length: 7 }, (_, i) => {
      const name = this.loc.weekdayNames[(i + ws) % 7] ?? "";
      return `<div class="dow" part="weekday" role="columnheader" title="${escapeHtml(name)}">${escapeHtml(name.slice(0, 3))}</div>`;
    }).join("");

    const weeksHtml = model.weeks
      .map((week, w) => {
        const dayHeads = week
          .map((cell, d) => {
            const i = w * 7 + d;
            const cls = [
              "day-head",
              cell.inCurrentMonth ? "" : "out",
              cell.isToday ? "today" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const label = `${formatHijri(cell.hijri, "D MMMM YYYY")} (${toIso(cell.gregorian)})`;
            return `<button type="button" part="day" class="${cls}" role="gridcell"
              style="grid-column:${d + 1}" data-i="${i}" data-date="${toIso(cell.gregorian)}"
              aria-label="${escapeHtml(label)}" tabindex="-1" ${cell.disabled ? "disabled data-disabled" : ""}>
              ${this.dayNumbersHtml(cell.hijri.day, cell.gregorian)}
            </button>`;
          })
          .join("");

        const chips = model.segments
          .filter((s) => s.weekIndex === w)
          .map((s) => {
            const idx = this.lastSegments.indexOf(s);
            const cls = [
              "chip",
              s.continuesBefore ? "continues-before" : "",
              s.continuesAfter ? "continues-after" : "",
            ]
              .filter(Boolean)
              .join(" ");
            const color = s.event.color ? ` style="--_ev-color:${escapeHtml(s.event.color)};grid-row:${s.lane + 2};grid-column:${s.startCol + 1} / span ${s.span}"` : ` style="grid-row:${s.lane + 2};grid-column:${s.startCol + 1} / span ${s.span}"`;
            const label = `${s.event.title}, ${this.eventTimeLabel(s.event)}`;
            return `<button type="button" part="event" class="${cls}" data-ev="${idx}"${color}
              aria-label="${escapeHtml(label)}">${escapeHtml(s.event.title)}</button>`;
          })
          .join("");

        const mores = week
          .map((cell, d) => {
            const count = model.overflow[w]?.[d] ?? 0;
            if (!count) return "";
            return `<button type="button" part="more-link" class="more"
              style="grid-row:${this.maxEvents + 2};grid-column:${d + 1}"
              data-more="${w * 7 + d}">${escapeHtml(this.loc.moreLabel(count))}</button>`;
          })
          .join("");

        return `<div class="week" role="row">${dayHeads}${chips}${mores}</div>`;
      })
      .join("");

    const body = `<div class="month" role="grid" aria-label="${escapeHtml(title)}">
      <div class="dow-row" role="row">${dowRow}</div>
      ${weeksHtml}
    </div>`;
    return { title, subtitle, body };
  }

  private wireMonth(): void {
    const dayButtons = Array.from(this.root.querySelectorAll<HTMLButtonElement>("[data-i]"));
    dayButtons.forEach((btn) => {
      const cell = this.lastCells[Number(btn.dataset.i)];
      if (!cell) return;
      btn.addEventListener("click", () => {
        if (cell.disabled) return;
        this.emit<DateClickDetail>("date-click", {
          hijri: cell.hijri,
          gregorian: toIso(cell.gregorian),
        });
      });
    });
    this.wireEventChips();
    this.root.querySelectorAll<HTMLButtonElement>("[data-more]").forEach((btn) => {
      const cell = this.lastCells[Number(btn.dataset.more)];
      if (!cell) return;
      btn.addEventListener("click", () => {
        this.emit<MoreClickDetail>("more-click", {
          hijri: cell.hijri,
          gregorian: toIso(cell.gregorian),
          events: this.eventsOnDay(cell.gregorian.getTime()),
        });
      });
    });
    this.wireGridKeyboard(dayButtons, 7);
  }

  private wireEventChips(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-ev]").forEach((btn) => {
      const seg = this.lastSegments[Number(btn.dataset.ev)];
      if (!seg) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.emitEventClick(seg.event);
      });
    });
  }

  protected emitEventClick(event: CalendarEvent): void {
    const n = normalizeEvent(event);
    this.emit<EventClickDetail>("event-click", {
      event,
      hijri: this.cal.gregorianToHijri(new Date(n.startMs)),
      gregorian: event.start,
    });
  }

  private wireGridKeyboard(buttons: HTMLButtonElement[], columns: number): void {
    if (!buttons.length) return;
    const initialIdx = Math.max(
      buttons.findIndex((b) => !b.disabled),
      0
    );
    buttons.forEach((b, i) => (b.tabIndex = i === initialIdx ? 0 : -1));

    const moveFocus = (from: number, delta: number): void => {
      let i = from + delta;
      while (i >= 0 && i < buttons.length && buttons[i]?.disabled) i += delta;
      const target = buttons[i];
      if (target) {
        buttons.forEach((b) => (b.tabIndex = -1));
        target.tabIndex = 0;
        target.focus();
      }
    };

    const grid = this.root.querySelector('[role="grid"]');
    grid?.addEventListener("keydown", (e) => {
      const ke = e as KeyboardEvent;
      const target = (ke.target as HTMLElement | null)?.closest?.("[data-i]");
      const idx = target ? buttons.indexOf(target as HTMLButtonElement) : -1;
      const deltas: Record<string, number> = {
        ArrowRight: 1,
        ArrowLeft: -1,
        ArrowDown: columns,
        ArrowUp: -columns,
      };
      if (ke.key in deltas) {
        ke.preventDefault();
        moveFocus(idx === -1 ? initialIdx : idx, deltas[ke.key] ?? 0);
      } else if (ke.key === "Enter" || ke.key === " ") {
        ke.preventDefault();
        const useIdx = idx === -1 ? initialIdx : idx;
        buttons[useIdx]?.click();
      }
    });
  }

  // ---- week/day time-grid views ----

  private lastTimedFlat: PositionedEvent[] = [];
  private lastAllDayFlat: NormalizedEvent[] = [];
  private lastColumns: TimeGridColumn[] = [];

  private hijriRangeTitle(first: HijriDate, last: HijriDate): string {
    const a = this.loc.monthNames[first.month - 1] ?? "";
    const b = this.loc.monthNames[last.month - 1] ?? "";
    if (first.month === last.month && first.year === last.year) return `${a} ${first.year}`;
    if (first.year === last.year) return `${a} – ${b} ${first.year}`;
    return `${a} ${first.year} – ${b} ${last.year}`;
  }

  private renderTimeGrid(dayCount: number): { title: string; subtitle: string; body: string } {
    const model = buildTimeGridModel(this.cal, this.viewDate, dayCount, this._events, {
      dayStartHour: this.dayStart,
      dayEndHour: this.dayEnd,
      weekStart: this.weekStart,
      today: zonedTodayUtc(this.timezone),
    });
    this.lastColumns = model.columns;
    this.lastTimedFlat = [];
    this.lastAllDayFlat = [];

    const first = model.columns[0]!;
    const last = model.columns[model.columns.length - 1]!;
    const title =
      dayCount === 1
        ? `${first.hijri.day} ${this.loc.monthNames[first.hijri.month - 1] ?? ""} ${first.hijri.year}`
        : this.hijriRangeTitle(first.hijri, last.hijri);
    const subtitle = this.gregSubtitle(first.gregorian, last.gregorian);

    const winStart = this.dayStart * 60;
    const winEnd = this.dayEnd * 60;
    const total = winEnd - winStart;
    const cols = `56px repeat(${dayCount}, 1fr)`;

    const heads = model.columns
      .map((col) => {
        const dow = this.loc.weekdayNames[col.gregorian.getUTCDay()] ?? "";
        return `<div class="tg-col-head${col.isToday ? " today" : ""}" part="day">
          <div class="dow" part="weekday">${escapeHtml(dow.slice(0, 3))}</div>
          ${this.dayNumbersHtml(col.hijri.day, col.gregorian)}
        </div>`;
      })
      .join("");

    const allDayCols = model.columns
      .map((col) => {
        const chips = col.allDay
          .map((n) => {
            const idx = this.lastAllDayFlat.push(n) - 1;
            const color = n.event.color ? `--_ev-color:${escapeHtml(n.event.color)};` : "";
            return `<button type="button" part="event" class="chip" data-aev="${idx}"
              style="${color}" aria-label="${escapeHtml(`${n.event.title}, ${this.loc.allDayLabel}`)}">${escapeHtml(n.event.title)}</button>`;
          })
          .join("");
        return `<div class="tg-allday-col" part="allday-row">${chips}</div>`;
      })
      .join("");

    const gutterSlots: string[] = [];
    for (let min = winStart; min < winEnd; min += 30) {
      const label =
        min % 60 === 0
          ? `<span>${escapeHtml(
              this.timeFormat === "24"
                ? `${String(min / 60).padStart(2, "0")}:00`
                : this.formatTimeLabel(min)
            )}</span>`
          : "";
      gutterSlots.push(`<div class="tg-slot">${label}</div>`);
    }

    const nowMin = zonedNowMinutes(this.timezone);
    const dayCols = model.columns
      .map((col) => {
        const iso = toIso(col.gregorian);
        const slots: string[] = [];
        for (let min = winStart; min < winEnd; min += 30) {
          const hh = String(Math.floor(min / 60)).padStart(2, "0");
          const mm = String(min % 60).padStart(2, "0");
          slots.push(
            `<div class="tg-slot${min % 60 === 30 ? " hour-end" : ""}" part="slot" data-slot="${iso}T${hh}:${mm}"></div>`
          );
        }

        const blocks = col.timed
          .map((p) => {
            const idx = this.lastTimedFlat.push(p) - 1;
            const top = ((p.startMin - winStart) / total) * 100;
            const height = ((p.endMin - p.startMin) / total) * 100;
            const left = (p.col / p.colCount) * 100;
            const width = 100 / p.colCount;
            const color = p.event.color ? `--_ev-color:${escapeHtml(p.event.color)};` : "";
            const timeLabel = this.formatTimeLabel(p.startMin);
            return `<button type="button" part="event" class="tg-event" data-tev="${idx}"
              style="${color}top:${top}%;height:${height}%;left:${left}%;width:${width}%"
              aria-label="${escapeHtml(`${p.event.title}, ${timeLabel}`)}">
              ${escapeHtml(p.event.title)}<small>${escapeHtml(timeLabel)}</small>
            </button>`;
          })
          .join("");

        let nowLine = "";
        if (col.isToday) {
          if (nowMin >= winStart && nowMin < winEnd) {
            const top = ((nowMin - winStart) / total) * 100;
            nowLine = `<div class="now-line" part="now-indicator" style="top:${top}%"></div>`;
          }
        }

        return `<div class="tg-day-col">${slots.join("")}${blocks}${nowLine}</div>`;
      })
      .join("");

    const body = `<div class="timegrid">
      <div class="tg-head" style="grid-template-columns:${cols}"><div></div>${heads}</div>
      <div class="tg-allday" style="grid-template-columns:${cols}">
        <div class="tg-allday-label">${escapeHtml(this.loc.allDayLabel)}</div>${allDayCols}
      </div>
      <div class="tg-body" style="grid-template-columns:${cols}">
        <div class="tg-gutter" part="time-gutter">${gutterSlots.join("")}</div>
        ${dayCols}
      </div>
    </div>`;
    return { title, subtitle, body };
  }

  private wireTimeGrid(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-tev]").forEach((btn) => {
      const p = this.lastTimedFlat[Number(btn.dataset.tev)];
      if (!p) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.emitEventClick(p.event);
      });
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-aev]").forEach((btn) => {
      const n = this.lastAllDayFlat[Number(btn.dataset.aev)];
      if (!n) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.emitEventClick(n.event);
      });
    });
    this.root.querySelectorAll<HTMLElement>("[data-slot]").forEach((slot) => {
      slot.addEventListener("click", () => {
        const value = slot.dataset.slot!;
        const day = parseIsoDateUtc(value.slice(0, 10));
        if (!day) return;
        this.emit<SlotClickDetail>("slot-click", {
          hijri: this.cal.gregorianToHijri(day),
          gregorian: value,
        });
      });
    });
    if (this.lastColumns.some((c) => c.isToday)) {
      this.startNowTimer(() => this.render());
    }
  }

  // ---- agenda view ----

  private static readonly AGENDA_DAYS = 30;
  private lastAgendaFlat: NormalizedEvent[] = [];

  private renderAgenda(): { title: string; subtitle: string; body: string } {
    const model = buildAgendaModel(
      this.cal,
      this.viewDate,
      HijriCalendarElement.AGENDA_DAYS,
      this._events
    );
    this.lastAgendaFlat = [];

    const windowEnd = new Date(
      this.viewDate.getTime() + (HijriCalendarElement.AGENDA_DAYS - 1) * DAY_MS
    );
    const title = this.hijriRangeTitle(
      this.cal.gregorianToHijri(this.viewDate),
      this.cal.gregorianToHijri(windowEnd)
    );
    const subtitle = this.gregSubtitle(this.viewDate, windowEnd);

    const daysHtml = model.days
      .map((day) => {
        const items = day.items
          .map((n) => {
            const idx = this.lastAgendaFlat.push(n) - 1;
            const color = n.event.color ? ` style="--_ev-color:${escapeHtml(n.event.color)}"` : "";
            const when = n.allDay
              ? this.loc.allDayLabel
              : this.formatTimeLabel(Math.round((n.startMs % DAY_MS) / 60000));
            return `<button type="button" part="agenda-item" class="agenda-item" data-gev="${idx}">
              <span class="dot"${color}></span>
              <span class="when">${escapeHtml(when)}</span>
              <span>${escapeHtml(n.event.title)}</span>
            </button>`;
          })
          .join("");
        const hijriLabel = `${day.hijri.day} ${this.loc.monthNames[day.hijri.month - 1] ?? ""} ${day.hijri.year}`;
        const gregLabel = day.gregorian.toLocaleDateString("en-US", {
          weekday: "short",
          month: "short",
          day: "numeric",
          timeZone: "UTC",
        });
        return `<div class="agenda-day" part="agenda-day">
          <div class="agenda-date">
            <div class="hijri">${escapeHtml(hijriLabel)}</div>
            <div class="greg">${escapeHtml(gregLabel)}</div>
          </div>
          <div class="agenda-items">${items}</div>
        </div>`;
      })
      .join("");

    const body = `<div class="agenda">${
      daysHtml || `<div class="agenda-empty">${escapeHtml(this.loc.emptyLabel)}</div>`
    }</div>`;
    return { title, subtitle, body };
  }

  private wireAgenda(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-gev]").forEach((btn) => {
      const n = this.lastAgendaFlat[Number(btn.dataset.gev)];
      if (!n) return;
      btn.addEventListener("click", () => this.emitEventClick(n.event));
    });
  }

  // ---- view dispatch ----

  protected renderView(): { title: string; subtitle: string; body: string } {
    switch (this.view) {
      case "week":
        return this.renderTimeGrid(7);
      case "day":
        return this.renderTimeGrid(1);
      case "agenda":
        return this.renderAgenda();
      default:
        return this.renderMonth();
    }
  }

  protected wireView(): void {
    if (this.view === "month") this.wireMonth();
    else if (this.view === "week" || this.view === "day") this.wireTimeGrid();
    else this.wireAgenda();
  }

  // ---- now indicator timer (used by time-grid views) ----

  private nowTimer: ReturnType<typeof setInterval> | null = null;

  protected startNowTimer(cb: () => void): void {
    this.stopNowTimer();
    this.nowTimer = setInterval(cb, 60000);
  }

  protected stopNowTimer(): void {
    if (this.nowTimer !== null) {
      clearInterval(this.nowTimer);
      this.nowTimer = null;
    }
  }

  protected render(): void {
    if (!this.root) return;
    this.stopNowTimer();
    const { title, subtitle, body } = this.renderView();
    this.root.innerHTML = `<style>${styles}</style>
      <div class="cal" role="application" aria-label="Hijri calendar">
        ${this.renderToolbar(title, subtitle)}
        ${body}
      </div>`;
    this.wireToolbar();
    this.wireView();
  }
}
