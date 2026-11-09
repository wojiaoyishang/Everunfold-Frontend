"use client";
import { useId, useMemo, useState } from "react";
import {
  checkTaskParameters,
  readTaskParameterJSON,
  taskParameterFields,
  type TaskParameterSchema,
  type TaskParameterValues,
} from "@/core/tasks/task-parameters";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextArea, TextField } from "../../components/ui/primitives";
import { FormField } from "../../components/ui/form-field";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import styles from "./task-parameters.module.css";

const number = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

export function TaskParameters({
  schema,
  value,
  disabled,
  onChange,
}: {
  schema: TaskParameterSchema;
  value: TaskParameterValues;
  disabled: boolean;
  onChange: (value: TaskParameterValues, valid: boolean) => void;
}) {
  const id = useId(),
    t = useT();
  const fields = useMemo(() => taskParameterFields(schema), [schema]);
  const [jsonMode, setJsonMode] = useState(!fields.length),
    [source, setSource] = useState(() => JSON.stringify(value, null, 2)),
    [jsonErrors, setJsonErrors] = useState<Record<string, boolean>>({});
  const validation = checkTaskParameters(schema, value);
  const valid =
    validation.length === 0 && !Object.values(jsonErrors).some(Boolean);
  const publish = (next: TaskParameterValues, errors = jsonErrors) =>
    onChange(
      next,
      checkTaskParameters(schema, next).length === 0 &&
        !Object.values(errors).some(Boolean),
    );
  const update = (key: string, next: unknown) => {
    const values = { ...value };
    if (next === undefined) delete values[key];
    else values[key] = next;
    const errors = { ...jsonErrors, [key]: false };
    setJsonErrors(errors);
    publish(values, errors);
  };
  return (
    <section className={styles.root} aria-label={t("任务参数")}>
      <div className={styles.heading}>
        <strong>
          <UiText text="任务参数" />
        </strong>
        {fields.length > 0 && (
          <Button
            className="admin-button"
            aria-pressed={jsonMode}
            disabled={disabled}
            onClick={() => {
              if (!jsonMode) setSource(JSON.stringify(value, null, 2));
              setJsonMode(!jsonMode);
              setJsonErrors({});
              onChange(value, checkTaskParameters(schema, value).length === 0);
            }}
          >
            <Icon name={jsonMode ? "settings" : "code"} />
            <UiText text={jsonMode ? "参数表单" : "JSON 模式"} />
          </Button>
        )}
      </div>
      {jsonMode ? (
        <div className={styles.field}>
          <FormField
            id={`${id}-json`}
            label="参数 JSON 对象"
            invalid={!!jsonErrors.$root}
          >
            <TextArea
              id={`${id}-json`}
              className={styles.json}
              value={source}
              disabled={disabled}
              rows={8}
              spellCheck={false}
              required
              maxLength={32768}
              onChange={(event) => {
                const next = event.target.value;
                setSource(next);
                const parsed = readTaskParameterJSON(next);
                setJsonErrors(parsed ? {} : { $root: true });
                if (parsed)
                  onChange(
                    parsed,
                    checkTaskParameters(schema, parsed).length === 0,
                  );
                else onChange(value, false);
              }}
            />
          </FormField>
          {jsonErrors.$root && (
            <small className={styles.error} role="alert">
              <UiText text="请输入有效的 JSON 对象。" />
            </small>
          )}
        </div>
      ) : (
        <div className={styles.fields}>
          {fields.map((field) => {
            const definition = field.definition,
              current = value[field.key],
              fieldId = `${id}-${field.key}`;
            const enumValues = Array.isArray(definition.enum)
              ? definition.enum
              : Object.hasOwn(definition, "const")
                ? [definition.const]
                : null;
            const simple =
              !definition.$ref &&
              !definition.anyOf &&
              !definition.oneOf &&
              !definition.allOf;
            let control;
            if (
              enumValues &&
              enumValues.every(
                (item) =>
                  item === null ||
                  ["string", "number", "boolean"].includes(typeof item),
              )
            ) {
              control = (
                <div className={styles.selectField}>
                  <span>
                    <UiText text={field.label} />
                    {field.required && (
                      <span className={styles.required} aria-hidden="true">
                        {" "}
                        *
                      </span>
                    )}
                  </span>
                  <Select
                    name={`task-parameter-${field.key}`}
                    label={field.label}
                    value={current === undefined ? "" : JSON.stringify(current)}
                    disabled={disabled}
                    options={[
                      {
                        value: "",
                        label: t("请选择参数值"),
                        disabled: field.required,
                      },
                      ...enumValues.map((item) => ({
                        value: JSON.stringify(item),
                        label: String(item),
                      })),
                    ]}
                    onValueChange={(next) =>
                      update(field.key, next ? JSON.parse(next) : undefined)
                    }
                  />
                </div>
              );
            } else if (simple && definition.type === "boolean") {
              control = (
                <div className={styles.booleanField}>
                  <span>
                    <UiText text={field.label} />
                    {field.required && (
                      <span className={styles.required} aria-hidden="true">
                        {" "}
                        *
                      </span>
                    )}
                  </span>
                  <Switch
                    aria-label={t(field.label)}
                    aria-required={field.required || undefined}
                    checked={current === true}
                    disabled={disabled}
                    onCheckedChange={(checked) => update(field.key, checked)}
                  />
                </div>
              );
            } else if (
              simple &&
              ["string", "integer", "number"].includes(String(definition.type))
            ) {
              const numeric = definition.type !== "string";
              control = (
                <FormField id={fieldId} label={field.label}>
                  <TextField
                    id={fieldId}
                    type={
                      numeric
                        ? "number"
                        : definition.writeOnly ||
                            definition.format === "password"
                          ? "password"
                          : "text"
                    }
                    value={
                      typeof current === "string" || typeof current === "number"
                        ? current
                        : ""
                    }
                    disabled={disabled}
                    required={field.required}
                    min={number(definition.minimum)}
                    max={number(definition.maximum)}
                    step={
                      definition.type === "integer"
                        ? 1
                        : numeric
                          ? "any"
                          : undefined
                    }
                    minLength={number(definition.minLength)}
                    maxLength={number(definition.maxLength) ?? 32768}
                    autoComplete="off"
                    onChange={(event) =>
                      update(
                        field.key,
                        numeric
                          ? event.target.value === ""
                            ? undefined
                            : Number(event.target.value)
                          : event.target.value,
                      )
                    }
                  />
                </FormField>
              );
            } else {
              control = (
                <ParameterJSONField
                  id={fieldId}
                  label={field.label}
                  value={current}
                  required={field.required}
                  disabled={disabled}
                  onChange={(next, okay) => {
                    if (!okay) {
                      setJsonErrors((errors) => ({
                        ...errors,
                        [field.key]: true,
                      }));
                      onChange(value, false);
                    } else update(field.key, next);
                  }}
                />
              );
            }
            return (
              <div className={styles.field} key={field.key}>
                {control}
                {field.description && <small>{field.description}</small>}
                {jsonErrors[field.key] && (
                  <small className={styles.error} role="alert">
                    <UiText text="请输入有效的 JSON 值。" />
                  </small>
                )}
              </div>
            );
          })}
        </div>
      )}
      {!valid && !Object.values(jsonErrors).some(Boolean) && (
        <p className={styles.error} role="status">
          <UiText text="请检查参数的必填项、类型与取值范围。" />
        </p>
      )}
    </section>
  );
}

function ParameterJSONField({
  id,
  label,
  value,
  required,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  value: unknown;
  required: boolean;
  disabled: boolean;
  onChange: (value: unknown, valid: boolean) => void;
}) {
  const [source, setSource] = useState(() =>
    value === undefined ? "" : JSON.stringify(value, null, 2),
  );
  return (
    <FormField id={id} label={`${label} · JSON`}>
      <TextArea
        id={id}
        value={source}
        disabled={disabled}
        required={required}
        rows={4}
        maxLength={32768}
        spellCheck={false}
        onChange={(event) => {
          const next = event.target.value;
          setSource(next);
          if (!next.trim() && !required) return onChange(undefined, true);
          try {
            onChange(JSON.parse(next), true);
          } catch {
            onChange(value, false);
          }
        }}
      />
    </FormField>
  );
}
