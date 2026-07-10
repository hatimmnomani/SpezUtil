import { $createParagraphNode, $getRoot, type LexicalEditor } from "lexical";
import { $canShowPlaceholder } from "@lexical/text";
import type { HijriDate } from "@spezutil/hijri-core";
import { createEditorInstance } from "./editor";
import { exportHTML, importHTML } from "./html";
import { insertHijriDate } from "./hijri-insert";
import { injectGlobalStyles } from "./styles";
import {
  ALL_TOOLBAR_GROUPS,
  buildToolbar,
  type ToolbarGroup,
  type ToolbarInstance,
} from "./toolbar";
import type { EditorLocale } from "./locale";
import { DEFAULT_HIJRI_FORMAT } from "./nodes/hijri-date-node";

export interface ChangeDetail {
  json: string;
  isEmpty: boolean;
}

const SET_VALUE_TAG = "spez-set-value";
const CHANGE_DEBOUNCE_MS = 150;

/**
 * `<spez-richtext>` — rich-text editor for Arabic / Lisan-ud-Dawat content.
 *
 * Renders in light DOM: Lexical's selection handling relies on
 * window.getSelection(), which does not work inside shadow roots.
 */
export class SpezRichtext extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["readonly", "placeholder", "dir", "locale", "toolbar"];
  }

  #editor: LexicalEditor | null = null;
  #disposeEditor: (() => void) | null = null;
  #toolbar: ToolbarInstance | null = null;
  #shell: HTMLElement | null = null;
  #editable: HTMLElement | null = null;
  #placeholderEl: HTMLElement | null = null;
  #pendingValue: string | null = null;
  #pendingHtml: string | null = null;
  #changeTimer: ReturnType<typeof setTimeout> | undefined;

  /** Escape hatch for advanced consumers; throws before first connect. */
  get editor(): LexicalEditor {
    if (this.#editor === null) {
      throw new Error("<spez-richtext> is not connected yet");
    }
    return this.#editor;
  }

  /** Serialized Lexical editor state JSON (canonical persistence format). */
  get value(): string | null {
    if (this.#editor === null) return this.#pendingValue;
    return JSON.stringify(this.#editor.getEditorState().toJSON());
  }

  set value(v: string | null) {
    if (this.#editor === null) {
      this.#pendingValue = v;
      return;
    }
    if (v == null) return;
    this.#editor.setEditorState(this.#editor.parseEditorState(v), { tag: SET_VALUE_TAG });
  }

  /** HTML applied on first init only; ignored when `value` was set. */
  set initialHtml(html: string | null) {
    if (this.#editor === null) {
      this.#pendingHtml = html;
    } else if (html != null) {
      importHTML(this.#editor, html);
    }
  }

  get readonly(): boolean {
    return this.hasAttribute("readonly");
  }

  set readonly(v: boolean) {
    this.toggleAttribute("readonly", v);
  }

  get locale(): EditorLocale {
    return this.getAttribute("locale") === "ar" ? "ar" : "en";
  }

  connectedCallback(): void {
    if (this.#editor !== null) return;
    injectGlobalStyles(this.ownerDocument);
    this.classList.add("spez-rte");

    const shell = document.createElement("div");
    shell.className = "spez-rte-shell";
    const editable = document.createElement("div");
    editable.className = "spez-rte-editor";
    // Vanilla Lexical does not manage the contenteditable attribute itself.
    editable.setAttribute("contenteditable", this.readonly ? "false" : "true");
    const placeholderEl = document.createElement("div");
    placeholderEl.className = "spez-rte-placeholder";
    shell.append(editable, placeholderEl);
    this.#shell = shell;
    this.#editable = editable;
    this.#placeholderEl = placeholderEl;

    const { editor, dispose } = createEditorInstance(editable);
    this.#editor = editor;
    this.#disposeEditor = dispose;

    this.#buildToolbar();
    this.append(shell);

    this.#applyDir();
    this.#applyPlaceholderText();
    editor.setEditable(!this.readonly);

    if (this.#pendingValue != null) {
      const pending = this.#pendingValue;
      this.#pendingValue = null;
      this.value = pending;
    } else if (this.#pendingHtml != null) {
      const pending = this.#pendingHtml;
      this.#pendingHtml = null;
      importHTML(editor, pending);
    }

    const unregisterChange = editor.registerUpdateListener(
      ({ dirtyElements, dirtyLeaves, tags }) => {
        this.#syncPlaceholderVisibility();
        if (dirtyElements.size === 0 && dirtyLeaves.size === 0) return;
        if (tags.has(SET_VALUE_TAG)) return;
        clearTimeout(this.#changeTimer);
        this.#changeTimer = setTimeout(() => this.#emitChange(), CHANGE_DEBOUNCE_MS);
      },
    );
    const previousDispose = this.#disposeEditor;
    this.#disposeEditor = () => {
      unregisterChange();
      previousDispose();
    };

    this.#syncPlaceholderVisibility();
    this.dispatchEvent(new CustomEvent("rte-ready", { bubbles: true, composed: true }));
  }

  disconnectedCallback(): void {
    if (this.#editor === null) return;
    // Preserve content across re-parenting (frameworks move elements).
    this.#pendingValue = this.value;
    clearTimeout(this.#changeTimer);
    this.#toolbar?.dispose();
    this.#toolbar = null;
    this.#disposeEditor?.();
    this.#disposeEditor = null;
    this.#editor = null;
    this.#shell = null;
    this.#editable = null;
    this.#placeholderEl = null;
    this.replaceChildren();
  }

  attributeChangedCallback(name: string, oldValue: string | null, newValue: string | null): void {
    if (this.#editor === null || oldValue === newValue) return;
    switch (name) {
      case "readonly":
        this.#editor.setEditable(newValue === null);
        if (this.#editable !== null) {
          this.#editable.setAttribute("contenteditable", newValue === null ? "true" : "false");
        }
        break;
      case "placeholder":
        this.#applyPlaceholderText();
        break;
      case "dir":
        this.#applyDir();
        break;
      case "locale":
      case "toolbar":
        this.#buildToolbar();
        break;
    }
  }

  getJSON(): string {
    return this.value ?? "";
  }

  getHTML(): string {
    return exportHTML(this.editor);
  }

  setValue(json: string): void {
    this.value = json;
  }

  setHTML(html: string): void {
    importHTML(this.editor, html);
  }

  clear(): void {
    this.editor.update(
      () => {
        const root = $getRoot();
        root.clear();
        root.append($createParagraphNode());
      },
      { discrete: true },
    );
  }

  focus(): void {
    this.#editor?.focus();
  }

  insertHijriDate(date?: HijriDate, format: string = DEFAULT_HIJRI_FORMAT): void {
    insertHijriDate(this.editor, date, format, this.locale);
  }

  #toolbarGroups(): readonly ToolbarGroup[] {
    const attr = this.getAttribute("toolbar");
    if (attr === null || attr.trim() === "") return ALL_TOOLBAR_GROUPS;
    if (attr.trim() === "none") return [];
    const requested = attr.split(",").map((s) => s.trim());
    return ALL_TOOLBAR_GROUPS.filter((g) => requested.includes(g));
  }

  #buildToolbar(): void {
    if (this.#editor === null) return;
    this.#toolbar?.dispose();
    this.#toolbar?.element.remove();
    this.#toolbar = null;
    const groups = this.#toolbarGroups();
    if (groups.length === 0) return;
    this.#toolbar = buildToolbar(this.#editor, this, groups, this.locale);
    this.prepend(this.#toolbar.element);
  }

  #applyDir(): void {
    if (this.#editable === null) return;
    const dir = this.getAttribute("dir");
    if (dir === "rtl" || dir === "ltr") {
      this.#editable.dir = dir;
    } else {
      this.#editable.removeAttribute("dir");
    }
  }

  #applyPlaceholderText(): void {
    if (this.#placeholderEl === null) return;
    this.#placeholderEl.textContent = this.getAttribute("placeholder") ?? "";
  }

  #syncPlaceholderVisibility(): void {
    if (this.#editor === null || this.#placeholderEl === null) return;
    const show = this.#editor
      .getEditorState()
      .read(() => $canShowPlaceholder(this.#editor!.isComposing()));
    this.#placeholderEl.style.display = show ? "" : "none";
  }

  #emitChange(): void {
    if (this.#editor === null) return;
    const json = JSON.stringify(this.#editor.getEditorState().toJSON());
    const isEmpty = this.#editor
      .getEditorState()
      .read(() => $canShowPlaceholder(this.#editor!.isComposing()));
    this.dispatchEvent(
      new CustomEvent<ChangeDetail>("change", {
        bubbles: true,
        composed: true,
        detail: { json, isEmpty },
      }),
    );
  }
}
