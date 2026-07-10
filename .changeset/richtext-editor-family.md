---
"@spezutil/richtext-editor": minor
"@spezutil/richtext-editor-react": minor
"@spezutil/richtext-editor-angular": minor
"@spezutil/hijri-calendar": patch
"@spezutil/hijri-datepicker": patch
---

Add `@spezutil/richtext-editor` (`<spez-richtext>`), a rich-text editor Web Component for Arabic / Lisan-ud-Dawat content built on Lexical, with React and Angular wrappers. Features: core formatting with RTL auto-direction, ayat and transliteration-pair content blocks, atomic Hijri date tokens (via `@spezutil/hijri-core`, with optional `<hijri-datepicker>` popover), links/images/tables, Lexical JSON + HTML output, embedded Al-Kanz font applied to Arabic text via `unicode-range`, and an en/ar-localized toolbar. The editor renders in light DOM because Lexical selection does not work inside shadow roots.

The font generator (`scripts/generate-font-asset.mjs`) now also emits `alKanzFontDataUrl` and annotates exports with `: string`; `hijri-calendar` and `hijri-datepicker` pick up the regenerated font module (no behavior change).
