"use client";
import { useEffect, useRef } from "react";
import { isEmbeddedEditor, previewStamp } from "./bridge";
/** An authorized editor sends only its display projection, never password fields or persisted browser data. */
export function useEmbeddedPreviewPublisher(
  id: string | null,
  payload: object | null,
  state: { dirty: boolean; busy: boolean } = { dirty: false, busy: false },
) {
  const latest = useRef({ payload, state });
  const session = useRef("");
  const revision = useRef(0);
  const serialized = JSON.stringify(payload);
  useEffect(() => {
    latest.current = { payload, state };
  }, [payload, state]);
  useEffect(() => {
    if (!id || !isEmbeddedEditor()) return;
    const sendState = () => {
      if (session.current)
        window.parent.postMessage(
          {
            type: "everunfold:editor-state",
            id,
            preview_session: session.current,
            ...latest.current.state,
          },
          window.location.origin,
        );
    };
    const send = () => {
      if (session.current && latest.current.payload) {
        const stamp = {
          preview_session: session.current,
          preview_revision: Math.max(1, revision.current),
        };
        window.parent.postMessage(
          { ...latest.current.payload, id, ...stamp },
          window.location.origin,
        );
      }
      sendState();
    };
    const request = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.origin === window.location.origin &&
        event.data?.type === "everunfold:request-preview" &&
        event.data.id === id &&
        previewStamp({ ...event.data, preview_revision: 1 })
      ) {
        session.current = event.data.preview_session;
        send();
      }
    };
    window.addEventListener("message", request);
    window.parent.postMessage(
      { type: "everunfold:editor-ready", id },
      window.location.origin,
    );
    return () => {
      window.removeEventListener("message", request);
    };
  }, [id]);
  useEffect(() => {
    if (!id || !isEmbeddedEditor()) return;
    revision.current++;
    if (session.current)
      window.parent.postMessage(
        {
          type: "everunfold:preview-pending",
          id,
          preview_session: session.current,
          preview_revision: revision.current,
        },
        window.location.origin,
      );
    const timer = setTimeout(() => {
      if (session.current && latest.current.payload)
        window.parent.postMessage(
          {
            ...latest.current.payload,
            id,
            preview_session: session.current,
            preview_revision: revision.current,
          },
          window.location.origin,
        );
    }, 180);
    return () => clearTimeout(timer);
  }, [id, serialized]);
  useEffect(() => {
    if (id && isEmbeddedEditor() && session.current)
      window.parent.postMessage(
        {
          type: "everunfold:editor-state",
          id,
          preview_session: session.current,
          dirty: state.dirty,
          busy: state.busy,
        },
        window.location.origin,
      );
  }, [id, state.dirty, state.busy]);
}
