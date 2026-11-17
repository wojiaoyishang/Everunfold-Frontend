"use client";

import { useId, type ReactNode } from "react";
import { adminPageSizes } from "@/core/browser/admin-page-size";
import { UiText } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import styles from "./admin-page-size.module.css";

export function AdminPageSize({
  size,
  onChange,
  children,
}: {
  size: number;
  onChange: (size: number) => void;
  children: ReactNode;
}) {
  const id = useId();
  return (
    <div className={styles.details}>
      <div className={styles.control}>
        <label htmlFor={id}>
          <UiText text="每页显示" />
        </label>
        <Select
          id={id}
          name="page-size"
          label="每页显示"
          value={String(size)}
          options={adminPageSizes.map((value) => ({
            value: String(value),
            label: String(value),
          }))}
          onValueChange={(value) => onChange(Number(value))}
        />
      </div>
      {children}
    </div>
  );
}
