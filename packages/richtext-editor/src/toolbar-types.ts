/** One entry in the toolbar font selector. `family` is a CSS font-family value. */
export interface FontOption {
  label: string;
  family: string;
}

/** One entry in the toolbar font-size selector. `size` is a CSS length (e.g. `"16px"`). */
export interface FontSizeOption {
  label: string;
  size: string;
}

/**
 * How the toolbar sits relative to the content.
 *  - `static`: in the normal flow above the content (the default).
 *  - `sticky`: pinned to the top of its scroll container while the content scrolls under it.
 *  - `focus`: hidden until the editor has focus (or {@link SpezRichtext.toolbarPinned} is set), then
 *    overlaid on the top of the content so nothing shifts.
 */
export type ToolbarMode = "static" | "sticky" | "focus";

export const TOOLBAR_MODES: readonly ToolbarMode[] = ["static", "sticky", "focus"];
