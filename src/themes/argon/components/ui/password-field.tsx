"use client";

import { useState, type ComponentPropsWithRef } from "react";
import { Button, TextField } from "./primitives";
import { Icon } from "../icon";

/** Shared password entry keeps its visibility control and accessible label together. */
export function PasswordField(
  props: Omit<ComponentPropsWithRef<typeof TextField>, "type">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <span className="ui-password-field">
      <TextField {...props} type={visible ? "text" : "password"} />
      <Button
        className="ui-password-toggle"
        aria-label={visible ? "隐藏密码" : "显示密码"}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
      >
        <Icon name={visible ? "eye-off" : "eye"} />
      </Button>
    </span>
  );
}
