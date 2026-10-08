import type { LocaleStrings } from "./locale";
import type { PopoverOpener } from "./toolbar-registry";

export type ColorProperty = "color" | "background-color";

export interface PaletteEntry {
  name: keyof LocaleStrings;
  value: string;
}

export const TEXT_COLORS: readonly PaletteEntry[] = [
  { name: "colorBlack", value: "#000000" },
  { name: "colorDarkGray", value: "#4b5563" },
  { name: "colorGray", value: "#9ca3af" },
  { name: "colorBrown", value: "#6d4c41" },
  { name: "colorRed", value: "#c62828" },
  { name: "colorOrange", value: "#ef6c00" },
  { name: "colorYellow", value: "#f9a825" },
  { name: "colorGreen", value: "#2e7d32" },
  { name: "colorTeal", value: "#00838f" },
  { name: "colorBlue", value: "#1565c0" },
  { name: "colorPurple", value: "#6a1b9a" },
  { name: "colorPink", value: "#ad1457" },
];

export const HIGHLIGHT_COLORS: readonly PaletteEntry[] = [
  { name: "colorYellow", value: "#fff59d" },
  { name: "colorOrange", value: "#ffe0b2" },
  { name: "colorRed", value: "#ffcdd2" },
  { name: "colorPink", value: "#f8bbd0" },
  { name: "colorPurple", value: "#e1bee7" },
  { name: "colorBlue", value: "#bbdefb" },
  { name: "colorTeal", value: "#b2dfdb" },
  { name: "colorGreen", value: "#c8e6c9" },
  { name: "colorBrown", value: "#d7ccc8" },
  { name: "colorGray", value: "#e0e0e0" },
  { name: "colorDarkGray", value: "#bdbdbd" },
  { name: "colorWhite", value: "#ffffff" },
];

const PALETTE_COLUMNS = 6;

/** `<input type="color">` only accepts `#rrggbb`; stored styles may be any CSS color. */
export function toHexColor(value: string): string | null {
  const v = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(v)) return v;
  if (/^#[0-9a-f]{3}$/.test(v)) return `#${[...v.slice(1)].map((c) => c + c).join("")}`;
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(v);
  if (rgb) {
    return `#${rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return null;
}

const POPOVER_INSET = 8;

/**
 * Popover under the toolbar, aligned to `anchor`'s inline-start edge when
 * given (clamped inside the host); closes on Escape or outside pointerdown.
 */
export function createPopoverOpener(host: HTMLElement, toolbar: HTMLElement) {
  let activeClose: (() => void) | null = null;
  return (content: HTMLElement, anchor?: HTMLElement): (() => void) => {
    activeClose?.();
    const pop = document.createElement("div");
    pop.className = "spez-rte-popover";
    pop.style.insetBlockStart = `${toolbar.offsetTop + toolbar.offsetHeight + 2}px`;
    pop.append(content);
    host.append(pop);
    let start = POPOVER_INSET;
    if (anchor) {
      const hostRect = host.getBoundingClientRect();
      const rect = anchor.getBoundingClientRect();
      const rtl = getComputedStyle(host).direction === "rtl";
      start = rtl ? hostRect.right - rect.right : rect.left - hostRect.left;
      start = Math.max(POPOVER_INSET, Math.min(start, host.clientWidth - pop.offsetWidth - POPOVER_INSET));
      anchor.setAttribute("aria-expanded", "true");
    }
    pop.style.insetInlineStart = `${start}px`;
    const onPointerDown = (event: Event) => {
      if (!pop.contains(event.target as Node)) close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const close = () => {
      if (activeClose === close) activeClose = null;
      pop.remove();
      anchor?.setAttribute("aria-expanded", "false");
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    activeClose = close;
    const focusTarget = pop.querySelector<HTMLElement>("[data-autofocus], input");
    if (focusTarget) focusTarget.focus();
    return close;
  };
}

export function colorPopover(
  property: ColorProperty,
  palette: readonly PaletteEntry[],
  current: string,
  t: LocaleStrings,
  apply: (value: string | null, merge: boolean) => void,
  done: () => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "spez-rte-color-popover";
  wrap.dataset.property = property;

  const grid = document.createElement("div");
  grid.className = "spez-rte-color-grid";
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", property === "color" ? t.textColor : t.highlightColor);
  const currentHex = toHexColor(current);
  const swatches: HTMLButtonElement[] = [];
  for (const { name, value } of palette) {
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "spez-rte-swatch";
    swatch.style.setProperty("--swatch", value);
    swatch.title = t[name];
    swatch.setAttribute("aria-label", t[name]);
    swatch.setAttribute("aria-pressed", String(value === currentHex));
    swatch.dataset.value = value;
    swatch.addEventListener("click", () => {
      apply(value, false);
      done();
    });
    swatches.push(swatch);
    grid.append(swatch);
  }
  (swatches.find((s) => s.getAttribute("aria-pressed") === "true") ?? swatches[0])?.setAttribute(
    "data-autofocus",
    "",
  );
  grid.addEventListener("keydown", (event) => {
    const index = swatches.indexOf(event.target as HTMLButtonElement);
    if (index === -1) return;
    const rtl = getComputedStyle(grid).direction === "rtl";
    const delta: Record<string, number> = {
      ArrowRight: rtl ? -1 : 1,
      ArrowLeft: rtl ? 1 : -1,
      ArrowDown: PALETTE_COLUMNS,
      ArrowUp: -PALETTE_COLUMNS,
    };
    const step = delta[event.key];
    if (step === undefined) return;
    const next = swatches[index + step];
    if (next) {
      event.preventDefault();
      next.focus();
    }
  });

  const actions = document.createElement("div");
  actions.className = "spez-rte-color-actions";

  const custom = document.createElement("label");
  custom.className = "spez-rte-color-custom";
  const preview = document.createElement("span");
  preview.className = "spez-rte-color-preview";
  const input = document.createElement("input");
  input.type = "color";
  input.value = currentHex ?? (property === "color" ? "#000000" : "#ffff00");
  input.setAttribute("aria-label", t.customColor);
  preview.style.setProperty("--swatch", input.value);
  // Browsers fire `input` continuously while the native picker is open; the
  // first pick creates one history entry and later ones merge into it, so
  // undo reverts the whole picking session at once.
  let picking = false;
  let lastApplied: string | null = null;
  const applyCustom = () => {
    if (input.value === lastApplied) return;
    lastApplied = input.value;
    preview.style.setProperty("--swatch", input.value);
    apply(input.value, picking);
    picking = true;
  };
  input.addEventListener("input", applyCustom);
  input.addEventListener("change", () => {
    applyCustom();
    done();
  });
  custom.append(preview, input, document.createTextNode(t.customColor));

  const reset = document.createElement("button");
  reset.type = "button";
  reset.className = "spez-rte-color-reset";
  reset.textContent = t.resetColor;
  reset.addEventListener("click", () => {
    apply(null, false);
    done();
  });

  actions.append(custom, reset);
  wrap.append(grid, actions);
  return wrap;
}

export function textInputPopover(
  placeholder: string,
  submitLabel: string,
  onSubmit: (value: string) => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.style.display = "contents";
  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = placeholder;
  const ok = document.createElement("button");
  ok.type = "button";
  ok.textContent = submitLabel;
  const submit = () => {
    const value = input.value.trim();
    if (value) onSubmit(value);
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      submit();
    }
  });
  ok.addEventListener("click", submit);
  wrap.append(input, ok);
  return wrap;
}

