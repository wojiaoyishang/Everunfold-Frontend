"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { postJSON, RequestError } from "@/core/http/request";
import { commentReadHeaders } from "@/core/content/comment-read-grant";
import { renderContent } from "@/core/rendering/content";
import type { Content } from "@/core/content/types";
import type { RegionKind } from "@/core/shortcodes/region-definitions";
import { useRouteState } from "./route-state";
import { useOptionalReaderBaseUrl } from "./reader-data";
import { Button, Form, TextField } from "./ui/primitives";
import { ContentMarkupView } from "./content-markup-view";
import { UiText } from "@/core/i18n/provider";
import styles from "./shortcode-regions.module.css";

const Grant = createContext<{ target: string; receipt?: string } | null>(null);

export function ShortcodeRegionBoundary({
  target,
  readReceipt,
  children,
}: {
  target: string;
  readReceipt?: string;
  children: ReactNode;
}) {
  return (
    <Grant.Provider value={{ target, receipt: readReceipt }}>
      {children}
    </Grant.Provider>
  );
}

type Body = {
  source: string;
  type: "markdown" | "html";
  media_urls: Content["media_urls"];
};

function isBodyResult(value: unknown): value is { success: true; data: Body } {
  if (typeof value !== "object" || value === null || !("data" in value))
    return false;
  const { data } = value;
  return (
    typeof data === "object" &&
    data !== null &&
    "source" in data &&
    typeof data.source === "string" &&
    "type" in data &&
    (data.type === "markdown" || data.type === "html") &&
    "media_urls" in data &&
    typeof data.media_urls === "object" &&
    data.media_urls !== null
  );
}

function message(reason: unknown) {
  if (reason instanceof RequestError) {
    if (reason.status === 401) return "请先登录，再提交评论。";
    if (reason.status === 429) return "尝试较多，请稍后重试。";
    if (reason.code === 40382) return "请先发表评论，审核通过后即可查看。";
    if (reason.code === 40383) return "区域口令不正确。";
    if (reason.code === 40381 || reason.code === 40388)
      return "请重新解锁所在页面。";
  }
  return "暂时无法查看此区域，请稍后重试。";
}

export function ShortcodeRegion({
  id,
  kind,
  showTitle = true,
}: {
  id: string;
  kind: RegionKind;
  showTitle?: boolean;
}) {
  const baseUrl = useOptionalReaderBaseUrl();
  const grant = useContext(Grant);
  const { site } = useRouteState();
  const [body, setBody] = useState<Body>();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  if (!baseUrl) return null;
  if (body) {
    const rendered = renderContent(
      {
        id,
        content: [{ id, content: body.source, type: body.type }],
        media_urls: body.media_urls,
      },
      site.settings?.shortcodes,
      { disableShortcodeScripts: true },
    );
    return (
      <ContentMarkupView
        html={rendered.html}
        features={rendered.features}
        preview
      />
    );
  }
  const reply = kind === "reply-only";
  return (
    <Form
      className={styles.region}
      data-embedded={showTitle || undefined}
      onSubmit={async (event) => {
        event.preventDefault();
        if (request.current) return;
        const password = new FormData(event.currentTarget).get("password");
        const controller = new AbortController();
        request.current = controller;
        setPending(true);
        setError("");
        try {
          const result = await postJSON(
            baseUrl,
            "/v1/reader/shortcode-region",
            { id, password: typeof password === "string" ? password : "" },
            isBodyResult,
            {
              credentials: "include",
              signal: controller.signal,
              headers: commentReadHeaders(grant?.target, grant?.receipt),
            },
          );
          if (!controller.signal.aborted) setBody(result.data);
        } catch (reason) {
          if (!controller.signal.aborted) setError(message(reason));
        } finally {
          if (!controller.signal.aborted) setPending(false);
          request.current = null;
        }
      }}
    >
      {showTitle && (
        <strong>
          <UiText text={reply ? "回复可见区域" : "密码保护区域"} />
        </strong>
      )}
      {reply && (
        <p>
          <UiText text="登录后发表评论，审核通过即可查看。" />
        </p>
      )}
      <div className={styles.controls}>
        {!reply && (
          <label>
            <span>
              <UiText text="区域口令" />
            </span>
            <TextField
              name="password"
              type="password"
              maxLength={200}
              autoComplete="off"
              required
            />
          </label>
        )}
        <Button type="submit" disabled={pending}>
          <UiText
            text={pending ? "正在检查…" : reply ? "检查并查看" : "解锁区域"}
          />
        </Button>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          <UiText text={error} />
        </p>
      )}
    </Form>
  );
}

export function ShortcodeRegions({
  root,
  html,
}: {
  root: RefObject<HTMLDivElement | null>;
  html: string;
}) {
  const baseUrl = useOptionalReaderBaseUrl();
  const [mounted, setMounted] = useState<{
    html: string;
    hosts: HTMLElement[];
  }>();
  useEffect(() => {
    if (!baseUrl || !html.includes("data-shortcode-region=")) return;
    let active = true;
    const hosts = [
      ...(root.current?.querySelectorAll<HTMLElement>(
        "[data-shortcode-region]",
      ) ?? []),
    ];
    queueMicrotask(() => {
      if (!active) return;
      hosts.forEach((host) => host.replaceChildren());
      setMounted({ html, hosts });
    });
    return () => {
      active = false;
    };
  }, [baseUrl, html, root]);
  return mounted?.html === html
    ? mounted.hosts.map((host, index) =>
        createPortal(
          <ShortcodeRegion
            id={host.dataset.shortcodeRegion ?? ""}
            kind={
              host.dataset.shortcodeRegionKind === "reply-only"
                ? "reply-only"
                : "password-area"
            }
          />,
          host,
          `${host.dataset.shortcodeRegion}-${index}`,
        ),
      )
    : null;
}
