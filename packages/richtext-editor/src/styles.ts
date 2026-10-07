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

/*
 * Toolbar tokens. Every colour, size and radius the toolbar draws comes from one of these, so an app
 * maps its own design tokens onto them at the element (or any ancestor) and nothing else. All defaults
 * are neutral and derive from the base --rte-* tokens above.
 */
.spez-rte {
  --rte-control-height: 28px;
  --rte-control-radius: 5px;
  --rte-toolbar-fg: var(--rte-fg);
  --rte-toolbar-muted: var(--rte-muted);
  --rte-toolbar-border: var(--rte-border);
  --rte-toolbar-divider: var(--rte-toolbar-border);
  --rte-toolbar-hover-bg: color-mix(in srgb, var(--rte-accent) 10%, transparent);
  --rte-toolbar-active-bg: color-mix(in srgb, var(--rte-accent) 16%, transparent);
  --rte-toolbar-active-fg: var(--rte-accent);
  --rte-toolbar-active-border: color-mix(in srgb, var(--rte-accent) 40%, transparent);
  --rte-toolbar-focus-ring: var(--rte-accent);
  --rte-toolbar-radius: var(--rte-radius);
  --rte-toolbar-field-bg: var(--rte-bg);
  --rte-toolbar-field-fg: var(--rte-fg);
  --rte-toolbar-gap: 2px;
  --rte-toolbar-padding-block: 6px;
  --rte-toolbar-padding-inline: 8px;
  --rte-toolbar-font-size: 0.85rem;
  --rte-toolbar-label-size: 0.75rem;
  --rte-toolbar-icon-size: 1.125rem;
  --rte-toolbar-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
  --rte-toolbar-z: 5;
  --rte-toolbar-sticky-top: 0px;
  --rte-toolbar-height: 2.5rem;
  --rte-menu-bg: var(--rte-bg);
  --rte-menu-fg: var(--rte-fg);
  --rte-menu-border: var(--rte-border);
  --rte-menu-shadow: 0 1px 2px rgba(0, 0, 0, 0.06), 0 8px 24px rgba(0, 0, 0, 0.14);
  --rte-menu-min-width: 18rem;
  --rte-menu-max-height: 70vh;
}

.spez-rte-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--rte-toolbar-gap);
  padding: var(--rte-toolbar-padding-block) var(--rte-toolbar-padding-inline);
  color: var(--rte-toolbar-fg);
  background: var(--rte-toolbar-bg);
  border-block-end: 1px solid var(--rte-toolbar-border);
  border-start-start-radius: var(--rte-toolbar-radius);
  border-start-end-radius: var(--rte-toolbar-radius);
  font-size: var(--rte-toolbar-font-size);
  user-select: none;
  -webkit-user-select: none;
}
.spez-rte-group {
  display: inline-flex;
  align-items: center;
  gap: var(--rte-toolbar-gap);
}
.spez-rte-group + .spez-rte-group {
  margin-inline-start: 6px;
  padding-inline-start: 8px;
  border-inline-start: 1px solid var(--rte-toolbar-divider);
}
.spez-rte-toolbar--legacy [data-item="clear-formatting"] {
  margin-inline-start: 6px;
  padding-inline-start: 8px;
  border-inline-start: 1px solid var(--rte-toolbar-divider);
}
.spez-rte-toolbar button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  background: transparent;
  color: var(--rte-toolbar-fg);
  font: inherit;
  font-size: var(--rte-toolbar-font-size);
  line-height: 1;
  min-width: var(--rte-control-height);
  height: var(--rte-control-height);
  padding: 0 6px;
  border-radius: var(--rte-control-radius);
  cursor: pointer;
  transition: background-color 120ms ease, border-color 120ms ease, color 120ms ease;
}
.spez-rte-toolbar button:hover:not(:disabled) {
  background: var(--rte-toolbar-hover-bg);
}
.spez-rte-toolbar button:active:not(:disabled) {
  background: var(--rte-toolbar-active-bg);
}
.spez-rte-toolbar button[aria-pressed="true"],
.spez-rte-toolbar button[aria-expanded="true"] {
  background: var(--rte-toolbar-active-bg);
  border-color: var(--rte-toolbar-active-border);
  color: var(--rte-toolbar-active-fg);
}
.spez-rte-toolbar button:disabled {
  opacity: 0.4;
  cursor: default;
}
.spez-rte-toolbar select {
  appearance: auto;
  font: inherit;
  font-size: var(--rte-toolbar-font-size);
  height: var(--rte-control-height);
  padding: 0 6px;
  border: 1px solid var(--rte-toolbar-border);
  border-radius: var(--rte-control-radius);
  background: var(--rte-toolbar-field-bg);
  color: var(--rte-toolbar-field-fg);
  cursor: pointer;
  transition: border-color 120ms ease;
}
.spez-rte-toolbar select:hover {
  border-color: color-mix(in srgb, var(--rte-fg) 35%, var(--rte-toolbar-border));
}
.spez-rte-toolbar button:focus-visible,
.spez-rte-toolbar select:focus-visible,
.spez-rte-popover button:focus-visible,
.spez-rte-popover input:focus-visible,
.spez-rte-popover .spez-rte-color-custom:focus-within {
  outline: 2px solid var(--rte-toolbar-focus-ring);
  outline-offset: 1px;
}

/* Icons: inline SVG, one stroke style, tinted by the button's text colour. */
.spez-rte-icon {
  flex: none;
  inline-size: var(--rte-toolbar-icon-size);
  block-size: var(--rte-toolbar-icon-size);
  pointer-events: none;
}
.spez-rte-toolbar:dir(rtl) .spez-rte-icon--flip {
  transform: scaleX(-1);
}
.spez-rte-toolbar[dir="rtl"] .spez-rte-icon--flip {
  transform: scaleX(-1);
}

.spez-rte-color-btn {
  flex-direction: column;
  gap: 3px;
}
.spez-rte-color-glyph {
  display: inline-flex;
  line-height: 1;
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

/* Compact layout: one row that gives groups up to More as it narrows, and wraps only as a last resort. */
.spez-rte-toolbar--compact {
  flex-wrap: nowrap;
  min-block-size: var(--rte-toolbar-height);
}
.spez-rte-toolbar--compact > * {
  flex: none;
}
.spez-rte-toolbar--compact.spez-rte-toolbar--wrap {
  flex-wrap: wrap;
}

/* Display modes. static is the normal flow; the others are set with the toolbar-mode attribute. */
.spez-rte[data-toolbar-mode="sticky"] > .spez-rte-toolbar,
.spez-rte[data-toolbar-mode="focus"] > .spez-rte-toolbar {
  position: sticky;
  inset-block-start: var(--rte-toolbar-sticky-top);
  z-index: var(--rte-toolbar-z);
}
/* focus: out of the flow (negative margin) and invisible until the editor has focus, so nothing shifts. */
.spez-rte[data-toolbar-mode="focus"] > .spez-rte-toolbar {
  box-sizing: border-box;
  block-size: var(--rte-toolbar-height);
  margin-block-end: calc(-1 * var(--rte-toolbar-height));
  box-shadow: var(--rte-toolbar-shadow);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition: opacity 150ms ease, visibility 150ms;
}
.spez-rte[data-toolbar-mode="focus"]:focus-within > .spez-rte-toolbar,
.spez-rte[data-toolbar-mode="focus"][data-toolbar-pinned] > .spez-rte-toolbar {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}
/* The room the toolbar floats over: reserved up front, so showing it never moves the first line. */
.spez-rte[data-toolbar-mode="focus"] .spez-rte-shell {
  padding-block-start: var(--rte-toolbar-height);
}

/* The More menu. */
.spez-rte-more {
  position: relative;
  display: inline-flex;
  margin-inline-start: auto;
}
.spez-rte-more[hidden] {
  display: none;
}
.spez-rte-more__btn {
  position: relative;
}
/* A dot while something inside is switched on (subscript, say), so it is never hidden state. */
.spez-rte-more__btn[data-active]::after {
  content: "";
  position: absolute;
  inset-block-start: 4px;
  inset-inline-end: 4px;
  inline-size: 6px;
  block-size: 6px;
  border-radius: 50%;
  background: var(--rte-toolbar-active-fg);
}
.spez-rte-more__panel {
  position: absolute;
  inset-block-start: calc(100% + 4px);
  inset-inline-end: 0;
  z-index: 2;
  display: grid;
  gap: 8px;
  box-sizing: border-box;
  min-inline-size: var(--rte-menu-min-width);
  max-block-size: var(--rte-menu-max-height);
  overflow: auto;
  padding: 8px;
  background: var(--rte-menu-bg);
  color: var(--rte-menu-fg);
  border: 1px solid var(--rte-menu-border);
  border-radius: var(--rte-control-radius);
  box-shadow: var(--rte-menu-shadow);
  text-align: start;
}
.spez-rte-more__panel[hidden],
.spez-rte-more__section[hidden] {
  display: none;
}
.spez-rte-more__section {
  display: grid;
  gap: 2px;
}
.spez-rte-more__section + .spez-rte-more__section {
  padding-block-start: 8px;
  border-block-start: 1px solid var(--rte-toolbar-divider);
}
.spez-rte-more__title {
  margin: 0 0 2px;
  font-size: var(--rte-toolbar-label-size);
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--rte-toolbar-muted);
}
.spez-rte-more__row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-block-size: var(--rte-control-height);
  padding-inline: 2px;
  font-size: var(--rte-toolbar-font-size);
  cursor: pointer;
}
.spez-rte-more__row:hover {
  background: var(--rte-toolbar-hover-bg);
}
.spez-rte-more__row--field,
.spez-rte-more__row--group {
  justify-content: space-between;
  cursor: default;
}
.spez-rte-more__row--field:hover,
.spez-rte-more__row--group:hover {
  background: transparent;
}
.spez-rte-more__label {
  flex: 1 1 auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.spez-rte-more__groups,
.spez-rte-more__responsive {
  display: flex;
  gap: 4px;
}
.spez-rte-more__responsive {
  flex-direction: column;
}
.spez-rte-more__panel .spez-rte-group {
  margin: 0;
  padding: 0;
  border: 0;
}
.spez-rte-more__row select {
  flex: 0 1 9rem;
  inline-size: 9rem;
}
.spez-rte-more kbd {
  margin-inline-start: auto;
  padding: 0 4px;
  border: 1px solid var(--rte-toolbar-divider);
  border-radius: 3px;
  background: transparent;
  color: var(--rte-toolbar-muted);
  font: inherit;
  font-size: var(--rte-toolbar-label-size);
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
@media print {
  .spez-rte-toolbar {
    display: none;
  }
}
.spez-rte-placeholder {
  position: absolute;
  inset-block-start: 12px;
  inset-inline-start: 14px;
  color: var(--rte-muted);
  pointer-events: none;
  user-select: none;
}
.spez-rte-status {
  padding: 4px 14px 8px;
  font-size: 0.75rem;
  color: var(--rte-muted);
  text-align: end;
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
.spez-rte-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.9em;
  padding: 0.1em 0.3em;
  border-radius: 4px;
  background: var(--rte-toolbar-bg);
  border: 1px solid var(--rte-border);
}

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
  .spez-rte-popover .spez-rte-swatch,
  .spez-rte[data-toolbar-mode="focus"] > .spez-rte-toolbar {
    transition: none;
  }
}

.spez-rte {
  --rte-comment-bg: rgba(255, 212, 0, 0.28);
  --rte-comment-active-bg: rgba(255, 170, 0, 0.55);
}
.spez-rte mark.spez-rte-comment {
  background: transparent;
  color: inherit;
}
.spez-rte mark.spez-rte-comment[data-visible] {
  background: var(--rte-comment-bg);
  border-bottom: 2px solid rgba(255, 170, 0, 0.8);
  cursor: pointer;
}
.spez-rte mark.spez-rte-comment[data-active] {
  background: var(--rte-comment-active-bg);
}

.spez-rte .spez-rte-diagram { margin: 0.75em 0; }
/* overflow + contain: a diagram's root-svg transform or margin cannot paint over host content. */
.spez-rte .spez-rte-diagram-figure { margin: 0; overflow: hidden; contain: paint; text-align: center; }
.spez-rte .spez-rte-diagram-figure svg { max-width: 100%; height: auto; }
.spez-rte .spez-rte-diagram-error { color: #c62828; font-size: 0.875em; }
.spez-rte .spez-rte-diagram-pending { color: var(--rte-muted); }
`;

export function injectGlobalStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = styles;
  doc.head.appendChild(style);
}
