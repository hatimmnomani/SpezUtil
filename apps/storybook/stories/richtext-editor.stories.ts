import { html } from "lit-html";
import "@spezutil/richtext-editor";
// Loaded so the toolbar's Hijri-date button opens the datepicker popover
// (optional peer, feature-detected at runtime by the editor).
import "@spezutil/hijri-datepicker";

export default {
  title: "Components/SpezRichtext",
  parameters: {
    docs: {
      description: {
        component: [
          "Rich-text editor for Arabic / Lisan-ud-Dawat content, built on Lexical.",
          "",
          "Renders in **light DOM** (Lexical selection does not work in shadow roots).",
          "",
          "**Manual QA checklist** (not covered by jsdom tests):",
          "- Typing and caret behavior, including inside ayat/translit blocks",
          "- RTL typing and mixed Arabic/English (bidi) runs",
          "- Amiri font renders on Arabic runs (unicode-range @font-face)",
          "- Toolbar font selector applies/clears fonts on a selection",
          "- Table cell selection and tab navigation",
          "- Link popover insert/remove",
          "- Hijri date button opens the datepicker popover and inserts a token",
          "- Paste from Word / web preserves structure and direction",
          "- Undo/redo across all of the above",
          "- Delete an entire LuD-font run — no empty lud-text node left in the JSON; type across two adjacent same-font runs",
          "- LuD picker: typing continues in the chosen font; Google Docs paste in Al Kanz keeps the typed text",
          "- Comment: select, 💬, highlight appears; click a mark fires comment-clicked",
          "- Diagram renders; double-click opens the edit prompt; no foreignObject in the SVG",
        ].join("\n"),
      },
    },
  },
  argTypes: {
    placeholder: { control: "text" },
    readonly: { control: "boolean" },
    dir: { control: "radio", options: ["auto", "ltr", "rtl"] },
    locale: { control: "radio", options: ["en", "ar"] },
    toolbar: { control: "text" },
  },
};

interface Args {
  placeholder?: string;
  readonly?: boolean;
  dir?: string;
  locale?: string;
  toolbar?: string;
  initialHtml?: string;
}

const Template = (args: Args) => {
  const el = document.createElement("spez-richtext");
  if (args.placeholder) el.setAttribute("placeholder", args.placeholder);
  if (args.readonly) el.setAttribute("readonly", "");
  if (args.dir && args.dir !== "auto") el.setAttribute("dir", args.dir);
  if (args.locale) el.setAttribute("locale", args.locale);
  if (args.toolbar) el.setAttribute("toolbar", args.toolbar);
  if (args.initialHtml) el.initialHtml = args.initialHtml;
  return html`${el}`;
};

export const Default = Template.bind({});
(Default as any).args = { placeholder: "Start writing…" };

export const ArabicContent = Template.bind({});
(ArabicContent as any).args = {
  initialHtml: [
    "<h2>Bayaan notes</h2>",
    "<p>السلام عليكم ورحمة الله وبركاته</p>",
    "<p>Mixed line with عربي inline text and English.</p>",
  ].join(""),
};

export const DawatBlocks = Template.bind({});
(DawatBlocks as any).args = {
  initialHtml: [
    '<blockquote data-spez-type="ayat">بسم الله الرحمن الرحيم</blockquote>',
    '<div data-spez-type="translit-pair">',
    '<p data-role="arabic">العلم نور</p>',
    '<p data-role="latin">al-ilmu noor</p>',
    "</div>",
    '<p>Majlis on <time data-spez-hijri="1447-2-12" data-spez-format="D MMMM YYYY">12 Safar al-Muzaffar 1447</time>.</p>',
  ].join(""),
};

export const Readonly = Template.bind({});
(Readonly as any).args = {
  readonly: true,
  initialHtml: "<p>This content is not editable.</p>",
};

export const MinimalToolbar = Template.bind({});
(MinimalToolbar as any).args = {
  toolbar: "inline,history",
  initialHtml: "<p>Only inline formatting and undo/redo.</p>",
};

export const RtlLocale = Template.bind({});
(RtlLocale as any).args = {
  locale: "ar",
  dir: "rtl",
  placeholder: "اكتب هنا…",
};

export const WithTable = Template.bind({});
(WithTable as any).args = {
  initialHtml:
    "<table><tr><th>Item</th><th>Count</th></tr><tr><td>Thaal</td><td>12</td></tr></table>",
};

const A = "01J9ZX3M4Q8R2S5T7V9W0XYZAB";
const B = "01J9ZX3M4Q8R2S5T7V9W0XYZAC";

export const LudFonts = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,block,font,lud,inline");
  el.initialHtml = [
    '<p><span data-lud-font="al-kanz">نسس ثثاك }</span> — Al Kanz, typed text kept as-is</p>',
    '<p><span data-lud-font="al-fatemi">ككتاب</span> — Al-Fatemi (draft profile)</p>',
    '<p><span data-lud-font="unicode">حاضرین</span> — Unicode fallback</p>',
  ].join("");
  return html`${el}`;
};

export const CommentReview = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,inline,comment");
  el.initialHtml = `<p>Students must <span data-thread-ids="${A}">attend daily</span> and <span data-thread-ids="${B}">revise weekly</span>.</p>`;
  const log = document.createElement("pre");
  el.addEventListener("comment-requested", (e) => (log.textContent = JSON.stringify((e as CustomEvent).detail, null, 2)));
  el.addEventListener("comment-clicked", (e) => {
    const [id] = (e as CustomEvent<{ threadIds: string[] }>).detail.threadIds;
    el.activeMark = id ?? null;
    log.textContent = JSON.stringify((e as CustomEvent).detail);
  });
  return html`${el}${log}`;
};

export const ReadOnlyHighlights = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("readonly", "");
  el.initialHtml = `<p>Only <span data-thread-ids="${A}">this thread</span> is visible; <span data-thread-ids="${B}">this one</span> is not.</p>`;
  el.highlightMarks = [A];
  return html`${el}`;
};

export const Diagram = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar", "history,block,diagram");
  el.addEventListener("rte-ready", () => el.insertDiagram("flowchart TD\n  Jadeed --> Muraja'at --> Tasmi"), { once: true });
  el.addEventListener("diagram-edit-requested", (e) => {
    const { nodeKey, source } = (e as CustomEvent<{ nodeKey: string; source: string }>).detail;
    const next = window.prompt("Mermaid source", source);
    if (next !== null) el.updateDiagram(nodeKey, { source: next });
  });
  return html`${el}`;
};

/* -------------------------------------------------------------------------- */
/* Toolbar API                                                                */
/* -------------------------------------------------------------------------- */

const TOOLBAR_DOC = [
  "<h2>Toolbar</h2>",
  "<p>Select some text and use the toolbar. Hover a button for its shortcut.</p>",
  "<p>السلام عليكم ورحمة الله وبركاته</p>",
].join("");

/** An editor inside a box whose width the story controls, so the overflow behaviour can be seen. */
function boxed(width: string, el: HTMLElement) {
  const box = document.createElement("div");
  box.style.cssText = `width:${width};max-width:100%;resize:horizontal;overflow:auto;padding:4px;border:1px dashed #9ca3af`;
  box.append(el);
  return html`<p style="font:12px system-ui;margin:0 0 6px">Drag the dashed box's corner to resize it.</p>${box}`;
}

export const ToolbarDefault = () => {
  const el = document.createElement("spez-richtext");
  el.initialHtml = TOOLBAR_DOC;
  return html`${el}`;
};
(ToolbarDefault as any).parameters = {
  docs: { description: { story: "The default compact layout: one row, with strike, sub/sup, code, justify, auto direction, Hijri date, ayat, transliteration, the font pickers and the Lisan ud-Dawat font picker in **More**." } },
};

export const ToolbarCustomGroups = () => {
  const el = document.createElement("spez-richtext");
  el.initialHtml = TOOLBAR_DOC;
  el.toolbarConfig = {
    groups: [
      "history",
      { id: "text", items: ["bold", "italic", "underline"], label: "Text" },
      "lists",
      "insert",
    ],
    more: ["strikethrough", "code", "hijri-date"],
    hide: ["image"],
    show: ["comment"],
  };
  return html`${el}`;
};

export const ToolbarOverflow = () => {
  const el = document.createElement("spez-richtext");
  el.initialHtml = TOOLBAR_DOC;
  return boxed("560px", el);
};
(ToolbarOverflow as any).parameters = {
  docs: { description: { story: "Groups collapse into More as the box narrows (alignment and direction first) and return when it widens. Below the narrowest, the row wraps instead of clipping." } },
};

export const ToolbarFocusMode = () => {
  const el = document.createElement("spez-richtext");
  el.setToolbarMode("focus");
  el.initialHtml = TOOLBAR_DOC;
  const pin = document.createElement("button");
  pin.textContent = "Pin toolbar";
  pin.onclick = () => (el.toolbarPinned = !el.toolbarPinned);
  return html`<p>${pin} The toolbar appears over the top of the page only while the editor has focus. Nothing shifts.</p>${el}`;
};

export const ToolbarSticky = () => {
  const el = document.createElement("spez-richtext");
  el.setToolbarMode("sticky");
  el.initialHtml = Array.from({ length: 40 }, (_, i) => `<p>Paragraph ${i + 1}. Scroll: the toolbar stays pinned.</p>`).join("");
  const box = document.createElement("div");
  box.style.cssText = "height:320px;overflow:auto;border:1px solid #d9dee4";
  box.append(el);
  return html`${box}`;
};

export const ToolbarModes = () => {
  const el = document.createElement("spez-richtext");
  el.initialHtml = TOOLBAR_DOC;
  const select = document.createElement("select");
  for (const m of ["static", "sticky", "focus"]) select.add(new Option(m, m));
  select.onchange = () => el.setToolbarMode(select.value as "static" | "sticky" | "focus");
  return html`<label>Mode ${select}</label>${el}`;
};

export const ToolbarRtl = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("locale", "ar");
  el.setAttribute("dir", "rtl");
  el.initialHtml = "<p>السلام عليكم ورحمة الله وبركاته</p>";
  return boxed("560px", el);
};

export const ToolbarThemed = () => {
  const el = document.createElement("spez-richtext");
  el.initialHtml = TOOLBAR_DOC;
  el.setToolbarMode("sticky");
  el.style.cssText = [
    "--rte-toolbar-bg:#0f1b2d",
    "--rte-toolbar-fg:#e8dcc0",
    "--rte-toolbar-muted:#9aa7b8",
    "--rte-toolbar-border:#2a3b55",
    "--rte-toolbar-hover-bg:#1c2d47",
    "--rte-toolbar-active-bg:#2a3b55",
    "--rte-toolbar-active-fg:#f2c75c",
    "--rte-toolbar-active-border:#f2c75c",
    "--rte-toolbar-focus-ring:#f2c75c",
    "--rte-menu-bg:#0f1b2d",
    "--rte-menu-fg:#e8dcc0",
    "--rte-menu-border:#2a3b55",
    "--rte-toolbar-radius:0",
    "--rte-control-radius:0",
    "--rte-toolbar-icon-size:1.25rem",
  ].join(";");
  return html`${el}`;
};

export const ToolbarLegacy = () => {
  const el = document.createElement("spez-richtext");
  el.setAttribute("toolbar-layout", "legacy");
  el.initialHtml = TOOLBAR_DOC;
  return html`${el}`;
};
(ToolbarLegacy as any).parameters = {
  docs: { description: { story: "The 0.5 layout: flat groups that wrap, no More menu. Icons and accessibility are the new ones." } },
};
