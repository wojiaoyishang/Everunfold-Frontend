"use client";
import { useState } from "react";
import type { CustomPageProps } from "@everunfold/plugin-sdk";
import {
  Button,
  TextField,
  TextLink,
  Select,
  Icon,
  useLocale,
} from "@everunfold/plugin-sdk/client";
import { CertificateImage } from "./image";
import { Certificate } from "./certificate";
import { honorsText } from "./labels";
import { readHonors, filterHonors, type Honor, type HonorOrder } from "./model";
import styles from "./styles.module.css";

function HonorCard({
  item,
  onOpen,
  timeline,
  t,
}: {
  item: Honor;
  onOpen: () => void;
  timeline: boolean;
  t: (value: string) => string;
}) {
  return (
    <article className={styles.card} data-honor-record={item.id}>
      {item.image && (
        <Button
          className={styles.cover}
          aria-label={`${t("查看证书")} · ${item.title}${item.date ? ` · ${item.date}` : ""}`}
          aria-haspopup="dialog"
          onClick={onOpen}
        >
          <CertificateImage
            key={item.image}
            src={item.image}
            title={item.title}
          />
          <span className={styles.expand}>
            <Icon name="expand" />
            {t("查看证书")}
          </span>
        </Button>
      )}
      <div className={styles.cardBody}>
        <div className={styles.meta}>
          <span>
            <Icon name="calendar" />
            {item.date || "—"}
          </span>
          {timeline && <span>{t(item.category || "未分类")}</span>}
        </div>
        <h3>{item.title}</h3>
        {item.award && (
          <p className={styles.award}>
            <Icon name="star" />
            {item.award}
          </p>
        )}
        {item.description && (
          <p className={styles.description}>{item.description}</p>
        )}
        {item.link && (
          <TextLink
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.sourceLink}
          >
            {t("查看相关链接")}
            <Icon name="external" />
          </TextLink>
        )}
      </div>
    </article>
  );
}

export default function HonorsPage({ page }: CustomPageProps) {
  const options = readHonors(page.options);
  const { uiLocale } = useLocale();
  const t = (text: string) => honorsText(text, uiLocale);
  const [category, setCategory] = useState<string | null>(null);
  const [year, setYear] = useState("");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{
    base: HonorOrder;
    value: HonorOrder;
  } | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const currentCategory =
    category !== null && options.categories.includes(category)
      ? category
      : null;
  const currentYear =
    options.yearFilter && options.years.includes(year) ? year : "";
  const order = sort?.base === options.sort ? sort.value : options.sort;
  const filtered = filterHonors(options.items, {
    category: currentCategory,
    year: currentYear,
    query: options.search ? query : "",
    order,
  });
  const images = filtered.filter((item) => item.image);
  const active = images.find((item) => item.id === selected);
  const clear = () => {
    setCategory(null);
    setYear("");
    setQuery("");
  };
  const card = (item: Honor) => (
    <HonorCard
      key={item.id}
      item={item}
      onOpen={() => setSelected(item.id)}
      timeline={options.layout === "timeline"}
      t={t}
    />
  );
  return (
    <div className={styles.honors} data-honors-page>
      {options.intro && <p className={styles.intro}>{options.intro}</p>}
      {options.summary && !!options.items.length && (
        <div className={styles.summary}>
          <div>
            <strong>{options.items.length}</strong>
            <span>{t("荣誉与任职")}</span>
          </div>
          <div>
            <strong>
              {
                new Set(options.items.map((item) => item.image).filter(Boolean))
                  .size
              }
            </strong>
            <span>{t("证书")}</span>
          </div>
          <div>
            <strong>{options.years.length}</strong>
            <span>{t("记录年份")}</span>
          </div>
        </div>
      )}
      {!!options.items.length && (
        <>
          <nav className={styles.categories} aria-label={t("荣誉分类")}>
            <Button
              aria-pressed={currentCategory === null}
              onClick={() => setCategory(null)}
            >
              {t("全部")}
              <small>{options.items.length}</small>
            </Button>
            {options.categories.map((name) => (
              <Button
                key={name}
                aria-pressed={currentCategory === name}
                onClick={() => setCategory(name)}
              >
                {t(name || "未分类")}
                <small>
                  {
                    options.items.filter((item) => item.category === name)
                      .length
                  }
                </small>
              </Button>
            ))}
          </nav>
          <div className={styles.filters}>
            {options.search && (
              <div className={styles.search}>
                <Icon name="search" />
                <TextField
                  type="search"
                  value={query}
                  aria-label={t("搜索荣誉")}
                  placeholder={t("搜索名称、奖项或说明…")}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
            )}
            {options.yearFilter && options.years.length > 0 && (
              <Select
                name="honors-year"
                label={t("年份")}
                className={styles.yearSelect}
                value={currentYear}
                onValueChange={setYear}
                options={[
                  { value: "", label: t("全部年份") },
                  ...options.years.map((value) => ({ value, label: value })),
                ]}
              />
            )}
            <Select
              name="honors-order"
              label={t("排序")}
              className={styles.sortSelect}
              value={order}
              onValueChange={(value) => {
                if (
                  value === "manual" ||
                  value === "newest" ||
                  value === "oldest"
                )
                  setSort({ base: options.sort, value });
              }}
              options={[
                { value: "manual", label: t("录入顺序") },
                { value: "newest", label: t("从新到旧") },
                { value: "oldest", label: t("从旧到新") },
              ]}
            />
          </div>
          <p className={styles.hint} role="status">
            {filtered.length} / {options.items.length} · {t("点击图片查看证书")}
          </p>
        </>
      )}
      {!!filtered.length &&
        (options.layout === "timeline" ? (
          <div className={styles.timeline}>{filtered.map(card)}</div>
        ) : (
          options.categories.map((name) => {
            const group = filtered.filter((item) => item.category === name);
            return group.length ? (
              <section className={styles.section} key={name}>
                <h2>
                  <Icon name="folder" />
                  {t(name || "未分类")}
                  <small>{group.length}</small>
                </h2>
                <div className={styles.grid}>{group.map(card)}</div>
              </section>
            ) : null;
          })
        ))}
      {!filtered.length && (
        <div className={styles.empty}>
          <Icon name="leaf" />
          <p>
            {t(
              options.items.length
                ? "没有符合筛选条件的记录。"
                : "新的收获，正在路上。",
            )}
          </p>
          {!!options.items.length && (
            <Button onClick={clear}>{t("清除筛选")}</Button>
          )}
        </div>
      )}
      {active && (
        <Certificate
          item={active}
          images={images}
          onSelect={setSelected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
