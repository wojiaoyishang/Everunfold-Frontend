"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Locale } from "./locale";
import { localeOf } from "./locale";
import { translate } from "./messages";

const LocaleContext = createContext<{
  locale: Locale;
  preferred: Locale;
  change: (locale: Locale) => void;
}>({ locale: "zh-CN", preferred: "zh-CN", change: () => {} });
export function LocaleProvider({
  initial,
  privateUI,
  children,
}: {
  initial: Locale;
  privateUI: boolean;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(initial);
  // Public SSR follows the URL; cookie preferences are restored after hydration.
  const cookieName = privateUI
    ? "everunfold-admin-locale"
    : "everunfold-locale";
  const preferred = useSyncExternalStore(
    subscribeLocale,
    () => {
      const cookie = document.cookie
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(cookieName + "="));
      return cookie ? localeOf(cookie.slice(cookieName.length + 1)) : initial;
    },
    () => initial,
  );
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.uiLocale = locale;
  }, [locale]);
  return (
    <LocaleContext
      value={{
        locale,
        preferred,
        change: (value) => {
          document.cookie = `${privateUI ? "everunfold-admin-locale" : "everunfold-locale"}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
          if (privateUI) setLocale(value);
          window.dispatchEvent(new Event("everunfold-locale-change"));
        },
      }}
    >
      {children}
    </LocaleContext>
  );
}
export function useLocale() {
  return useContext(LocaleContext);
}
function subscribeLocale(listener: () => void) {
  window.addEventListener("everunfold-locale-change", listener);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("everunfold-locale-change", listener);
    window.removeEventListener("focus", listener);
  };
}
export function UiText({
  text,
  values,
}: {
  text: string;
  values?: Record<string, string | number>;
}) {
  return translate(text, useLocale().locale, values);
}
export function useT() {
  const { locale } = useLocale();
  return (text: string) => translate(text, locale);
}
