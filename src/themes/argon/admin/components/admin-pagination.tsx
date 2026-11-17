"use client";

import { Fragment } from "react";
import { useT } from "@/core/i18n/provider";
import { pageNumbers } from "@/core/navigation/page-numbers";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import styles from "./admin-pagination.module.css";

export function AdminPagination({
  page,
  pages,
  onChange,
  disabled = false,
  className = "",
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const numbers = pageNumbers(page, pages);
  return (
    <nav className={`${styles.pagination} ${className}`} aria-label={t("分页")}>
      <Button
        className="admin-icon-button"
        aria-label={t("上一页")}
        title={t("上一页")}
        disabled={disabled || page <= 1}
        onClick={() => onChange(Math.min(page - 1, pages))}
      >
        <Icon name="arrow-left" />
      </Button>
      <div className={styles.numbers}>
        {numbers.map((number, index) => (
          <Fragment key={number}>
            {index > 0 && number - numbers[index - 1] > 1 && (
              <span className={styles.ellipsis} aria-hidden="true">
                …
              </span>
            )}
            <Button
              className={styles.number}
              aria-label={t("第 {page} 页", { page: number })}
              aria-current={number === page ? "page" : undefined}
              aria-disabled={disabled || number === page || undefined}
              onClick={() => {
                if (!disabled && number !== page) onChange(number);
              }}
            >
              {number}
            </Button>
          </Fragment>
        ))}
      </div>
      <Button
        className="admin-icon-button"
        aria-label={t("下一页")}
        title={t("下一页")}
        disabled={disabled || page >= pages}
        onClick={() => onChange(page + 1)}
      >
        <Icon name="arrow" />
      </Button>
    </nav>
  );
}
