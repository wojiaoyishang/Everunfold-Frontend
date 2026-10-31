import type { ReactNode } from "react";
import { Icon } from "../components/icon";
import { TextLink } from "../components/ui/primitives";
import { ManagementScene } from "./management-scene";

type ManagementEntryProps = {
  intro: {
    kicker: string;
    title: string;
    description: string;
  };
  panel: {
    kicker: string;
    title: string;
    description: string;
  };
  children: ReactNode;
};

/** Shared centered entry surface for login and pre-authentication checks. */
export function ManagementEntry({
  intro,
  panel,
  children,
}: ManagementEntryProps) {
  return (
    <main className="login-stage">
      <ManagementScene />
      <div className="login-card">
        <section
          className="login-introduction"
          aria-labelledby="management-entry-title"
        >
          <div className="login-intro-header">
            <span className="management-brand">
              <Icon name="leaf" />
              Everunfold
            </span>
            <TextLink href="/" className="login-back">
              <Icon name="arrow-left" />
              返回站点
            </TextLink>
          </div>
          <div className="login-intro-copy">
            <span className="management-kicker">{intro.kicker}</span>
            <h1 id="management-entry-title">{intro.title}</h1>
            <p>{intro.description}</p>
          </div>
        </section>
        <section
          className="login-panel"
          aria-labelledby="management-panel-title"
        >
          <div className="login-panel-heading">
            <span className="management-kicker">{panel.kicker}</span>
            <h2 id="management-panel-title">{panel.title}</h2>
            <p>{panel.description}</p>
          </div>
          {children}
        </section>
      </div>
    </main>
  );
}
