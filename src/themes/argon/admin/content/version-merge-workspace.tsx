"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import type { DraftVersioning } from "@/core/content-management/use-draft-versions";
import type { MediaURL } from "@/generated/content-admin-contract";
import type { MediaItem, PublicShortcode } from "@/generated/settings-contract";
import { serializeDraftExport } from "@/core/collaboration/export";
import { Button } from "../../components/ui/primitives";
import { DownloadButton } from "../../components/ui/download-button";
import { MergeConflictCard } from "./merge-conflict-card";
import { MergeResultEditor } from "./merge-result-editor";
import { DraftPreview } from "./draft-preview";
import { VersionComparison } from "./version-comparison";
import { mergeStates } from "./version-catalog";
import styles from "./versions.module.css";

export function VersionMergeWorkspace({
  versioning,
  media,
  shortcodes,
  onResume,
  onMedia,
}: {
  versioning: DraftVersioning;
  media: Record<string, MediaURL>;
  shortcodes: readonly PublicShortcode[];
  onResume: () => void;
  onMedia: (item: MediaItem) => void;
}) {
  const [preview, setPreview] = useState(false);
  const [comparison, setComparison] = useState<"inputs" | "result" | null>(
    null,
  );
  const current = versioning.merge,
    result = versioning.result;
  if (!current || !result) return null;
  const working = versioning.busy || versioning.saving;
  const active = current.status === "active";
  const unresolved = current.conflicts.filter(
    (conflict) => !current.resolved.includes(conflict.key),
  ).length;
  return (
    <section className={styles.merge} aria-label="版本合并工作区">
      <header>
        <div>
          <h2>
            {mergeStates[current.status]} <UiText text="· 目标 V" />
            {current.target_revision}
          </h2>
          <p>
            {active ? (
              <UiText text="最新版已锁定，下方编辑的是独立合并草稿。" />
            ) : (
              <UiText text="合并结果已保留。" />
            )}
          </p>
        </div>
        <span>
          {unresolved ? (
            `${unresolved} 项冲突待处理`
          ) : (
            <UiText text="冲突已处理" />
          )}
        </span>
      </header>
      <div className={styles.actions}>
        <Button
          className="admin-button"
          aria-pressed={comparison === "inputs"}
          onClick={() =>
            setComparison(comparison === "inputs" ? null : "inputs")
          }
        >
          <UiText text="比较线上与分支" />
        </Button>
        <Button
          className="admin-button"
          aria-pressed={comparison === "result"}
          onClick={() =>
            setComparison(comparison === "result" ? null : "result")
          }
        >
          <UiText text="查看合并结果差异" />
        </Button>
      </div>
      {comparison && (
        <VersionComparison
          before={current.remote}
          after={comparison === "inputs" ? current.local : result}
          beforeLabel={`线上 V${current.target_revision}`}
          afterLabel={comparison === "inputs" ? "草稿分支" : "合并结果"}
          media={media}
          shortcodes={shortcodes}
        />
      )}
      {current.conflicts.map((conflict) => (
        <MergeConflictCard
          key={`${current.id}:${conflict.key}`}
          conflict={conflict}
          resolved={current.resolved.includes(conflict.key)}
          disabled={working || !versioning.canResolve}
          onResolve={(resolution) => void versioning.resolve(resolution)}
        />
      ))}
      <div className={styles.resultHeading}>
        <h3>
          <UiText text="合并结果" />
        </h3>
        <span role="status">
          {versioning.saving ? (
            <UiText text="正在保存到服务器…" />
          ) : !versioning.localSaved ? (
            <UiText text="正在保存到本机…" />
          ) : versioning.error ? (
            <UiText text="请检查保存状态" />
          ) : versioning.serverSaved ? (
            <UiText text="合并草稿已保存到服务器" />
          ) : (
            <UiText text="已保存到本机，等待同步" />
          )}
        </span>
        <Button
          className="admin-button"
          aria-pressed={preview}
          onClick={() => setPreview(!preview)}
        >
          {preview ? <UiText text="编辑结果" /> : <UiText text="预览结果" />}
        </Button>
      </div>
      {preview ? (
        <DraftPreview fields={result} media={media} shortcodes={shortcodes} />
      ) : (
        <MergeResultEditor
          fields={result}
          onChange={versioning.setResult}
          disabled={versioning.busy || !versioning.canResolve}
          media={media}
          onMedia={onMedia}
        />
      )}
      <div className={styles.mergeActions}>
        {active ? (
          <>
            <Button
              className="admin-button"
              disabled={working || !versioning.canResolve}
              onClick={() => void versioning.cancel()}
            >
              <UiText text="暂停合并并解锁" />
            </Button>
            <Button
              className="admin-button admin-button-primary"
              disabled={working || !versioning.canResolve || unresolved > 0}
              onClick={() => void versioning.finish()}
            >
              <UiText text="完成合并" />
            </Button>
          </>
        ) : (
          current.status !== "completed" && (
            <Button
              className="admin-button"
              disabled={working}
              onClick={onResume}
            >
              <UiText text="重新比较最新版并继续" />
            </Button>
          )
        )}
        <DownloadButton
          filename={`merge-${current.id}.json`}
          content={() => serializeDraftExport(result)}
        >
          <UiText text="导出合并结果" />
        </DownloadButton>
      </div>
    </section>
  );
}
