"use client";

import { useId, useState } from "react";
import { UiText, useLocale, useT } from "@/core/i18n/provider";
import {
  useQueryCacheReport,
  type QueryCacheHours,
  type QueryCacheReport,
} from "@/core/settings/use-query-cache-report";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { SettingsSection } from "./shared";
import styles from "./query-cache.module.css";

type Business = QueryCacheReport["businesses"][number]["business"];
type Stats = QueryCacheReport["total"];
type Point = QueryCacheReport["trend"][number];

const businesses = {
  site: "站点信息与统计",
  taxonomies: "分类与标签",
  content_list: "公开内容列表",
} satisfies Record<Business, string>;
const cacheStates = {
  ready: "Redis 在线",
  unavailable: "Redis 不可用 · 直接查库",
  unconfigured: "Redis 未配置 · 直接查库",
  disabled: "查询缓存已停用",
} satisfies Record<QueryCacheReport["cache_status"], string>;
const columns = [
  ["queries", "查询量"],
  ["hits", "命中"],
  ["misses", "未命中"],
  ["bypasses", "绕过"],
  ["errors", "查询错误"],
  ["hit_rate", "命中率"],
  ["sql_queries", "SQL 次数"],
  ["mean_ms", "平均耗时"],
  ["p95_ms", "P95 耗时"],
] as const satisfies readonly (readonly [keyof Stats, string])[];

type Series = {
  key: "queries" | "hits" | "sql_queries" | "hit_rate" | "mean_ms" | "p95_ms";
  label: string;
  style: "primary" | "secondary" | "tertiary";
};

function MetricChart({
  title,
  points,
  series,
  fixedMax,
  axisSuffix = "",
}: {
  title: string;
  points: Point[];
  series: Series[];
  fixedMax?: number;
  axisSuffix?: string;
}) {
  const id = useId();
  const { uiLocale } = useLocale();
  const number = new Intl.NumberFormat(uiLocale, { maximumFractionDigits: 1 });
  const time = new Intl.DateTimeFormat(uiLocale, {
    hour: "2-digit",
    minute: "2-digit",
  });
  const peak = Math.max(
    1,
    ...series.flatMap(({ key }) => points.map((point) => point[key] ?? 0)),
  );
  const magnitude = 10 ** Math.floor(Math.log10(peak));
  const max = fixedMax ?? Math.ceil(peak / (magnitude / 2)) * (magnitude / 2);
  const y = (value: number) => 98 - (96 * value) / max;
  const x = (index: number) => (index * 100) / Math.max(1, points.length - 1);
  const segments = (key: Series["key"]) => {
    let segment: string[] = [];
    const result: string[][] = [];
    points.forEach((point, index) => {
      const value = point[key];
      if (value == null) {
        if (segment.length) result.push(segment);
        segment = [];
      } else {
        segment.push(`${x(index)},${y(value)}`);
      }
    });
    if (segment.length) result.push(segment);
    return result;
  };
  const scale = (value: number) =>
    `${number.format(fixedMax === 1 ? value * 100 : value)}${axisSuffix}`;
  return (
    <figure className={styles.figure} aria-labelledby={id}>
      <figcaption id={id}>
        <UiText text={title} />
      </figcaption>
      <div className={styles.plot}>
        <div className={styles.axis} aria-hidden="true">
          <span>{scale(max)}</span>
          <span>{scale(max / 2)}</span>
          <span>{scale(0)}</span>
        </div>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {[2, 50, 98].map((tick) => (
            <line
              key={tick}
              x1="0"
              y1={tick}
              x2="100"
              y2={tick}
              className={styles.gridLine}
            />
          ))}
          {series.map(({ key, style }) =>
            segments(key).map((segment, index) => {
              if (segment.length > 1)
                return (
                  <polyline
                    key={`${key}-${index}`}
                    points={segment.join(" ")}
                    className={styles[style]}
                  />
                );
              const [left, top] = segment[0].split(",").map(Number);
              return (
                <line
                  key={`${key}-${index}`}
                  x1={left - 0.35}
                  y1={top}
                  x2={left + 0.35}
                  y2={top}
                  className={styles[style]}
                />
              );
            }),
          )}
        </svg>
        <div className={styles.timeAxis} aria-hidden="true">
          {[
            points.at(0),
            points.at(Math.floor(points.length / 2)),
            points.at(-1),
          ].map((point, index) => (
            <span key={index}>
              {point ? time.format(new Date(point.at)) : "—"}
            </span>
          ))}
        </div>
      </div>
      <ul className={styles.legend}>
        {series.map(({ key, label, style }) => (
          <li key={key}>
            <i className={styles[style]} aria-hidden="true" />
            <UiText text={label} />
          </li>
        ))}
      </ul>
    </figure>
  );
}

export function QueryCacheSection() {
  const t = useT();
  const { uiLocale } = useLocale();
  const [hours, setHours] = useState<QueryCacheHours>(6);
  const [business, setBusiness] = useState<Business | "all">("all");
  const { report, loading, error, refresh } = useQueryCacheReport(hours);
  const active = report?.businesses.find((row) => row.business === business);
  const points = business === "all" ? report?.trend : active?.trend;
  const number = new Intl.NumberFormat(uiLocale);
  const fraction = new Intl.NumberFormat(uiLocale, {
    style: "percent",
    maximumFractionDigits: 1,
  });
  const decimal = new Intl.NumberFormat(uiLocale, { maximumFractionDigits: 1 });
  const time = new Intl.DateTimeFormat(uiLocale, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const metric = (key: keyof Stats, value: number | null) => {
    if (value == null) return "—";
    if (key === "hit_rate") return fraction.format(value);
    if (key === "mean_ms" || key === "p95_ms")
      return `${decimal.format(value)} ms`;
    return number.format(value);
  };
  return (
    <SettingsSection
      id="query-cache"
      title="后端查询缓存"
      description="站点统计、分类标签与公开内容列表的 Redis 和 SQL 指标。"
    >
      <div className={styles.report} aria-busy={loading}>
        <div className={styles.toolbar}>
          <div className={styles.status}>
            {report && (
              <>
                <span className="admin-badge" data-state={report.cache_status}>
                  <UiText text={cacheStates[report.cache_status]} />
                </span>
                <time dateTime={report.checked_at}>
                  {time.format(new Date(report.checked_at))}
                </time>
              </>
            )}
          </div>
          <div className={styles.controls}>
            <Select
              name="query-cache-period"
              label="统计时间范围"
              value={String(hours)}
              options={[
                { value: "1", label: t("最近 1 小时") },
                { value: "6", label: t("最近 6 小时") },
                { value: "24", label: t("最近 24 小时") },
              ]}
              onValueChange={(value) =>
                setHours(value === "1" ? 1 : value === "24" ? 24 : 6)
              }
            />
            <Button
              className="admin-button"
              onClick={refresh}
              disabled={loading}
            >
              <Icon name="refresh" />
              <UiText text="刷新指标" />
            </Button>
          </div>
        </div>
        {error && (
          <p role="status" className="admin-settings-message is-error">
            <UiText
              text={
                report
                  ? "刷新失败，当前显示上次取得的指标。"
                  : "无法读取查询缓存指标。"
              }
            />
          </p>
        )}
        {!report && loading && (
          <p role="status">
            <UiText text="正在读取查询指标…" />
          </p>
        )}
        {report?.metrics_status === "unavailable" && (
          <p role="status" className="admin-settings-message is-error">
            <UiText text="指标存储暂不可用。" />
          </p>
        )}
        {report?.metrics_status === "ready" && (
          <>
            <dl className={styles.summary}>
              {(
                [
                  ["hit_rate", "Redis 命中率"],
                  ["queries", "业务查询量"],
                  ["sql_queries", "SQL 执行次数"],
                  ["p95_ms", "P95 查询耗时"],
                ] as const
              ).map(([key, label]) => (
                <div key={key}>
                  <dt>
                    <UiText text={label} />
                  </dt>
                  <dd>{metric(key, report.total[key])}</dd>
                </div>
              ))}
            </dl>
            <div className={styles.trendHeader}>
              <h3>
                <UiText text="查询趋势" />
              </h3>
              <Select
                name="query-cache-business"
                label="趋势业务"
                value={business}
                options={[
                  { value: "all", label: t("全部业务") },
                  ...report.businesses.map((row) => ({
                    value: row.business,
                    label: t(businesses[row.business]),
                  })),
                ]}
                onValueChange={(value) =>
                  setBusiness(
                    report.businesses.find((row) => row.business === value)
                      ?.business ?? "all",
                  )
                }
              />
            </div>
            {points?.some((point) => point.queries > 0) ? (
              <div className={styles.charts}>
                <MetricChart
                  title="查询量"
                  points={points}
                  series={[
                    { key: "queries", label: "业务查询", style: "primary" },
                    { key: "hits", label: "缓存命中", style: "secondary" },
                    {
                      key: "sql_queries",
                      label: "SQL 执行",
                      style: "tertiary",
                    },
                  ]}
                />
                <MetricChart
                  title="缓存命中率"
                  points={points}
                  fixedMax={1}
                  axisSuffix="%"
                  series={[
                    { key: "hit_rate", label: "命中率", style: "primary" },
                  ]}
                />
                <MetricChart
                  title="查询耗时"
                  points={points}
                  axisSuffix=" ms"
                  series={[
                    { key: "p95_ms", label: "P95", style: "primary" },
                    { key: "mean_ms", label: "平均", style: "secondary" },
                  ]}
                />
              </div>
            ) : (
              <p className={styles.empty}>
                <UiText text="所选时段暂无查询。" />
              </p>
            )}
            <div className={styles.audit}>
              <h3 id="query-cache-audit">
                <UiText text="查询审计" />
              </h3>
              <div
                className={styles.tableScroll}
                role="region"
                tabIndex={0}
                aria-labelledby="query-cache-audit"
              >
                <table>
                  <thead>
                    <tr>
                      <th scope="col">
                        <UiText text="业务" />
                      </th>
                      {columns.map(([key, label]) => (
                        <th scope="col" key={key}>
                          <UiText text={label} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <th scope="row">
                        <UiText text="总计" />
                      </th>
                      {columns.map(([key]) => (
                        <td key={key}>{metric(key, report.total[key])}</td>
                      ))}
                    </tr>
                    {report.businesses.map((row) => (
                      <tr key={row.business}>
                        <th scope="row">
                          <UiText text={businesses[row.business]} />
                        </th>
                        {columns.map(([key]) => (
                          <td key={key}>{metric(key, row[key])}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="admin-settings-hint">
                <UiText text="命中率按命中 ÷（命中 + 未命中）计算。P95 为估算值。" />
              </p>
            </div>
          </>
        )}
      </div>
    </SettingsSection>
  );
}
