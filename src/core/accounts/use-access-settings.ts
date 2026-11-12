"use client";

import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readAccessSettings,
  saveAccessSettings,
  type AccessSettingsInput,
  type AccessSettingsState,
} from "@/core/contracts/accounts";
import { accountFailure, useAccountAction } from "./use-action";

export function useAccessSettings() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const action = useAccountAction();
  const [draft, setDraft] = useState<AccessSettingsState | null>(null);
  const [saved, setSaved] = useState<AccessSettingsState | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    void readAccessSettings(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSaved(data);
        setDraft(data);
        setError("");
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, reload]);

  function save(patch: Omit<AccessSettingsInput, "expected_revision">) {
    if (!draft) return;
    void action.run(async (signal) => {
      const { data } = await saveAccessSettings(
        baseUrl,
        { expected_revision: draft.revision, ...patch },
        csrfToken,
        { signal },
      );
      if (!signal.aborted) {
        setSaved(data);
        setDraft(data);
      }
    });
  }

  return {
    draft,
    saved,
    setDraft,
    save,
    busy: action.busy,
    message: action.message,
    error,
    reload: () => setReload((value) => value + 1),
  };
}
