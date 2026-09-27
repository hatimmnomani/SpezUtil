# @spezutil/lud-codec

Converts Lisan ud-Dawat text between how people type it for legacy fonts and Unicode.

Legacy LuD fonts (Al Kanz, Al-Fatemi, Kanz al-Marjaan) have no glyphs for letters such as ٹ ڈ ڑ ں ے.
Users type doubled Arabic letters instead (`ثث`, `طط`, `سس`, …) and the font draws them as one letter.
Store the Unicode; convert at the edges.

```ts
import { toUnicode, toDisplayHtml } from "@spezutil/lud-codec";

toUnicode("نسس", "al-kanz");        // "نے"   — save this
toDisplayHtml("نے", "al-kanz");     // "نسس"  — render inside font-family: AL-KANZ
```

- One JSON profile per font in `profiles/`. `al-kanz` is confirmed. `al-fatemi` and `kanz-al-marjaan`
  are **drafts** (meanings assumed from Al Kanz) and are ignored unless you pass `{ allowDraft: true }`.
- Letters a font cannot draw and has no sequence for are returned as fallback segments, which
  `toDisplayHtml` wraps in `<span class="lud-fallback">` using the profile's `fallbackFont`.
- `ـــــ` (five tatweels) is preserved verbatim.
- This package ships **no font files**. Declare the fonts yourself with `@font-face`.
- New fonts: run `tools/lud-font-probe`, have a person confirm the meanings, add
  `profiles/<id>.json` + `<id>.corpus.json`, and import the profile in `src/registry.ts`.
- The mahadalzahrawebapi C# port reads these same files; after changing a profile, re-run its
  `scripts/sync-lud-profiles.sh`.
