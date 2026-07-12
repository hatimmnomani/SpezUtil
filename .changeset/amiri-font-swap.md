---
"@spezutil/hijri-calendar": minor
"@spezutil/hijri-datepicker": minor
"@spezutil/richtext-editor": minor
---

Replace the embedded Al-Kanz Arabic font with Amiri (SIL Open Font License 1.1).

Al-Kanz was removed because no redistribution license exists for it. Amiri is
OFL-1.1 licensed, which permits embedding and redistribution; the license text
ships in the repository at `assets/fonts/OFL-Amiri.txt`.

The default value of the Arabic font CSS custom properties
(`--hcal-font-family-arabic`, `--dtp-font-family-arabic`,
`--rte-font-family-arabic`, `--rte-font-family`) changes from `"Al-Kanz", …` to
`"Amiri", …`. Consumers who relied on the embedded Al-Kanz should load their own
licensed copy and override the custom property.
