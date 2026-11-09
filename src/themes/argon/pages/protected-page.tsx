"use client";
import { useEffect, useRef, useState } from "react";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { PageCommentsBoundary } from "@/core/pages/comments";
import {
  readProtectedPage,
  type UnlockedManagedPage,
} from "@/core/contracts/captcha";
import { useCaptcha, captchaFailure } from "@/core/captcha/use-captcha";
import { ExtensionComponent } from "@/core/extensions/components";
import type { Content } from "@/core/content/types";
import { useReaderData } from "../components/reader-data";
import { ReadingAccessForm } from "../components/reading-access-form";
import styles from "./pages.module.css";

export function ProtectedManagedPage({
  page,
  translations,
}: {
  page: PublicManagedPage;
  translations?: Content["translations"];
}) {
  const { store } = useReaderData();
  const [unlocked, setUnlocked] = useState<UnlockedManagedPage | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const captcha = useCaptcha(store.baseUrl, "read", page.id, !unlocked);
  useEffect(() => () => request.current?.abort(), []);
  const unlock = async () => {
    if (request.current) return false;
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    try {
      const response = await readProtectedPage(
        store.baseUrl,
        { id: page.id, captcha: captcha.response },
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) setUnlocked(response.data);
      return true;
    } catch (reason) {
      if (!controller.signal.aborted) setError(captchaFailure(reason));
      return false;
    } finally {
      if (!controller.signal.aborted) setPending(false);
      request.current = null;
    }
  };
  return unlocked ? (
    <PageCommentsBoundary
      page={unlocked}
      comments={unlocked.unlocked_comments ?? []}
      readReceipt={unlocked.read_receipt}
    >
      <ExtensionComponent
        name="public.page.surface"
        page={unlocked}
        translations={translations}
      />
    </PageCommentsBoundary>
  ) : (
    <article className={styles.page}>
      <ExtensionComponent
        name="public.page.heading"
        page={page}
        translations={translations}
      />
      <ReadingAccessForm
        captcha={captcha}
        pending={pending}
        error={error}
        onUnlock={unlock}
      />
    </article>
  );
}
