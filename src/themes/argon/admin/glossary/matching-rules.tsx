"use client";

import { useEffect, useMemo, useState } from "react";

import type { GlossaryContract } from "@/core/contracts/glossary";
import { previewGlossary } from "@/core/contracts/glossary";
import {
  matchGlossaryText,
  type GlossaryMatchTerm,
} from "@/core/glossary/match";
import { Icon } from "../../components/icon";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import styles from "./matching-rules.module.css";

type Fields = GlossaryContract["create"]["fields"];
type MatchRule = NonNullable<Fields["match_rules"]>[number];
type Preview = NonNullable<GlossaryContract["preview_output"]["data"]>;

function configuredRules(fields: Fields): MatchRule[] {
  if (fields.match_rules !== null && fields.match_rules !== undefined)
    return fields.match_rules;
  return (fields.aliases ?? []).map((pattern) => ({
    kind: "literal",
    pattern,
    enabled: true,
    case_sensitive: false,
    whole_word: true,
    priority: 0,
  }));
}

function newRule(): MatchRule {
  return {
    kind: "literal",
    pattern: "",
    enabled: true,
    case_sensitive: false,
    whole_word: true,
    priority: 0,
  };
}

export function MatchingRulesEditor({
  fields,
  onChange,
  baseUrl,
  csrfToken,
  disabled,
}: {
  fields: Fields;
  onChange: (patch: Partial<Fields>) => void;
  baseUrl: string;
  csrfToken: string;
  disabled: boolean;
}) {
  const [sample, setSample] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [previewError, setPreviewError] = useState("");
  const [loading, setLoading] = useState(false);
  const rules = configuredRules(fields);

  function changeRules(next: MatchRule[]) {
    onChange({
      match_rules: next,
      aliases: [
        ...new Set(
          next
            .filter((rule) => rule.kind === "literal")
            .map((rule) => rule.pattern.trim())
            .filter(Boolean),
        ),
      ].slice(0, 20),
    });
  }

  function changeRule(index: number, patch: Partial<MatchRule>) {
    changeRules(
      rules.map((rule, position) =>
        position === index ? { ...rule, ...patch } : rule,
      ),
    );
  }

  useEffect(() => {
    const controller = new AbortController();
    if (!sample.trim()) {
      queueMicrotask(() => {
        if (!controller.signal.aborted) {
          setPreview(null);
          setPreviewError("");
          setLoading(false);
        }
      });
      return () => controller.abort();
    }
    const timer = setTimeout(() => {
      setLoading(true);
      setPreviewError("");
      void previewGlossary(
        baseUrl,
        {
          title: fields.title,
          aliases: fields.aliases,
          auto_match_title: fields.auto_match_title ?? true,
          match_rules: fields.match_rules,
          sample,
        },
        csrfToken,
        { signal: controller.signal },
      )
        .then((response) => {
          if (!controller.signal.aborted) setPreview(response.data);
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setPreview(null);
            setPreviewError(
              "匹配测试失败。请检查正则语法；仅支持有限重复 {0,32}，不支持无限重复、断言和反向引用。",
            );
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    baseUrl,
    csrfToken,
    fields.aliases,
    fields.auto_match_title,
    fields.match_rules,
    fields.title,
    sample,
  ]);

  const matches = useMemo(() => {
    if (!preview) return [];
    const item: GlossaryMatchTerm = {
      id: "preview",
      language: "*",
      slug: "preview",
      title: fields.title || "术语",
      summary: "",
      aliases: fields.aliases ?? [],
      path: "/glossary",
      body: [],
      media_urls: {},
      matched_texts: preview.hits.map((hit) => hit.text),
      matched_patterns: preview.hits,
    };
    return matchGlossaryText(sample, [item], 80);
  }, [fields.aliases, fields.title, preview, sample]);

  const highlighted = [];
  let cursor = 0;
  for (const [index, match] of matches.entries()) {
    highlighted.push(sample.slice(cursor, match.start));
    highlighted.push(
      <mark key={index}>{sample.slice(match.start, match.end)}</mark>,
    );
    cursor = match.end;
  }
  highlighted.push(sample.slice(cursor));

  return (
    <div className={styles.rules}>
      <div className={styles.titleRule}>
        <div>
          <strong>自动匹配术语标题</strong>
          <small>
            词条的显示标题和匹配开关独立。旧词条仍保留原有标题与别名匹配行为。
          </small>
        </div>
        <Button
          type="button"
          className="admin-button"
          aria-pressed={fields.auto_match_title ?? true}
          disabled={disabled}
          onClick={() =>
            onChange({ auto_match_title: !(fields.auto_match_title ?? true) })
          }
        >
          <Icon name={(fields.auto_match_title ?? true) ? "check" : "close"} />
          {(fields.auto_match_title ?? true) ? "已启用" : "已关闭"}
        </Button>
      </div>
      {rules.map((rule, index) => (
        <div className={styles.ruleRow} key={index}>
          <div className={styles.ruleMain}>
            <div className={styles.ruleKind}>
              <Select
                name={`glossary-rule-${index}`}
                label={`规则 ${index + 1} 类型`}
                value={rule.kind}
                disabled={disabled}
                options={[
                  { value: "literal", label: "普通匹配" },
                  { value: "regex", label: "正则匹配" },
                ]}
                onValueChange={(value) =>
                  changeRule(index, { kind: value as MatchRule["kind"] })
                }
              />
            </div>
            <TextField
              type="text"
              aria-label={`规则 ${index + 1} 匹配文字`}
              placeholder={
                rule.kind === "regex"
                  ? "(?:AI|人工智能)(?:技术|系统)?"
                  : "输入匹配文字"
              }
              value={rule.pattern}
              maxLength={160}
              disabled={disabled}
              onChange={(event) =>
                changeRule(index, { pattern: event.target.value })
              }
            />
            <Button
              type="button"
              className="admin-icon-button"
              aria-label={`删除第 ${index + 1} 条规则`}
              disabled={disabled}
              onClick={() =>
                changeRules(rules.filter((_, position) => position !== index))
              }
            >
              <Icon name="trash" />
            </Button>
          </div>
          <div className={styles.ruleOptions}>
            <Button
              type="button"
              aria-pressed={rule.enabled ?? true}
              disabled={disabled}
              onClick={() =>
                changeRule(index, { enabled: !(rule.enabled ?? true) })
              }
            >
              {(rule.enabled ?? true) ? "已启用" : "已停用"}
            </Button>
            <Button
              type="button"
              aria-pressed={rule.case_sensitive ?? false}
              disabled={disabled}
              onClick={() =>
                changeRule(index, {
                  case_sensitive: !(rule.case_sensitive ?? false),
                })
              }
            >
              区分大小写
            </Button>
            <Button
              type="button"
              aria-pressed={rule.whole_word ?? true}
              disabled={disabled}
              onClick={() =>
                changeRule(index, { whole_word: !(rule.whole_word ?? true) })
              }
            >
              完整英文单词
            </Button>
            <label className={styles.priority}>
              优先级
              <TextField
                type="number"
                aria-label={`规则 ${index + 1} 优先级`}
                min={0}
                max={100}
                value={rule.priority ?? 0}
                disabled={disabled}
                onChange={(event) =>
                  changeRule(index, {
                    priority: Math.max(
                      0,
                      Math.min(100, Number(event.target.value) || 0),
                    ),
                  })
                }
              />
            </label>
          </div>
        </div>
      ))}
      <div className={styles.ruleActions}>
        <Button
          type="button"
          className="admin-button"
          disabled={disabled || rules.length >= 30}
          onClick={() => changeRules([...rules, newRule()])}
        >
          <Icon name="plus" /> 添加匹配规则
        </Button>
        <small>
          普通匹配也会作为公开词条的别名；正则仅用于正文命中，不会公开其表达式。
        </small>
      </div>
      <div className={styles.test}>
        <label htmlFor="glossary-match-test">匹配测试</label>
        <TextArea
          id="glossary-match-test"
          rows={3}
          maxLength={2000}
          value={sample}
          onChange={(event) => setSample(event.target.value)}
          placeholder="输入一段文章文字，实时预览实际命中结果。"
        />
        {previewError ? (
          <p role="alert" className={styles.error}>
            {previewError}
          </p>
        ) : null}
        {sample.trim() && !previewError && (
          <div className={styles.preview} role="status" aria-live="polite">
            <span>{loading ? "正在测试…" : `已命中 ${matches.length} 处`}</span>
            {!loading && preview ? <p>{highlighted}</p> : null}
          </div>
        )}
        <small>
          测试使用后端的真实匹配引擎，不会保存词条或修改文章。正则使用有限重复、无断言的安全子集。
        </small>
      </div>
    </div>
  );
}
