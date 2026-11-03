"use client";
import {
  useEffect,
  useImperativeHandle,
  useRef,
  type Ref,
  type ReactNode,
} from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { Extension } from "@tiptap/core";
import { Slice } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";
import {
  ySyncPlugin,
  ySyncPluginKey,
  yCursorPlugin,
  absolutePositionToRelativePosition,
  relativePositionToAbsolutePosition,
} from "@tiptap/y-tiptap";
import { richExtensions } from "@/core/editor/rich-extensions";
import { sourceDocument, renderRichNode } from "@/core/editor/rich-text";
import { renderContent } from "@/core/rendering/content";
import { referencedFontFaces } from "@/core/rendering/fonts";
import type { MediaURL } from "@/generated/content-admin-contract";
import type { CodeEditorHandle, SharedSource } from "./code-editor";
import styles from "./rich-text-editor.module.css";

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
          Boolean(transaction.getMeta(ySyncPluginKey)?.isChangeOrigin),
      }),
    ];
  },
});

export function RichTextEditor({
  value,
  onChange,
  label,
  disabled,
  shared,
  editorRef,
  media = {},
  toolbar,
}: {
  value: string;
  onChange: (html: string) => void;
  label: string;
  disabled: boolean;
  shared?: SharedSource;
  editorRef?: Ref<CodeEditorHandle>;
  media?: Record<string, MediaURL>;
  toolbar: (editor: Editor) => ReactNode;
}) {
  const latest = useRef({ onChange, media });
  useEffect(() => {
    latest.current = { onChange, media };
  }, [onChange, media]);
  const root = useRef<HTMLDivElement>(null);
  const extensions = richExtensions(Boolean(shared?.rich));
  extensions.push(ReadonlyGuard.configure({ disabled }));
  if (shared?.rich) {
    const fragment = shared.rich;
    extensions.push(
      Extension.create({
        name: "everunfoldSharedRich",
        addProseMirrorPlugins: () => [
          ySyncPlugin(fragment),
          yCursorPlugin(shared.awareness, {
            awarenessStateFilter: (current, other, state) =>
              current !== other && state.blockId === shared.blockId,
          }),
        ],
        addKeyboardShortcuts: () => ({
          "Mod-z": () => {
            shared.undo.undo();
            return true;
          },
          "Mod-Shift-z": () => {
            shared.undo.redo();
            return true;
          },
          "Mod-y": () => {
            shared.undo.redo();
            return true;
          },
        }),
      }),
    );
  }
  const editor = useEditor(
    {
      extensions,
      immediatelyRender: false,
      editable: !disabled,
      content: shared?.rich ? undefined : sourceDocument(value),
      editorProps: {
        handlePaste: (view, event) => {
          const html = event.clipboardData?.getData("text/html");
          if (!html) return false;
          event.preventDefault();
          const fragment = view.state.schema.nodeFromJSON(
            sourceDocument(html),
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
        handleDOMEvents: {
          focus: () => {
            if (shared)
              shared.awareness.setLocalStateField("blockId", shared.blockId);
            return false;
          },
        },
      },
      onUpdate: ({ editor }) => {
        if (!shared?.rich)
          latest.current.onChange(renderRichNode(editor.getJSON()));
      },
    },
    [shared?.rich],
  );
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    editor.commands.setReadonlyGuard(disabled);
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  useEffect(() => {
    if (
      editor &&
      !editor.isDestroyed &&
      !shared?.rich &&
      value !== renderRichNode(editor.getJSON())
    )
      editor.commands.setContent(sourceDocument(value), { emitUpdate: false });
  }, [editor, shared?.rich, value]);
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const render = () => {
      for (const img of root.current?.querySelectorAll<HTMLImageElement>(
        "img[data-media-source]",
      ) ?? []) {
        const virtual = img.dataset.mediaSource ?? "";
        const id = virtual.replace("site://media/", "");
        const url = latest.current.media[id]?.original;
        if (url && img.getAttribute("src") !== url) img.src = url;
      }
      for (const raw of root.current?.querySelectorAll<HTMLElement>(
        "div[data-raw-html]",
      ) ?? []) {
        const html = raw.dataset.rawHtml ?? "";
        const safe = renderContent({
          id: "editor-raw",
          content: [{ id: "raw", type: "html", content: html }],
          media_urls: latest.current.media,
        }).html;
        if (raw.dataset.rendered !== safe) {
          raw.innerHTML = `<div class="rich-raw-label">自定义 HTML · 在源码模式编辑</div><div>${safe}</div>`;
          raw.dataset.rendered = safe;
          raw.contentEditable = "false";
        }
      }
    };
    render();
    editor.on("transaction", render);
    return () => {
      editor.off("transaction", render);
    };
  }, [editor, media]);
  useImperativeHandle(
    editorRef,
    () => ({
      focus: () => editor?.commands.focus(),
      selection: () => ({
        start: editor?.state.selection.from ?? 0,
        end: editor?.state.selection.to ?? 0,
      }),
      insert: (before, after = "") => {
        if (editor && !disabled)
          editor
            .chain()
            .focus()
            .insertContent(sourceDocument(before + after).content ?? [])
            .run();
      },
      captureInsertion: () => {
        if (!editor) return () => {};
        const sync = ySyncPluginKey.getState(editor.state),
          at = editor.state.selection.from;
        const relative =
          shared?.rich && sync
            ? absolutePositionToRelativePosition(
                at,
                shared.rich,
                sync.binding.mapping,
              )
            : null;
        return (html) => {
          if (editor.isDestroyed || !editor.isEditable) return;
          const current = ySyncPluginKey.getState(editor.state);
          const position =
            relative && shared?.rich && current
              ? relativePositionToAbsolutePosition(
                  shared.rich.doc!,
                  shared.rich,
                  relative,
                  current.binding.mapping,
                )
              : at;
          editor
            .chain()
            .focus()
            .insertContentAt(
              Math.min(
                Math.max(position ?? 1, 1),
                editor.state.doc.content.size,
              ),
              sourceDocument(html).content ?? [],
            )
            .run();
        };
      },
    }),
    [editor, disabled, shared],
  );
  return (
    <div className={styles.root} ref={root} data-disabled={disabled}>
      <style
        data-editor-fonts
        dangerouslySetInnerHTML={{ __html: referencedFontFaces(value, media) }}
      />
      {editor && (
        <fieldset disabled={disabled} className={styles.tools}>
          {toolbar(editor)}
        </fieldset>
      )}
      <EditorContent editor={editor} className={styles.canvas} />
    </div>
  );
}
