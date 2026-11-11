"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Locale, MessageLocale } from "./locale";
import { localeOf, messageLocale } from "./locale";
import {
  translate,
  type CustomTranslations,
  type MessageScope,
} from "./messages";
import { initialCatalog, type LanguageCatalog } from "./catalog";

const CatalogContext = createContext<LanguageCatalog>(initialCatalog);
export const LanguageCatalogProvider = CatalogContext.Provider;
export function useLanguageCatalog() {
  return useContext(CatalogContext);
}

const LocaleContext = createContext<{
  locale: Locale;
  uiLocale: MessageLocale;
  preferred: Locale;
  scope: MessageScope;
  translations: CustomTranslations;
  change: (locale: Locale, uiLocale?: MessageLocale) => void;
}>({
  locale: "zh-CN",
  uiLocale: "zh-CN",
  preferred: "zh-CN",
  scope: "public",
  translations: {},
  change: () => {},
});
export function LocaleProvider({
  initial,
  privateUI,
  initialUI,
  catalog = initialCatalog,
  translations = {},
  children,
}: {
  initial: Locale;
  privateUI: boolean;
  initialUI?: MessageLocale;
  catalog?: LanguageCatalog;
  translations?: CustomTranslations;
  children: ReactNode;
}) {
  const [locale, setLocale] = useState(initial);
  const [uiLocale, setUI] = useState(initialUI ?? messageLocale(initial));
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
    document.documentElement.dataset.uiLocale = uiLocale;
  }, [locale, uiLocale]);
  return (
    <LanguageCatalogProvider value={catalog}>
      <LocaleContext
        value={{
          locale,
          uiLocale,
          preferred,
          scope: privateUI ? "admin" : "public",
          translations,
          change: (value, fallback) => {
            document.cookie = `${privateUI ? "everunfold-admin-locale" : "everunfold-locale"}=${value}; Path=/; Max-Age=31536000; SameSite=Lax`;
            if (privateUI) {
              setLocale(value);
              setUI(fallback ?? messageLocale(value));
              document.cookie = `everunfold-admin-ui=${fallback ?? messageLocale(value)}; Path=/; Max-Age=31536000; SameSite=Lax`;
            }
            window.dispatchEvent(new Event("everunfold-locale-change"));
          },
        }}
      >
        {children}
      </LocaleContext>
    </LanguageCatalogProvider>
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
  const { locale, uiLocale, scope, translations } = useLocale();
  return translate(text, uiLocale, values, translations, scope, locale);
}
export function useT() {
  const { locale, uiLocale, scope, translations } = useLocale();
  return (text: string, values?: Record<string, string | number>) =>
    translate(text, uiLocale, values, translations, scope, locale);
}
