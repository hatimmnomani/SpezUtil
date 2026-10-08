import type { EditorLocale } from "../locale";

/** Strings owned by the table UI. Kept apart from `LocaleStrings` so the main toolbar's locale file stays untouched. */
export interface TableStrings {
  toolbar: string;
  insertRowAbove: string;
  insertRowBelow: string;
  insertColumnLeft: string;
  insertColumnRight: string;
  deleteRow: string;
  deleteColumn: string;
  deleteTable: string;
  mergeCells: string;
  splitCell: string;
  headerRow: string;
  headerColumn: string;
  cellBackground: string;
  cellAlignment: string;
  alignStart: string;
  alignCenter: string;
  alignEnd: string;
  alignJustify: string;
  alignTop: string;
  alignMiddle: string;
  alignBottom: string;
  clearContents: string;
  noFill: string;
  customColor: string;
  customSize: string;
  headerRowOption: string;
  sizeLabel: string; // {rows} {cols}
  pickerLabel: string;
  addRow: string;
  addColumn: string;
  rowMenu: string; // {n}
  columnMenu: string; // {n}
  moveRowUp: string;
  moveRowDown: string;
  moveColumnLeft: string;
  moveColumnRight: string;
  columnWidth: string;
  resetWidths: string;
  resizeColumn: string;
  selectRow: string;
  selectColumn: string;
  mergedCantMove: string;
  // announcements (live region)
  rowAdded: string; // {rows} {cols}
  columnAdded: string;
  rowsDeleted: string;
  columnsDeleted: string;
  tableDeleted: string;
  tableInserted: string;
  merged: string;
  split: string;
  headerRowOn: string;
  headerRowOff: string;
  headerColumnOn: string;
  headerColumnOff: string;
  widthSet: string; // {n} {w}
  widthsReset: string;
  moved: string;
  cleared: string;
  cellsSelected: string; // {count}
}

const en: TableStrings = {
  toolbar: "Table tools",
  insertRowAbove: "Insert row above",
  insertRowBelow: "Insert row below",
  insertColumnLeft: "Insert column left",
  insertColumnRight: "Insert column right",
  deleteRow: "Delete row",
  deleteColumn: "Delete column",
  deleteTable: "Delete table",
  mergeCells: "Merge cells",
  splitCell: "Split cell",
  headerRow: "Header row",
  headerColumn: "Header column",
  cellBackground: "Cell background",
  cellAlignment: "Cell alignment",
  alignStart: "Align start",
  alignCenter: "Align center",
  alignEnd: "Align end",
  alignJustify: "Justify",
  alignTop: "Align top",
  alignMiddle: "Align middle",
  alignBottom: "Align bottom",
  clearContents: "Clear contents",
  noFill: "No fill",
  customColor: "Custom…",
  customSize: "Custom size",
  headerRowOption: "Header row",
  sizeLabel: "{rows} × {cols}",
  pickerLabel: "Table size",
  addRow: "Add row",
  addColumn: "Add column",
  rowMenu: "Row {n} options",
  columnMenu: "Column {n} options",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  moveColumnLeft: "Move column left",
  moveColumnRight: "Move column right",
  columnWidth: "Column width (px)",
  resetWidths: "Reset column widths",
  resizeColumn: "Resize column",
  selectRow: "Select row",
  selectColumn: "Select column",
  mergedCantMove: "Rows and columns can't be moved while the table has merged cells.",
  rowAdded: "Row added. Table now has {rows} rows and {cols} columns.",
  columnAdded: "Column added. Table now has {rows} rows and {cols} columns.",
  rowsDeleted: "Row deleted. Table now has {rows} rows.",
  columnsDeleted: "Column deleted. Table now has {cols} columns.",
  tableDeleted: "Table deleted.",
  tableInserted: "Table inserted: {rows} rows by {cols} columns.",
  merged: "Cells merged.",
  split: "Cell split.",
  headerRowOn: "Header row on.",
  headerRowOff: "Header row off.",
  headerColumnOn: "Header column on.",
  headerColumnOff: "Header column off.",
  widthSet: "Column {n} width set to {w} pixels.",
  widthsReset: "Column widths reset.",
  moved: "Moved.",
  cleared: "Contents cleared.",
  cellsSelected: "{count} cells selected.",
};

const ar: TableStrings = {
  toolbar: "أدوات الجدول",
  insertRowAbove: "إدراج صف أعلاه",
  insertRowBelow: "إدراج صف أسفله",
  insertColumnLeft: "إدراج عمود إلى اليسار",
  insertColumnRight: "إدراج عمود إلى اليمين",
  deleteRow: "حذف الصف",
  deleteColumn: "حذف العمود",
  deleteTable: "حذف الجدول",
  mergeCells: "دمج الخلايا",
  splitCell: "تقسيم الخلية",
  headerRow: "صف العنوان",
  headerColumn: "عمود العنوان",
  cellBackground: "لون خلفية الخلية",
  cellAlignment: "محاذاة الخلية",
  alignStart: "محاذاة إلى البداية",
  alignCenter: "توسيط",
  alignEnd: "محاذاة إلى النهاية",
  alignJustify: "ضبط",
  alignTop: "محاذاة للأعلى",
  alignMiddle: "محاذاة للوسط",
  alignBottom: "محاذاة للأسفل",
  clearContents: "مسح المحتوى",
  noFill: "بدون تعبئة",
  customColor: "مخصص…",
  customSize: "حجم مخصص",
  headerRowOption: "صف عنوان",
  sizeLabel: "{rows} × {cols}",
  pickerLabel: "حجم الجدول",
  addRow: "إضافة صف",
  addColumn: "إضافة عمود",
  rowMenu: "خيارات الصف {n}",
  columnMenu: "خيارات العمود {n}",
  moveRowUp: "نقل الصف للأعلى",
  moveRowDown: "نقل الصف للأسفل",
  moveColumnLeft: "نقل العمود لليسار",
  moveColumnRight: "نقل العمود لليمين",
  columnWidth: "عرض العمود (بكسل)",
  resetWidths: "إعادة ضبط عرض الأعمدة",
  resizeColumn: "تغيير عرض العمود",
  selectRow: "تحديد الصف",
  selectColumn: "تحديد العمود",
  mergedCantMove: "لا يمكن نقل الصفوف والأعمدة عندما يحتوي الجدول على خلايا مدموجة.",
  rowAdded: "أُضيف صف. يحتوي الجدول الآن على {rows} صفوف و{cols} أعمدة.",
  columnAdded: "أُضيف عمود. يحتوي الجدول الآن على {rows} صفوف و{cols} أعمدة.",
  rowsDeleted: "حُذف الصف. يحتوي الجدول الآن على {rows} صفوف.",
  columnsDeleted: "حُذف العمود. يحتوي الجدول الآن على {cols} أعمدة.",
  tableDeleted: "حُذف الجدول.",
  tableInserted: "أُدرج جدول: {rows} صفوف و{cols} أعمدة.",
  merged: "تم دمج الخلايا.",
  split: "تم تقسيم الخلية.",
  headerRowOn: "صف العنوان مفعّل.",
  headerRowOff: "صف العنوان معطّل.",
  headerColumnOn: "عمود العنوان مفعّل.",
  headerColumnOff: "عمود العنوان معطّل.",
  widthSet: "عرض العمود {n} الآن {w} بكسل.",
  widthsReset: "أُعيد ضبط عرض الأعمدة.",
  moved: "تم النقل.",
  cleared: "تم مسح المحتوى.",
  cellsSelected: "تم تحديد {count} خلايا.",
};

export function getTableStrings(locale: EditorLocale | string | null | undefined): TableStrings {
  return locale === "ar" ? ar : en;
}

/** Replaces `{name}` placeholders. Unknown names are left in place so a typo is visible, not silent. */
export function fillTemplate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
    key in values ? String(values[key]) : whole,
  );
}
