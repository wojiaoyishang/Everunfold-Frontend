"use client";
import { useState } from "react";
import type { Taxonomy } from "@/core/content/types";
import { useWordCloud } from "../hooks/use-word-cloud";
import { taxonomyHref } from "@/core/content/urls";
import { AppLink } from "./navigation-link";
import { Button } from "./ui/primitives";
import { UiText } from "@/core/i18n/provider";
import styles from "./tag-word-cloud.module.css";
export function TagWordCloud({ terms }: { terms: Taxonomy[] }) {
  const { ref, placed } = useWordCloud(terms);
  const [list, setList] = useState(false);
  const byId = new Map(terms.map((t) => [t.id, t]));
  return (
    <section className={`surface ${styles.root}`}>
      <div className={styles.heading}>
        <span>
          <UiText text="标签词云" />
        </span>
        <Button
          className="icon-button"
          aria-pressed={list}
          onClick={() => setList((v) => !v)}
        >
          <UiText text={list ? "词云" : "查看全部"} />
        </Button>
      </div>
      <div
        ref={ref}
        className={styles.stage}
        data-list={list || !placed.length}
      >
        {list || !placed.length ? (
          <div className={styles.list}>
            {terms.map((t) => (
              <AppLink key={t.id} href={taxonomyHref(t)}>
                {t.name}
                <small>{t.count}</small>
              </AppLink>
            ))}
          </div>
        ) : (
          placed.map((word) => (
            <AppLink
              className={styles.word}
              key={word.id}
              href={taxonomyHref(byId.get(word.id)!)}
              title={`${word.name} · ${word.count}`}
              style={{
                left: word.x,
                top: word.y,
                fontSize: word.size,
                width: word.width,
                height: word.height,
              }}
            >
              {word.name}
            </AppLink>
          ))
        )}
      </div>
      {!list && placed.length > 0 && placed.length < terms.length && (
        <p className={styles.hint}>
          <UiText text="展示常用标签，可切换列表查看全部。" />
        </p>
      )}
      {!terms.length && (
        <p>
          <UiText text="暂时还没有标签。" />
        </p>
      )}
    </section>
  );
}
