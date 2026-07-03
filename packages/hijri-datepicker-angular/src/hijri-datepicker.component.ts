import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import "@digitaltakeoff/hijri-datepicker";
import type { ChangeDetail } from "@digitaltakeoff/hijri-datepicker";

@Component({
  selector: "hijri-datepicker-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <hijri-datepicker
      [value]="value"
      [start]="start"
      [end]="end"
      [mode]="mode"
      [min]="min"
      [max]="max"
      [dir]="dir"
      [enableTime]="enableTime"
      [timeFormat]="timeFormat"
      [disabledWeekdays]="disabledWeekdays"
      (change)="onChange($event)"
    ></hijri-datepicker>
  `,
})
export class HijriDatepickerComponent {
  @Input() value: string | null = null;
  @Input() start: string | null = null;
  @Input() end: string | null = null;
  @Input() mode: string | null = null;
  @Input() min: string | null = null;
  @Input() max: string | null = null;
  @Input() dir: string | null = null;
  @Input() enableTime = false;
  @Input() timeFormat: string | null = null;
  @Input() disabledWeekdays: string | null = null;

  @Output() change = new EventEmitter<ChangeDetail>();

  onChange(event: Event): void {
    this.change.emit((event as CustomEvent<ChangeDetail>).detail);
  }
}
