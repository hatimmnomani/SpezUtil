---
"@spezutil/richtext-editor": patch
---

Tables can now be removed from the keyboard. Backspace at the start of the first cell (or Delete at the end of the last cell) removes an empty table, or selects a non-empty one so the next press deletes it. Backspace/Delete from the block right after/before a table selects the table instead of eating that line.
