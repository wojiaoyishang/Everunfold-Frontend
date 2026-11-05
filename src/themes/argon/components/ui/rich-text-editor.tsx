"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type ReactNode,
} from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { NodeSelection, Plugin, TextSelection } from "@tiptap/pm/state";
import { richExtensions } from "@/core/editor/rich-extensions";
import { sourceDocument, renderRichNode } from "@/core/editor/rich-text";
import { htmlRichSource } from "@/core/editor/visual-document";
import { renderContent } from "@/core/rendering/content";
import { resourceUrl } from "@/core/content/urls";
import { inspectContentFeatures } from "@/core/rendering/features/content-features";
import { renderMarkdownSource } from "@/core/rendering/content";
import { ContentResources } from "../content-resources";
import { referencedFontFaces } from "@/core/rendering/fonts";
import type { UploadEntry } from "@/core/media/upload-queue";
import type { MediaItem } from "@/generated/settings-contract";
import { UPLOAD_SCHEME } from "@/core/editor/upload-placeholders";
import type { MediaURL } from "@/generated/content-admin-contract";
import type {
  CodeEditorHandle,
  SourceSelection,
  CapturedInsertion,
} from "./code-editor";
import { richSourceSelection } from "@/core/editor/source-positions";
import {
  markdownRichSource,
  patchVisualMarkdown,
  richMarkdownSelection,
} from "@/core/editor/visual-markdown";
import { patchVisualHtml } from "@/core/editor/patch-visual-html";
import { EditorStatusBar } from "./editor-status-bar";
import styles from "./rich-text-editor.module.css";
import { revealEditorSelection } from "./reveal-editor-selection";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    everunfoldReadonly: {
      setReadonlyGuard: (disabled: boolean) => ReturnType;
    };
  }
}

const ReadonlyGuard = Extension.create<
  { disabled: boolean },
  { disabled: boolean }
>({
  name: "everunfoldReadonly",
  addOptions: () => ({ disabled: false }),
  addStorage() {
    return { disabled: this.options.disabled };
  },
  addCommands() {
    return {
      setReadonlyGuard: (disabled) => () => {
        this.storage.disabled = disabled;
        return true;
      },
    };
  },
  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        filterTransaction: (transaction) =>
          !transaction.docChanged ||
          !storage.disabled ||
          Boolean(transaction.getMeta("everunfoldSource")),
      }),
    ];
  },
});

interface RichTextEditorProps {
  value: string;
  onChange: (html: string, previous: string) => void;
  label: string;
  disabled: boolean;
  initialSelection?: SourceSelection;
  editorRef?: Ref<CodeEditorHandle>;
  media?: Record<string, MediaURL>;
  toolbar: (editor: Editor) => ReactNode;
  afterToolbar?: ReactNode;
  uploadEntries?: UploadEntry<MediaItem>[];
  format?: "html" | "markdown";
  statusTarget?: HTMLElement | null;
  hideStatusBar?: boolean;
}

function hasLiveEditor(editor: Editor | null): editor is Editor {
  // A destroyed engine can outlive its view in React's current render snapshot.
  // Check the manager as well before touching commands, schema or plugin state.
  return Boolean(editor?.extensionManager && !editor.isDestroyed);
}

export function RichTextEditor({
  value,
  onChange,
  label,
  disabled,
  initialSelection,
  editorRef,
  media = {},
  toolbar,
  format = "html",
  afterToolbar,
  uploadEntries,
  statusTarget,
  hideStatusBar,
}: RichTextEditorProps) {
  const readSource =
    format === "markdown" ? markdownRichSource : htmlRichSource;
  const mapSelection =
    format === "markdown" ? richMarkdownSelection : richSourceSelection;
  const latest = useRef({ onChange, media });
  const source = useRef(value);
  const [problem, setProblem] = useState(false);
  useEffect(() => {
    latest.current = { onChange, media };
  }, [onChange, media]);
  const root = useRef<HTMLDivElement>(null);
  const extensions = richExtensions(false, format === "markdown");
  extensions.push(ReadonlyGuard.configure({ disabled }));
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editable: !disabled,
    content: readSource(value),
    editorProps: {
      handlePaste: (view, event) => {
        const html = event.clipboardData?.getData("text/html");
        if (!html) return false;
        event.preventDefault();
        const fragment = view.state.schema.nodeFromJSON(
          htmlRichSource(html, format === "markdown"),
        ).content;
        view.dispatch(
          view.state.tr
            .replaceSelection(new Slice(fragment, 0, 0))
            .scrollIntoView(),
        );
        return true;
      },
      attributes: {
        role: "textbox",
        "aria-multiline": "true",
        "aria-label": label,
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!hasLiveEditor(editor)) return;
      const next =
        format === "markdown"
          ? patchVisualMarkdown(
              source.current,
              transaction.before,
              editor.state.doc,
            )
          : patchVisualHtml(
              source.current,
              renderRichNode(transaction.before.toJSON()),
              renderRichNode(editor.getJSON()),
            );
      if (next === undefined) {
        setProblem(true);
        queueMicrotask(() => {
          if (hasLiveEditor(editor))
            resetContent(editor, readSource(source.current));
        });
        return;
      }
      const previous = source.current;
      source.current = next;
      setProblem(false);
      latest.current.onChange(next, previous);
    },
  });
  const selectedText =
    useEditorState({
      editor,
      selector: ({ editor: current }) =>
        hasLiveEditor(current)
          ? current.state.doc.textBetween(
              current.state.selection.from,
              current.state.selection.to,
            ).length
          : 0,
    }) ?? 0;
  useEffect(() => {
    if (!hasLiveEditor(editor)) return;
    editor.commands.setReadonlyGuard(disabled);
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (hasLiveEditor(editor) && source.current !== value) {
      source.current = value;
      resetContent(editor, readSource(value));
    }
  }, [editor, readSource, value]);
  useEffect(() => {
    if (!hasLiveEditor(editor) || !initialSelection) return;
    const frame = requestAnimationFrame(() => {
      if (hasLiveEditor(editor))
        selectSource(editor, source.current, initialSelection, mapSelection);
    });
    return () => cancelAnimationFrame(frame);
  }, [editor, initialSelection, mapSelection]);
  useEffect(() => {
    if (!hasLiveEditor(editor)) return;
    const render = () => {
      if (!hasLiveEditor(editor)) return;
      for (const img of root.current?.querySelectorAll<HTMLImageElement>(
        "img[data-media-source]",
      ) ?? []) {
        const virtual = img.dataset.mediaSource ?? "";
        if (virtual.startsWith(UPLOAD_SCHEME)) {
          const entry = uploadEntries?.find(
            (item) => virtual === UPLOAD_SCHEME + item.id,
          );
          const state = entry?.state ?? "cancelled";
          img.dataset.uploadState = state;
          img.setAttribute(
            "aria-busy",
            String(["queued", "uploading", "saving"].includes(state)),
          );
          img.alt =
            (state === "failed"
              ? "上传失败 "
              : state === "cancelled"
                ? "上传已中断 "
                : "正在上传 ") + (entry?.name ?? "");
        }
        const id = virtual.replace("site://media/", "");
        const url = latest.current.media[id]?.original;
        if (url && img.getAttribute("src") !== url) img.src = url;
      }
      for (const video of root.current?.querySelectorAll<HTMLVideoElement>(
        "video[data-media-source]",
      ) ?? []) {
        const virtual = video.dataset.mediaSource ?? "";
        const src = resourceUrl(
          virtual.startsWith("site://media/")
            ? latest.current.media[virtual.slice(13)]?.original
            : virtual,
        );
        if (src && video.getAttribute("src") !== src) video.src = src;
        else if (!src) video.removeAttribute("src");
        const poster = video.dataset.mediaPoster;
        if (poster) {
          const url = poster.startsWith("site://media/")
            ? latest.current.media[poster.slice(13)]?.original
            : /^https?:\/\//.test(poster)
              ? poster
              : undefined;
          if (url && video.getAttribute("poster") !== url) video.poster = url;
        }
      }
      for (const raw of root.current?.querySelectorAll<HTMLElement>(
        "div[data-raw-html]",
      ) ?? []) {
        const html = raw.dataset.rawHtml ?? "";
        const rendered = renderContent({
          id: "editor-raw",
          content: [{ id: "raw", type: "html", content: html }],
          media_urls: latest.current.media,
        });
        const safe = rendered.html;
        if (raw.dataset.rendered !== safe) {
          raw.innerHTML = `<div class="rich-raw-label">HTML 节点</div><div>${safe}</div>`;
          raw.dataset.rendered = safe;
          raw.contentEditable = "false";
          if (rendered.features.code || rendered.features.math)
            void import("@/core/rendering/features/content-features")
              .then(({ enhanceContentHtml }) => enhanceContentHtml(safe))
              .then((html) => {
                if (
                  hasLiveEditor(editor) &&
                  raw.isConnected &&
                  raw.dataset.rendered === safe
                )
                  raw.innerHTML = `<div class="rich-raw-label">HTML 节点</div><div>${html}</div>`;
              })
              .catch(() => {});
        }
      }
    };
    render();
    editor.on("transaction", render);
    return () => {
      editor.off("transaction", render);
    };
  }, [editor, media, uploadEntries]);
  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => {
        if (hasLiveEditor(editor)) editor.commands.focus();
      },
      selection: () =>
        hasLiveEditor(editor)
          ? (mapSelection(editor.state.doc, source.current, {
              start: editor.state.selection.from,
              end: editor.state.selection.to,
            }) ?? { start: 0, end: 0 })
          : { start: 0, end: 0 },
      select: (range) => {
        if (hasLiveEditor(editor))
          selectSource(editor, source.current, range, mapSelection);
      },
      insert: (before, after = "") => {
        if (hasLiveEditor(editor) && !disabled)
          editor
            .chain()
            .focus()
            .insertContent(readSource(before + after).content ?? [])
            .run();
      },
      captureInsertion: () => {
        if (!hasLiveEditor(editor)) return () => {};
        const position = editor.state.selection.from;
        let range = { from: position, to: editor.state.selection.to };
        let valid = true;
        const track = ({
          transaction,
        }: {
          transaction: import("@tiptap/pm/state").Transaction;
        }) => {
          if (transaction.docChanged && transaction.getMeta("everunfoldSource"))
            valid = false;
          range = {
            from: transaction.mapping.map(range.from),
            to: transaction.mapping.map(range.to, -1),
          };
        };
        editor.on("transaction", track);
        let disposed = false;
        const dispose = () => {
          disposed = true;
          editor.off("transaction", track);
        };
        const insert: CapturedInsertion = (html) => {
          if (disposed) return false;
          dispose();
          if (!valid || !hasLiveEditor(editor) || !editor.isEditable)
            return false;
          return editor
            .chain()
            .focus()
            .insertContentAt(
              {
                from: Math.min(
                  Math.max(range.from, 1),
                  editor.state.doc.content.size,
                ),
                to: Math.min(
                  Math.max(range.to, range.from),
                  editor.state.doc.content.size,
                ),
              },
              readSource(html).content ?? [],
            )
            .run();
        };
        insert.dispose = dispose;
        return insert;
      },
    }),
    [editor, disabled, mapSelection, readSource],
  );
  return (
    <div
      className={styles.root}
      ref={root}
      data-disabled={disabled}
      data-editor-local-control
    >
      <ContentResources
        features={inspectContentFeatures(
          format === "markdown" ? renderMarkdownSource(value) : value,
        )}
      />
      <style
        data-editor-fonts
        dangerouslySetInnerHTML={{ __html: referencedFontFaces(value, media) }}
      />
      {editor?.extensionManager && (
        <fieldset disabled={disabled} className={styles.tools}>
          {toolbar(editor)}
        </fieldset>
      )}
      {afterToolbar}
      {problem && (
        <p className={styles.sourceWarning} role="alert">
          这次排版无法保留现有源码，请在源码视图中修改。
        </p>
      )}
      <EditorContent
        editor={editor?.extensionManager ? editor : null}
        className={styles.canvas}
      />
      <EditorStatusBar
        count={value.length}
        target={statusTarget}
        hidden={hideStatusBar}
      >
        {selectedText ? `已选 ${selectedText} 字符` : null}
      </EditorStatusBar>
    </div>
  );
}

function resetContent(
  editor: Editor,
  value: ReturnType<typeof sourceDocument>,
) {
  editor
    .chain()
    .setMeta("everunfoldSource", true)
    .setMeta("addToHistory", false)
    .setContent(value, { emitUpdate: false })
    .run();
}

function selectSource(
  editor: Editor,
  source: string,
  range: SourceSelection,
  mapSelection: typeof richSourceSelection,
) {
  const { doc, tr } = editor.state;
  const mapped = mapSelection(doc, source, range, true);
  if (!mapped) {
    editor.commands.focus();
    return;
  }
  const from = doc.resolve(mapped.start),
    to = doc.resolve(mapped.end);
  if (
    from.nodeAfter?.isAtom &&
    !from.nodeAfter.isText &&
    mapped.end === mapped.start + from.nodeAfter.nodeSize
  ) {
    editor.view.dispatch(
      tr.setSelection(NodeSelection.create(doc, mapped.start)).scrollIntoView(),
    );
  } else {
    editor.view.dispatch(
      tr.setSelection(TextSelection.between(from, to)).scrollIntoView(),
    );
  }
  editor.view.focus();
  revealEditorSelection(editor.view.dom, () =>
    hasLiveEditor(editor)
      ? editor.view.coordsAtPos(editor.state.selection.head)
      : null,
  );
}
