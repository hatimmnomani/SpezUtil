export type EditorLocale = "en" | "ar";

export interface LocaleStrings {
  undo: string;
  redo: string;
  paragraph: string;
  heading1: string;
  heading2: string;
  heading3: string;
  quote: string;
  bold: string;
  italic: string;
  underline: string;
  strikethrough: string;
  bulletList: string;
  numberList: string;
  alignStart: string;
  alignCenter: string;
  alignEnd: string;
  alignJustify: string;
  dirRtl: string;
  dirLtr: string;
  dirAuto: string;
  link: string;
  linkPlaceholder: string;
  removeLink: string;
  image: string;
  imagePlaceholder: string;
  table: string;
  rows: string;
  columns: string;
  insert: string;
  hijriDate: string;
  ayat: string;
  translit: string;
  translitArabicPlaceholder: string;
  translitLatinPlaceholder: string;
}

const en: LocaleStrings = {
  undo: "Undo",
  redo: "Redo",
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  quote: "Quote",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strikethrough: "Strikethrough",
  bulletList: "Bulleted list",
  numberList: "Numbered list",
  alignStart: "Align start",
  alignCenter: "Align center",
  alignEnd: "Align end",
  alignJustify: "Justify",
  dirRtl: "Right-to-left",
  dirLtr: "Left-to-right",
  dirAuto: "Auto direction",
  link: "Link",
  linkPlaceholder: "https://…",
  removeLink: "Remove link",
  image: "Image",
  imagePlaceholder: "Image URL",
  table: "Table",
  rows: "Rows",
  columns: "Columns",
  insert: "Insert",
  hijriDate: "Hijri date",
  ayat: "Ayat block",
  translit: "Transliteration pair",
  translitArabicPlaceholder: "Arabic",
  translitLatinPlaceholder: "Transliteration",
};

const ar: LocaleStrings = {
  undo: "تراجع",
  redo: "إعادة",
  paragraph: "فقرة",
  heading1: "عنوان ١",
  heading2: "عنوان ٢",
  heading3: "عنوان ٣",
  quote: "اقتباس",
  bold: "غامق",
  italic: "مائل",
  underline: "تسطير",
  strikethrough: "يتوسطه خط",
  bulletList: "قائمة نقطية",
  numberList: "قائمة مرقمة",
  alignStart: "محاذاة البداية",
  alignCenter: "توسيط",
  alignEnd: "محاذاة النهاية",
  alignJustify: "ضبط",
  dirRtl: "من اليمين إلى اليسار",
  dirLtr: "من اليسار إلى اليمين",
  dirAuto: "اتجاه تلقائي",
  link: "رابط",
  linkPlaceholder: "https://…",
  removeLink: "إزالة الرابط",
  image: "صورة",
  imagePlaceholder: "رابط الصورة",
  table: "جدول",
  rows: "صفوف",
  columns: "أعمدة",
  insert: "إدراج",
  hijriDate: "تاريخ هجري",
  ayat: "آية",
  translit: "نص مع النقل الحرفي",
  translitArabicPlaceholder: "النص العربي",
  translitLatinPlaceholder: "النقل الحرفي",
};

const tables: Record<EditorLocale, LocaleStrings> = { en, ar };

export function getLocaleStrings(locale: string | null | undefined): LocaleStrings {
  return tables[(locale as EditorLocale) ?? "en"] ?? en;
}
