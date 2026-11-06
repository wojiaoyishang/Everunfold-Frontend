"use client";
import { useEffect, useState } from "react";
import type {
  NavigationReference,
  NavigationResource,
} from "@/generated/settings-contract";
import { queryNavigationResources } from "@/generated/settings-client";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import { UiText, useT } from "@/core/i18n/provider";
import { LanguageLabel } from "../../components/language-label";
import { Modal } from "../../components/ui/modal";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./navigation-picker.module.css";

export function NavigationPicker({
  kind,
  onPick,
  onClose,
}: {
  kind: NavigationReference["kind"];
  onPick: (value: NavigationResource) => void;
  onClose: () => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest(),
    t = useT();
  const [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [items, setItems] = useState<NavigationResource[]>([]);
  const [total, setTotal] = useState(0),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const [closing, setClosing] = useState(false),
    [picked, setPicked] = useState<NavigationResource | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void queryNavigationResources(
        baseUrl,
        { kind, search: query, page, page_size: 20 },
        csrfToken,
        { signal: controller.signal },
      )
        .then(({ data }) => {
          if (!controller.signal.aborted) {
            setItems(data.items);
            setTotal(data.total);
            setError("");
            setLoading(false);
          }
        })
        .catch((cause) => {
          if (!controller.signal.aborted) {
            setError(accountFailure(cause));
            setLoading(false);
          }
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [kind, query, page, baseUrl, csrfToken]);
  return (
    <Modal
      title={
        kind === "article"
          ? "关联文章"
          : kind === "shuoshuo"
            ? "关联说说"
            : "关联页面"
      }
      closeLabel="关闭内容选择器"
      onClose={() => setClosing(true)}
      closing={closing}
      onExited={() => {
        if (picked) onPick(picked);
        onClose();
      }}
    >
      <div className={styles.picker}>
        <div className={styles.search}>
          <Icon name="search" />
          <TextField
            type="search"
            aria-label={t("搜索已发布内容")}
            placeholder={t("搜索标题或地址")}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
              setLoading(true);
            }}
            maxLength={200}
          />
        </div>
        <p className="admin-settings-hint">
          <UiText text="选择已发布内容；菜单按内容 ID 关联，发布后的地址变化会自动跟随。" />
        </p>
        <div className={styles.results} aria-busy={loading}>
          {loading ? (
            <p role="status">
              <UiText text="正在读取内容…" />
            </p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : (
            items.map((item) => (
              <Button
                key={item.id}
                className={styles.item}
                onClick={() => {
                  setPicked(item);
                  setClosing(true);
                }}
              >
                <Icon
                  name={
                    kind === "page"
                      ? "code"
                      : kind === "shuoshuo"
                        ? "leaf"
                        : "book"
                  }
                />
                <span>
                  <strong>{item.title || t("未命名说说")}</strong>
                  <small>{item.path}</small>
                </span>
                {item.language && (
                  <LanguageLabel code={item.language} compact />
                )}
                <Icon name="chevron" />
              </Button>
            ))
          )}
          {!loading && !error && !items.length && (
            <p>
              <UiText text="没有匹配的已发布内容。" />
            </p>
          )}
        </div>
        <div className={styles.pagination}>
          <span>
            <UiText text="{count} 项" values={{ count: total }} />
          </span>
          <Button
            className="admin-icon-button"
            aria-label={t("上一页")}
            disabled={loading || page <= 1}
            onClick={() => {
              setPage(page - 1);
              setLoading(true);
            }}
          >
            <Icon name="arrow-left" />
          </Button>
          <span>
            {page} / {Math.max(1, Math.ceil(total / 20))}
          </span>
          <Button
            className="admin-icon-button"
            aria-label={t("下一页")}
            disabled={loading || page * 20 >= total}
            onClick={() => {
              setPage(page + 1);
              setLoading(true);
            }}
          >
            <Icon name="arrow" />
          </Button>
        </div>
      </div>
    </Modal>
  );
}
