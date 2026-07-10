# db-sotware-packages

pnpm/turbo monorepo. Published scope: `@spezutil/*`. Hijri (Bohra/Misri) calendar + datepicker web components, plain + Angular/React wrappers.

## Packages

- `hijri-core` — zero-dep Hijri calendar engine (JD conversion, tabular calc, locale strings, formatting). No DOM.
- `hijri-view-core` — pure view-model builders (month grid, time grid, agenda, event layout). No DOM, no styling.
- `hijri-calendar` — `<hijri-calendar>` Web Component (month/week/day/agenda views + events). Ships CSS-in-JS (`src/styles.ts`).
- `hijri-datepicker` — `<hijri-datepicker>` Web Component (single/range date picker + optional time). Ships CSS-in-JS (`src/styles.ts`).
- `richtext-editor` — `<spez-richtext>` rich-text editor Web Component for Arabic / Lisan-ud-Dawat content, built on Lexical (`lexical` + `@lexical/*` as regular deps, version-matched). Ayat blocks, transliteration pairs, atomic Hijri date tokens, RTL auto-direction, en/ar toolbar. **Renders in light DOM** (Lexical selection breaks in shadow roots — facebook/lexical#8125); styles are `spez-rte-`-prefixed and injected once into `document.head`. `@spezutil/hijri-datepicker` is an optional peer, feature-detected at runtime for the date-picker popover.
- `hijri-calendar-angular`, `hijri-calendar-react`, `hijri-datepicker-angular`, `hijri-datepicker-react`, `richtext-editor-angular`, `richtext-editor-react` — thin wrappers around the above Web Components, no own styling.

Build: `tsup` per package (`pnpm --filter <pkg> build`). Test: `vitest` (`pnpm --filter <pkg> test`).

## Arabic / Hijri numeral font (Al-Kanz)

`hijri-calendar` and `hijri-datepicker` embed the **Al-Kanz** TrueType font (base64 `@font-face`, inlined into the compiled JS — no extra network request, no asset path to resolve) and use it **by default** for Arabic-locale text and Hijri day numerals: day-number spans (`.num-primary`/`.num-secondary`), weekday labels (`.dow`), and the Hijri month/year title (`.title`, but not `.title small`, which carries the Gregorian sub-label and stays on the base font).

- Source font: `assets/fonts/Al-Kanz.ttf` (repo root, tracked in git).
- Generated modules (do not hand-edit): `packages/hijri-calendar/src/font-al-kanz.ts`, `packages/hijri-datepicker/src/font-al-kanz.ts`, `packages/richtext-editor/src/font-al-kanz.ts`.
- Regenerate after replacing the font file: `node scripts/generate-font-asset.mjs`.
- The generated module exports `alKanzFontFace` (a full `@font-face` rule) and `alKanzFontDataUrl` (the raw data URL, used by `richtext-editor` to declare its own `@font-face` with `unicode-range` so Al-Kanz applies only to Arabic codepoints). Exports are annotated `: string` — without that, TypeScript inlines the ~520 KB literal into every consumer's `.d.ts`.
- CSS custom properties (per-component, override on the host element to configure):
  - `hijri-calendar`: `--hcal-font-family-arabic` (default `"Al-Kanz", "Traditional Arabic", serif`), `--hcal-font-family` (default `system-ui, sans-serif`, used for non-Arabic text).
  - `hijri-datepicker`: `--dtp-font-family-arabic` (default `"Al-Kanz", "Traditional Arabic", serif`), `--dtp-font-family` (default `system-ui, sans-serif`).
  - `richtext-editor`: `--rte-font-family-arabic` (default `"Al-Kanz", "Traditional Arabic", serif`), `--rte-font-family` (default `"Al-Kanz", system-ui, sans-serif` — Al-Kanz first is safe because its `@font-face` is restricted to Arabic `unicode-range`).

Example override:

```css
hijri-calendar {
  --hcal-font-family-arabic: "My Custom Arabic Font", serif;
}
```

Each font adds ~520 KB (base64) to that package's `dist`. This is a known, accepted tradeoff for a self-contained Web Component (no runtime asset resolution needed by consumers). If a new component package needs the same treatment, extend `scripts/generate-font-asset.mjs`'s `targets` list rather than duplicating the encoding logic.
