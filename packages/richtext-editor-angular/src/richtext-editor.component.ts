import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  EventEmitter,
  Input,
  Output,
} from "@angular/core";
import "@spezutil/richtext-editor";
import type { ChangeDetail, FontOption } from "@spezutil/richtext-editor";

@Component({
  selector: "spez-richtext-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <spez-richtext
      [value]="value"
      [initialHtml]="initialHtml"
      [attr.readonly]="readonly ? '' : null"
      [attr.placeholder]="placeholder"
      [attr.dir]="dir"
      [attr.locale]="locale"
      [attr.toolbar]="toolbar"
      [fonts]="fonts"
      (change)="onChange($event)"
      (rte-ready)="onReady($event)"
    ></spez-richtext>
  `,
})
export class SpezRichtextComponent {
  /** Serialized Lexical editor state JSON. */
  @Input() value: string | null = null;
  /** HTML applied on first init when no value is set. */
  @Input() initialHtml: string | null = null;
  @Input() readonly = false;
  @Input() placeholder: string | null = null;
  @Input() dir: string | null = null;
  @Input() locale: string | null = null;
  @Input() toolbar: string | null = null;
  /** Toolbar font list; replaces the defaults (spread DEFAULT_FONTS to extend). */
  @Input() fonts: FontOption[] | null = null;

  @Output() change = new EventEmitter<ChangeDetail>();
  @Output() ready = new EventEmitter<void>();

  onChange(event: Event): void {
    this.change.emit((event as CustomEvent<ChangeDetail>).detail);
  }

  onReady(_event: Event): void {
    this.ready.emit();
  }
}
