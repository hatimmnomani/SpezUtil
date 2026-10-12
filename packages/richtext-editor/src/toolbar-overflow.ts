import { groupRow, type MoreMenu } from "./toolbar-more";

export interface OverflowGroup {
  id: string;
  element: HTMLElement;
  /** Row label in the More menu while collapsed. */
  label: string;
}

export interface OverflowOptions {
  toolbar: HTMLElement;
  more: MoreMenu;
  /** Collapsible groups, in collapse order: the first is given up first. */
  groups: readonly OverflowGroup[];
  /** True when the More menu has controls of its own (then its button always shows). */
  moreHasContent: boolean;
  /** Overridable for tests; default compares `scrollWidth` with `clientWidth`. */
  isOverflowing?: () => boolean;
  /** Called after a pass moved anything (the toolbar re-reads its tab order). */
  onChange?: () => void;
}

export interface OverflowController {
  /** Re-fits the toolbar now. `force` skips the "width unchanged" shortcut. */
  update: (force?: boolean) => void;
  /** Ids of the groups currently inside More. */
  collapsed: () => string[];
  dispose: () => void;
}

/**
 * Priority+ overflow. Groups move (never clone, so their listeners and `aria-pressed` sync survive) into the
 * More menu one at a time, least important first, until the row fits, and move back when width returns. If
 * the row still does not fit with everything collapsed (a phone), it wraps rather than clipping.
 */
export function createOverflowController(options: OverflowOptions): OverflowController {
  const { toolbar, more, groups } = options;
  const overflowing = options.isOverflowing ?? ((): boolean => toolbar.scrollWidth > toolbar.clientWidth + 1);
  const slots = new Map<string, Comment>();
  for (const g of groups) {
    const marker = document.createComment(`spez-rte-slot-${g.id}`);
    g.element.before(marker);
    slots.set(g.id, marker);
  }
  let collapsed: string[] = [];
  let lastWidth = -1;
  let frame = 0;
  let disposed = false;

  const restore = (): void => {
    for (const g of groups) {
      if (!collapsed.includes(g.id)) continue;
      slots.get(g.id)?.after(g.element);
    }
    more.responsiveBody.replaceChildren();
    collapsed = [];
  };

  const update = (force = false): void => {
    if (disposed) return;
    const width = toolbar.clientWidth;
    if (width === 0) return; // not on screen (a hidden tab): measure when it is
    if (!force && width === lastWidth) return;
    lastWidth = width;

    const before = collapsed.join();
    restore();
    toolbar.classList.remove("spez-rte-toolbar--wrap");
    more.root.hidden = false;

    for (const g of groups) {
      if (!overflowing()) break;
      more.responsiveBody.append(groupRow(g.label, g.element));
      collapsed.push(g.id);
    }
    // Nothing left to give up and still too wide: wrap rather than clip.
    if (overflowing()) toolbar.classList.add("spez-rte-toolbar--wrap");

    more.responsive.hidden = collapsed.length === 0;
    toolbar.toggleAttribute("data-collapsed", collapsed.length > 0);
    more.root.hidden = !options.moreHasContent && collapsed.length === 0;
    more.refreshActive();
    if (collapsed.join() !== before) options.onChange?.();
  };

  const schedule = (force = false): void => {
    if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
    if (typeof requestAnimationFrame === "function") frame = requestAnimationFrame(() => update(force));
    else update(force);
  };

  const observer = typeof ResizeObserver === "function" ? new ResizeObserver(() => schedule()) : null;
  observer?.observe(toolbar);
  // Web fonts change control widths once they load (select text, Arabic labels): measure again then.
  const refit = (): void => schedule(true);
  const fonts = typeof document !== "undefined" ? document.fonts : undefined;
  void fonts?.ready.then(refit);
  fonts?.addEventListener?.("loadingdone", refit);
  schedule(true);

  return {
    update,
    collapsed: () => [...collapsed],
    dispose: () => {
      disposed = true;
      if (typeof cancelAnimationFrame === "function") cancelAnimationFrame(frame);
      observer?.disconnect();
      fonts?.removeEventListener?.("loadingdone", refit);
      restore();
    },
  };
}
