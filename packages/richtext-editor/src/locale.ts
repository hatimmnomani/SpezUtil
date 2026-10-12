export type EditorLocale = "en" | "ar";

export interface LocaleStrings {
  undo: string;
  redo: string;
  paragraph: string;
  heading1: string;
  heading2: string;
  heading3: string;
  quote: string;
  font: string;
  fontDefault: string;
  fontSize: string;
  bold: string;
  italic: string;
  underline: string;
  strikethrough: string;
  subscript: string;
  superscript: string;
  inlineCode: string;
  clearFormatting: string;
  textColor: string;
  highlightColor: string;
  customColor: string;
  resetColor: string;
  colorBlack: string;
  colorDarkGray: string;
  colorGray: string;
  colorWhite: string;
  colorBrown: string;
  colorRed: string;
  colorOrange: string;
  colorYellow: string;
  colorGreen: string;
  colorTeal: string;
  colorBlue: string;
  colorPurple: string;
  colorPink: string;
  bulletList: string;
  numberList: string;
  indent: string;
  outdent: string;
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
  ludFont: string;
  ludFontNone: string;
  ludFontDraft: string;
  comment: string;
  diagram: string;
  wordCount: string;
  characterCount: string;
  blockStyle: string;
  toolbarLabel: string;
  moreFormatting: string;
  moreTools: string;
  sectionTextStyle: string;
  sectionParagraph: string;
  sectionInsert: string;
  groupHistory: string;
  groupBlock: string;
  groupInline: string;
  groupColor: string;
  groupLists: string;
  groupAlignDir: string;
  groupInsert: string;
  groupComment: string;
}

const en: LocaleStrings = {
  undo: "Undo",
  redo: "Redo",
  paragraph: "Paragraph",
  heading1: "Heading 1",
  heading2: "Heading 2",
  heading3: "Heading 3",
  quote: "Quote",
  font: "Font",
  fontDefault: "Default",
  fontSize: "Font size",
  bold: "Bold",
  italic: "Italic",
  underline: "Underline",
  strikethrough: "Strikethrough",
  subscript: "Subscript",
  superscript: "Superscript",
  inlineCode: "Inline code",
  clearFormatting: "Clear formatting",
  textColor: "Text color",
  highlightColor: "Highlight color",
  customColor: "Custom…",
  resetColor: "Reset",
  colorBlack: "Black",
  colorDarkGray: "Dark gray",
  colorGray: "Gray",
  colorWhite: "White",
  colorBrown: "Brown",
  colorRed: "Red",
  colorOrange: "Orange",
  colorYellow: "Yellow",
  colorGreen: "Green",
  colorTeal: "Teal",
  colorBlue: "Blue",
  colorPurple: "Purple",
  colorPink: "Pink",
  bulletList: "Bulleted list",
  numberList: "Numbered list",
  indent: "Indent",
  outdent: "Outdent",
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
  ludFont: "Lisan ud-Dawat font",
  ludFontNone: "Default",
  ludFontDraft: "(draft)",
  comment: "Comment",
  diagram: "Diagram",
  wordCount: "{count} words",
  characterCount: "{count} characters",
  blockStyle: "Block style",
  toolbarLabel: "Formatting",
  moreFormatting: "More formatting",
  moreTools: "More tools",
  sectionTextStyle: "Text style",
  sectionParagraph: "Paragraph",
  sectionInsert: "Insert",
  groupHistory: "History",
  groupBlock: "Block style",
  groupInline: "Text",
  groupColor: "Colour",
  groupLists: "Lists and indent",
  groupAlignDir: "Alignment and direction",
  groupInsert: "Insert",
  groupComment: "Comment",
};

const ar: LocaleStrings = {
  undo: "تراجع",
  redo: "إعادة",
  paragraph: "فقرة",
  heading1: "عنوان ١",
  heading2: "عنوان ٢",
  heading3: "عنوان ٣",
  quote: "اقتباس",
  font: "الخط",
  fontDefault: "افتراضي",
  fontSize: "حجم الخط",
  bold: "غامق",
  italic: "مائل",
  underline: "تسطير",
  strikethrough: "يتوسطه خط",
  subscript: "منخفض",
  superscript: "مرتفع",
  inlineCode: "شفرة برمجية",
  clearFormatting: "إزالة التنسيق",
  textColor: "لون النص",
  highlightColor: "لون التظليل",
  customColor: "لون مخصص…",
  resetColor: "إزالة اللون",
  colorBlack: "أسود",
  colorDarkGray: "رمادي داكن",
  colorGray: "رمادي",
  colorWhite: "أبيض",
  colorBrown: "بني",
  colorRed: "أحمر",
  colorOrange: "برتقالي",
  colorYellow: "أصفر",
  colorGreen: "أخضر",
  colorTeal: "أزرق مخضرّ",
  colorBlue: "أزرق",
  colorPurple: "بنفسجي",
  colorPink: "وردي",
  bulletList: "قائمة نقطية",
  numberList: "قائمة مرقمة",
  indent: "زيادة المسافة البادئة",
  outdent: "إنقاص المسافة البادئة",
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
  ludFont: "خط لسان الدعوة",
  ludFontNone: "افتراضي",
  ludFontDraft: "(مسودة)",
  comment: "تعليق",
  diagram: "مخطط",
  wordCount: "{count} كلمة",
  characterCount: "{count} حرف",
  blockStyle: "نمط الفقرة",
  toolbarLabel: "التنسيق",
  moreFormatting: "المزيد من التنسيق",
  moreTools: "أدوات أخرى",
  sectionTextStyle: "نمط النص",
  sectionParagraph: "الفقرة",
  sectionInsert: "إدراج",
  groupHistory: "السجل",
  groupBlock: "نمط الفقرة",
  groupInline: "النص",
  groupColor: "الألوان",
  groupLists: "القوائم والإزاحة",
  groupAlignDir: "المحاذاة والاتجاه",
  groupInsert: "إدراج",
  groupComment: "تعليق",
};

const tables: Record<EditorLocale, LocaleStrings> = { en, ar };

export function getLocaleStrings(locale: string | null | undefined): LocaleStrings {
  return tables[(locale as EditorLocale) ?? "en"] ?? en;
}
