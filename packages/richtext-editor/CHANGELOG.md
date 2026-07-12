# @spezutil/richtext-editor

## 0.2.0

### Minor Changes

- 0534a7a: Replace the embedded Al-Kanz Arabic font with Amiri (SIL Open Font License 1.1).

  Al-Kanz was removed because no redistribution license exists for it. Amiri is
  OFL-1.1 licensed, which permits embedding and redistribution; the license text
  ships in the repository at `assets/fonts/OFL-Amiri.txt`.

  The default value of the Arabic font CSS custom properties
  (`--hcal-font-family-arabic`, `--dtp-font-family-arabic`,
  `--rte-font-family-arabic`, `--rte-font-family`) changes from `"Al-Kanz", …` to
  `"Amiri", …`. Consumers who relied on the embedded Al-Kanz should load their own
  licensed copy and override the custom property.

- 0534a7a: Add a font-family selector to the `<spez-richtext>` toolbar.

  - New `font` toolbar group: end users apply a font to the selected text
    (inline `font-family` style, preserved across HTML export/import).
  - Configurable via the new `fonts` property (`FontOption[]`; replaces the
    defaults — spread the exported `DEFAULT_FONTS` to extend them) or the simple
    `fonts="Amiri, Tahoma"` attribute form.
  - React wrapper accepts `fonts` as a prop; the Angular wrapper adds a `fonts`
    `@Input`. Both re-export `FontOption` and `DEFAULT_FONTS`.
  - Localized control labels (en/ar).

## 0.1.0

### Minor Changes

- Initial public release of the `<spez-richtext>` Web Component, including localized formatting,
  RTL auto-direction, ayat and transliteration blocks, Hijri date tokens, links, images, tables,
  Lexical JSON and HTML persistence, and the embedded Al-Kanz font.
