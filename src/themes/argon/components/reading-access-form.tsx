"use client";
import { useState } from "react";
import { UiText } from "@/core/i18n/provider";
import type { CaptchaController } from "@/core/captcha/use-captcha";
import { CaptchaField } from "./captcha-field";
import { Button, Form } from "./ui/primitives";
import { PasswordField } from "./ui/password-field";
import { Icon } from "./icon";
import styles from "./protected-article.module.css";

export function ReadingAccessForm({
  captcha,
  passwordRequired = false,
  opensAt,
  pending,
  error,
  onUnlock,
}: {
  captcha: CaptchaController;
  passwordRequired?: boolean;
  opensAt?: string | null;
  pending: boolean;
  error: string;
  onUnlock: (password: string) => Promise<boolean>;
}) {
  const [password, setPassword] = useState("");
  return (
    <div className={styles.gate} aria-busy={pending}>
      <span className={styles.mark}>
        <Icon name="lock" />
      </span>
      <h2>
        <UiText
          text={passwordRequired ? "这篇内容需要密码" : "完成验证后继续阅读"}
        />
      </h2>
      <p>
        {passwordRequired ? (
          <UiText text="输入作者提供的文章密码，继续阅读正文。" />
        ) : (
          <UiText text="请完成下面的安全验证，正文将在当前页面中显示。" />
        )}
      </p>
      {passwordRequired && opensAt && (
        <p>
          <UiText text="开放时间：" />
          <time dateTime={opensAt}>
            {new Date(opensAt).toLocaleString("zh-CN", {
              timeZone: "Asia/Shanghai",
              hour12: false,
            })}
          </time>
        </p>
      )}
      <Form
        onSubmit={(event) => {
          event.preventDefault();
          if (pending || !captcha.ready) return;
          void onUnlock(password).then((success) => {
            if (success) setPassword("");
            else void captcha.refresh();
          });
        }}
      >
        {passwordRequired && (
          <PasswordField
            aria-label="文章访问密码"
            value={password}
            autoComplete="off"
            onChange={(event) => setPassword(event.target.value)}
            disabled={pending}
            maxLength={200}
            placeholder="文章密码"
          />
        )}
        <CaptchaField control={captcha} />
        <Button
          type="submit"
          disabled={
            pending || !captcha.ready || (passwordRequired && !password)
          }
        >
          <Icon name={pending ? "refresh" : "lock"} />
          <UiText text={pending ? "正在验证…" : "解锁阅读"} />
        </Button>
      </Form>
      {error && (
        <p className={styles.error} role="alert">
          <UiText text={error} />
        </p>
      )}
    </div>
  );
}
