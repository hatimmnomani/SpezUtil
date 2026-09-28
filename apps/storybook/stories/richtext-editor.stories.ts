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
