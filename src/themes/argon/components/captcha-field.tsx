"use client";
import { useId } from "react";
import Image from "next/image";
import type { CaptchaController } from "@/core/captcha/use-captcha";
import { UiText } from "@/core/i18n/provider";
import { ExtensionComponent } from "@/core/extensions/components";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { Button, TextField } from "./ui/primitives";
import { Icon } from "./icon";
import styles from "./captcha-field.module.css";

export function CaptchaField({ control }: { control: CaptchaController }) {
  const id = useId();
  const runtime = usePluginRuntime();
  const missing =
    control.challenge?.required &&
    control.challenge.provider !== "local" &&
    !runtime.loading &&
    !runtime.catalog?.plugins.some(
      (plugin) =>
        plugin.components.includes(control.challenge?.widget ?? "") &&
        !runtime.catalog?.disabled.includes(plugin.id),
    );
  if (
    control.challenge?.required === false &&
    !control.pending &&
    !control.error
  )
    return null;
  return (
    <div
      className={styles.field}
      data-captcha-field="true"
      aria-busy={control.pending}
    >
      <div className={styles.heading}>
        <label htmlFor={id}>
          <UiText text="安全验证" />
        </label>
        <Button
          type="button"
          className={styles.refresh}
          disabled={control.pending}
          onClick={() => void control.refresh()}
          aria-label="刷新验证码"
        >
          <Icon name="refresh" />
          <UiText text="刷新验证码" />
        </Button>
      </div>
      {control.pending ? (
        <p role="status">
          <UiText text="正在加载验证码…" />
        </p>
      ) : (
        control.challenge?.required &&
        (control.challenge.provider === "local" ? (
          <>
            <div className={styles.image}>
              <Image
                unoptimized
                src={control.challenge.image ?? ""}
                width={220}
                height={76}
                alt="验证码图片"
              />
            </div>
            <TextField
              id={id}
              aria-label="图形验证码"
              value={control.answer}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={5}
              onChange={(event) => control.setAnswer(event.target.value)}
              placeholder="输入图片中的 5 位字符"
            />
            <small>
              <UiText text="字母不区分大小写。看不清时可刷新图片。" />
            </small>
          </>
        ) : missing ? (
          <p role="alert">
            <UiText text="验证码插件未启用或不可用，请联系管理员。" />
          </p>
        ) : (
          <ExtensionComponent
            key={control.challenge.challenge_id}
            name={control.challenge.widget ?? ""}
            siteKey={control.challenge.site_key}
            challengeId={control.challenge.challenge_id}
            onChange={(token: string) => {
              control.setAnswer(token);
              if (token) control.setError("");
            }}
            onError={() =>
              control.setError("验证码组件加载失败，请重试或联系管理员。")
            }
          />
        ))
      )}
      {control.error && (
        <p className={styles.error} role="alert">
          <UiText text={control.error} />
        </p>
      )}
    </div>
  );
}
