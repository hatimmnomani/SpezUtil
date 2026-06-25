import { HijriDatepicker } from "./hijri-datepicker";

export { HijriDatepicker } from "./hijri-datepicker";
export type { DayCell, MonthModel } from "./render";

if (typeof customElements !== "undefined" && !customElements.get("hijri-datepicker")) {
  customElements.define("hijri-datepicker", HijriDatepicker);
}

declare global {
  interface HTMLElementTagNameMap {
    "hijri-datepicker": HijriDatepicker;
  }
}
