import { $createParagraphNode, $getNodeByKey, $getRoot, type LexicalEditor } from "lexical";
import { $canShowPlaceholder } from "@lexical/text";
import type { HijriDate } from "@spezutil/hijri-core";
import { createEditorInstance } from "./editor";
import {
  ADD_COMMENT_MARK_COMMAND,
  FOCUS_COMMENT_MARK_COMMAND,
  REMOVE_COMMENT_MARK_COMMAND,
  registerComments,
  type CommentClickDetail,
  type CommentsController,
} from "./comments/comments";
import type { CommentRequestDetail } from "./comments/anchor";
import {
  $insertDiagram,
  DEFAULT_DIAGRAM_SOURCE,
  DIAGRAM_RENDER_TAG,
  registerDiagrams,
  type DiagramEditDetail,
} from "./diagram/diagrams";
import { $isDiagramNode } from "./nodes/diagram-node";
import { exportHTML, importHTML } from "./html";
import { insertHijriDate } from "./hijri-insert";
import { injectGlobalStyles } from "./styles";
import {
  ALL_TOOLBAR_GROUPS,
  DEFAULT_FONTS,
  DEFAULT_FONT_SIZES,
  DEFAULT_TOOLBAR_GROUPS,
  buildToolbar,
  type FontOption,
  type FontSizeOption,
  type ToolbarGroup,
  type ToolbarInstance,
} from "./toolbar";
import { getLocaleStrings, type EditorLocale } from "./locale";
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
    return [
      "readonly",
      "placeholder",
      "dir",
      "locale",
      "toolbar",
      "fonts",
      "font-sizes",
      "word-count",
    ];
  }

  #editor: LexicalEditor | null = null;
  #disposeEditor: (() => void) | null = null;
  #toolbar: ToolbarInstance | null = null;
  #shell: HTMLElement | null = null;
  #editable: HTMLElement | null = null;
  #placeholderEl: HTMLElement | null = null;
  #statusEl: HTMLElement | null = null;
  #pendingValue: string | null = null;
  #pendingHtml: string | null = null;
  #fonts: FontOption[] | null = null;
  #fontSizes: FontSizeOption[] | null = null;
  #unregisterStatus: (() => void) | null = null;
  #changeTimer: ReturnType<typeof setTimeout> | undefined;
  #comments: CommentsController | null = null;
  #disposeDiagrams: (() => void) | null = null;
  #highlightMarks: readonly string[] | null = null;
  #activeMark: string | null = null;
  #lastCommentRequest: CommentRequestDetail | null = null;

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

  /**
   * Toolbar font list. Set to replace the defaults entirely; spread
   * `DEFAULT_FONTS` to extend them instead. `null` restores the defaults
   * (or the `fonts` attribute, when present). Invalid entries are dropped.
   */
  get fonts(): readonly FontOption[] {
    return this.#fontOptions();
  }

  set fonts(list: readonly FontOption[] | null) {
    this.#fonts =
      list === null
        ? null
        : list.filter(
            (f): f is FontOption =>
              typeof f?.label === "string" && typeof f?.family === "string" && f.family !== "",
          );
    this.#buildToolbar();
  }

  /**
   * Toolbar font-size list. Set to replace the defaults entirely; spread
   * `DEFAULT_FONT_SIZES` to extend them instead. `null` restores the defaults
   * (or the `font-sizes` attribute, when present). Invalid entries are dropped.
   */
  get fontSizes(): readonly FontSizeOption[] {
    return this.#fontSizeOptions();
  }

  set fontSizes(list: readonly FontSizeOption[] | null) {
    this.#fontSizes =
      list === null
        ? null
        : list.filter(
            (f): f is FontSizeOption =>
              typeof f?.label === "string" && typeof f?.size === "string" && f.size !== "",
          );
    this.#buildToolbar();
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

    this.#comments = registerComments(editor, editable, {
      onRequested: (detail) => {
        this.#lastCommentRequest = detail;
        this.dispatchEvent(new CustomEvent<CommentRequestDetail>("comment-requested", { bubbles: true, composed: true, detail }));
      },
      onClicked: (detail) =>
        this.dispatchEvent(new CustomEvent<CommentClickDetail>("comment-clicked", { bubbles: true, composed: true, detail })),
    });
    this.#comments.setHighlight(this.#highlightMarks);
    this.#comments.setActive(this.#activeMark);

    this.#disposeDiagrams = registerDiagrams(editor, editable, {
      onEditRequested: (detail) => this.#emitDiagramEdit(detail),
    });

    this.#buildToolbar();
    this.append(shell);

    this.#applyDir();
    this.#applyPlaceholderText();
    this.#syncStatusVisibility();
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
        // A read-only viewer rendering a stored diagram whose svg was empty is not a user change;
        // in an editable draft the same write is what persists the svg, so it is reported there.
        if (tags.has(DIAGRAM_RENDER_TAG) && !editor.isEditable()) return;
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
    this.#unregisterStatus?.();
    this.#unregisterStatus = null;
    this.#comments?.dispose();
    this.#comments = null;
    this.#disposeDiagrams?.();
    this.#disposeDiagrams = null;
    this.#disposeEditor?.();
    this.#disposeEditor = null;
    this.#editor = null;
    this.#shell = null;
    this.#editable = null;
    this.#placeholderEl = null;
    this.#statusEl = null;
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
        this.#buildToolbar();
        this.#updateStatusText();
        break;
      case "toolbar":
      case "fonts":
      case "font-sizes":
        this.#buildToolbar();
        break;
      case "word-count":
        this.#syncStatusVisibility();
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

  /** Thread mark ids to highlight; null (default) highlights every mark. */
  get highlightMarks(): readonly string[] | null {
    return this.#highlightMarks;
  }

  set highlightMarks(ids: readonly string[] | null) {
    this.#highlightMarks = ids === null ? null : ids.filter((id) => typeof id === "string");
    this.#comments?.setHighlight(this.#highlightMarks);
  }

  get activeMark(): string | null {
    return this.#activeMark;
  }

  set activeMark(id: string | null) {
    this.#activeMark = id;
    this.#comments?.setActive(id);
  }

  /**
   * Wraps the current selection (or, in read-only mode, the DOM selection) in a comment mark.
   * Fires `comment-requested` and returns its detail; null when the selection is empty,
   * blank or longer than 1,000 characters.
   */
  addCommentMark(markId?: string): CommentRequestDetail | null {
    this.#lastCommentRequest = null;
    this.editor.dispatchCommand(ADD_COMMENT_MARK_COMMAND, markId === undefined ? undefined : { markId });
    this.editor.update(() => {}, { discrete: true });
    return this.#lastCommentRequest;
  }

  removeCommentMark(markId: string): void {
    this.editor.dispatchCommand(REMOVE_COMMENT_MARK_COMMAND, markId);
    this.editor.update(() => {}, { discrete: true });
  }

  focusCommentMark(markId: string): void {
    this.#activeMark = markId;
    this.editor.dispatchCommand(FOCUS_COMMENT_MARK_COMMAND, markId);
  }

  /** Inserts a diagram at the selection (or appends to the root); returns the node key. */
  insertDiagram(source?: string, drawioKey: string | null = null): string {
    let key = "";
    this.editor.update(
      () => {
        key = $insertDiagram(source ?? DEFAULT_DIAGRAM_SOURCE, drawioKey);
      },
      { discrete: true },
    );
    return key;
  }

  /** Updates a diagram's source and/or drawio key; the editor re-renders and re-sanitizes the svg. Returns false when `nodeKey` is not a diagram. */
  updateDiagram(nodeKey: string, patch: { source?: string; drawioKey?: string | null }): boolean {
    let found = false;
    this.editor.update(
      () => {
        const node = $getNodeByKey(nodeKey);
        if (!$isDiagramNode(node)) return;
        found = true;
        if (patch.source !== undefined) node.setSource(patch.source);
        if (patch.drawioKey !== undefined) node.setDrawioKey(patch.drawioKey);
      },
      { discrete: true },
    );
    return found;
  }

  #emitDiagramEdit(detail: DiagramEditDetail): void {
    this.dispatchEvent(
      new CustomEvent<DiagramEditDetail>("diagram-edit-requested", { bubbles: true, composed: true, detail }),
    );
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

  /** Property wins over the `fonts` attribute (comma-separated families). */
  #fontOptions(): readonly FontOption[] {
    if (this.#fonts !== null) return this.#fonts;
    const attr = this.getAttribute("fonts");
    if (attr === null || attr.trim() === "") return DEFAULT_FONTS;
    return attr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((family) => ({ label: family.replace(/["']/g, ""), family }));
  }

  /** Property wins over the `font-sizes` attribute (comma-separated sizes). */
  #fontSizeOptions(): readonly FontSizeOption[] {
    if (this.#fontSizes !== null) return this.#fontSizes;
    const attr = this.getAttribute("font-sizes");
    if (attr === null || attr.trim() === "") return DEFAULT_FONT_SIZES;
    return attr
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s !== "")
      .map((size) => ({ label: size, size }));
  }

  #toolbarGroups(): readonly ToolbarGroup[] {
    const attr = this.getAttribute("toolbar");
    if (attr === null || attr.trim() === "") return DEFAULT_TOOLBAR_GROUPS;
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
    this.#toolbar = buildToolbar(
      this.#editor,
      this,
      groups,
      this.locale,
      this.#fontOptions(),
      this.#fontSizeOptions(),
      (detail) => this.#emitDiagramEdit(detail),
    );
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

  #syncStatusVisibility(): void {
    if (this.#editor === null || this.#shell === null) return;
    const shouldShow = this.hasAttribute("word-count");
    const statusEl = this.#statusEl;
    if (shouldShow && statusEl === null) {
      const el = document.createElement("div");
      el.className = "spez-rte-status";
      this.#shell.append(el);
      this.#statusEl = el;
      this.#unregisterStatus = this.#editor.registerUpdateListener(() => this.#updateStatusText());
      this.#updateStatusText();
    } else if (!shouldShow && statusEl !== null) {
      this.#unregisterStatus?.();
      this.#unregisterStatus = null;
      statusEl.remove();
      this.#statusEl = null;
    } else if (shouldShow) {
      this.#updateStatusText();
    }
  }

  #updateStatusText(): void {
    if (this.#editor === null || this.#statusEl === null) return;
    const text = this.#editor.getEditorState().read(() => $getRoot().getTextContent());
    const words = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;
    const characters = text.length;
    const t = getLocaleStrings(this.locale);
    this.#statusEl.textContent = `${t.wordCount.replace("{count}", String(words))} · ${t.characterCount.replace("{count}", String(characters))}`;
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
