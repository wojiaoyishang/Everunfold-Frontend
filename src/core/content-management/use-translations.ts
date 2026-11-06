"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { randomUUID } from "@/core/browser/crypto";
import {
  createTranslation,
  linkTranslation,
  readTranslations,
  reviewTranslation,
  unlinkTranslation,
  restoreDraft,
  trashDraft,
} from "@/core/contracts/content-admin";
import type {
  TranslationCatalog,
  TranslationMutation,
  TranslationMember,
} from "@/core/contracts/content-admin";
import type { Locale } from "@/core/i18n/locale";
import { draftError, uncertainWrite } from "./draft-state";
import { RequestError } from "@/core/http/request";

export function useTranslations(id: string | null, contentRevision = 0) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [catalog, setCatalog] = useState<TranslationCatalog | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [revision, refresh] = useState(0);
  const pending = useRef<{ key: string; input: TranslationMutation } | null>(
    null,
  );
  const requestVersion = useRef(0);
  const inFlight = useRef(false);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    const abort = new AbortController();
    const version = ++requestVersion.current;
    readTranslations(baseUrl, { id }, csrfToken, { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted && version === requestVersion.current)
          setCatalog(data);
      })
      .catch((cause: unknown) => {
        if (!abort.signal.aborted && version === requestVersion.current)
          setError(draftError(cause));
      });
    return () => abort.abort();
  }, [baseUrl, csrfToken, id, revision, contentRevision]);
  async function run(
    key: string,
    execute: (
      input: TranslationMutation,
    ) => Promise<{ data: TranslationCatalog }>,
  ) {
    if (!id || !catalog || inFlight.current) return null;
    inFlight.current = true;
    requestVersion.current++;
    if (pending.current?.key !== key)
      pending.current = {
        key,
        input: {
          id,
          expected_revision: catalog.revision,
          operation_id: randomUUID(),
        },
      };
    setBusy(true);
    setError("");
    try {
      const { data } = await execute(pending.current.input);
      if (!alive.current) return null;
      requestVersion.current++;
      setCatalog(data);
      pending.current = null;
      return data;
    } catch (cause) {
      setError(
        cause instanceof RequestError && cause.code === 40990
          ? "语言关联已变化或该语言已存在，请刷新后直接打开对应版本。"
          : draftError(cause),
      );
      if (!uncertainWrite(cause)) {
        pending.current = null;
        refresh((value) => value + 1);
      }
      return null;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }
  return {
    catalog,
    error,
    busy,
    reload: () => {
      setError("");
      refresh((value) => value + 1);
    },
    create: (language: Locale, copy: boolean) =>
      run(`create:${language}:${copy}`, (input) =>
        createTranslation(
          baseUrl,
          { ...input, language, copy_source: copy },
          csrfToken,
        ),
      ),
    link: (target: string) =>
      run(`link:${target}`, (input) =>
        linkTranslation(baseUrl, { ...input, target_id: target }, csrfToken),
      ),
    unlink: (target: string) =>
      run(`unlink:${target}`, async (input) => {
        const result = await unlinkTranslation(
          baseUrl,
          { ...input, id: target },
          csrfToken,
        );
        return target === id
          ? readTranslations(baseUrl, { id: target }, csrfToken)
          : result;
      }),
    review: () =>
      run("review", (input) => reviewTranslation(baseUrl, input, csrfToken)),
    archive: (member: TranslationMember, restore: boolean) =>
      run(`${restore ? "restore" : "trash"}:${member.id}`, async (input) => {
        await (restore ? restoreDraft : trashDraft)(
          baseUrl,
          { ...input, id: member.id, expected_revision: member.revision },
          csrfToken,
        );
        return readTranslations(baseUrl, { id: input.id }, csrfToken);
      }),
  };
}
