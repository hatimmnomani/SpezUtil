import {
  createCalendar,
  formatHijri,
  formatNumerals,
  weekdayNames as enWeekdayNames,
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
import { resolveLocale, resolveNames, type CalendarLocale, type NameSet } from "./locale";
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
export interface RangeChangeDetail {
  view: CalendarView;
  /** Inclusive first visible day, "yyyy-mm-dd" (Gregorian, UTC day). */
  start: string;
  /** Exclusive end, "yyyy-mm-dd" — the day after the last visible day. */
  end: string;
  hijriStart: HijriDate;
  /** Hijri date of the last visible day (inclusive, for display). */
  hijriEnd: HijriDate;
  reason: "init" | "navigate" | "view" | "attribute";
}

interface ViewRenderResult {
  title: string;
  subtitle: string;
  body: string;
  /** Inclusive start / exclusive end of the visible range, used to compute `range-change`. */
  range: { start: Date; end: Date };
}

const DAY_MS = 86400000;
const VIEWS: CalendarView[] = ["month", "week", "day", "agenda"];
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type SecondaryPosition = "end" | "start" | "above" | "below" | "hidden";
const SECONDARY_POSITIONS: SecondaryPosition[] = ["end", "start", "above", "below", "hidden"];

export type EventStyle = "solid" | "tinted" | "outline";
const EVENT_STYLES: EventStyle[] = ["solid", "tinted", "outline"];

export type EventTimeMode = "auto" | "none" | "start" | "start-duration" | "range";
const EVENT_TIME_MODES: EventTimeMode[] = ["auto", "none", "start", "start-duration", "range"];

const SLOT_MINUTES_VALUES = [15, 30, 60] as const;
export type SlotMinutes = (typeof SLOT_MINUTES_VALUES)[number];

export type AlldayRowMode = "always" | "auto" | "never";
const ALLDAY_ROW_MODES: AlldayRowMode[] = ["always", "auto", "never"];

export type NowIndicatorMode = "line" | "line-label" | "none";
const NOW_INDICATOR_MODES: NowIndicatorMode[] = ["line", "line-label", "none"];

export type TimeLabelPosition = "line" | "cell";

export type DayHeaderMode = "column" | "banner";
const DAY_HEADER_MODES: DayHeaderMode[] = ["column", "banner"];

/**
 * Size band the calendar is rendered at, measured from the host's own `contentRect.width` via
 * a `ResizeObserver` (§5.9). Exposed as a read-only `size` property and as a token on
 * `part="calendar <band>"`. `SIZE_BANDS` gives the two thresholds as fixed literals (not
 * customizable attributes — see the task-5 brief): `wide` is `width >= SIZE_BANDS.wide`,
 * `medium` is `SIZE_BANDS.medium <= width < SIZE_BANDS.wide`, `narrow` is everything below
 * `SIZE_BANDS.medium`. When `ResizeObserver` is unavailable (jsdom, very old browsers) the
 * band is always `"wide"` — see `classifySize()`/`setupResizeObserver()`.
 */
export type SizeBand = "wide" | "medium" | "narrow";

/** Fixed size-band thresholds (host width, px) — see `SizeBand`. Not configurable; 1.0 defers that. */
export const SIZE_BANDS = { medium: 600, wide: 900 } as const;

function classifySize(width: number): SizeBand {
  if (width >= SIZE_BANDS.wide) return "wide";
  if (width >= SIZE_BANDS.medium) return "medium";
  return "narrow";
}

export type NarrowEventsMode = "dots" | "scroll";
const NARROW_EVENTS_MODES: NarrowEventsMode[] = ["dots", "scroll"];

/** Context passed to the `renderEvent` hook for every chip/block/agenda item. */
export interface RenderEventContext {
  event: CalendarEvent;
  view: CalendarView;
  placement: "month-chip" | "allday-chip" | "timed-block" | "agenda-item";
  hijri: HijriDate;
  /** Pre-formatted labels honouring time-format / numerals-gregorian / locale. */
  labels: { start: string; end: string; duration: string; range: string };
  continuesBefore: boolean;
  continuesAfter: boolean;
  size: SizeBand;
}
export type RenderEventHook = (ctx: RenderEventContext) => Node | string | null;

/** Context passed to the `renderDayCell` hook for every month-cell button and column head. */
export interface RenderDayCellContext {
  cell: DayCell;
  /** `"month"` for month cells, `"week"`/`"day"` for time-grid column heads. */
  view: CalendarView;
  placement: "month-cell" | "column-head";
  /** Events overlapping this day (all, including overflow), already field-mapped. */
  events: CalendarEvent[];
  /** Pre-formatted labels honouring primary / numerals / numerals-gregorian / month-marker. */
  labels: { primary: string; secondary: string; monthMarker: string | null; weekday: string };
  size: SizeBand;
}
export type RenderDayCellHook = (ctx: RenderDayCellContext) => Node | string | null;

/**
 * Hooks never break the calendar (design principle 7): a hook that throws is caught, logged
 * once via `console.warn` (keyed on the hook function's own identity, so the same function
 * reused across many chips/cells in one render — or across many renders — warns only once),
 * and the default renderer is used instead. Module-level (not per-instance) so it survives
 * across re-renders of the same element. This is deliberate, not an oversight: because the key
 * is the hook function's identity rather than a per-element token, two separate
 * `<hijri-calendar>` instances that are handed the *same* function reference (e.g. a shared
 * module-level hook, or one lifted out of a host framework's render so it's referentially
 * stable) also share the one warning between them. That is stricter than the acceptance bullet
 * requires and errs toward console quiet for something that fires per event — do not "fix" this
 * into a per-instance warning; that would reintroduce the console-spam problem the identity key
 * exists to prevent whenever a host reuses one hook across multiple calendars.
 */
const warnedHooks = new WeakSet<object>();
function warnHookOnce(hook: object, name: string, err: unknown): void {
  if (warnedHooks.has(hook)) return;
  warnedHooks.add(hook);
  console.warn(
    `[@spezutil/hijri-calendar] ${name} threw and will be ignored (falling back to the ` +
      `default renderer) for this and every other element using the same function:`,
    err
  );
}

/**
 * `variant` is interpolated into a `part="event variant-<v>"` attribute (and `data-variant`).
 * `normalizeEvent` (hijri-view-core) already validates and drops an invalid `variant` before it
 * reaches render code here, but this regex is re-checked at the interpolation site itself
 * (`variantTokens()`) as defence in depth, so a later refactor that reintroduces a raw,
 * unnormalized event at a render site cannot reopen an attribute-injection hole (Ruling P).
 */
const VARIANT_RE = /^[a-z0-9-]+$/;

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
      "views",
      "toolbar",
      "title-layout",
      "names",
      "numerals",
      "numerals-gregorian",
      "weekday-format",
      "weekend-days",
      "day-number-align",
      "month-marker",
      "today-marker",
      "event-style",
      "event-time",
      "slot-minutes",
      "allday-row",
      "now-indicator",
      "time-label-position",
      "day-header",
      "agenda-days",
      "loading",
      "narrow-events",
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
  private nameSet: NameSet = resolveNames(null);
  private lastRangeDetail: RangeChangeDetail | null = null;
  private _renderEvent: RenderEventHook | undefined;
  private _renderDayCell: RenderDayCellHook | undefined;
  /**
   * Current size band (§5.9). Defaults to the documented `ResizeObserver`-unavailable
   * fallback, "wide"; `setupResizeObserver()` measures the real value (synchronously, for the
   * stub tests use — see responsive.test.ts — asynchronously in real browsers) before the
   * band can ever affect a render, because it runs before the first `render("init")` call in
   * `connectedCallback()`.
   */
  private _size: SizeBand = "wide";
  private resizeObserver: ResizeObserver | null = null;
  /**
   * Set `true` at the end of every `render()`. Guards `handleResize()`: the *first* observer
   * callback (fired synchronously by observe() in real browsers is async, but the stub used by
   * responsive.test.ts fires it synchronously from `connectedCallback`) must only update
   * `_size` before the first render, never trigger a second one — otherwise the "exactly one
   * range-change with reason 'init'" contract (§5.3) could be broken by an earlier,
   * differently-reasoned render.
   */
  private hasRendered = false;

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
  /**
   * Which view buttons render, in which order. Unknown tokens are ignored; the currently
   * active `view` is always included even if absent from the list.
   */
  get views(): CalendarView[] {
    return this.parseViews(this.getAttribute("views"));
  }
  set views(v: string | CalendarView[]) {
    this.reflect("views", Array.isArray(v) ? v.join(" ") : v);
  }
  /** `"none"` removes the built-in toolbar (host drives `view`/`date` itself); slots still render. */
  get toolbar(): "full" | "none" {
    return this.getAttribute("toolbar") === "none" ? "none" : "full";
  }
  set toolbar(v: string) {
    this.reflect("toolbar", v);
  }
  /** The range last carried by a `range-change` event, or `null` before the first render. */
  get visibleRange(): RangeChangeDetail | null {
    return this.lastRangeDetail;
  }
  /**
   * Current size band, measured from the host's own width (§5.9). Read-only: there is no
   * setter and no reflected attribute — hosts that want to react to it read the property or
   * select on the `part="calendar <band>"` token.
   */
  get size(): SizeBand {
    return this._size;
  }
  /** Gregorian subtitle below (`stacked`, default) or inline after the Hijri title (`inline`). */
  get titleLayout(): "stacked" | "inline" {
    return this.getAttribute("title-layout") === "inline" ? "inline" : "stacked";
  }
  set titleLayout(v: string) {
    this.reflect("title-layout", v);
  }
  /**
   * Hijri month & weekday name set, independent of the `locale` attribute's UI strings.
   * Defaults to following `locale` (`"ar"` when `locale="ar"`, `"translit"` otherwise).
   */
  get names(): "translit" | "ar" {
    const v = this.getAttribute("names");
    if (v === "translit" || v === "ar") return v;
    return this.locale === "ar" ? "ar" : "translit";
  }
  set names(v: string) {
    this.reflect("names", v);
  }
  /** Digit system for Hijri numbers: day numbers, Hijri year, title primary, agenda Hijri date. */
  get numerals(): "latn" | "arab" {
    return this.getAttribute("numerals") === "arab" ? "arab" : "latn";
  }
  set numerals(v: string) {
    this.reflect("numerals", v);
  }
  /** Digit system for Gregorian numbers and clock digits (gutter labels, event times, etc). */
  get numeralsGregorian(): "latn" | "arab" {
    return this.getAttribute("numerals-gregorian") === "arab" ? "arab" : "latn";
  }
  set numeralsGregorian(v: string) {
    this.reflect("numerals-gregorian", v);
  }
  /** `bilingual` renders the `names` weekday (primary) and the English abbreviation (secondary). */
  get weekdayFormat(): "short" | "long" | "bilingual" {
    const v = this.getAttribute("weekday-format");
    return v === "long" || v === "bilingual" ? v : "short";
  }
  set weekdayFormat(v: string) {
    this.reflect("weekday-format", v);
  }
  /** Day indices (0=Sunday..6=Saturday) that receive the `weekend` part token. Default `[0, 6]`. */
  get weekendDays(): number[] {
    return this.parseWeekendDays(this.getAttribute("weekend-days"));
  }
  set weekendDays(v: number[] | string) {
    this.reflect("weekend-days", Array.isArray(v) ? v.join(" ") : v);
  }

  /** Alignment of the number row in month cells and time-grid column heads. Default `"center"`. */
  get dayNumberAlign(): "center" | "start" | "end" {
    const v = this.getAttribute("day-number-align");
    return v === "start" || v === "end" ? v : "center";
  }
  set dayNumberAlign(v: string) {
    this.reflect("day-number-align", v);
  }
  /** Which calendar's first-of-month gets a month-name marker. Default `"gregorian"` (today's behaviour). */
  get monthMarker(): "gregorian" | "hijri" | "both" | "none" {
    const v = this.getAttribute("month-marker");
    return v === "hijri" || v === "both" || v === "none" ? v : "gregorian";
  }
  set monthMarker(v: string) {
    this.reflect("month-marker", v);
  }
  /**
   * `pill` (default) keeps today's ring around the primary number; `dot` renders a small
   * corner indicator on the cell instead and colours the primary number with
   * `--hcal-today-color`; `none` renders neither. `--hcal-today-bg` tints the cell/column-head
   * background in all three modes.
   */
  get todayMarker(): "pill" | "dot" | "none" {
    const v = this.getAttribute("today-marker");
    return v === "dot" || v === "none" ? v : "pill";
  }
  set todayMarker(v: string) {
    this.reflect("today-marker", v);
  }

  /** Default chip/block rendering; a per-event `style` field overrides this. Default `"solid"` (today's behaviour). */
  get eventStyle(): EventStyle {
    const v = this.getAttribute("event-style");
    return EVENT_STYLES.includes(v as EventStyle) ? (v as EventStyle) : "solid";
  }
  set eventStyle(v: string) {
    this.reflect("event-style", v);
  }
  /**
   * Time text shown on chips/blocks/agenda items. `"auto"` resolves per placement: no time on
   * month-view chips or the all-day row (there is no meaningful clock time to show), and the
   * start time on timed blocks and agenda items — today's behaviour either way.
   */
  get eventTime(): EventTimeMode {
    const v = this.getAttribute("event-time");
    return EVENT_TIME_MODES.includes(v as EventTimeMode) ? (v as EventTimeMode) : "auto";
  }
  set eventTime(v: string) {
    this.reflect("event-time", v);
  }
  /**
   * Time-grid slot granularity in minutes. **Also the granularity of `slot-click`**: with `60`,
   * `detail.gregorian` is always the hour start (e.g. "…T09:00"), never a half-hour value —
   * hosts needing finer times collect them in their own UI.
   */
  get slotMinutes(): SlotMinutes {
    const n = Number(this.getAttribute("slot-minutes"));
    return (SLOT_MINUTES_VALUES as readonly number[]).includes(n) ? (n as SlotMinutes) : 30;
  }
  set slotMinutes(v: number) {
    this.reflect("slot-minutes", String(v));
  }
  /** `"auto"` hides the all-day row when no all-day event is in the visible range. Default `"always"` (today's behaviour). */
  get alldayRow(): AlldayRowMode {
    const v = this.getAttribute("allday-row");
    return ALLDAY_ROW_MODES.includes(v as AlldayRowMode) ? (v as AlldayRowMode) : "always";
  }
  set alldayRow(v: string) {
    this.reflect("allday-row", v);
  }
  /**
   * Current-time line in week/day views. `"none"` hides it entirely. `"line-label"` is reserved
   * for a future phase; until then it renders the same as `"line"` (the line, with no label).
   */
  get nowIndicator(): NowIndicatorMode {
    const v = this.getAttribute("now-indicator");
    return NOW_INDICATOR_MODES.includes(v as NowIndicatorMode) ? (v as NowIndicatorMode) : "line";
  }
  set nowIndicator(v: string) {
    this.reflect("now-indicator", v);
  }
  /** Gutter label centred on the hour line (`"line"`, default) or top-aligned inside the hour cell (`"cell"`). */
  get timeLabelPosition(): TimeLabelPosition {
    return this.getAttribute("time-label-position") === "cell" ? "cell" : "line";
  }
  set timeLabelPosition(v: string) {
    this.reflect("time-label-position", v);
  }
  /**
   * Day view only: `"column"` (default) keeps the compact time-grid column head; `"banner"`
   * replaces it with a full-width `part="day-banner"` header carrying a bigger date and an
   * events/hours summary. No effect in week/month/agenda views.
   */
  get dayHeader(): DayHeaderMode {
    const v = this.getAttribute("day-header");
    return DAY_HEADER_MODES.includes(v as DayHeaderMode) ? (v as DayHeaderMode) : "column";
  }
  set dayHeader(v: string) {
    this.reflect("day-header", v);
  }
  /** Agenda window length in days, from `date`. Default `30` (today's hard-coded behaviour). */
  get agendaDays(): number {
    const n = Number(this.getAttribute("agenda-days"));
    return Number.isInteger(n) && n >= 1 && n <= 366 ? n : 30;
  }
  set agendaDays(v: number) {
    this.reflect("agenda-days", String(v));
  }
  /**
   * Sets `aria-busy="true"` on the grid/timegrid/agenda body and renders a `part="loading"`
   * overlay (`slot="loading"` for host content, `loc.loadingLabel` by default). The body
   * itself gets `pointer-events: none` so clicks can't reach through the overlay.
   */
  get loading(): boolean {
    return this.hasAttribute("loading");
  }
  set loading(v: boolean) {
    if (v) this.setAttribute("loading", "");
    else this.removeAttribute("loading");
  }
  /**
   * Month view at the `narrow` size band only (§5.9): `"dots"` (default) collapses chips to
   * coloured `part="event dot"` spans (tap the cell → `date-click`); `"scroll"` keeps the
   * desktop chip layout and scrolls it horizontally inside `part="scroll"` instead. No effect
   * at `wide`/`medium` — the desktop chip layout always renders there.
   */
  get narrowEvents(): NarrowEventsMode {
    const v = this.getAttribute("narrow-events");
    return NARROW_EVENTS_MODES.includes(v as NarrowEventsMode) ? (v as NarrowEventsMode) : "dots";
  }
  set narrowEvents(v: string) {
    this.reflect("narrow-events", v);
  }
  /**
   * Replaces the inner content of every chip/block/agenda item (`part="event …"`). Returning
   * `null` keeps the default renderer; a `string` is inserted as a text node (never parsed as
   * HTML); a `Node` is appended as-is. Property only — see `RenderEventContext`.
   */
  get renderEvent(): RenderEventHook | undefined {
    return this._renderEvent;
  }
  set renderEvent(fn: RenderEventHook | undefined) {
    this._renderEvent = fn;
    if (this.root) this.render();
  }
  /**
   * Replaces the inner content of the month-cell number button and the time-grid column head
   * (`part="day …"`). Same return contract as `renderEvent` — see `RenderDayCellContext`.
   */
  get renderDayCell(): RenderDayCellHook | undefined {
    return this._renderDayCell;
  }
  set renderDayCell(fn: RenderDayCellHook | undefined) {
    this._renderDayCell = fn;
    if (this.root) this.render();
  }

  private parseWeekendDays(attr: string | null): number[] {
    if (attr === null) return [0, 6];
    const out: number[] = [];
    for (const t of attr.split(/\s+/).filter(Boolean)) {
      const n = Number(t);
      if (Number.isInteger(n) && n >= 0 && n <= 6 && !out.includes(n)) out.push(n);
    }
    return out;
  }

  private numH(n: number | string): string {
    return formatNumerals(n, this.numerals);
  }
  private numG(n: number | string): string {
    return formatNumerals(n, this.numeralsGregorian);
  }

  /**
   * `dir="rtl"` gate for spans whose content is a Hijri/weekday/month *name* string (as
   * opposed to a numeral). Generalises the P1 principle already used for day numbers (see the
   * `gregHasMonthMarker` comment in `dayNumbersHtml`): whether a span gets `dir="rtl"` is a
   * property of its actual rendered content, never merely of which attribute happens to be
   * `"arab"`. A title mixing a translit month name with Arabic-Indic year digits
   * (`"Ramadan ١٤٤٧"`) must not be marked rtl — only `names==="ar"` (genuinely Arabic-script
   * text) does, regardless of `numerals`.
   */
  private namesDirAttr(): string {
    return this.names === "ar" ? ' dir="rtl"' : "";
  }

  private parseViews(attr: string | null): CalendarView[] {
    const tokens = (attr ?? "month week day agenda").split(/\s+/).filter(Boolean);
    const list: CalendarView[] = [];
    for (const t of tokens) {
      if (VIEWS.includes(t as CalendarView) && !list.includes(t as CalendarView)) {
        list.push(t as CalendarView);
      }
    }
    if (!list.includes(this.view)) list.push(this.view);
    return list;
  }

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
  }

  connectedCallback(): void {
    this.syncFromAttrs();
    this.setupResizeObserver();
    this.render("init");
  }

  disconnectedCallback(): void {
    this.stopNowTimer();
    this.teardownResizeObserver();
  }

  /**
   * Measures the host width via `ResizeObserver` and classifies it into a `SizeBand`
   * (§5.9). Runs before the first `render("init")` in `connectedCallback()`, so `_size`
   * already holds the real measured band by the time anything renders — `handleResize()`
   * itself never triggers a render until `hasRendered` is true (see that field's doc
   * comment), so this initial measurement is silent even when the observer implementation
   * invokes its callback synchronously from `observe()` (the stub used by the unit tests
   * does; real `ResizeObserver` invokes it asynchronously after layout, in which case `_size`
   * simply starts as the documented "wide" fallback for that first render and corrects itself
   * — with a real re-render — once the async callback lands).
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === "undefined") {
      this._size = "wide";
      return;
    }
    this.resizeObserver = new ResizeObserver((entries) => this.handleResize(entries));
    this.resizeObserver.observe(this);
  }

  private teardownResizeObserver(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  /** Re-renders only when the classified band actually changes (task 1). */
  private handleResize(entries: ResizeObserverEntry[]): void {
    const width = entries[entries.length - 1]?.contentRect.width ?? 0;
    const band = classifySize(width);
    if (band === this._size) return;
    this._size = band;
    if (this.hasRendered) this.render();
  }

  attributeChangedCallback(): void {
    if (!this.root || this.suppress) return;
    this.syncFromAttrs();
    if (this.isConnected) this.render("attribute");
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
    this.nameSet = resolveNames(this.names);
  }

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
  }

  private setViewDate(d: Date): void {
    this.viewDate = floorToDayUtc(d);
    const iso = toIso(this.viewDate);
    this.applyAttrs(() => this.setAttribute("date", iso));
    this.render("navigate");
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
    const days = this.view === "week" ? 7 : this.view === "day" ? 1 : this.agendaDays;
    this.setViewDate(new Date(this.viewDate.getTime() + delta * days * DAY_MS));
  }

  private setView(v: CalendarView): void {
    this.applyAttrs(() => this.setAttribute("view", v));
    this.render("view");
    this.emit<ViewChangeDetail>("view-change", { view: v });
  }

  private buildDisabledFn(): (h: HijriDate, g: Date) => boolean {
    return (h, g) => (this.isDateDisabled ? this.isDateDisabled(h, g) : false);
  }

  /** Clock label ("10:30", "8 AM"); routes digits through `numerals-gregorian`. */
  protected formatTimeLabel(minutes: number): string {
    const hour = Math.floor(minutes / 60);
    const minute = minutes % 60;
    const mm = minute ? `:${String(minute).padStart(2, "0")}` : "";
    if (this.timeFormat === "24") {
      return this.numG(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
    }
    const meridiem = hour < 12 ? "AM" : "PM";
    let h12 = hour % 12;
    if (h12 === 0) h12 = 12;
    return this.numG(`${h12}${mm} ${meridiem}`);
  }

  /**
   * Clock-time labels for one event, computed once and reused across every render site that
   * needs them (aria-label, `title`, and the `event-time` part span) rather than recomputed
   * inline at each. All-day events collapse every field to `loc.allDayLabel` — there is no
   * meaningful clock time to show, and this matches the pre-existing "All day" behaviour.
   *
   * Ruling Y: duration is a clock-adjacent number, so its *digits* are routed through `numG`
   * (`numerals-gregorian`) exactly like the start/end clock labels — `locale` never decides a
   * digit system. Only the unit suffix ("m" / "د") is locale-fixed, supplied by
   * `loc.durationLabel`.
   */
  private timeLabels(
    startMin: number,
    endMin: number,
    allDay: boolean
  ): { start: string; end: string; duration: string; range: string } {
    if (allDay) {
      const s = this.loc.allDayLabel;
      return { start: s, end: s, duration: s, range: s };
    }
    const norm = (m: number): number => ((m % 1440) + 1440) % 1440;
    const start = this.formatTimeLabel(norm(startMin));
    const end = this.formatTimeLabel(norm(endMin));
    const minutes = Math.max(0, endMin - startMin);
    const duration = this.loc.durationLabel(this.numG(minutes));
    return { start, end, duration, range: `${start} – ${end}` };
  }

  /** `timeLabels()` for a `NormalizedEvent` (month chips, all-day chips, agenda items). */
  private normalizedLabels(n: NormalizedEvent): {
    start: string;
    end: string;
    duration: string;
    range: string;
  } {
    const startMin = Math.round((n.startMs % DAY_MS) / 60000);
    const minutes = Math.round((n.endMs - n.startMs) / 60000);
    return this.timeLabels(startMin, startMin + minutes, n.allDay);
  }

  /**
   * Resolves `event-time` (honoring `"auto"`) into the text to show for one placement, or `""`
   * when nothing should render. `"auto"` shows no time on month chips or all-day chips (there is
   * no meaningful clock time on an all-day event, and today's month/all-day-row rendering never
   * showed one); it shows the start time on timed blocks and agenda items, matching today's
   * `<small>`/`.when` behaviour there.
   */
  private resolveEventTimeText(
    labels: { start: string; end: string; duration: string; range: string },
    placement: "month-chip" | "allday-chip" | "timed-block" | "agenda-item"
  ): string {
    let mode: EventTimeMode = this.eventTime;
    if (mode === "auto") {
      mode = placement === "month-chip" || placement === "allday-chip" ? "none" : "start";
    }
    switch (mode) {
      case "start":
        return labels.start;
      case "start-duration":
        return `${labels.start} · ${labels.duration}`;
      case "range":
        return labels.range;
      default:
        return "";
    }
  }

  /**
   * `variant` is re-validated here (not just trusted from an already-normalized event) as
   * defence in depth for the `part`/`data-variant` attribute-injection boundary (Ruling P).
   */
  private variantTokens(variant: string | undefined): { part: string; dataAttr: string } {
    if (!variant || !VARIANT_RE.test(variant)) return { part: "", dataAttr: "" };
    return { part: ` variant-${variant}`, dataAttr: ` data-variant="${variant}"` };
  }

  /** Per-event `style` override, falling back to the component's `event-style` attribute. */
  private effectiveEventStyle(perEvent: CalendarEvent["style"]): EventStyle {
    return perEvent === "solid" || perEvent === "tinted" || perEvent === "outline"
      ? perEvent
      : this.eventStyle;
  }

  /**
   * Builds the inner content shared by every chip/block/agenda item: an optional `event-time`
   * span (per `resolveEventTimeText`), the `event-title` span, and an optional `event-subtitle`
   * span when the event has one. `event` must already be the normalized/sanitized event (Ruling
   * P) — callers pass `NormalizedEvent.event`, never a raw stored event.
   */
  private eventInnerHtml(
    event: CalendarEvent,
    labels: { start: string; end: string; duration: string; range: string },
    placement: "month-chip" | "allday-chip" | "timed-block" | "agenda-item"
  ): string {
    const timeText = this.resolveEventTimeText(labels, placement);
    // Agenda items additionally carry "agenda-when" on the same span (space-separated part
    // tokens, design principle 5) so hosts can select the agenda time text specifically
    // without touching event-time everywhere else.
    const timePart = placement === "agenda-item" ? "event-time agenda-when" : "event-time";
    const timeHtml = timeText ? `<span part="${timePart}">${escapeHtml(timeText)}</span>` : "";
    const titleHtml = `<span part="event-title">${escapeHtml(event.title)}</span>`;
    const subtitleHtml = event.subtitle
      ? `<span part="event-subtitle">${escapeHtml(event.subtitle)}</span>`
      : "";
    return `${timeHtml}${titleHtml}${subtitleHtml}`;
  }

  /** Gregorian month/year subtitle ("May 2026"); routes the year digits through `numerals-gregorian`. */
  private gregSubtitle(first: Date, last: Date): string {
    const opts: Intl.DateTimeFormatOptions = { month: "short", year: "numeric", timeZone: "UTC" };
    const a = first.toLocaleDateString("en-US", opts);
    const b = last.toLocaleDateString("en-US", opts);
    return this.numG(a === b ? a : `${a} – ${b}`);
  }

  /**
   * Gregorian day number, with "1 Jul"-style month marker on the first of a month when
   * `month-marker` is `"gregorian"` or `"both"`. The day number (and year, N/A here) route
   * through `numerals-gregorian`; the month abbreviation is never transliterated (`numG` only
   * rewrites ASCII digits).
   */
  private gregDayLabel(g: Date): string {
    const d = g.getUTCDate();
    const showMonthName =
      d === 1 && (this.monthMarker === "gregorian" || this.monthMarker === "both");
    if (!showMonthName) return this.numG(d);
    return this.numG(`1 ${g.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" })}`);
  }

  /**
   * The Hijri month-name marker text (`month-marker="hijri"|"both"`), on the first day of a
   * Hijri month, or `null` when no marker applies. Shared by `monthMarkerHtml()` (HTML, for the
   * default renderer) and `dayCellLabels()` (plain text, for the `renderDayCell` hook context).
   */
  private monthMarkerText(hijri: HijriDate): string | null {
    if (hijri.day !== 1) return null;
    if (this.monthMarker !== "hijri" && this.monthMarker !== "both") return null;
    return this.nameSet.monthNames[hijri.month - 1] ?? "";
  }

  /**
   * The Hijri month-name marker (`month-marker="hijri"|"both"`), rendered on the first day of
   * a Hijri month. Bare month names, so no numeral formatting; the rtl gate is content-based
   * (`namesDirAttr`), not a property of `numerals`.
   */
  private monthMarkerHtml(hijri: HijriDate): string {
    const name = this.monthMarkerText(hijri);
    if (name === null) return "";
    return `<span part="day-month-marker"${this.namesDirAttr()}>${escapeHtml(name)}</span>`;
  }

  /**
   * Primary/secondary day-number spans (wrapped in `part="day-numbers"`) honoring `primary`
   * and `secondary-position`, plus the `month-marker` name span.
   */
  private dayNumbersHtml(hijri: HijriDate, g: Date): string {
    const gregLabel = this.gregDayLabel(g);
    const hijriLabel = this.numH(hijri.day);
    // The "1 Jul"-style month marker mixes an Arabic-Indic numeral with a Latin month
    // abbreviation. Under an RTL base direction the bidi algorithm reorders that mix (it
    // would render "Jul ١" instead of "١ Jul"), so a span carrying that mixed content never
    // gets `dir`, regardless of `numerals-gregorian` — see the dayNumbersHtml/gregDayLabel
    // comment above. A bare Hijri or Gregorian numeral has no such mix and is safe to mark.
    // `gregHasMonthMarker` must mirror gregDayLabel's own condition, not just "is the 1st" —
    // when `month-marker` doesn't render the Gregorian name, the span is a bare digit again.
    const gregHasMonthMarker =
      g.getUTCDate() === 1 && (this.monthMarker === "gregorian" || this.monthMarker === "both");
    const gregDir = !gregHasMonthMarker && this.numeralsGregorian === "arab" ? ' dir="rtl"' : "";
    const hijriDir = this.numerals === "arab" ? ' dir="rtl"' : "";
    const [primHtml, secHtml] =
      this.primary === "gregorian"
        ? [
            `<span class="num-primary" part="day-primary"${gregDir}>${escapeHtml(gregLabel)}</span>`,
            `<span class="num-secondary" part="day-secondary"${hijriDir}>${escapeHtml(hijriLabel)}</span>`,
          ]
        : [
            `<span class="num-primary" part="day-primary"${hijriDir}>${escapeHtml(hijriLabel)}</span>`,
            `<span class="num-secondary" part="day-secondary"${gregDir}>${escapeHtml(gregLabel)}</span>`,
          ];
    const numbers = this.secondaryPosition === "hidden" ? primHtml : `${primHtml}${secHtml}`;
    // `day-numbers` is `display: contents` by default (see styles.ts), so wrapping it here
    // never changes layout unless a month-marker span is also present as its flex sibling.
    return `<span part="day-numbers">${numbers}</span>${this.monthMarkerHtml(hijri)}`;
  }

  /**
   * The primary weekday label text honoring `weekday-format` (full name for `long`/`bilingual`,
   * a 3-letter abbreviation for `short`). Shared by `weekdayCellHtml()` (HTML) and
   * `dayCellLabels()` (plain text, for the `renderDayCell` hook context's `labels.weekday`).
   *
   * §5.9 (task 3, render-time not CSS): at the `narrow` band, `weekday-format="long"` downgrades
   * to the `short` abbreviation. `bilingual`'s primary is unaffected by this — it keeps the full
   * name at every band; only its *secondary* span disappears at `narrow` (see `weekdayCellHtml`).
   */
  private weekdayPrimaryText(dow: number): string {
    const full = this.nameSet.weekdayNames[dow] ?? "";
    const fmt = this.weekdayFormat;
    const downgradeLong = this._size === "narrow" && fmt === "long";
    return (fmt === "bilingual" || fmt === "long") && !downgradeLong ? full : full.slice(0, 3);
  }

  /**
   * Weekday header cell honoring `weekday-format` and `weekend-days`. Shared by month and
   * time-grid views. §5.9 (task 3, render-time not CSS): `weekday-secondary` is omitted
   * entirely at the `narrow` band, even under `weekday-format="bilingual"` — the DOM itself
   * differs per band, not just its CSS visibility.
   */
  private weekdayCellHtml(dow: number): string {
    const full = this.nameSet.weekdayNames[dow] ?? "";
    const isWeekend = this.weekendDays.includes(dow);
    const partTokens = ["weekday", isWeekend ? "weekend" : ""].filter(Boolean).join(" ");
    const dirAttr = this.namesDirAttr();
    let inner = `<span part="weekday-primary"${dirAttr}>${escapeHtml(this.weekdayPrimaryText(dow))}</span>`;
    if (this.weekdayFormat === "bilingual" && this._size !== "narrow") {
      const secondary = (enWeekdayNames[dow] ?? "").slice(0, 3);
      inner += `<span part="weekday-secondary">${escapeHtml(secondary)}</span>`;
    }
    return `<div class="dow" part="${partTokens}" role="columnheader" title="${escapeHtml(full)}">${inner}</div>`;
  }

  /**
   * Plain-text primary/secondary/monthMarker/weekday labels for the `renderDayCell` hook
   * context — mirrors `dayNumbersHtml()`'s primary/secondary selection and `weekdayCellHtml()`'s
   * primary text, but without HTML/`dir` (the hook receives plain strings; the wrapping
   * button/column-head is component-owned).
   */
  private dayCellLabels(
    hijri: HijriDate,
    g: Date
  ): { primary: string; secondary: string; monthMarker: string | null; weekday: string } {
    const gregLabel = this.gregDayLabel(g);
    const hijriLabel = this.numH(hijri.day);
    const [primary, secondary] =
      this.primary === "gregorian" ? [gregLabel, hijriLabel] : [hijriLabel, gregLabel];
    return {
      primary,
      secondary,
      monthMarker: this.monthMarkerText(hijri),
      weekday: this.weekdayPrimaryText(g.getUTCDay()),
    };
  }

  /**
   * Full Gregorian date ("14 May 2026"), day-month-year regardless of locale ordering (unlike
   * `toLocaleDateString`, which would render "May 14, 2026" for en-US). Day/year digits route
   * through `numerals-gregorian`; the month name is never transliterated.
   */
  private gregFullDateLabel(g: Date): string {
    const month = g.toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
    return `${this.numG(g.getUTCDate())} ${month} ${this.numG(g.getUTCFullYear())}`;
  }

  /** Size band the calendar is rendered at, for `RenderEventContext`/`RenderDayCellContext`. */
  private currentSize(): SizeBand {
    return this._size;
  }

  /**
   * Shared implementation for `renderEvent`/`renderDayCell`: calls `hook(ctx)`, and
   * - a `Node` is appended to `target`,
   * - a `string` is inserted as a **text node** (never parsed as HTML — this is the whole
   *   difference between a render hook and an HTML-injection sink),
   * - `null`/`undefined` (or any other return value) restores `fallbackHtml` (the default
   *   renderer's output, already present in `target` from the initial `innerHTML` render).
   * A throwing hook is caught, warned once (`warnHookOnce`), and also falls back.
   */
  private applyHook<C>(
    hook: ((ctx: C) => Node | string | null) | undefined,
    ctx: C,
    target: HTMLElement,
    fallbackHtml: string,
    hookName: string
  ): void {
    if (!hook) return;
    let result: Node | string | null;
    try {
      result = hook(ctx);
    } catch (err) {
      warnHookOnce(hook, hookName, err);
      target.innerHTML = fallbackHtml;
      return;
    }
    if (typeof result === "string") {
      target.innerHTML = "";
      target.appendChild(document.createTextNode(result));
      return;
    }
    if (result instanceof Node) {
      target.innerHTML = "";
      target.appendChild(result);
      return;
    }
    target.innerHTML = fallbackHtml;
  }

  private eventsOnDay(dayStartMs: number): CalendarEvent[] {
    return this._events.filter((e) => {
      const n = normalizeEvent(e);
      return n.startMs < dayStartMs + DAY_MS && n.endMs > dayStartMs;
    });
  }

  // ---- toolbar ----

  private renderToolbar(title: string, subtitle: string): string {
    const subheaderSlot = `<slot name="subheader" part="subheader" class="subheader"></slot>`;
    if (this.toolbar === "none") {
      return `<slot name="toolbar-start"></slot><slot name="toolbar-end"></slot>${subheaderSlot}`;
    }
    const viewBtns = this.views
      .map(
        (v) =>
          `<button type="button" part="view-btn" data-view="${v}" aria-pressed="${v === this.view}">${this.loc.viewLabels[v]}</button>`
      )
      .join("");
    // Ruling M: gate title-primary's dir the same way as any other name-bearing span — on
    // `names`, not on `numerals` (a Latin month name with an Arabic-Indic year, e.g.
    // "Ramadan ١٤٤٧", must not be marked rtl; see namesDirAttr()).
    const titleDir = this.namesDirAttr();
    // §5.9 (task 3): title is forced "stacked" at the `narrow` band, decided here at render
    // time — not left to CSS — so the effective layout is a real, testable render-time fact.
    // `title-secondary` is emitted identically either way (§5.4 D3); only the `data-layout`
    // hook that styles.ts keys off changes. See styles.ts's `.title[data-layout="inline"]`
    // rules, which replace the old `:host([title-layout="inline"])` selector for this reason.
    const titleLayout = this._size === "narrow" ? "stacked" : this.titleLayout;
    const titleHtml = `<div class="title" part="title" data-layout="${titleLayout}"><span part="title-primary"${titleDir}>${escapeHtml(title)}</span><span part="title-secondary">${escapeHtml(subtitle)}</span></div>`;
    return `<div class="toolbar" part="toolbar">
      <slot name="toolbar-start"></slot>
      <div class="nav-group" part="nav-group">
        <button type="button" part="nav-prev" data-nav="-1" aria-label="Previous">‹</button>
        <button type="button" part="nav-today" data-today>${this.loc.todayLabel}</button>
        <button type="button" part="nav-next" data-nav="1" aria-label="Next">›</button>
      </div>
      ${titleHtml}
      <div class="view-switch" part="view-switch">${viewBtns}</div>
      <slot name="toolbar-end"></slot>
    </div>${subheaderSlot}`;
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

  private renderMonth(): ViewRenderResult {
    const h = this.cal.gregorianToHijri(this.viewDate);
    const model = buildCalendarMonthModel(this.cal, { year: h.year, month: h.month }, this._events, {
      maxLanes: this.maxEvents,
      today: zonedTodayUtc(this.timezone),
      weekStart: this.weekStart,
      weekendDays: this.weekendDays,
      isDisabled: this.buildDisabledFn(),
    });
    this.lastCells = model.weeks.flat();
    this.lastSegments = model.segments;

    const inMonth = this.lastCells.filter((c) => c.inCurrentMonth);
    const title = `${this.nameSet.monthNames[h.month - 1] ?? ""} ${this.numH(h.year)}`;
    const subtitle = this.gregSubtitle(
      inMonth[0]!.gregorian,
      inMonth[inMonth.length - 1]!.gregorian
    );

    const ws = this.weekStart;
    const dowRow = Array.from({ length: 7 }, (_, i) => this.weekdayCellHtml((i + ws) % 7)).join("");

    // §5.9 (task 4): at the `narrow` band, `narrow-events="dots"` (the default) replaces the
    // lane-based chip layout with per-day coloured dots inside the `day-cell` background layer
    // — no lane chips, no desktop `more-link` buttons, the whole cell stays the only tap
    // target (its existing click-forwarding to the day button in wireMonth already covers
    // dots, since they're inside the same `data-cell` div). `narrow-events="scroll"` keeps the
    // desktop layout untouched and instead scrolls it horizontally (handled below, at `body`).
    const narrowDots = this._size === "narrow" && this.narrowEvents === "dots";

    const weeksHtml = model.weeks
      .map((week, w) => {
        // Background layer, one div per column, emitted *before* the day-head buttons so it
        // sits behind them in DOM/stacking order (R1). It shares the button's click handler
        // (see wireMonth) rather than re-emitting date-click itself.
        //
        // Deliberately NOT a grid item: `.week`'s own box can be taller than the sum of its row
        // tracks (min-height: var(--hcal-cell-min-height) with align-content: start puts any
        // leftover height *after* the last track, outside every grid line — nothing placed via
        // grid-row/grid-column, at any span, can reach into it). So the layer is taken out of
        // grid layout entirely and positioned absolutely instead: `.week` is already `position:
        // relative`, and an absolutely-positioned child with NO definite grid-row/grid-column
        // uses the grid container's own padding box as its containing block (a definite grid
        // position would instead use that grid *area* as the containing block, which is exactly
        // the track-bounded box we're trying to escape). `top:0;bottom:0` in styles.ts then
        // stretches it to `.week`'s actual rendered height, whatever produced it (min-height or
        // content). Horizontal placement is done manually via the `--_col` custom property
        // (`inset-inline-start`/`width` in styles.ts) since there's no grid-column to rely on.
        const dayCells = week
          .map((cell, d) => {
            const i = w * 7 + d;
            const tokens = ["day-cell"];
            if (cell.isToday) tokens.push("today");
            if (!cell.inCurrentMonth) tokens.push("out");
            if (cell.isWeekend) tokens.push("weekend");
            if (cell.disabled) tokens.push("disabled");
            const tokenStr = tokens.join(" ");
            const indicator =
              this.todayMarker === "dot" && cell.isToday
                ? `<span part="today-indicator"></span>`
                : "";
            // Dot-mode chips (task 4): up to `max-events` coloured dots per day, then a
            // non-interactive `+N` count. Lives inside the same background layer as
            // `today-indicator` — a `<span>`, never a `<button>`, since the whole cell (not
            // the dot) is the tap target (wireMonth forwards the div's click to the day
            // button).
            let dotsHtml = "";
            if (narrowDots) {
              const dayEvents = this.eventsOnDay(cell.gregorian.getTime());
              const shown = dayEvents.slice(0, this.maxEvents);
              dotsHtml = shown
                .map((e) => {
                  const color = normalizeEvent(e).event.color;
                  const colorStyle = color ? ` style="--_ev-color:${escapeHtml(color)};"` : "";
                  return `<span part="event dot"${colorStyle}></span>`;
                })
                .join("");
              const overflowCount = dayEvents.length - shown.length;
              if (overflowCount > 0) {
                dotsHtml += `<span part="more-link">+${this.numG(overflowCount)}</span>`;
              }
            }
            return `<div class="${tokenStr}" part="${tokenStr}" data-cell="${i}"
              style="--_col:${d}">${indicator}${dotsHtml}</div>`;
          })
          .join("");

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
            let label = `${formatHijri(cell.hijri, "D MMMM YYYY", { monthNames: this.nameSet.monthNames })} (${toIso(cell.gregorian)})`;
            if (narrowDots) {
              const n = this.eventsOnDay(cell.gregorian.getTime()).length;
              if (n > 0) label += `, ${this.loc.moreDotsLabel(this.numG(n))}`;
            }
            return `<button type="button" part="day" class="${cls}" role="gridcell"
              style="grid-column:${d + 1}" data-i="${i}" data-date="${toIso(cell.gregorian)}"
              aria-label="${escapeHtml(label)}" tabindex="-1" ${cell.disabled ? "disabled data-disabled" : ""}>
              ${this.dayNumbersHtml(cell.hijri, cell.gregorian)}
            </button>`;
          })
          .join("");

        // Dot mode (narrowDots) skips both the lane chips and the desktop more-link buttons
        // entirely — the day-cell layer's dots/overflow-count span above are the only
        // per-event UI at the narrow band.
        const chips = narrowDots
          ? ""
          : model.segments
              .filter((s) => s.weekIndex === w)
              .map((s) => {
                const idx = this.lastSegments.indexOf(s);
                // EventSegment.event is the raw, pre-sanitisation event (view-core's month
                // builder keeps the original reference); re-normalize here so every rendered
                // field (variant/style/subtitle/title/color) is read off the sanitized copy,
                // never the raw stored one (Ruling P).
                const n = normalizeEvent(s.event);
                const ev = n.event;
                const cls = [
                  "chip",
                  s.continuesBefore ? "continues-before" : "",
                  s.continuesAfter ? "continues-after" : "",
                ]
                  .filter(Boolean)
                  .join(" ");
                const styleToken = this.effectiveEventStyle(ev.style);
                const variant = this.variantTokens(ev.variant);
                const colorStyle = ev.color ? `--_ev-color:${escapeHtml(ev.color)};` : "";
                const gridStyle = `grid-row:${s.lane + 2};grid-column:${s.startCol + 1} / span ${s.span}`;
                const labels = this.normalizedLabels(n);
                const ariaLabel = `${ev.title}, ${labels.start}`;
                const inner = this.eventInnerHtml(ev, labels, "month-chip");
                return `<button type="button" part="event ${styleToken}${variant.part}" class="${cls}" data-ev="${idx}"
              style="${colorStyle}${gridStyle}"${variant.dataAttr}
              aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">${inner}</button>`;
              })
              .join("");

        const mores = narrowDots
          ? ""
          : week
              .map((cell, d) => {
                const count = model.overflow[w]?.[d] ?? 0;
                if (!count) return "";
                return `<button type="button" part="more-link" class="more"
              style="grid-row:${this.maxEvents + 2};grid-column:${d + 1}"
              data-more="${w * 7 + d}">${escapeHtml(this.loc.moreLabel(count))}</button>`;
              })
              .join("");

        return `<div class="week" role="row">${dayCells}${dayHeads}${chips}${mores}</div>`;
      })
      .join("");

    const monthHtml = `<div class="month" role="grid" aria-label="${escapeHtml(title)}"${this.loading ? ' aria-busy="true"' : ""}>
      <div class="dow-row" role="row">${dowRow}</div>
      ${weeksHtml}
    </div>`;
    // §5.9 (task 4): `narrow-events="scroll"` keeps the desktop chip layout at the `narrow`
    // band and scrolls it horizontally instead of collapsing to dots — `.month` gets a
    // `min-width` (styles.ts) inside this wrapper so it doesn't shrink below a usable width.
    const narrowScroll = this._size === "narrow" && this.narrowEvents === "scroll";
    const body = narrowScroll ? `<div part="scroll">${monthHtml}</div>` : monthHtml;
    const rangeStart = this.lastCells[0]!.gregorian;
    const rangeEnd = new Date(this.lastCells[this.lastCells.length - 1]!.gregorian.getTime() + DAY_MS);
    return { title, subtitle, body, range: { start: rangeStart, end: rangeEnd } };
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
    // The day-cell background layer forwards clicks to its column's button instead of
    // re-emitting date-click itself: one source of truth for the detail, and disabled
    // buttons already no-op on `.click()` so disabled cells never fire.
    this.root.querySelectorAll<HTMLElement>("[data-cell]").forEach((div) => {
      const btn = dayButtons[Number(div.dataset.cell)];
      if (btn) div.addEventListener("click", () => btn.click());
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
  /** `TimeGridColumn` each `lastTimedFlat` entry was drawn under, same index — for renderEvent's `hijri`. */
  private lastTimedCol: TimeGridColumn[] = [];
  private lastAllDayFlat: NormalizedEvent[] = [];
  /** `TimeGridColumn` each `lastAllDayFlat` entry was drawn under, same index. */
  private lastAllDayCol: TimeGridColumn[] = [];
  private lastColumns: TimeGridColumn[] = [];

  private hijriRangeTitle(first: HijriDate, last: HijriDate): string {
    const a = this.nameSet.monthNames[first.month - 1] ?? "";
    const b = this.nameSet.monthNames[last.month - 1] ?? "";
    if (first.month === last.month && first.year === last.year) {
      return `${a} ${this.numH(first.year)}`;
    }
    if (first.year === last.year) return `${a} – ${b} ${this.numH(first.year)}`;
    return `${a} ${this.numH(first.year)} – ${b} ${this.numH(last.year)}`;
  }

  /**
   * `day-header="banner"` full-width header for the day view (`renderTimeGrid(1)` only): a
   * bigger Hijri/Gregorian/weekday date plus an events/hours summary, replacing the compact
   * `.tg-col-head`. Summary counts timed+all-day events and sums timed-event duration in
   * hours to one decimal — both routed through `loc.eventsCount`/`loc.hoursScheduled` with
   * digits via `numG` (Ruling Y: clock-adjacent numbers are `numerals-gregorian`, not `locale`).
   */
  private dayBannerHtml(col: TimeGridColumn): string {
    const totalEvents = col.timed.length + col.allDay.length;
    const totalMinutes = col.timed.reduce((sum, p) => sum + (p.endMin - p.startMin), 0);
    const hours = (totalMinutes / 60).toFixed(1);
    const summary = `${this.loc.eventsCount(this.numG(totalEvents))} · ${this.loc.hoursScheduled(this.numG(hours))}`;
    const primary = `${this.numH(col.hijri.day)} ${this.nameSet.monthNames[col.hijri.month - 1] ?? ""} ${this.numH(col.hijri.year)}`;
    const secondary = this.gregFullDateLabel(col.gregorian);
    const weekday = col.gregorian.toLocaleDateString("en-US", { weekday: "long", timeZone: "UTC" });
    const tokens = ["day-banner", col.isToday ? "today" : ""].filter(Boolean).join(" ");
    return `<div part="${tokens}">
      <div>
        <span part="day-banner-primary"${this.namesDirAttr()}>${escapeHtml(primary)}</span>
        <span part="day-banner-secondary">${escapeHtml(secondary)}</span>
        <span part="day-banner-weekday">${escapeHtml(weekday)}</span>
      </div>
      <div part="day-banner-summary">
        <slot name="day-summary">${escapeHtml(summary)}</slot>
      </div>
    </div>`;
  }

  private renderTimeGrid(dayCount: number): ViewRenderResult {
    const model = buildTimeGridModel(this.cal, this.viewDate, dayCount, this._events, {
      dayStartHour: this.dayStart,
      dayEndHour: this.dayEnd,
      weekStart: this.weekStart,
      weekendDays: this.weekendDays,
      today: zonedTodayUtc(this.timezone),
    });
    this.lastColumns = model.columns;
    this.lastTimedFlat = [];
    this.lastTimedCol = [];
    this.lastAllDayFlat = [];
    this.lastAllDayCol = [];

    const first = model.columns[0]!;
    const last = model.columns[model.columns.length - 1]!;
    const title =
      dayCount === 1
        ? `${this.numH(first.hijri.day)} ${this.nameSet.monthNames[first.hijri.month - 1] ?? ""} ${this.numH(first.hijri.year)}`
        : this.hijriRangeTitle(first.hijri, last.hijri);
    const subtitle = this.gregSubtitle(first.gregorian, last.gregorian);

    const winStart = this.dayStart * 60;
    const winEnd = this.dayEnd * 60;
    const total = winEnd - winStart;
    const slotMinutes = this.slotMinutes;
    // §5.9 (task 5): day columns get a `min-width` floor at `medium`/`narrow` only — `wide`
    // keeps today's unconstrained `1fr` tracks (Global Constraint 1: the default/`wide` render
    // must stay byte-for-byte what it was before this phase).
    const colTrack = this._size === "wide" ? "1fr" : "minmax(var(--hcal-column-min-width), 1fr)";
    const cols = `var(--hcal-gutter-width) repeat(${dayCount}, ${colTrack})`;
    const slotHeightVar = `--_slot-h:calc(var(--hcal-hour-height) * ${slotMinutes} / 60)`;

    const showBanner = dayCount === 1 && this.dayHeader === "banner";
    const heads = showBanner
      ? ""
      : model.columns
          .map((col, i) => {
            const cls = ["tg-col-head", col.isToday ? "today" : "", col.isWeekend ? "weekend" : ""]
              .filter(Boolean)
              .join(" ");
            // D2: `day` keeps matching existing ::part(day) selectors; `column-head` is additive.
            const partTokens = [
              "day",
              "column-head",
              col.isToday ? "today" : "",
              col.isWeekend ? "weekend" : "",
            ]
              .filter(Boolean)
              .join(" ");
            // `data-col` keys the renderDayCell post-render pass (see applyDayCellHooks()).
            return `<div class="${cls}" part="${partTokens}" data-col="${i}">
          ${this.weekdayCellHtml(col.gregorian.getUTCDay())}
          ${this.dayNumbersHtml(col.hijri, col.gregorian)}
        </div>`;
          })
          .join("");

    const hasAllDay = model.columns.some((col) => col.allDay.length > 0);
    const showAllDayRow =
      this.alldayRow === "never" ? false : this.alldayRow === "auto" ? hasAllDay : true;

    const allDayCols = !showAllDayRow
      ? ""
      : model.columns
          .map((col) => {
            const chips = col.allDay
              .map((n) => {
                const idx = this.lastAllDayFlat.push(n) - 1;
                this.lastAllDayCol.push(col);
                const ev = n.event;
                const styleToken = this.effectiveEventStyle(ev.style);
                const variant = this.variantTokens(ev.variant);
                const colorStyle = ev.color ? `--_ev-color:${escapeHtml(ev.color)};` : "";
                const labels = this.normalizedLabels(n);
                const ariaLabel = `${ev.title}, ${labels.start}`;
                const inner = this.eventInnerHtml(ev, labels, "allday-chip");
                return `<button type="button" part="event ${styleToken}${variant.part}" class="chip" data-aev="${idx}"
              style="${colorStyle}"${variant.dataAttr} aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">${inner}</button>`;
              })
              .join("");
            return `<div class="tg-allday-col" part="allday-row">${chips}</div>`;
          })
          .join("");

    const gutterSlots: string[] = [];
    for (let min = winStart; min < winEnd; min += slotMinutes) {
      const label =
        min % 60 === 0
          ? `<span part="time-label">${escapeHtml(this.formatTimeLabel(min))}</span>`
          : "";
      gutterSlots.push(`<div class="tg-slot">${label}</div>`);
    }

    const nowMin = zonedNowMinutes(this.timezone);
    const dayCols = model.columns
      .map((col) => {
        const iso = toIso(col.gregorian);
        const slots: string[] = [];
        for (let min = winStart; min < winEnd; min += slotMinutes) {
          const hh = String(Math.floor(min / 60)).padStart(2, "0");
          const mm = String(min % 60).padStart(2, "0");
          const isHourEnd = (min + slotMinutes) % 60 === 0;
          const isAltHour = Math.floor(min / 60) % 2 === 1;
          const slotCls = ["tg-slot", isHourEnd ? "slot-hour-end" : "", isAltHour ? "tg-slot-alt" : ""]
            .filter(Boolean)
            .join(" ");
          slots.push(`<div class="${slotCls}" part="slot" data-slot="${iso}T${hh}:${mm}"></div>`);
        }

        const blocks = col.timed
          .map((p) => {
            const idx = this.lastTimedFlat.push(p) - 1;
            this.lastTimedCol.push(col);
            const top = ((p.startMin - winStart) / total) * 100;
            const height = ((p.endMin - p.startMin) / total) * 100;
            const left = (p.col / p.colCount) * 100;
            const width = 100 / p.colCount;
            const ev = p.event;
            const styleToken = this.effectiveEventStyle(ev.style);
            const variant = this.variantTokens(ev.variant);
            const colorStyle = ev.color ? `--_ev-color:${escapeHtml(ev.color)};` : "";
            const labels = this.timeLabels(p.startMin, p.endMin, false);
            const ariaLabel = `${ev.title}, ${labels.start}`;
            const inner = this.eventInnerHtml(ev, labels, "timed-block");
            return `<button type="button" part="event ${styleToken}${variant.part}" class="tg-event" data-tev="${idx}"
              style="${colorStyle}top:${top}%;height:${height}%;left:${left}%;width:${width}%"${variant.dataAttr}
              aria-label="${escapeHtml(ariaLabel)}" title="${escapeHtml(ariaLabel)}">${inner}</button>`;
          })
          .join("");

        let nowLine = "";
        if (col.isToday && this.nowIndicator !== "none") {
          if (nowMin >= winStart && nowMin < winEnd) {
            const top = ((nowMin - winStart) / total) * 100;
            const nowLabel =
              this.nowIndicator === "line-label"
                ? `<span part="now-label">${escapeHtml(`${this.loc.nowLabel} · ${this.formatTimeLabel(nowMin)}`)}</span>`
                : "";
            nowLine = `<div class="now-line" part="now-indicator" style="top:${top}%">${nowLabel}</div>`;
          }
        }

        const dayColPart = ["day-column", col.isToday ? "today" : "", col.isWeekend ? "weekend" : ""]
          .filter(Boolean)
          .join(" ");
        return `<div class="tg-day-col" part="${dayColPart}">${slots.join("")}${blocks}${nowLine}</div>`;
      })
      .join("");

    const alldayHtml = showAllDayRow
      ? `<div class="tg-allday" style="grid-template-columns:${cols}">
        <div class="tg-allday-label" part="allday-label">${escapeHtml(this.loc.allDayLabel)}</div>${allDayCols}
      </div>`
      : "";

    const tgHead = showBanner
      ? this.dayBannerHtml(model.columns[0]!)
      : `<div class="tg-head" style="grid-template-columns:${cols}"><div></div>${heads}</div>`;

    // §5.9 (task 5): `.tg-head`, `.tg-allday` (when present) and `.tg-body` share one
    // `part="scroll"` horizontal-scroll container at every band — at `wide` the unconstrained
    // `1fr` columns above never overflow it, so no scrollbar appears (Global Constraint 1); at
    // `medium`/`narrow` the `minmax(var(--hcal-column-min-width), 1fr)` columns can exceed the
    // host width, and this is the container that scrolls. The gutter/allday-label/head-first-
    // cell sticky rules (styles.ts) rely on this being their scrolling ancestor. The vertical
    // `--hcal-body-max-height` scroll stays entirely on `.tg-body`, untouched by this wrapper.
    const body = `<div class="timegrid"${this.loading ? ' aria-busy="true"' : ""}>
      <div part="scroll">
        ${tgHead}
        ${alldayHtml}
        <div class="tg-body" style="grid-template-columns:${cols};${slotHeightVar}">
          <div class="tg-gutter" part="time-gutter">${gutterSlots.join("")}</div>
          ${dayCols}
        </div>
      </div>
    </div>`;
    const rangeStart = first.gregorian;
    const rangeEnd = new Date(last.gregorian.getTime() + DAY_MS);
    return { title, subtitle, body, range: { start: rangeStart, end: rangeEnd } };
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
    this.wireStickyGutter();
  }

  /**
   * §5.9 task 5 follow-up (verified in Chromium, not just asserted in jsdom — see
   * task-5-report.md): `position: sticky` alone does not keep `.tg-gutter` pinned while
   * `part="scroll"` scrolls horizontally, because `.tg-gutter` lives inside `.tg-body`, and
   * `.tg-body`'s own `overflow-y: auto` (needed for the unrelated, pre-existing vertical
   * `--hcal-body-max-height` scroll) makes the CSS engine treat `.tg-body` itself as
   * `.tg-gutter`'s nearest scrolling ancestor — even though `.tg-body` never actually scrolls
   * horizontally on its own. Sticky positioning resolves against *one* nearest scrolling
   * ancestor for every inset it's given, so `inset-inline-start: 0` ends up computed against
   * `.tg-body`'s (always-static-on-x) scrollport instead of `part="scroll"`'s — the gutter's
   * sticky offset is therefore always zero, and it scrolls away with the content exactly like
   * an ordinary grid cell would. `.tg-allday-label` and `.tg-head > :first-child` don't have
   * this problem (neither lives inside an element with its own non-visible overflow), so only
   * the gutter needs this assist. The CSS `position: sticky` declaration stays in styles.ts
   * regardless — it's harmless (its own computed offset is always 0 here) and documents intent
   * for any future restructuring that removes the nested scroll box.
   *
   * The fix measures the actual pixel gap between the scroll container's edge and the gutter's
   * current edge and cancels it with a `transform: translateX()`, on every `scroll` event of
   * `part="scroll"` — robust to jsdom (all rects are zero there, so this is a harmless no-op in
   * unit tests) and to `dir="rtl"` (compares the *inline-start* edges via `direction`, not a
   * hard-coded `left`/`scrollLeft` sign, since RTL `scrollLeft` sign conventions are not
   * consistent across engines).
   */
  private wireStickyGutter(): void {
    const scrollEl = this.root.querySelector<HTMLElement>('[part="scroll"]');
    const gutter = this.root.querySelector<HTMLElement>(".tg-gutter");
    if (!scrollEl || !gutter) return;
    const rtl = getComputedStyle(this.root.querySelector(".cal")!).direction === "rtl";
    const sync = (): void => {
      gutter.style.transform = "";
      const scrollRect = scrollEl.getBoundingClientRect();
      const gutterRect = gutter.getBoundingClientRect();
      const delta = rtl ? scrollRect.right - gutterRect.right : scrollRect.left - gutterRect.left;
      if (delta) gutter.style.transform = `translateX(${delta}px)`;
    };
    sync();
    scrollEl.addEventListener("scroll", sync, { passive: true });
  }

  // ---- agenda view ----

  private lastAgendaFlat: NormalizedEvent[] = [];
  /** Hijri date of the day-group each `lastAgendaFlat` entry was rendered under, same index. */
  private lastAgendaHijri: HijriDate[] = [];

  private renderAgenda(): ViewRenderResult {
    const agendaDays = this.agendaDays;
    const model = buildAgendaModel(this.cal, this.viewDate, agendaDays, this._events);
    this.lastAgendaFlat = [];
    this.lastAgendaHijri = [];

    const windowEnd = new Date(this.viewDate.getTime() + (agendaDays - 1) * DAY_MS);
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
            this.lastAgendaHijri.push(day.hijri);
            const ev = n.event;
            const styleToken = this.effectiveEventStyle(ev.style);
            const variant = this.variantTokens(ev.variant);
            const colorStyle = ev.color ? `--_ev-color:${escapeHtml(ev.color)};` : "";
            const labels = this.normalizedLabels(n);
            const ariaLabel = `${ev.title}, ${labels.start}`;
            const inner = this.eventInnerHtml(ev, labels, "agenda-item");
            // "dot stays for solid": the per-item color dot is only meaningful when the item
            // has no other color-bearing chrome; "tinted"/"outline" already color the whole
            // item via the shared [part~="event"][part~="tinted"|"outline"] rules (styles.ts).
            const dotHtml = styleToken === "solid" ? `<span class="dot"></span>` : "";
            return `<button type="button" part="agenda-item event ${styleToken}${variant.part}" class="agenda-item" data-gev="${idx}"
              style="${colorStyle}"${variant.dataAttr} title="${escapeHtml(ariaLabel)}">
              ${dotHtml}${inner}
            </button>`;
          })
          .join("");
        const hijriLabel = `${this.numH(day.hijri.day)} ${this.nameSet.monthNames[day.hijri.month - 1] ?? ""} ${this.numH(day.hijri.year)}`;
        const gregLabel = this.numG(
          day.gregorian.toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })
        );
        return `<div class="agenda-day" part="agenda-day">
          <div class="agenda-date" part="agenda-date">
            <div class="hijri">${escapeHtml(hijriLabel)}</div>
            <div class="greg">${escapeHtml(gregLabel)}</div>
          </div>
          <div class="agenda-items">${items}</div>
        </div>`;
      })
      .join("");

    const body = `<div class="agenda"${this.loading ? ' aria-busy="true"' : ""}>${
      daysHtml || `<div class="agenda-empty">${escapeHtml(this.loc.emptyLabel)}</div>`
    }</div>`;
    const rangeStart = this.viewDate;
    const rangeEnd = new Date(this.viewDate.getTime() + agendaDays * DAY_MS);
    return { title, subtitle, body, range: { start: rangeStart, end: rangeEnd } };
  }

  private wireAgenda(): void {
    this.root.querySelectorAll<HTMLButtonElement>("[data-gev]").forEach((btn) => {
      const n = this.lastAgendaFlat[Number(btn.dataset.gev)];
      if (!n) return;
      btn.addEventListener("click", () => this.emitEventClick(n.event));
    });
  }

  // ---- view dispatch ----

  protected renderView(): ViewRenderResult {
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

  private maybeEmitRangeChange(
    view: CalendarView,
    start: Date,
    end: Date,
    reason: RangeChangeDetail["reason"]
  ): void {
    const startIso = toIso(start);
    const endIso = toIso(end);
    const prev = this.lastRangeDetail;
    if (prev && prev.view === view && prev.start === startIso && prev.end === endIso) return;
    const detail: RangeChangeDetail = {
      view,
      start: startIso,
      end: endIso,
      hijriStart: this.cal.gregorianToHijri(start),
      hijriEnd: this.cal.gregorianToHijri(new Date(end.getTime() - DAY_MS)),
      reason,
    };
    this.lastRangeDetail = detail;
    this.emit<RangeChangeDetail>("range-change", detail);
  }

  // ---- render hooks (post-render pass) ----

  /**
   * `renderEvent` post-render pass: `render()` builds every chip/block/agenda item's *default*
   * content via `innerHTML` first, so this pass runs afterwards and keys off the same
   * `data-ev`/`data-aev`/`data-tev`/`data-gev` indices `wire*()` uses, reusing the flat arrays
   * those already populate (`lastSegments`/`lastAllDayFlat`+`lastAllDayCol`/
   * `lastTimedFlat`+`lastTimedCol`/`lastAgendaFlat`+`lastAgendaHijri`). No-ops entirely when no
   * hook is set, leaving the default `innerHTML` output untouched.
   */
  private applyEventHooks(): void {
    const hook = this._renderEvent;
    if (!hook) return;
    const apply = (
      btn: HTMLButtonElement,
      event: CalendarEvent,
      placement: RenderEventContext["placement"],
      hijri: HijriDate,
      labels: RenderEventContext["labels"],
      continuesBefore: boolean,
      continuesAfter: boolean
    ): void => {
      const ctx: RenderEventContext = {
        event,
        view: this.view,
        placement,
        hijri,
        labels,
        continuesBefore,
        continuesAfter,
        size: this.currentSize(),
      };
      this.applyHook(hook, ctx, btn, btn.innerHTML, "renderEvent");
    };

    this.root.querySelectorAll<HTMLButtonElement>("[data-ev]").forEach((btn) => {
      const seg = this.lastSegments[Number(btn.dataset.ev)];
      if (!seg) return;
      const n = normalizeEvent(seg.event);
      const hijri = this.lastCells[seg.weekIndex * 7 + seg.startCol]?.hijri;
      if (!hijri) return;
      apply(
        btn,
        n.event,
        "month-chip",
        hijri,
        this.normalizedLabels(n),
        seg.continuesBefore,
        seg.continuesAfter
      );
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-aev]").forEach((btn) => {
      const n = this.lastAllDayFlat[Number(btn.dataset.aev)];
      const col = this.lastAllDayCol[Number(btn.dataset.aev)];
      if (!n || !col) return;
      apply(btn, n.event, "allday-chip", col.hijri, this.normalizedLabels(n), false, false);
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-tev]").forEach((btn) => {
      const p = this.lastTimedFlat[Number(btn.dataset.tev)];
      const col = this.lastTimedCol[Number(btn.dataset.tev)];
      if (!p || !col) return;
      apply(
        btn,
        p.event,
        "timed-block",
        col.hijri,
        this.timeLabels(p.startMin, p.endMin, false),
        false,
        false
      );
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-gev]").forEach((btn) => {
      const n = this.lastAgendaFlat[Number(btn.dataset.gev)];
      const hijri = this.lastAgendaHijri[Number(btn.dataset.gev)];
      if (!n || !hijri) return;
      apply(btn, n.event, "agenda-item", hijri, this.normalizedLabels(n), false, false);
    });
  }

  /**
   * `renderDayCell` post-render pass: keys off `data-i` (month-cell number buttons) and
   * `data-col` (time-grid column heads, week/day views). The target's *entire* current
   * content is what gets replaced in both cases — for a month button that's exactly
   * `dayNumbersHtml()`'s output (nothing else is in there); for a column head it's
   * `weekdayCellHtml()` + `dayNumbersHtml()` together, which is why `RenderDayCellContext`
   * carries `labels.weekday` too. The `day-cell` background layer, `today-indicator`,
   * `more-link` and chips are separate sibling elements, never touched by this pass.
   */
  private applyDayCellHooks(): void {
    const hook = this._renderDayCell;
    if (!hook) return;
    this.root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((btn) => {
      const cell = this.lastCells[Number(btn.dataset.i)];
      if (!cell) return;
      const ctx: RenderDayCellContext = {
        cell,
        view: "month",
        placement: "month-cell",
        events: this.eventsOnDay(cell.gregorian.getTime()),
        labels: this.dayCellLabels(cell.hijri, cell.gregorian),
        size: this.currentSize(),
      };
      this.applyHook(hook, ctx, btn, btn.innerHTML, "renderDayCell");
    });
    this.root.querySelectorAll<HTMLElement>("[data-col]").forEach((div) => {
      const col = this.lastColumns[Number(div.dataset.col)];
      if (!col) return;
      // TimeGridColumn has no selection/range/disabled concept — a column head is never any
      // of those, so the DayCell shape is filled in with the fixed values that make it "just
      // a plain, enabled, in-range day" for context purposes.
      const cell: DayCell = {
        hijri: col.hijri,
        gregorian: col.gregorian,
        inCurrentMonth: true,
        selected: false,
        disabled: false,
        isToday: col.isToday,
        rangeStart: false,
        rangeEnd: false,
        inRange: false,
        isWeekend: col.isWeekend,
      };
      const ctx: RenderDayCellContext = {
        cell,
        view: this.view,
        placement: "column-head",
        events: this.eventsOnDay(col.gregorian.getTime()),
        labels: this.dayCellLabels(col.hijri, col.gregorian),
        size: this.currentSize(),
      };
      this.applyHook(hook, ctx, div, div.innerHTML, "renderDayCell");
    });
  }

  protected render(reason: RangeChangeDetail["reason"] = "attribute"): void {
    if (!this.root) return;
    this.stopNowTimer();
    const { title, subtitle, body, range } = this.renderView();
    const overlay = this.loading
      ? `<div part="loading"><slot name="loading">${escapeHtml(this.loc.loadingLabel)}</slot></div>`
      : "";
    this.root.innerHTML = `<style>${styles}</style>
      <div class="cal" part="calendar ${this._size}" data-size="${this._size}" role="application" aria-label="Hijri calendar">
        ${this.renderToolbar(title, subtitle)}
        <div class="body-wrap">${body}${overlay}</div>
      </div>`;
    this.wireToolbar();
    this.maybeEmitRangeChange(this.view, range.start, range.end, reason);
    this.wireView();
    this.applyEventHooks();
    this.applyDayCellHooks();
    this.hasRendered = true;
  }
}
