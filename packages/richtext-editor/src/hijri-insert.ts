import { $getSelection, $isRangeSelection, type LexicalEditor } from "lexical";
import { createCalendar, type HijriDate } from "@spezutil/hijri-core";
import { $createHijriDateNode, DEFAULT_HIJRI_FORMAT } from "./nodes/hijri-date-node";
import type { EditorLocale } from "./locale";

export function insertHijriDate(
  editor: LexicalEditor,
  hijri?: HijriDate,
  format: string = DEFAULT_HIJRI_FORMAT,
  locale: EditorLocale = "en",
): void {
  const date = hijri ?? createCalendar().gregorianToHijri(new Date());
  editor.update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    selection.insertNodes([$createHijriDateNode(date, format, locale)]);
  });
}

/**
 * Opens a `<hijri-datepicker>` popover when @spezutil/hijri-datepicker is
 * loaded on the page (optional peer, detected at runtime — never imported);
 * otherwise inserts today's date directly.
 */
export function openHijriDatePicker(
  editor: LexicalEditor,
  locale: EditorLocale,
  openPopover: (content: HTMLElement) => () => void,
): void {
  if (typeof customElements === "undefined" || !customElements.get("hijri-datepicker")) {
    insertHijriDate(editor, undefined, DEFAULT_HIJRI_FORMAT, locale);
    return;
  }
  const picker = document.createElement("hijri-datepicker");
  const close = openPopover(picker);
  picker.addEventListener("change", (event) => {
    // SingleChangeDetail from @spezutil/hijri-datepicker (default mode).
    const detail = (event as CustomEvent<{ mode: string; hijri?: HijriDate }>).detail;
    if (detail?.mode === "single" && detail.hijri) {
      insertHijriDate(editor, detail.hijri, DEFAULT_HIJRI_FORMAT, locale);
      close();
    }
  });
}
