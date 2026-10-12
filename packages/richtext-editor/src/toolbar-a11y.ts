/** Keyboard-shortcut text and the roving-tabindex behaviour of the toolbar (WAI-ARIA APG "toolbar" pattern). */

export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? nav.platform ?? nav.userAgent ?? "";
  return /Mac|iPhone|iPad|iPod/.test(platform);
}

/**
 * Human text for a shortcut spec: `mod+shift+Z` is `⌘⇧Z` on Apple platforms and `Ctrl+Shift+Z` elsewhere.
 */
export function formatShortcut(spec: string, apple: boolean = isApplePlatform()): string {
  const parts = spec.split("+").map((part) => {
    if (part === "mod") return apple ? "⌘" : "Ctrl";
    if (part === "shift") return apple ? "⇧" : "Shift";
    if (part === "alt") return apple ? "⌥" : "Alt";
    return part.length === 1 ? part.toUpperCase() : part;
  });
  return apple ? parts.join("") : parts.join("+");
}

/** The `aria-keyshortcuts` value for a spec (`Meta+Shift+Z` on Apple, `Control+Shift+Z` elsewhere). */
export function ariaKeyShortcuts(spec: string, apple: boolean = isApplePlatform()): string {
  return spec
    .split("+")
    .map((part) => {
      if (part === "mod") return apple ? "Meta" : "Control";
      if (part === "shift") return "Shift";
      if (part === "alt") return "Alt";
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join("+");
}

/** True when `el` renders right-to-left: the nearest `dir` attribute wins, else the computed direction. */
export function isRtl(el: Element): boolean {
  const owner = el.closest("[dir]");
  const dir = owner?.getAttribute("dir");
  if (dir === "rtl") return true;
  if (dir === "ltr") return false;
  return typeof getComputedStyle === "function" && getComputedStyle(el).direction === "rtl";
}

export interface RovingToolbar {
  /** Re-evaluate which controls take part (call after controls are added, moved, enabled or disabled). */
  refresh: () => void;
  /** Moves focus to the control that currently holds the tab stop. */
  focus: () => void;
  dispose: () => void;
}

export interface RovingOptions {
  /** Controls inside these containers keep their own navigation (the More menu panel). */
  excludeWithin?: (el: Element) => boolean;
  /** Called for Escape pressed on a toolbar control (to hand focus back to the editor). */
  onEscape?: () => void;
}

const CONTROLS = "button, select, input, [role='button']";

/**
 * One control sits in the tab order (`tabindex=0`); the rest are `-1`. Left/Right (mirrored under RTL)
 * move between controls, Home/End jump to the ends. On a `<select>` Left/Right still move on, while
 * Up/Down (and Home/End) are left to the control.
 */
export function installRovingToolbar(toolbar: HTMLElement, options: RovingOptions = {}): RovingToolbar {
  let current: HTMLElement | null = null;

  const participants = (): HTMLElement[] =>
    Array.from(toolbar.querySelectorAll<HTMLElement>(CONTROLS)).filter(
      (el) =>
        !(el as HTMLButtonElement).disabled &&
        !el.closest("[hidden]") &&
        !options.excludeWithin?.(el),
    );

  const refresh = (): void => {
    const list = participants();
    for (const el of toolbar.querySelectorAll<HTMLElement>(CONTROLS)) {
      // Controls that left the row (into the More menu) go back to the natural tab order.
      if (options.excludeWithin?.(el)) el.removeAttribute("tabindex");
      else el.tabIndex = -1;
    }
    if (current === null || !list.includes(current)) current = list[0] ?? null;
    if (current) current.tabIndex = 0;
  };

  const onFocusIn = (event: FocusEvent): void => {
    const target = event.target as HTMLElement;
    if (!participants().includes(target)) return;
    if (current && current !== target) current.tabIndex = -1;
    current = target;
    target.tabIndex = 0;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement;
    if (event.key === "Escape") {
      if (!options.excludeWithin?.(target)) options.onEscape?.();
      return;
    }
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const list = participants();
    const index = list.indexOf(target);
    if (index < 0) return;
    const isSelect = target.tagName === "SELECT";
    const rtl = isRtl(toolbar);
    let next: HTMLElement | undefined;
    switch (event.key) {
      case "ArrowRight":
        next = list[(index + (rtl ? -1 : 1) + list.length) % list.length];
        break;
      case "ArrowLeft":
        next = list[(index + (rtl ? 1 : -1) + list.length) % list.length];
        break;
      case "Home":
        if (isSelect) return;
        next = list[0];
        break;
      case "End":
        if (isSelect) return;
        next = list[list.length - 1];
        break;
      default:
        return;
    }
    event.preventDefault();
    next?.focus();
  };

  toolbar.addEventListener("focusin", onFocusIn);
  toolbar.addEventListener("keydown", onKeyDown);
  refresh();

  return {
    refresh,
    focus: () => {
      refresh();
      current?.focus();
    },
    dispose: () => {
      toolbar.removeEventListener("focusin", onFocusIn);
      toolbar.removeEventListener("keydown", onKeyDown);
    },
  };
}
