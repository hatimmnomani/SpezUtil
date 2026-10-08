import type { LocaleStrings } from "./locale";
import { createIcon } from "./toolbar-icons";
import { formatShortcut } from "./toolbar-a11y";

export interface MoreEntry {
  /** The control, already built; it is moved (never cloned) into the menu so its listeners survive. */
  element: HTMLElement;
  label: string;
  shortcut?: string;
}

export interface MoreSectionContent {
  id: string;
  title: string | null;
  entries: MoreEntry[];
}

export interface MoreMenu {
  root: HTMLElement;
  trigger: HTMLButtonElement;
  panel: HTMLElement;
  /** Holds the groups that overflowed out of the row; hidden while empty. */
  responsive: HTMLElement;
  responsiveBody: HTMLElement;
  isOpen: () => boolean;
  open: (focusFirst?: boolean) => void;
  close: (restoreFocus?: boolean) => void;
  /** Re-checks whether anything inside is switched on (shows the dot on the trigger). */
  refreshActive: () => void;
  dispose: () => void;
}

let counter = 0;

const FOCUSABLE = "button:not(:disabled), select:not(:disabled), input:not(:disabled)";

/**
 * The More menu: a disclosure button plus a panel of labelled rows. Keyboard: Enter, Space or ArrowDown
 * open it and move into it; ArrowUp/Down walk the buttons, Tab walks every control, Escape (from anywhere in the menu or the editor) closes it and
 * returns to the button, and focus leaving the menu closes it.
 */
export function createMoreMenu(t: LocaleStrings, sections: readonly MoreSectionContent[]): MoreMenu {
  const id = `spez-rte-more-${++counter}`;
  const root = document.createElement("div");
  root.className = "spez-rte-more";

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "spez-rte-more__btn";
  trigger.dataset.item = "more";
  trigger.title = t.moreFormatting;
  trigger.setAttribute("aria-label", t.moreFormatting);
  trigger.setAttribute("aria-haspopup", "true");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", id);
  trigger.append(createIcon("more"));
  // Like every toolbar control, pressing it must not take focus (and the selection) out of the editor.
  trigger.addEventListener("pointerdown", (event) => event.preventDefault());

  const panel = document.createElement("div");
  panel.className = "spez-rte-more__panel";
  panel.id = id;
  panel.setAttribute("role", "group");
  panel.setAttribute("aria-label", t.moreFormatting);
  panel.hidden = true;

  for (const section of sections) {
    if (section.entries.length === 0) continue;
    const el = document.createElement("section");
    el.className = "spez-rte-more__section";
    el.dataset.section = section.id;
    if (section.title) {
      const heading = document.createElement("h3");
      heading.className = "spez-rte-more__title";
      heading.textContent = section.title;
      el.append(heading);
    }
    for (const entry of section.entries) el.append(row(entry));
    panel.append(el);
  }

  const responsive = document.createElement("section");
  responsive.className = "spez-rte-more__section spez-rte-more__section--responsive";
  responsive.hidden = true;
  const responsiveTitle = document.createElement("h3");
  responsiveTitle.className = "spez-rte-more__title";
  responsiveTitle.textContent = t.moreTools;
  const responsiveBody = document.createElement("div");
  responsiveBody.className = "spez-rte-more__responsive";
  responsive.append(responsiveTitle, responsiveBody);
  panel.append(responsive);

  root.append(trigger, panel);

  const isOpen = (): boolean => !panel.hidden;

  const open = (focusFirst = false): void => {
    if (!isOpen()) root.ownerDocument.addEventListener("keydown", onDocKey, true);
    panel.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    if (focusFirst) panel.querySelector<HTMLElement>(FOCUSABLE)?.focus();
  };

  const close = (restoreFocus = false): void => {
    if (!isOpen()) return;
    root.ownerDocument.removeEventListener("keydown", onDocKey, true);
    panel.hidden = true;
    trigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) trigger.focus();
  };

  const refreshActive = (): void => {
    // Only the menu's own sections count: a collapsed group's default state (left-to-right, say) is not news.
    const on = panel.querySelector('.spez-rte-more__section:not(.spez-rte-more__section--responsive) button[aria-pressed="true"]');
    trigger.toggleAttribute("data-active", on !== null);
  };

  const onTriggerClick = (event: MouseEvent): void => {
    if (isOpen()) close();
    // A click with no pointer (Enter / Space) is keyboard-driven: move into the menu.
    else open(event.detail === 0);
  };
  const onTriggerKey = (event: KeyboardEvent): void => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      open(true);
    }
  };
  /**
   * Escape, while open, wherever focus is: a mouse open leaves focus in the editor (the trigger does not take
   * it), so a listener on the panel alone would never hear the key. Heard in the capture phase at the document
   * and consumed there, so the editor's own Escape (leaving a table, say) does not also run. Only Escapes
   * aimed at this editor (or at nothing) count; another widget on the page keeps its own Escape.
   */
  const onDocKey = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !isOpen()) return;
    // A popover opened from here (the Hijri date picker) takes its own Escape first.
    if (root.ownerDocument.querySelector(".spez-rte-popover")) return;
    const target = event.target as Node | null;
    const host = root.closest(".spez-rte");
    const doc = root.ownerDocument;
    const mine = target === doc.body || target === doc.documentElement || target === doc || (host !== null && target !== null && host.contains(target));
    if (!mine) return;
    event.stopPropagation();
    close(true);
  };
  const onPanelKey = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const target = event.target as HTMLElement;
    // A <select> uses these keys itself; leave it to Tab to move on.
    if (target.tagName === "SELECT" || target.tagName === "INPUT") return;
    const list = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => !el.closest("[hidden]"));
    const index = list.indexOf(target);
    if (index < 0) return;
    event.preventDefault();
    const step = event.key === "ArrowDown" ? 1 : event.key === "ArrowUp" ? -1 : 0;
    const next =
      event.key === "Home"
        ? list[0]
        : event.key === "End"
          ? list[list.length - 1]
          : list[(index + step + list.length) % list.length];
    next?.focus();
  };
  // A control that acts at once closes the menu behind it; one that opens a popover keeps it (its anchor).
  const onPanelClick = (event: Event): void => {
    const btn = (event.target as Element | null)?.closest("button");
    if (!btn || !panel.contains(btn) || btn.hasAttribute("aria-haspopup")) return;
    close();
  };
  const onPanelChange = (): void => close();
  const onFocusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && !root.contains(next) && !root.ownerDocument.querySelector(".spez-rte-popover")) close();
  };
  const onDocPointer = (event: Event): void => {
    if (!isOpen() || root.contains(event.target as Node)) return;
    // A popover opened from a button in the menu is outside it, and clicking it must not close the menu.
    if ((event.target as Element | null)?.closest?.(".spez-rte-popover")) return;
    close();
  };

  trigger.addEventListener("click", onTriggerClick);
  trigger.addEventListener("keydown", onTriggerKey);
  panel.addEventListener("keydown", onPanelKey);
  panel.addEventListener("click", onPanelClick);
  panel.addEventListener("change", onPanelChange);
  root.addEventListener("focusout", onFocusOut);
  root.ownerDocument.addEventListener("pointerdown", onDocPointer, true);

  const observer = typeof MutationObserver === "function" ? new MutationObserver(refreshActive) : null;
  observer?.observe(panel, { subtree: true, attributes: true, attributeFilter: ["aria-pressed"] });
  refreshActive();

  return {
    root,
    trigger,
    panel,
    responsive,
    responsiveBody,
    isOpen,
    open,
    close,
    refreshActive,
    dispose: () => {
      observer?.disconnect();
      root.ownerDocument.removeEventListener("pointerdown", onDocPointer, true);
      root.ownerDocument.removeEventListener("keydown", onDocKey, true);
    },
  };
}

/** `label` + the control itself; pressing the label presses the control. */
function row(entry: MoreEntry): HTMLElement {
  const el = document.createElement("div");
  el.className = "spez-rte-more__row";
  const text = document.createElement("span");
  text.className = "spez-rte-more__label";
  text.textContent = entry.label;
  if (entry.shortcut) {
    const kbd = document.createElement("kbd");
    kbd.textContent = formatShortcut(entry.shortcut);
    text.append(" ", kbd);
  }
  const control = entry.element;
  if (control instanceof HTMLButtonElement) {
    el.append(control, text);
    el.addEventListener("pointerdown", (event) => {
      if (event.target !== control && !control.contains(event.target as Node)) event.preventDefault();
    });
    el.addEventListener("click", (event) => {
      if (event.target !== control && !control.contains(event.target as Node)) control.click();
    });
  } else {
    el.classList.add("spez-rte-more__row--field");
    // A <select> labelled by the row text as well as its own aria-label.
    el.append(text, control);
  }
  return el;
}

/** A row that holds a whole group moved out of the toolbar row. */
export function groupRow(label: string, group: HTMLElement): HTMLElement {
  const el = document.createElement("div");
  el.className = "spez-rte-more__row spez-rte-more__row--group";
  el.dataset.rowGroup = group.dataset.group ?? "";
  const text = document.createElement("span");
  text.className = "spez-rte-more__label";
  text.textContent = label;
  const holder = document.createElement("div");
  holder.className = "spez-rte-more__groups";
  holder.append(group);
  el.append(text, holder);
  return el;
}
