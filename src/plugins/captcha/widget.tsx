"use client";
import { useEffect, useRef } from "react";
import type { CaptchaWidgetProps } from "@everunfold/plugin-sdk";

type WidgetAPI = {
  render: (
    element: HTMLElement,
    options: Record<string, unknown>,
  ) => string | number;
  remove?: (id: string | number) => void;
  reset: (id: string | number) => void;
  ready?: (callback: () => void) => void;
};
type Provider = "google" | "turnstile";
type WidgetWindow = Window & { grecaptcha?: WidgetAPI; turnstile?: WidgetAPI };
const scripts = new Map<Provider, Promise<WidgetAPI>>();
function load(provider: Provider) {
  const host = window as WidgetWindow;
  const readyAPI = provider === "google" ? host.grecaptcha : host.turnstile;
  if (readyAPI?.render) return Promise.resolve(readyAPI);
  const existing = scripts.get(provider);
  if (existing) return existing;
  const pending = new Promise<WidgetAPI>((resolve, reject) => {
    const script = document.createElement("script");
    script.async = true;
    script.src =
      provider === "google"
        ? "https://www.google.com/recaptcha/api.js?render=explicit"
        : "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.onload = () => {
      const host = window as WidgetWindow;
      const api = provider === "google" ? host.grecaptcha : host.turnstile;
      if (!api) {
        reject(new Error("CAPTCHA API unavailable"));
        return;
      }
      if (provider === "google" && api.ready) api.ready(() => resolve(api));
      else resolve(api);
    };
    script.onerror = () => {
      script.remove();
      reject(new Error("CAPTCHA script unavailable"));
    };
    document.head.append(script);
  });
  scripts.set(provider, pending);
  void pending.catch(() => scripts.delete(provider));
  return pending;
}
function Widget({
  provider,
  siteKey,
  challengeId,
  onChange,
  onError,
}: CaptchaWidgetProps & { provider: Provider }) {
  const target = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onChange, onError });
  useEffect(() => {
    callbacks.current = { onChange, onError };
  }, [onChange, onError]);
  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | undefined;
    const timer = setTimeout(() => {
      if (!disposed) callbacks.current.onError();
    }, 15000);
    void load(provider)
      .then((api) => {
        if (disposed || !target.current) return;
        clearTimeout(timer);
        const id = api.render(target.current, {
          sitekey: siteKey,
          size: "compact",
          callback: (token: string) => {
            if (!disposed) callbacks.current.onChange(token);
          },
          "expired-callback": () => {
            if (!disposed) callbacks.current.onChange("");
          },
          "error-callback": () => {
            if (!disposed) {
              callbacks.current.onChange("");
              callbacks.current.onError();
            }
          },
        });
        cleanup = () => {
          try {
            if (api.remove) api.remove(id);
            else api.reset(id);
          } catch {
            /* Provider iframe may already be gone during navigation. */
          }
        };
      })
      .catch(() => {
        if (!disposed) {
          clearTimeout(timer);
          callbacks.current.onError();
        }
      });
    return () => {
      disposed = true;
      clearTimeout(timer);
      cleanup?.();
    };
  }, [provider, siteKey, challengeId]);
  return <div ref={target} style={{ minHeight: 140, maxWidth: "100%" }} />;
}
export function GoogleCaptcha(props: CaptchaWidgetProps) {
  return <Widget {...props} provider="google" />;
}
export function TurnstileCaptcha(props: CaptchaWidgetProps) {
  return <Widget {...props} provider="turnstile" />;
}
