---
"@spezutil/hijri-datepicker": patch
---

With `enable-time`, picking a day now commits the time the spinner displays (00:00 when none was set) in both the `value` attribute and the `change` event (`detail.time`, `gregorian` as `YYYY-MM-DDTHH:mm`). Previously the spinner showed "12:00 AM" but the first day pick emitted a date-only value until the spinner was edited.
