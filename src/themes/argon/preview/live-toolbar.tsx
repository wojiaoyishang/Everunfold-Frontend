"use client";

import type { RefObject } from "react";
import type { BuilderDevice } from "@/core/builder/types";
import type { PreviewKind } from "@/core/preview/routes";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon, type IconName } from "../components/icon";
import { Button } from "../components/ui/primitives";
import { ActionPopover } from "../components/ui/action-popover";
import type { LivePanel } from "../admin/builder/editor";
import styles from "./live-workspace.module.css";

const devices = [
  ["desktop", "desktop", "桌面预览"],
  ["tablet", "tablet", "平板预览"],
  ["mobile", "phone", "手机预览"],
] as const;

export function LiveToolbar({
  title,
  published,
  ready,
  saveBlocked,
  kind,
  builderMode,
  panel,
  onAdd,
  onSettings,
  onParameters,
  structure,
  structureRef,
  onStructure,
  device,
  onDevice,
  collapsed,
  onPreview,
  onOpenPreview,
  previewDisabled,
  onUndo,
  onRedo,
  onSaveTemplate,
  onExit,
  busy,
}: {
  title: string;
  published: boolean | null;
  ready: boolean;
  saveBlocked: boolean;
  kind: PreviewKind;
  builderMode: boolean;
  panel: LivePanel;
  onAdd: () => void;
  onSettings: () => void;
  onParameters?: () => void;
  structure: boolean;
  structureRef: RefObject<HTMLButtonElement | null>;
  onStructure: () => void;
  device: BuilderDevice;
  onDevice: (device: BuilderDevice) => void;
  collapsed: boolean;
  onPreview: () => void;
  onOpenPreview: () => void;
  previewDisabled: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  onSaveTemplate?: () => void;
  onExit: () => void;
  busy: boolean;
}) {
  const t = useT();
  const isBlocks = kind === "article" || kind === "shuoshuo";
  const gallery = builderMode || isBlocks;
  const libraryLabel = builderMode
    ? "添加组件"
    : isBlocks
      ? "添加区块"
      : "页面源码";
  const tool = (
    icon: IconName,
    label: string,
    onClick: () => void,
    active?: boolean,
    disabled?: boolean,
  ) => (
    <Button
      className={styles.tool}
      title={t(label)}
      aria-label={t(label)}
      onClick={onClick}
      aria-pressed={active}
      disabled={disabled}
    >
      <Icon name={icon} />
    </Button>
  );
  return (
    <header className={styles.toolbar} data-live-toolbar>
      <div className={styles.tools}>
        <ActionPopover
          label={t("工作区菜单")}
          triggerContent={<Icon name="menu" />}
          className={styles.tool}
          panelClassName={styles.toolbarMenu}
          panelWidth={180}
        >
          {(close) => (
            <>
              <Button
                disabled={busy}
                onClick={() => {
                  close();
                  onExit();
                }}
              >
                <Icon name="arrow-left" />
                <UiText text="返回后台" />
              </Button>
              <Button
                onClick={() => {
                  close();
                  onPreview();
                }}
              >
                <Icon name="sidebar" />
                <UiText text={collapsed ? "恢复编辑栏" : "纯预览"} />
              </Button>
              {onParameters && (
                <Button
                  onClick={() => {
                    close();
                    onParameters();
                  }}
                >
                  <Icon name="sliders" />
                  <UiText text="页面参数" />
                </Button>
              )}
              {builderMode && (
                <>
                  <Button
                    disabled={!onUndo}
                    onClick={() => {
                      close();
                      onUndo?.();
                    }}
                  >
                    <Icon name="undo" />
                    <UiText text="撤销" />
                  </Button>
                  <Button
                    disabled={!onRedo}
                    onClick={() => {
                      close();
                      onRedo?.();
                    }}
                  >
                    <Icon name="redo" />
                    <UiText text="重做" />
                  </Button>
                </>
              )}
            </>
          )}
        </ActionPopover>
        {tool(
          gallery || !ready ? "plus" : "code",
          libraryLabel,
          onAdd,
          !collapsed && panel === "library",
          !ready,
        )}
        <Button
          ref={structureRef}
          className={styles.tool}
          title={t("结构")}
          aria-label={t("结构")}
          disabled={!builderMode}
          aria-pressed={structure}
          onClick={onStructure}
        >
          <Icon name="layers" />
        </Button>
      </div>
      <div className={styles.document}>
        <div className={styles.documentLabel}>
          <span className={styles.documentTitle} title={title}>
            {title || t("实时预览")}
          </span>
          {kind !== "template" && published !== null && (
            <span className={styles.documentState} data-published={published}>
              <UiText text={published ? "已发布" : "草稿"} />
            </span>
          )}
        </div>
        {tool(
          "settings",
          "页面设置",
          onSettings,
          !collapsed && panel === "settings",
          !ready,
        )}
      </div>
      <div className={styles.devices} role="group" aria-label={t("预览设备")}>
        {devices.map(([value, icon, label]) => (
          <Button
            className={styles.tool}
            key={value}
            title={t(label)}
            aria-label={t(label)}
            aria-pressed={device === value}
            onClick={() => onDevice(value)}
          >
            <Icon name={icon} />
          </Button>
        ))}
      </div>
      <div className={styles.actions}>
        {tool(
          "eye",
          "在新窗口查看前台预览",
          onOpenPreview,
          undefined,
          previewDisabled,
        )}
        <div className={styles.save} data-locked={saveBlocked || undefined}>
          <div
            className={styles.primary}
            data-live-editor-primary
            inert={saveBlocked}
          />
          <ActionPopover
            label={t("保存选项")}
            className={styles.saveToggle}
            triggerContent={<Icon name="chevron-down" />}
            disabled={!ready || saveBlocked}
            panelClassName={styles.toolbarMenu}
            panelWidth={190}
          >
            {(close) => (
              <>
                <div className={styles.secondary} data-live-editor-actions />
                {onSaveTemplate && (
                  <Button
                    onClick={() => {
                      close();
                      onSaveTemplate();
                    }}
                  >
                    <Icon name="folder" />
                    <UiText text="另存为模板" />
                  </Button>
                )}
              </>
            )}
          </ActionPopover>
        </div>
      </div>
    </header>
  );
}
