"use client";
import { useMemo, useState } from "react";
import type { Content, Site } from "@/core/content/types";
import { useProtectedContent } from "@/core/content/use-protected-content";
import { renderContent } from "@/core/rendering/content";
import { ArticleHeader } from "./article-header";
import { ArticleMedia } from "./article-media";
import { PagePresentation } from "./route-state";
import { Button, Form } from "./ui/primitives";
import { PasswordField } from "./ui/password-field";
import { Icon } from "./icon";
import styles from "./protected-article.module.css";

export function ProtectedArticle({
  content,
  site,
  baseUrl,
}: {
  content: Content;
  site: Site;
  baseUrl: string;
}) {
  const access = useProtectedContent(baseUrl, content.id, content.opens_at);
  const [password, setPassword] = useState("");
  const readable = access.content ?? content;
  const rendered = useMemo(() => renderContent(readable), [readable]);
  return (
    <>
      <PagePresentation id={content.id} site={site} toc={rendered.toc} />
      <article className="surface article-card">
        <ArticleHeader content={readable} liveMetrics={false} />
        {access.content ? (
          <div className={`article-body ${styles.revealed}`}>
            <ArticleMedia>
              <div
                className="article-content"
                dangerouslySetInnerHTML={{ __html: rendered.html }}
              />
            </ArticleMedia>
          </div>
        ) : (
          <div className={styles.gate} aria-busy={access.pending}>
            <span className={styles.mark}>
              <Icon name="lock" />
            </span>
            <h2>
              {content.opens_at ? "这篇内容尚未开放" : "这篇内容需要密码"}
            </h2>
            <p>
              {content.opens_at ? (
                <>
                  开放时间：
                  <time dateTime={content.opens_at}>
                    {new Date(content.opens_at).toLocaleString("zh-CN", {
                      timeZone: "Asia/Shanghai",
                      hour12: false,
                    })}
                  </time>
                  （北京时间）。在此之前，也可以输入密码阅读。
                </>
              ) : (
                "输入作者提供的文章密码，继续阅读正文。"
              )}
            </p>
            <Form
              onSubmit={(event) => {
                event.preventDefault();
                void access.load(password).then((success) => {
                  if (success) setPassword("");
                });
              }}
            >
              <PasswordField
                aria-label="文章访问密码"
                autoComplete="off"
                value={password}
                maxLength={200}
                disabled={access.pending}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="文章密码"
              />
              <Button type="submit" disabled={access.pending || !password}>
                <Icon name={access.pending ? "refresh" : "lock"} />
                {access.pending ? "正在验证…" : "解锁阅读"}
              </Button>
            </Form>
            {content.opens_at && (
              <Button
                className={styles.checkTime}
                disabled={access.pending}
                onClick={() => void access.load()}
              >
                <Icon name="refresh" /> 检查开放状态
              </Button>
            )}
            {access.error && (
              <p className={styles.error} role="alert">
                {access.error}
              </p>
            )}
          </div>
        )}
      </article>
    </>
  );
}
