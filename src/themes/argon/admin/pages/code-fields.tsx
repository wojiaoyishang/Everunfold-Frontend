"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import type { TitledPageCode } from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { AdminWarning } from "../components/warning";
import styles from "./pages.module.css";

const SourceEditor = dynamic(() => import("./source-editor"), { ssr: false });

export function PageCodeFields({
  value,
  onChange,
  disabled,
  allowScripts,
}: {
  value: TitledPageCode;
  onChange: (patch: Partial<TitledPageCode>) => void;
  disabled: boolean;
  allowScripts: boolean;
}) {
  const t = useT();
  const [mode, setMode] = useState<"html" | "css" | "javascript">("html");
  return (
    <section className="account-card">
      <header>
        <h2>
          <UiText text="页面源码" />
        </h2>
      </header>
      <div className={styles.configuration}>
        <nav className={styles.tabs} aria-label={t("页面源码模式")}>
          {(["html", "css", "javascript"] as const).map((kind) => (
            <Button
              key={kind}
              aria-pressed={mode === kind}
              onClick={() => setMode(kind)}
            >
              {kind === "javascript" ? "JavaScript" : kind.toUpperCase()}
            </Button>
          ))}
        </nav>
        <SourceEditor
          kind={mode}
          value={value[mode] ?? ""}
          onChange={(text) => onChange({ [mode]: text })}
          disabled={disabled}
        />
        <div className={styles.toggle}>
          <span>JavaScript</span>
          <Switch
            aria-label={t("启用 JavaScript")}
            checked={!!value.javascript_enabled}
            onCheckedChange={(javascript_enabled) =>
              onChange({ javascript_enabled })
            }
            disabled={disabled || !allowScripts}
          />
        </div>
        <p className={styles.configurationHint}>
          <UiText text="JavaScript 默认关闭，仅在独立页面沙箱内运行。" />
        </p>
        <div className={`account-field ${styles.scriptPosition}`}>
          <span>
            <UiText text="脚本执行位置" />
          </span>
          <Select
            name="page-javascript-position"
            label="脚本执行位置"
            value={value.javascript_position ?? "body_end"}
            onValueChange={(position) => {
              if (position === "head" || position === "body_end")
                onChange({ javascript_position: position });
            }}
            options={[
              { value: "head", label: "正文加载前（Head 内）" },
              { value: "body_end", label: "正文加载后（Body 末尾）" },
            ]}
            disabled={disabled}
            programOptions
          />
          <small>
            <UiText text="加载前执行时，正文 DOM 尚未生成；直接操作页面元素请选择加载后。" />
          </small>
        </div>
        {value.javascript_enabled && (
          <AdminWarning text="JavaScript 已启用，脚本可以改变页面交互或触发跳转。请只使用可信代码。" />
        )}
      </div>
    </section>
  );
}
