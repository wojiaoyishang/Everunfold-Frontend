"use client";
import { UiText, useLocale } from "@/core/i18n/provider";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { Icon } from "../components/icon";
import { TextLink } from "../components/ui/primitives";
import { ManagementScene } from "./management-scene";
import { InterfaceLanguage } from "../components/language-switcher";
import { useMotion } from "../hooks/use-motion";

type ManagementEntryProps = {
  panel: {
    kicker?: string;
    title: string;
    description: string;
  };
  children: ReactNode;
  cardRef?: RefObject<HTMLDivElement | null>;
};

/** A quiet, shared entry for account login and pre-authentication checks. */
export function ManagementEntry({
  panel,
  children,
  cardRef,
}: ManagementEntryProps) {
  const ownCard = useRef<HTMLDivElement>(null);
  const entry = cardRef ?? ownCard;
  const [settled, setSettled] = useState(false);
  const { uiLocale } = useLocale();
  const previousLocale = useRef(uiLocale);
  const { enabled } = useMotion();
  useEffect(() => {
    const elements = [
      entry.current,
      entry.current?.querySelector(".login-panel-heading"),
      entry.current?.querySelector(".login-panel-content"),
    ];
    const animations = elements.flatMap(
      (element) => element?.getAnimations?.() ?? [],
    );
    let disposed = false;
    // Completion or cancellation settles once, including late hydration/reduced motion.
    void Promise.allSettled(
      animations.map((animation) => animation.finished),
    ).then(() => {
      if (!disposed) setSettled(true);
    });
    return () => {
      disposed = true;
    };
  }, [entry]);
  useEffect(() => {
    if (previousLocale.current === uiLocale) return;
    previousLocale.current = uiLocale;
    if (!enabled || !settled) return;
    const labels = entry.current?.querySelectorAll<HTMLElement>(
      ".login-panel-heading h1, .login-panel-heading p, .login-form .ui-form-field > label, .login-submit > span, .login-back",
    );
    const animations = Array.from(labels ?? []).flatMap((element) =>
      element.animate
        ? [
            element.animate([{ opacity: 0.82 }, { opacity: 1 }], {
              duration: 160,
              easing: "ease-out",
            }),
          ]
        : [],
    );
    void Promise.allSettled(animations.map((animation) => animation.finished));
    return () => animations.forEach((animation) => animation.cancel());
  }, [enabled, entry, settled, uiLocale]);
  return (
    <main className="login-stage">
      <ManagementScene />
      <div
        className="login-card"
        ref={entry}
        data-entry-settled={settled ? "true" : undefined}
        onFocusCapture={() => setSettled(true)}
        onPointerDownCapture={() => setSettled(true)}
      >
        <header className="login-entry-header">
          <span className="management-brand">
            <Icon name="leaf" />
            Everunfold
          </span>
          <div className="login-entry-actions">
            <TextLink href="/" className="login-back">
              <Icon name="arrow-left" />
              <UiText text="返回站点" />
            </TextLink>
            <InterfaceLanguage className="login-language-button" />
          </div>
        </header>
        <section
          className="login-panel"
          aria-labelledby="management-panel-title"
        >
          <div className="login-panel-heading">
            {panel.kicker && (
              <span className="management-kicker">{panel.kicker}</span>
            )}
            <h1 id="management-panel-title">
              <UiText text={panel.title} />
            </h1>
            <p>
              <UiText text={panel.description} />
            </p>
          </div>
          <div className="login-panel-content">{children}</div>
        </section>
      </div>
    </main>
  );
}
