---
"@spezutil/hijri-calendar": patch
---

Fix horizontal scrolling in the week (and day) time grid at the `medium` and `narrow` bands. The head, all-day and body rows were sized to the scroll container's visible width instead of the width of their columns, so `.tg-body`'s `overflow-x: clip` cut the scrolled body off short of the header, and the pinned corner and all-day label came unpinned near the end of the scroll range. Each row now gets a `min-width` equal to the gutter plus `N × --hcal-column-min-width`. The pinned gutter, corner and all-day label also paint an opaque base under `--hcal-gutter-bg`, so columns no longer show through them while scrolled. The `wide` band render is unchanged.
