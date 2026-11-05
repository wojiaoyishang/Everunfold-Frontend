"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readDraftVersion } from "@/generated/collaboration-client";
import type { VersionDetail } from "@/generated/collaboration-contract";
import { draftError } from "./draft-state";

/** Each side is addressed by its URL; an obsolete response cannot change the current comparison. */
export function useVersionTarget(id: string, revision: number | null) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    revision: number | null;
    pending: boolean;
    detail: VersionDetail | null;
    error: string;
  }>({ revision: null, pending: false, detail: null, error: "" });
  useEffect(() => {
    if (revision === null) return;
    const controller = new AbortController();
    void Promise.resolve().then(async () => {
      if (controller.signal.aborted) return;
      setState({ revision, pending: true, detail: null, error: "" });
      try {
        const { data } = await readDraftVersion(
          baseUrl,
          { id, revision },
          csrfToken,
          { signal: controller.signal },
        );
        if (!controller.signal.aborted)
          setState({ revision, pending: false, detail: data, error: "" });
      } catch (cause) {
        if (!controller.signal.aborted)
          setState({
            revision,
            pending: false,
            detail: null,
            error: draftError(cause),
          });
      }
    });
    return () => controller.abort();
  }, [baseUrl, csrfToken, id, revision, attempt]);
  const matches = revision !== null && state.revision === revision;
  return {
    detail: matches ? state.detail : null,
    loading: revision !== null && (!matches || state.pending),
    error: matches ? state.error : "",
    retry: () => setAttempt((value) => value + 1),
  };
}
