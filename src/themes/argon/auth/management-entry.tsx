import { UiText } from "@/core/i18n/provider";
import type { ReactNode, Ref } from "react";
import { Icon } from "../components/icon";
import { TextLink } from "../components/ui/primitives";
import { ManagementScene } from "./management-scene";
import { InterfaceLanguage } from "../components/language-switcher";

type ManagementEntryProps = {
  panel: {
    kicker?: string;
    title: string;
    description: string;
  };
  children: ReactNode;
  cardRef?: Ref<HTMLDivElement>;
};

/** A quiet, shared entry for account login and pre-authentication checks. */
export function ManagementEntry({
  panel,
  children,
  cardRef,
}: ManagementEntryProps) {
  return (
    <main className="login-stage">
      <ManagementScene />
      <div className="login-card" ref={cardRef}>
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
