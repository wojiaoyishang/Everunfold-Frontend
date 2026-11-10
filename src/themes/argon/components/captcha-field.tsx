"use client";
import { useId } from "react";
import Image from "next/image";
import type { CaptchaController } from "@/core/captcha/use-captcha";
import { UiText, useT } from "@/core/i18n/provider";
import { ExtensionComponent } from "@/core/extensions/components";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { Button, TextField } from "./ui/primitives";
import { Icon } from "./icon";
import styles from "./captcha-field.module.css";

export function CaptchaField({
  control,
  appearance = "inline",
  disabled = false,
}: {
  control: CaptchaController;
  appearance?: "inline" | "dialog" | "login";
  disabled?: boolean;
}) {
  const t = useT();
  const id = useId();
  const runtime = usePluginRuntime();
  const local = control.challenge?.provider === "local";
  const interactionBlocked = disabled || control.pending;
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
      className={`${styles.field} ${
        appearance === "dialog"
          ? styles.dialog
          : appearance === "login"
            ? styles.login
            : ""
      }`}
      data-captcha-field="true"
      data-invalid={Boolean(control.error)}
      aria-busy={control.pending}
    >
      <div className={styles.heading} data-captcha-heading="true">
        {appearance === "dialog" ? (
          <span>
            <UiText text={local ? "识别图中字符" : "完成下方验证"} />
          </span>
        ) : (
          <label htmlFor={id}>
            <UiText text="安全验证" />
          </label>
        )}
        <Button
          type="button"
          className={styles.refresh}
          data-loading={control.pending}
          disabled={interactionBlocked}
          onClick={() => void control.refresh()}
          aria-label={t("刷新验证码")}
        >
          <Icon name="refresh" />
          <UiText
            text={
              appearance === "dialog" && local
                ? "换一张"
                : appearance === "login"
                  ? "换一张"
                  : "刷新验证码"
            }
          />
        </Button>
      </div>
      {control.pending && !(local && control.challenge?.required) ? (
        <p role="status">
          <UiText text="正在加载验证码…" />
        </p>
      ) : (
        control.challenge?.required &&
        (control.challenge.provider === "local" ? (
          <>
            <div
              className={
                appearance === "login" ? styles.loginBody : styles.answerBody
              }
            >
              <div
                className={styles.image}
                data-captcha-image="true"
                aria-busy={control.pending}
              >
                <Image
                  unoptimized
                  src={control.challenge.image ?? ""}
                  width={220}
                  height={76}
                  alt={t("验证码图片")}
                />
                {control.pending && (
                  <span className={styles.imageLoading} role="status">
                    <UiText text="正在加载验证码…" />
                  </span>
                )}
              </div>
              <div className={styles.answer} data-captcha-answer="true">
                {appearance === "dialog" && (
                  <div className={styles.answerHeading}>
                    <label htmlFor={id}>
                      <UiText text="输入验证码" />
                    </label>
                    <small>
                      <UiText text="不区分大小写" />
                    </small>
                  </div>
                )}
                <TextField
                  id={id}
                  aria-label={t("图形验证码")}
                  aria-describedby={`${id}-hint`}
                  aria-invalid={Boolean(control.error)}
                  value={control.answer}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  disabled={interactionBlocked}
                  maxLength={5}
                  onChange={(event) => control.setAnswer(event.target.value)}
                  placeholder={
                    appearance === "dialog"
                      ? "· · · · ·"
                      : appearance === "login"
                        ? t("5 位字符")
                        : t("输入图片中的 5 位字符")
                  }
                />
              </div>
            </div>
            <small id={`${id}-hint`} className={styles.hint}>
              <UiText
                text={
                  appearance === "dialog"
                    ? "输入图片中的 5 位字符，验证后即可发送。"
                    : appearance === "login"
                      ? "字母不区分大小写。"
                      : "字母不区分大小写。看不清时可刷新图片。"
                }
              />
            </small>
          </>
        ) : missing ? (
          <p role="alert">
            <UiText text="验证码插件未启用或不可用，请联系管理员。" />
          </p>
        ) : (
          <div className={styles.widget}>
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
          </div>
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
