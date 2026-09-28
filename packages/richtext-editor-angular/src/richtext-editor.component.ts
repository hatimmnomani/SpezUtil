import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from "@angular/core";
import "@spezutil/richtext-editor";
import type {
  ChangeDetail,
  CommentClickDetail,
  CommentRequestDetail,
  DiagramEditDetail,
  FontOption,
  FontSizeOption,
  SpezRichtext,
} from "@spezutil/richtext-editor";

@Component({
  selector: "spez-richtext-ng",
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  template: `
    <spez-richtext
      #el
      [value]="value"
      [initialHtml]="initialHtml"
      [attr.readonly]="readonly ? '' : null"
      [attr.placeholder]="placeholder"
      [attr.dir]="dir"
      [attr.locale]="locale"
      [attr.toolbar]="toolbar"
      [fonts]="fonts"
      [fontSizes]="fontSizes"
      [highlightMarks]="highlightMarks"
      [activeMark]="activeMark"
      (change)="onChange($event)"
      (rte-ready)="onReady($event)"
      (comment-requested)="commentRequested.emit($any($event).detail)"
      (comment-clicked)="commentClicked.emit($any($event).detail)"
      (diagram-edit-requested)="diagramEditRequested.emit($any($event).detail)"
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
  /** Comma-separated groups; add `lud`, `comment`, `diagram` to opt in. */
  @Input() toolbar: string | null = null;
  /** Toolbar font list; replaces the defaults (spread DEFAULT_FONTS to extend). */
  @Input() fonts: FontOption[] | null = null;
  @Input() fontSizes: FontSizeOption[] | null = null;
  /** Thread mark ids to highlight; null highlights all. */
  @Input() highlightMarks: string[] | null = null;
  @Input() activeMark: string | null = null;

  @Output() change = new EventEmitter<ChangeDetail>();
  @Output() ready = new EventEmitter<void>();
  @Output() commentRequested = new EventEmitter<CommentRequestDetail>();
  @Output() commentClicked = new EventEmitter<CommentClickDetail>();
  @Output() diagramEditRequested = new EventEmitter<DiagramEditDetail>();

  @ViewChild("el", { static: true }) private elRef!: ElementRef<SpezRichtext>;

  get element(): SpezRichtext {
    return this.elRef.nativeElement;
  }

  addCommentMark(markId?: string): CommentRequestDetail | null {
    return this.element.addCommentMark(markId);
  }
  removeCommentMark(markId: string): void {
    this.element.removeCommentMark(markId);
  }
  focusCommentMark(markId: string): void {
    this.element.focusCommentMark(markId);
  }
  insertDiagram(source?: string, drawioKey: string | null = null): string {
    return this.element.insertDiagram(source, drawioKey);
  }
  updateDiagram(nodeKey: string, patch: { source?: string; drawioKey?: string | null }): boolean {
    return this.element.updateDiagram(nodeKey, patch);
  }
  getJSON(): string {
    return this.element.getJSON();
  }

  onChange(event: Event): void {
    this.change.emit((event as CustomEvent<ChangeDetail>).detail);
  }

  onReady(_event: Event): void {
    this.ready.emit();
  }
}
