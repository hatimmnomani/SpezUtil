import { arabicFontDataUrl, ARABIC_FONT_FAMILY } from "./font-arabic";

const STYLE_ID = "spez-rte-styles";

// The editor renders in light DOM (Lexical selection APIs do not work inside
// shadow roots), so all rules are scoped under the spez-rte- class prefix and
// the stylesheet is injected once per document.
export const styles: string = `
@font-face {
  font-family: "${ARABIC_FONT_FAMILY}";
  src: url(${arabicFontDataUrl}) format("truetype");
  font-weight: normal;
  font-style: normal;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0660-0669, U+0750-077F, U+08A0-08FF, U+FB50-FDFF, U+FE70-FEFF;
}

.spez-rte {
  --rte-font-family: "${ARABIC_FONT_FAMILY}", system-ui, sans-serif;
  --rte-font-family-arabic: "${ARABIC_FONT_FAMILY}", "Traditional Arabic", serif;
  --rte-bg: #ffffff;
  --rte-fg: #1f2933;
  --rte-muted: #6b7280;
  --rte-border: #d9dee4;
  --rte-accent: #0b7d3e;
  --rte-radius: 8px;
  --rte-toolbar-bg: #f7f8f9;
  --rte-ayat-font-size: 1.5em;
  --rte-translit-color: var(--rte-muted);
  display: block;
  position: relative;
  font-family: var(--rte-font-family);
  color: var(--rte-fg);
  background: var(--rte-bg);
  border: 1px solid var(--rte-border);
  border-radius: var(--rte-radius);
}

.spez-rte-toolbar {
  --rte-control-radius: 5px;
  --rte-control-height: 28px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--rte-toolbar-bg);
  border-block-end: 1px solid var(--rte-border);
  border-start-start-radius: var(--rte-radius);
  border-start-end-radius: var(--rte-radius);
  user-select: none;
  -webkit-user-select: none;
}
.spez-rte-group {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}
.spez-rte-group + .spez-rte-group {
  margin-inline-start: 6px;
  padding-inline-start: 8px;
  border-inline-start: 1px solid var(--rte-border);
}
.spez-rte-toolbar button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--rte-fg);
  font: inherit;
  font-size: 0.85rem;
  line-height: 1;
  min-width: var(--rte-control-height);
  height: var(--rte-control-height);
  padding: 0 6px;
  border-radius: var(--rte-control-radius);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.spez-rte-toolbar button:hover:not(:disabled) {
  background: color-mix(in srgb, var(--rte-accent) 10%, transparent);
}
.spez-rte-toolbar button:active:not(:disabled) {
  background: color-mix(in srgb, var(--rte-accent) 18%, transparent);
}
.spez-rte-toolbar button[aria-pressed="true"],
.spez-rte-toolbar button[aria-expanded="true"] {
  background: color-mix(in srgb, var(--rte-accent) 16%, transparent);
  border-color: color-mix(in srgb, var(--rte-accent) 40%, transparent);
  color: var(--rte-accent);
}
.spez-rte-toolbar button:disabled {
  opacity: 0.4;
  cursor: default;
}
.spez-rte-toolbar select {
  appearance: auto;
  font: inherit;
  font-size: 0.85rem;
  height: var(--rte-control-height);
  padding: 0 6px;
  border: 1px solid var(--rte-border);
  border-radius: var(--rte-control-radius);
  background: var(--rte-bg);
  color: var(--rte-fg);
  cursor: pointer;
  transition: border-color 120ms ease;
}
.spez-rte-toolbar select:hover {
  border-color: color-mix(in srgb, var(--rte-fg) 35%, var(--rte-border));
}
.spez-rte-toolbar button:focus-visible,
.spez-rte-toolbar select:focus-visible,
.spez-rte-popover button:focus-visible,
.spez-rte-popover input:focus-visible,
.spez-rte-popover .spez-rte-color-custom:focus-within {
  outline: 2px solid var(--rte-accent);
  outline-offset: 1px;
}

.spez-rte-color-btn {
  flex-direction: column;
  gap: 3px;
}
.spez-rte-color-glyph {
  font-weight: 600;
  line-height: 1;
}
.spez-rte-color-btn[data-property="background-color"] .spez-rte-color-glyph {
  padding: 0 2px;
  border-radius: 2px;
  background: color-mix(in srgb, var(--rte-accent) 18%, transparent);
}
.spez-rte-color-bar {
  display: block;
  width: 100%;
  min-width: 14px;
  height: 3px;
  border-radius: 2px;
  background: var(--rte-fg);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--rte-fg) 12%, transparent);
}
.spez-rte-color-btn[data-property="background-color"] .spez-rte-color-bar {
  background: repeating-linear-gradient(
    -45deg,
    var(--rte-border) 0 2px,
    transparent 2px 4px
  );
}

.spez-rte-shell {
  position: relative;
}
.spez-rte-editor {
  min-height: 8em;
  padding: 12px 14px;
  outline: none;
  overflow-wrap: break-word;
}
.spez-rte-editor:focus-visible {
  outline: none;
}
.spez-rte[readonly] .spez-rte-toolbar {
  display: none;
}
.spez-rte-placeholder {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-start: 14px;
  color: var(--rte-muted);
  pointer-events: none;
  user-select: none;
}

.spez-rte-editor p {
  margin: 0 0 0.5em;
}
.spez-rte-editor [dir="rtl"] {
  text-align: right;
  font-family: var(--rte-font-family-arabic);
}
.spez-rte-editor h1, .spez-rte-editor h2, .spez-rte-editor h3 {
  margin: 0.6em 0 0.4em;
  line-height: 1.3;
}
.spez-rte-quote {
  margin: 0.5em 0;
  padding-inline-start: 12px;
  border-inline-start: 3px solid var(--rte-border);
  color: var(--rte-muted);
}
.spez-rte-editor ul, .spez-rte-editor ol {
  margin: 0 0 0.5em;
  padding-inline-start: 1.6em;
}
.spez-rte-editor [dir="rtl"] ul, .spez-rte-editor [dir="rtl"] ol {
  padding-inline-start: 1.6em;
}

.spez-rte-bold { font-weight: bold; }
.spez-rte-italic { font-style: italic; }
.spez-rte-underline { text-decoration: underline; }
.spez-rte-strikethrough { text-decoration: line-through; }
.spez-rte-underline.spez-rte-strikethrough { text-decoration: underline line-through; }

.spez-rte-link {
  color: var(--rte-accent);
  text-decoration: underline;
  cursor: pointer;
}

.spez-rte-ayat {
  margin: 0.75em 0;
  padding: 0.5em 1em;
  text-align: center;
  direction: rtl;
  font-family: var(--rte-font-family-arabic);
  font-size: var(--rte-ayat-font-size);
  line-height: 2;
  border-block: 1px solid color-mix(in srgb, var(--rte-accent) 35%, transparent);
  background: color-mix(in srgb, var(--rte-accent) 4%, transparent);
}

.spez-rte-translit {
  margin: 0.75em 0;
  padding: 0.4em 0.8em;
  border-inline-start: 3px solid color-mix(in srgb, var(--rte-accent) 40%, transparent);
}
.spez-rte-translit-line[data-role="arabic"] {
  direction: rtl;
  text-align: right;
  font-family: var(--rte-font-family-arabic);
  font-size: 1.2em;
  margin: 0;
}
.spez-rte-translit-line[data-role="latin"] {
  direction: ltr;
  text-align: left;
  font-style: italic;
  color: var(--rte-translit-color);
  margin: 0 0 0.25em;
}

.spez-rte-hijri-date {
  background: color-mix(in srgb, var(--rte-accent) 12%, transparent);
  border-radius: 4px;
  padding: 0 4px;
  white-space: nowrap;
}

.spez-rte-image {
  display: block;
  margin: 0.5em 0;
}
.spez-rte-image img {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.spez-rte-editor table {
  border-collapse: collapse;
  margin: 0.5em 0;
  width: 100%;
}
.spez-rte-editor th, .spez-rte-editor td {
  border: 1px solid var(--rte-border);
  padding: 4px 8px;
  min-width: 3em;
  vertical-align: top;
}
.spez-rte-editor th {
  background: var(--rte-toolbar-bg);
  text-align: start;
}

.spez-rte-popover {
  position: absolute;
  z-index: 10;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  padding: 8px;
  background: var(--rte-bg);
  color: var(--rte-fg);
  border: 1px solid var(--rte-border);
  border-radius: var(--rte-radius);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 6px 20px rgba(0, 0, 0, 0.12);
}
.spez-rte-popover input {
  font: inherit;
  font-size: 0.85rem;
  padding: 4px 6px;
  border: 1px solid var(--rte-border);
  border-radius: 5px;
  background: var(--rte-bg);
  color: var(--rte-fg);
  min-width: 12em;
}
.spez-rte-popover input:focus-visible {
  border-color: var(--rte-accent);
}
.spez-rte-popover input[type="number"] {
  min-width: 4em;
  width: 4em;
}
.spez-rte-popover label {
  font-size: 0.8rem;
  color: var(--rte-muted);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.spez-rte-popover button {
  font: inherit;
  font-size: 0.85rem;
  padding: 4px 10px;
  border: 1px solid var(--rte-accent);
  border-radius: 5px;
  background: var(--rte-accent);
  color: #fff;
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.spez-rte-popover button:hover {
  background: color-mix(in srgb, var(--rte-accent) 88%, var(--rte-fg));
}

.spez-rte-color-popover {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.spez-rte-color-grid {
  display: grid;
  grid-template-columns: repeat(6, 22px);
  gap: 6px;
}
.spez-rte-popover .spez-rte-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border-radius: 4px;
  background: var(--swatch);
  border: 1px solid color-mix(in srgb, var(--rte-fg) 15%, transparent);
  transition: transform 120ms ease, box-shadow 120ms ease;
}
.spez-rte-popover .spez-rte-swatch:hover {
  background: var(--swatch);
  transform: scale(1.1);
}
.spez-rte-popover .spez-rte-swatch[aria-pressed="true"] {
  box-shadow: 0 0 0 2px var(--rte-bg), 0 0 0 4px var(--rte-accent);
}
.spez-rte-color-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}
.spez-rte-popover .spez-rte-color-custom {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  font-size: 0.8rem;
  color: var(--rte-fg);
  border: 1px solid var(--rte-border);
  border-radius: 5px;
  cursor: pointer;
}
.spez-rte-popover .spez-rte-color-custom:hover {
  background: color-mix(in srgb, var(--rte-accent) 8%, transparent);
}
.spez-rte-popover .spez-rte-color-custom input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  opacity: 0;
  cursor: pointer;
}
.spez-rte-color-preview {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: var(--swatch);
  border: 1px solid color-mix(in srgb, var(--rte-fg) 15%, transparent);
}
.spez-rte-popover .spez-rte-color-reset {
  background: transparent;
  color: var(--rte-fg);
  border-color: var(--rte-border);
}
.spez-rte-popover .spez-rte-color-reset:hover {
  background: color-mix(in srgb, var(--rte-accent) 8%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .spez-rte-toolbar button,
  .spez-rte-toolbar select,
  .spez-rte-popover button,
  .spez-rte-popover .spez-rte-swatch {
    transition: none;
  }
}
`;

export function injectGlobalStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = styles;
  doc.head.appendChild(style);
}
