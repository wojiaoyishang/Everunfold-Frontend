import type { ComponentPropsWithRef } from "react";

const classes = (base: string, extra?: string) =>
  extra ? `${base} ${extra}` : base;

/** Keep native semantics and refs inside the theme's shared control boundary. */
export function Button({
  type = "button",
  className,
  ...props
}: ComponentPropsWithRef<"button">) {
  return (
    <button
      {...props}
      type={type}
      className={classes("ui-button", className)}
    />
  );
}

type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "type"> & {
  type?:
    | "text"
    | "search"
    | "email"
    | "url"
    | "password"
    | "tel"
    | "hidden"
    | "number";
};
export function TextField({
  type = "text",
  className,
  ...props
}: TextFieldProps) {
  return (
    <input {...props} type={type} className={classes("ui-input", className)} />
  );
}
export function TextArea({
  className,
  ...props
}: ComponentPropsWithRef<"textarea">) {
  return <textarea {...props} className={classes("ui-textarea", className)} />;
}
export function TextLink({ className, ...props }: ComponentPropsWithRef<"a">) {
  return <a {...props} className={classes("ui-link", className)} />;
}
export function Form(props: ComponentPropsWithRef<"form">) {
  return <form {...props} />;
}
export function Dialog({
  className,
  ...props
}: ComponentPropsWithRef<"dialog">) {
  return <dialog {...props} className={classes("ui-dialog", className)} />;
}
export function Popover({
  className,
  popover = "auto",
  ...props
}: ComponentPropsWithRef<"div">) {
  return (
    <div
      {...props}
      popover={popover}
      className={classes("ui-popover", className)}
    />
  );
}
