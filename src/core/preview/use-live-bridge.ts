"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import {
  checkedBuilderChange,
  checkedBuilderState,
  type LiveBuilderState,
  type LiveBuilderChange,
} from "./builder";
import { randomUUID } from "@/core/browser/crypto";
import { checkedPreviewPage } from "@/core/pages/preview-validation";
import { checkedLiveContent } from "./content";
import {
  previewNavigation,
  previewStamp,
  samePreview,
  type PreviewStamp,
} from "./bridge";
import type { PreviewKind } from "./routes";

export interface LiveEditorState {
  dirty: boolean;
  busy: boolean;
  published?: boolean;
}
export function useLiveBridge({
  kind,
  id,
  editor,
  view,
  onEditorState,
  onLeave,
  onLocation,
  onFocusEditor,
}: {
  kind: PreviewKind;
  id: string;
  editor: RefObject<HTMLIFrameElement | null>;
  view: RefObject<HTMLIFrameElement | null>;
  onEditorState: (state: LiveEditorState) => void;
  onLeave: (path: string, force?: boolean) => void;
  onLocation: (path: string) => void;
  onFocusEditor: () => void;
}) {
  const [documentTitle, setDocumentTitle] = useState<string | null>(null);
  const [awaitingBuilder, setAwaitingBuilder] = useState(false);
  const [builder, setBuilder] = useState<LiveBuilderState | null>(null);
  const builderSequence = useRef(0);
  const channel = useRef(randomUUID());
  const latest = useRef<object | null>(null);
  const expected = useRef<PreviewStamp | null>(null);
  const [pending, setPending] = useState<PreviewStamp | null>(null);
  const [status, setStatus] = useState<
    "loading" | "updating" | "ready" | "error"
  >("loading");
  const request = useCallback(
    () =>
      editor.current?.contentWindow?.postMessage(
        {
          type: "everunfold:request-preview",
          id,
          preview_session: channel.current,
        },
        window.location.origin,
      ),
    [editor, id],
  );
  const loadEditor = useCallback(() => {
    channel.current = randomUUID();
    builderSequence.current = 0;
    setAwaitingBuilder(false);
    latest.current = expected.current = null;
    setPending(null);
    setStatus("loading");
    request();
  }, [request]);
  const loadPreview = useCallback(() => {
    if (latest.current)
      view.current?.contentWindow?.postMessage(
        latest.current,
        window.location.origin,
      );
    setStatus((state) =>
      latest.current ? (state === "ready" ? "ready" : "updating") : "loading",
    );
    request();
  }, [request, view]);
  useEffect(() => {
    if (status === "ready" || status === "error") return;
    const timer = setTimeout(() => setStatus("error"), 12000);
    return () => clearTimeout(timer);
  }, [pending?.preview_session, pending?.preview_revision, status]);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (event.source === editor.current?.contentWindow) {
        if (data.type === "everunfold:editor-ready" && data.id === id) {
          request();
          return;
        }
        if (
          data.type === "everunfold:embedded-location" &&
          typeof data.path === "string"
        ) {
          onLocation(data.path);
          return;
        }
        if (
          data.type === "everunfold:embedded-leave-request" &&
          data.id === id &&
          typeof data.path === "string"
        ) {
          const target = previewNavigation(data.path, window.location.origin);
          if (target) onLeave(target.href, true);
          return;
        }
        if (data.type === "everunfold:focus-editor" && data.id === id) {
          onFocusEditor();
          return;
        }
        if (data.id !== id || data.preview_session !== channel.current) return;
        if (
          data.type === "everunfold:editor-state" &&
          typeof data.dirty === "boolean" &&
          typeof data.busy === "boolean"
        ) {
          onEditorState({
            dirty: data.dirty,
            busy: data.busy,
            published:
              typeof data.published === "boolean" ? data.published : undefined,
          });
          return;
        }
        const stamp = previewStamp(data);
        if (
          !stamp ||
          (expected.current &&
            stamp.preview_revision < expected.current.preview_revision)
        )
          return;
        if (data.type === "everunfold:preview-pending") {
          expected.current = stamp;
          setPending(stamp);
          setStatus("updating");
          return;
        }
        const projection =
          kind === "page" || kind === "template"
            ? data.type === "everunfold:page-preview" &&
              checkedPreviewPage(data.page, id)
            : data.type === "everunfold:content-preview" &&
              checkedLiveContent(data.content, kind, id);
        if (!projection) return;
        setDocumentTitle(projection.title);
        if ((data.builder_sequence ?? 0) >= builderSequence.current) {
          setAwaitingBuilder(false);
          setBuilder(checkedBuilderState(data.builder));
        }
        expected.current = stamp;
        latest.current = data;
        setPending(stamp);
        setStatus("updating");
        view.current?.contentWindow?.postMessage(data, window.location.origin);
      } else if (
        event.source === view.current?.contentWindow &&
        data.id === id
      ) {
        if (data.type === "everunfold:focus-editor") {
          onFocusEditor();
          editor.current?.contentWindow?.focus();
          return;
        }
        if (
          [
            "everunfold:page-preview-ready",
            "everunfold:content-preview-ready",
          ].includes(data.type)
        )
          loadPreview();
        if (
          data.type === "everunfold:preview-applied" &&
          samePreview(expected.current, previewStamp(data))
        )
          setStatus("ready");
      }
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [
    id,
    kind,
    editor,
    view,
    request,
    loadPreview,
    onEditorState,
    onLeave,
    onLocation,
    onFocusEditor,
  ]);
  const retry = () => {
    loadEditor();
    const frame = view.current;
    if (frame)
      frame.setAttribute("src", frame.getAttribute("src") ?? "about:blank");
  };
  const changeBuilder = (change: LiveBuilderChange) => {
    if (!expected.current || !builder || !checkedBuilderChange(change, builder))
      return;
    builderSequence.current++;
    setAwaitingBuilder(true);
    setBuilder({
      ...builder,
      ...(change.document ? { document: change.document } : {}),
      ...(change.parameters ? { parameters: change.parameters } : {}),
      ...(change.mediaUrls
        ? { media: { ...builder.media, ...change.mediaUrls } }
        : {}),
    });
    editor.current?.contentWindow?.postMessage(
      {
        type: "everunfold:builder-change",
        id,
        ...expected.current,
        change,
        builder_sequence: builderSequence.current,
      },
      window.location.origin,
    );
  };
  return {
    status,
    loadEditor,
    loadPreview,
    retry,
    builder,
    changeBuilder,
    documentTitle,
    awaitingBuilder,
  };
}
