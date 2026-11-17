"use client";

import {
  createContext,
  useContext,
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";
import {
  articleReadHeaders,
  forgetArticleRead,
  unavailableArticleRead,
  useRememberedArticleRead,
} from "@/core/content/remembered-article";
import { readProtectedArticleExcerpt } from "@/core/contracts/content-access";
import { RequestError } from "@/core/http/request";
import { UiText } from "@/core/i18n/provider";
import { shortcodeExcerpt } from "@/core/rendering/native-shortcodes";
import { useReaderScope } from "./reader-data";
import { ReadingLock } from "./reading-lock";

// An empty string is an unlocked card with no excerpt. Null retains the public fallback.
const ArticleExcerpt = createContext<string | null>(null);

export function ProtectedCardAccess({
  id,
  revision,
  children,
}: {
  id: string;
  revision: string;
  children: ReactNode;
}) {
  const { store, route } = useReaderScope();
  const { baseUrl } = store;
  const slot = useId();
  const receipt = useRememberedArticleRead(baseUrl, id);
  const [unlocked, setUnlocked] = useState<{
    id: string;
    baseUrl: string;
    receipt: string;
    revision: string;
    excerpt: string;
  } | null>(null);

  useEffect(() => {
    if (!receipt) return;
    return store.registerTask(
      route,
      `reader:unlocked-excerpt:${slot}`,
      async (options) => {
        try {
          const { data } = await readProtectedArticleExcerpt(
            baseUrl,
            { id },
            {
              ...options,
              headers: articleReadHeaders(receipt),
            },
          );
          if (data.id !== id) throw new RequestError("invalid");
          if (!options.signal?.aborted)
            setUnlocked({
              id,
              baseUrl,
              receipt,
              revision,
              excerpt: data.excerpt,
            });
          return true;
        } catch (reason) {
          if (unavailableArticleRead(reason) && !options.signal?.aborted)
            forgetArticleRead(baseUrl, id, receipt);
          throw reason;
        }
      },
    );
  }, [baseUrl, id, receipt, revision, route, slot, store]);

  const excerpt =
    unlocked &&
    unlocked.receipt === receipt &&
    unlocked.id === id &&
    unlocked.baseUrl === baseUrl &&
    unlocked.revision === revision
      ? unlocked.excerpt
      : null;
  return (
    <ArticleExcerpt.Provider value={excerpt}>
      {children}
    </ArticleExcerpt.Provider>
  );
}

export function ProtectedCardLock() {
  return (
    <ReadingLock
      className="post-title-lock"
      unlocked={useContext(ArticleExcerpt) !== null}
    />
  );
}

export function LockedCardStatus({ children }: { children: ReactNode }) {
  return useContext(ArticleExcerpt) === null ? children : null;
}

export function ProtectedCardExcerpt({
  fallback,
  hideFallback,
}: {
  fallback: string;
  hideFallback?: boolean;
}) {
  const unlocked = useContext(ArticleExcerpt);
  if (unlocked === null)
    return hideFallback ? null : (
      <p className="post-excerpt">
        {fallback || (
          <UiText text="这是一篇加密的文章，需要输入密码才能阅读。" />
        )}
      </p>
    );
  const excerpt = shortcodeExcerpt(unlocked);
  return excerpt ? <p className="post-excerpt">{excerpt}</p> : null;
}
