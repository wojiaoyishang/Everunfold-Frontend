"use client";
import { createElement, useMemo, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  useWorkspace,
  useWorkspaceAnalytics,
} from "@/core/operations/use-data";
import {
  saveWorkspaceLayout,
  type WorkspaceCardPlacement,
} from "@/core/contracts/operations";
import {
  workspaceCards,
  defaultWorkspaceLayout,
} from "@/core/workspace/registry";
import type {
  WorkspaceCardDefinition,
  WorkspaceCardProps,
} from "@/core/workspace/types";
import { useAdminPluginRuntime } from "@/core/plugins/runtime/context";
import { OptionalPluginBoundary } from "@/core/plugins/runtime/optional-component";
import { can } from "@/core/accounts/permissions";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Modal } from "../../components/ui/modal";
import { DragAndDrop } from "../../components/ui/drag-and-drop";
import { moveBefore } from "../../components/ui/reorder-list";
import { usePageFeedback } from "../pages/feedback";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { AdminLoadingState } from "../components/loading-state";
import { CoreWorkspaceCard } from "./cards";
import { WorkspaceTile, EndSlot } from "./tile";
import styles from "./workspace.module.css";

type Definition = WorkspaceCardDefinition & { pluginId?: string };
export function Workspace() {
  const user = useAdminAccount(),
    request = useAdminRequest(),
    runtime = useAdminPluginRuntime(),
    t = useT(),
    notify = usePageFeedback();
  const summary = useWorkspace();
  const [days, setDays] = useState<7 | 30 | 90>(7);
  const reports = useWorkspaceAnalytics(days);
  const definitions = useMemo<Definition[]>(
    () =>
      [...workspaceCards, ...runtime.workspaceCards].filter((card) =>
        can(user, card.permission),
      ),
    [user, runtime.workspaceCards],
  );
  const [draft, setDraft] = useState<WorkspaceCardPlacement[] | null>(null),
    [revision, setRevision] = useState(0),
    [saving, setSaving] = useState(false),
    [picking, setPicking] = useState(false),
    [closing, setClosing] = useState(false),
    [dragging, setDragging] = useState(false),
    [error, setError] = useState("");
  const placements =
    draft ?? summary.data?.layout?.cards ?? defaultWorkspaceLayout(definitions);
  const visible = placements.flatMap((item) => {
    const definition = definitions.find((card) => card.id === item.id);
    return definition ? [{ ...item, definition }] : [];
  });
  const editing = draft !== null;
  const move = (id: string, offset: number) => {
    const index = visible.findIndex((item) => item.id === id),
      target = visible[index + offset];
    if (!target) return;
    setDraft((current) => {
      const next = [...(current ?? placements)],
        a = next.findIndex((item) => item.id === id),
        b = next.findIndex((item) => item.id === target.id);
      [next[a], next[b]] = [next[b]!, next[a]!];
      return next;
    });
  };
  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setError("");
    try {
      const saved = await saveWorkspaceLayout(
        request.baseUrl,
        { revision, cards: draft },
        request.csrfToken,
      );
      summary.setData((current) =>
        current ? { ...current, layout: saved.data } : current,
      );
      setDraft(null);
      notify("工作台布局已保存", "success");
    } catch (reason) {
      setError(accountFailure(reason));
    } finally {
      setSaving(false);
    }
  };
  const refreshing = summary.loading || reports.loading;
  const refresh = () => {
    void summary.refresh();
    void reports.refresh();
  };
  return (
    <div className={styles.workspace}>
      <UnsavedAccountChanges
        dirty={
          editing &&
          JSON.stringify(draft) !==
            JSON.stringify(
              summary.data?.layout?.cards ??
                defaultWorkspaceLayout(definitions),
            )
        }
        busy={saving}
      />
      <AdminPageHeading
        title="工作台"
        action={
          <div className={styles.toolbar}>
            {!editing && (
              <Select
                name="workspace-period"
                label="统计时段"
                value={String(days)}
                options={[7, 30, 90].map((value) => ({
                  value: String(value),
                  label: t("近 {days} 天", { days: value }),
                }))}
                onValueChange={(value) => {
                  if ([7, 30, 90].includes(Number(value)))
                    setDays(Number(value) as 7 | 30 | 90);
                }}
              />
            )}
            {editing ? (
              <>
                <Button
                  className="admin-button"
                  disabled={saving}
                  onClick={() => setPicking(true)}
                >
                  <Icon name="plus" />
                  <UiText text="添加卡片" />
                </Button>
                <Button
                  className="admin-button"
                  disabled={saving}
                  onClick={() => setDraft(defaultWorkspaceLayout(definitions))}
                >
                  <Icon name="undo" />
                  <UiText text="恢复默认布局" />
                </Button>
                <Button
                  className="admin-button"
                  disabled={saving}
                  onClick={() => {
                    setDraft(null);
                    setError("");
                  }}
                >
                  <UiText text="取消" />
                </Button>
                <Button
                  className="admin-button admin-button-primary"
                  disabled={saving}
                  onClick={() => void save()}
                >
                  <Icon name="check" />
                  <UiText text={saving ? "正在保存…" : "完成布局"} />
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="admin-button"
                  disabled={!summary.data}
                  onClick={() => {
                    setDraft([...placements]);
                    setRevision(summary.data?.layout?.revision ?? 0);
                  }}
                >
                  <Icon name="grid" />
                  <UiText text="自定义布局" />
                </Button>
                <Button
                  className="admin-button"
                  disabled={refreshing}
                  onClick={refresh}
                >
                  <Icon name="refresh" />
                  <UiText text="刷新" />
                </Button>
              </>
            )}
          </div>
        }
      />
      {(error || summary.error || reports.error) && (
        <div className={styles.error} role="alert">
          <UiText text={error || summary.error || reports.error} />
          <Button className="admin-button" onClick={refresh}>
            <UiText text="重试" />
          </Button>
        </div>
      )}
      {!summary.data && summary.loading ? (
        <AdminLoadingState label="正在读取工作台…" />
      ) : (
        <>
          {editing && (
            <p className={styles.hint}>
              <UiText text="拖动卡片手柄调整位置，选择宽度，完成后保存。" />
            </p>
          )}
          <DragAndDrop
            nested
            disabled={!editing || saving}
            onBusyChange={setDragging}
            onDrop={(item, before) =>
              setDraft((current) =>
                moveBefore(current ?? placements, item.id, before),
              )
            }
            renderPreview={(item) => (
              <div className={styles.dragPreview}>
                <Icon name="grid" />
                {item.label}
              </div>
            )}
          >
            <div
              className={styles.grid}
              data-editing={editing || undefined}
              aria-busy={refreshing}
            >
              {visible.map((item, index) => (
                <WorkspaceTile
                  key={item.id}
                  placement={item}
                  definition={item.definition}
                  order={visible.map((item) => item.id).join(",")}
                  editing={editing}
                  disabled={saving || dragging}
                  first={index === 0}
                  last={index === visible.length - 1}
                  onMove={(offset) => move(item.id, offset)}
                  onWidth={(width) =>
                    setDraft((current) =>
                      (current ?? placements).map((card) =>
                        card.id === item.id ? { ...card, width } : card,
                      ),
                    )
                  }
                  onRemove={() =>
                    setDraft((current) =>
                      (current ?? placements).filter(
                        (card) => card.id !== item.id,
                      ),
                    )
                  }
                >
                  {item.definition.pluginId ? (
                    <OptionalPluginBoundary
                      pending={<AdminLoadingState compact />}
                      key={`${item.id}:${runtime.catalog?.revision}`}
                      fallback={
                        <p role="alert">
                          <UiText text="卡片暂不可用" />
                        </p>
                      }
                    >
                      {runtime.components.get(item.definition.pluginId)?.[
                        item.definition.component
                      ] ? (
                        createElement(
                          runtime.components.get(item.definition.pluginId)![
                            item.definition.component
                          ]!,
                          {
                            cardId: item.id,
                            days,
                            data: summary.data,
                            analytics:
                              reports.data?.days === days ? reports.data : null,
                            refreshing,
                          } satisfies WorkspaceCardProps,
                        )
                      ) : (
                        <AdminLoadingState compact />
                      )}
                    </OptionalPluginBoundary>
                  ) : (
                    <CoreWorkspaceCard
                      component={item.definition.component}
                      cardId={item.id}
                      days={days}
                      data={summary.data}
                      analytics={
                        reports.data?.days === days ? reports.data : null
                      }
                      refreshing={refreshing}
                    />
                  )}
                </WorkspaceTile>
              ))}
              {editing && <EndSlot />}
            </div>
          </DragAndDrop>
          {!visible.length && (
            <div className={styles.empty}>
              <Icon name="grid" />
              <p>
                <UiText text="添加卡片，开始布置工作台" />
              </p>
              <Button
                className="admin-button"
                onClick={() => {
                  if (!editing) {
                    setDraft([...placements]);
                    setRevision(summary.data?.layout?.revision ?? 0);
                  }
                  setPicking(true);
                }}
              >
                <UiText text="添加卡片" />
              </Button>
            </div>
          )}
        </>
      )}
      {picking && (
        <Modal
          title="添加卡片"
          onClose={() => setClosing(true)}
          closing={closing}
          onExited={() => {
            setPicking(false);
            setClosing(false);
          }}
        >
          <div className={styles.picker}>
            {definitions.map((card) => {
              const added = placements.some((item) => item.id === card.id);
              return (
                <Button
                  key={card.id}
                  className={styles.pickerItem}
                  disabled={added || placements.length >= 48}
                  onClick={() =>
                    setDraft((current) => [
                      ...(current ?? placements),
                      { id: card.id, width: card.width ?? 3 },
                    ])
                  }
                >
                  <Icon name={card.icon ?? "puzzle"} />
                  <span>
                    <UiText text={card.label} />
                    <small>
                      {card.pluginId ? card.pluginId : t("内建卡片")}
                    </small>
                  </span>
                  <Icon name={added ? "check" : "plus"} />
                </Button>
              );
            })}
          </div>
        </Modal>
      )}
    </div>
  );
}
