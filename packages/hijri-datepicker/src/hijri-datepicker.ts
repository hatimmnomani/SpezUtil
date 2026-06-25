import {
  createCalendar,
  formatHijri,
  translitMonthNames,
  weekdayNames,
  type HijriCalendar,
  type HijriDate,
} from "@digitaltakeoff/hijri-core";
import { buildMonthModel, type DayCell } from "./render";
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

export class HijriDatepicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["value", "min", "max", "dir", "disabled-weekdays"];
  }

  private cal: HijriCalendar = createCalendar();
  private root: ShadowRoot;
  private view: { year: number; month: number };
  private selected: HijriDate | null = null;

  public isDateDisabled?: (hijri: HijriDate, gregorian: Date) => boolean;

  constructor() {
    super();
    this.root = this.attachShadow({ mode: "open" });
    const todayHijri = this.cal.gregorianToHijri(new Date());
    this.view = { year: todayHijri.year, month: todayHijri.month };
  }

  connectedCallback(): void {
    this.syncFromValue();
    this.render();
  }

  attributeChangedCallback(): void {
    if (!this.root) return;
    this.syncFromValue();
    this.render();
  }

  private syncFromValue(): void {
    const v = parseIsoUtc(this.getAttribute("value"));
    if (v) {
      this.selected = this.cal.gregorianToHijri(v);
      this.view = { year: this.selected.year, month: this.selected.month };
    } else {
      this.selected = null;
    }
  }

  private buildDisabledFn(): (h: HijriDate, g: Date) => boolean {
    const min = parseIsoUtc(this.getAttribute("min"));
    const max = parseIsoUtc(this.getAttribute("max"));
    const dowAttr = this.getAttribute("disabled-weekdays");
    const disabledDows = dowAttr
      ? dowAttr.split(",").map((n) => Number(n.trim()))
      : [];
    return (h, g) => {
      if (min && g.getTime() < min.getTime()) return true;
      if (max && g.getTime() > max.getTime()) return true;
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

  private select(cell: DayCell): void {
    if (cell.disabled) return;
    this.selected = cell.hijri;
    this.setAttribute("value", toIso(cell.gregorian));
    this.dispatchEvent(
      new CustomEvent("change", {
        bubbles: true,
        composed: true,
        detail: { hijri: cell.hijri, gregorian: toIso(cell.gregorian) },
      })
    );
    this.render();
  }

  private render(): void {
    const model = buildMonthModel(this.cal, this.view, {
      selected: this.selected,
      isDisabled: this.buildDisabledFn(),
      today: new Date(),
    });

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
          ${weekdayNames.map((d) => `<div class="dow" role="columnheader">${d.slice(0, 2)}</div>`).join("")}
          ${model.weeks
            .flat()
            .map((cell, i) => {
              const cls = [
                "cell",
                cell.inCurrentMonth ? "" : "out",
                cell.isToday ? "today" : "",
              ]
                .filter(Boolean)
                .join(" ");
              const label = `${formatHijri(cell.hijri, "D MMMM YYYY")} (${toIso(cell.gregorian)})`;
              return `<button type="button" part="day" class="${cls}" role="gridcell"
                data-i="${i}" aria-selected="${cell.selected}" aria-label="${label}"
                tabindex="-1" ${cell.disabled ? "disabled" : ""}>
                <span class="hijri">${cell.hijri.day}</span>
                <span class="greg">${cell.gregorian.getUTCDate()}</span>
              </button>`;
            })
            .join("")}
        </div>
      </div>`;

    const flat = model.weeks.flat();
    this.root.querySelectorAll<HTMLButtonElement>("[data-nav]").forEach((btn) => {
      btn.addEventListener("click", () => this.navigate(Number(btn.dataset.nav)));
    });
    this.root.querySelectorAll<HTMLButtonElement>("[data-i]").forEach((btn) => {
      btn.addEventListener("click", () => this.select(flat[Number(btn.dataset.i)]!));
    });

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
      const current = this.root.activeElement as HTMLButtonElement | null;
      const idx = current ? dayButtons.indexOf(current) : initialIdx;
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
        if (idx >= 0) {
          const cell = flat[Number(dayButtons[idx]?.dataset.i)];
          if (cell) this.select(cell);
        }
      }
    });
  }
}
