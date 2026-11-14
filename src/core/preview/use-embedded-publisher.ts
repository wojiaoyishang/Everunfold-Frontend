"use client";
import { useEffect, useRef, useState } from "react";
import {
  checkedBuilderChange,
  type LiveBuilderState,
  type LiveBuilderChange,
} from "./builder";
import { isEmbeddedEditor, previewStamp } from "./bridge";
/** An authorized editor sends only its display projection, never password fields or persisted browser data. */
export function useEmbeddedPreviewPublisher(
  id: string | null,
  payload: object | null,
  state: { dirty: boolean; busy: boolean; published?: boolean } = {
    dirty: false,
    busy: false,
  },
  builder?: {
    value: LiveBuilderState;
    onChange: (change: LiveBuilderChange) => void;
  },
) {
  const latest = useRef({ payload, state, builder });
  const session = useRef("");
  const revision = useRef(0);
  const builderSequence = useRef(0);
  const [sequence, acknowledge] = useState(0);
  const builderMode = Boolean(builder);
  const serialized = JSON.stringify({ payload, builder: builder?.value });
  useEffect(() => {
    latest.current = { payload, state, builder };
  }, [payload, state, builder]);
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
          {
            ...latest.current.payload,
            id,
            ...stamp,
            builder: latest.current.builder?.value,
            builder_sequence: builderSequence.current,
          },
          window.location.origin,
        );
      }
      sendState();
    };
    const request = (event: MessageEvent) => {
      if (
        event.source === window.parent &&
        event.origin === window.location.origin &&
        event.data?.type === "everunfold:builder-change" &&
        event.data.id === id &&
        event.data.preview_session === session.current &&
        Number.isSafeInteger(event.data.builder_sequence) &&
        event.data.builder_sequence > builderSequence.current &&
        !latest.current.state.busy &&
        latest.current.builder
      ) {
        const change = checkedBuilderChange(
          event.data.change,
          latest.current.builder.value,
        );
        if (change) {
          builderSequence.current = event.data.builder_sequence;
          latest.current.builder.onChange(change);
          acknowledge(builderSequence.current);
        }
        return;
      }
      if (
        event.source === window.parent &&
        event.origin === window.location.origin &&
        event.data?.type === "everunfold:request-preview" &&
        event.data.id === id &&
        previewStamp({ ...event.data, preview_revision: 1 })
      ) {
        if (session.current !== event.data.preview_session)
          builderSequence.current = 0;
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
    const timer = setTimeout(
      () => {
        if (session.current && latest.current.payload)
          window.parent.postMessage(
            {
              ...latest.current.payload,
              builder: latest.current.builder?.value,
              builder_sequence: builderSequence.current,
              id,
              preview_session: session.current,
              preview_revision: revision.current,
            },
            window.location.origin,
          );
      },
      builderMode ? 0 : 180,
    );
    return () => clearTimeout(timer);
  }, [id, serialized, builderMode, sequence]);
  useEffect(() => {
    if (id && isEmbeddedEditor() && session.current)
      window.parent.postMessage(
        {
          type: "everunfold:editor-state",
          id,
          preview_session: session.current,
          dirty: state.dirty,
          busy: state.busy,
          published: state.published,
        },
        window.location.origin,
      );
  }, [id, state.dirty, state.busy, state.published]);
}
