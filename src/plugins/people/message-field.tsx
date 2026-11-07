"use client";
import type { FormFieldProps } from "@everunfold/plugin-sdk";
import { ExtensionComponent } from "@everunfold/plugin-sdk/client";
import styles from "./styles.module.css";

/** A plugin-owned control composed with the current theme's textarea implementation. */
export function PeopleMessageField(props: FormFieldProps) {
  const length = typeof props.value === "string" ? props.value.length : 0;
  return (
    <div>
      <ExtensionComponent
        name="form.textarea"
        {...props}
        field={{ ...props.field, component: "form.textarea" }}
      />
      <small className={styles.fieldCount}>
        {length.toLocaleString()} /{" "}
        {String(props.field.props?.maxLength ?? 5000)}
      </small>
    </div>
  );
}
