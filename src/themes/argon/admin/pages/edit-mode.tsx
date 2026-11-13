"use client";

import { UiText, useT } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import styles from "./pages.module.css";

export type PageLayout = "wide" | "sidebar" | "wide_transparent" | "blank";
export type PageEditMode = "source" | "components";

export function PageEditOptions({
  mode,
  layout = "wide",
  onMode,
  onLayout,
}: {
  mode: PageEditMode;
  layout?: PageLayout;
  onMode?: (mode: PageEditMode) => void;
  onLayout: (layout: PageLayout) => void;
}) {
  const t = useT();
  return (
    <div className="account-form-grid">
      {onMode && (
        <label className={styles.editOption}>
          <UiText text="编辑方式" />
          <Select
            name="page-edit-mode"
            label={t("编辑方式")}
            value={mode}
            options={[
              { value: "components", label: t("组件模式") },
              { value: "source", label: t("HTML、CSS 和 JavaScript") },
            ]}
            onValueChange={(value) =>
              onMode(value === "source" ? "source" : "components")
            }
          />
        </label>
      )}
      <label className={styles.editOption}>
        <UiText text="页面布局" />
        <Select
          name="page-layout"
          label={t("页面布局")}
          value={layout}
          options={[
            { value: "wide", label: t("全宽") },
            { value: "sidebar", label: t("带侧边栏") },
            { value: "wide_transparent", label: t("全宽无容器背景") },
            { value: "blank", label: t("空白") },
          ]}
          onValueChange={(value) => onLayout(value as PageLayout)}
        />
      </label>
    </div>
  );
}
