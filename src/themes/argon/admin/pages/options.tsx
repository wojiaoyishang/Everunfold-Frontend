"use client";
import type { PageOption, PageValue } from "@/generated/pages-contract";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import { AccountField } from "../../account/fields";
import styles from "./pages.module.css";

type Values = NonNullable<PageValue["options"]>;
export function PageOptionsEditor({
  fields,
  value,
  onChange,
}: {
  fields: PageOption[];
  value: Values;
  onChange: (value: Values) => void;
}) {
  const t = useT();
  return (
    <div className={styles.options}>
      {fields.map((field) => {
        const current = value[field.key] ?? field.default;
        const set = (next: unknown) =>
          onChange({ ...value, [field.key]: next });
        if (field.kind === "list") {
          const rows = Array.isArray(current) ? current : [];
          const rowValue = (row: unknown): Values =>
            row && typeof row === "object" && !Array.isArray(row)
              ? (row as Values)
              : {};
          const update = (index: number, row: Values) =>
            set(
              rows.map((item, position) => (index === position ? row : item)),
            );
          const move = (index: number, offset: number) => {
            const next = [...rows];
            [next[index], next[index + offset]] = [
              next[index + offset],
              next[index],
            ];
            set(next);
          };
          return (
            <section key={field.key} className={styles.peopleSettings}>
              <header>
                <h3>
                  {t(field.label)} <small>{rows.length}</small>
                </h3>
                <Button
                  className="admin-button"
                  disabled={rows.length >= (field.max_items ?? 100)}
                  onClick={() =>
                    set([
                      ...rows,
                      Object.fromEntries(
                        (field.fields ?? []).map((item) => [
                          item.key,
                          structuredClone(item.default ?? ""),
                        ]),
                      ),
                    ])
                  }
                >
                  <UiText text="添加人物" />
                </Button>
              </header>
              {!rows.length && (
                <p className={styles.help}>
                  <UiText text="添加姓名和分组，再写下寄语。列表顺序就是前台展示顺序。" />
                </p>
              )}
              {rows.map((row, index) => (
                <section key={index} className={styles.personEditor}>
                  <header>
                    <strong>{String(rowValue(row).name || t("新人物"))}</strong>
                    <div>
                      <Button
                        className="admin-button"
                        aria-label={t("上移人物")}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        ↑
                      </Button>
                      <Button
                        className="admin-button"
                        aria-label={t("下移人物")}
                        disabled={index === rows.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        ↓
                      </Button>
                      <ConfirmPopover
                        label={t("移除人物")}
                        title="移除此人物？"
                        description="保存页面后才会生效。"
                        triggerClassName="admin-button"
                        onConfirmed={() =>
                          set(rows.filter((_, position) => position !== index))
                        }
                      >
                        <UiText text="移除" />
                      </ConfirmPopover>
                    </div>
                  </header>
                  <PageOptionsEditor
                    fields={field.fields ?? []}
                    value={rowValue(row)}
                    onChange={(next) => update(index, next)}
                  />
                </section>
              ))}
            </section>
          );
        }
        if (field.kind === "boolean")
          return (
            <div className={styles.toggle} key={field.key}>
              <span>{t(field.label)}</span>
              <Switch
                aria-label={t(field.label)}
                checked={current === true}
                onCheckedChange={set}
              />
            </div>
          );
        if (field.kind === "select")
          return (
            <div className="account-field" key={field.key}>
              <span>{t(field.label)}</span>
              <Select
                label={t(field.label)}
                name={field.key}
                value={typeof current === "string" ? current : ""}
                options={(field.choices ?? []).map((choice) => ({
                  value: choice,
                  label: t(field.choice_labels?.[choice] ?? choice),
                }))}
                onValueChange={set}
              />
            </div>
          );
        return (
          <AccountField
            key={field.key}
            label={field.label}
            value={typeof current === "string" ? current : ""}
            multiline={field.kind === "textarea"}
            maxLength={field.max_length}
            minLength={field.min_length}
            required={(field.min_length ?? 0) > 0}
            onChange={set}
          />
        );
      })}
    </div>
  );
}
