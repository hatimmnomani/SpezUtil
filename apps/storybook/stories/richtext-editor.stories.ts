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
          "- Al-Kanz font renders on Arabic runs (unicode-range @font-face)",
          "- Table cell selection and tab navigation",
          "- Link popover insert/remove",
          "- Hijri date button opens the datepicker popover and inserts a token",
          "- Paste from Word / web preserves structure and direction",
          "- Undo/redo across all of the above",
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
