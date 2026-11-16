import { UiText } from "@/core/i18n/provider";
import type { CSSProperties } from "react";
import { failurePage, type FailureKind } from "@/core/navigation/failure-page";
import { Icon, type IconName } from "../components/icon";
import { Button, TextLink } from "../components/ui/primitives";
import { CelebrationFireworks } from "../components/ui/celebration-fireworks";

const faces: IconName[] = ["star", "moon", "leaf", "heart"];

/** Presentational markup shared by React boundaries and the standalone HTTP document. */
export function FailureSurface({
  kind,
  embedded = false,
}: {
  kind: FailureKind;
  embedded?: boolean;
}) {
  const page = failurePage(kind);
  const { status } = page;
  return (
    <section
      className="failure-surface"
      data-embedded={embedded}
      aria-label={page.title}
    >
      <div className="failure-wrap">
        <div className="failure-layout">
          <div className="failure-copy">
            <div className="failure-art" aria-hidden="true">
              <span className="failure-orbit" />
              <Icon name={status === 404 ? "search" : "cloud-off"} />
              <span className="failure-code">{status}</span>
              <span className="failure-spark">
                <Icon name="star" />
              </span>
            </div>
            <p className="failure-eyebrow">
              {status === 404 ? (
                <UiText text="地址未找到" />
              ) : (
                <UiText text="暂时无法访问" />
              )}
            </p>
            <h1>{page.title}</h1>
            <p className="failure-description">{page.description}</p>
            {page.adminHint && (
              <p className="failure-description">{page.adminHint}</p>
            )}
            <div className="failure-actions">
              <TextLink href="/" className="failure-primary">
                <Icon name="home" />
                <UiText text="返回首页" />
              </TextLink>
              {status !== 404 && (
                <Button data-retry hidden>
                  <Icon name="refresh" />
                  <UiText text="重试" />
                </Button>
              )}
            </div>
          </div>
          <section className="failure-game" aria-label="翻牌配对小游戏">
            <div className="failure-game-heading">
              <span className="failure-game-icon">
                <Icon name="flask" />
              </span>
              <div>
                <h2>
                  <UiText text="翻牌配对" />
                </h2>
                <p>
                  <UiText text="休息一下，试试你的记忆力" />
                </p>
              </div>
            </div>
            <div className="failure-game-meta">
              <span>
                <UiText text="4 组图案" />
              </span>
              <span data-game-score>
                <UiText text="尚未开始" />
              </span>
            </div>
            <div className="failure-cards">
              <CelebrationFireworks />
              {Array.from({ length: 8 }, (_, index) => (
                <Button
                  key={index}
                  className="failure-card"
                  data-card={index}
                  style={
                    {
                      "--entry-order": index,
                      "--entry-x": `${((index % 4) - 1.5) * 7}px`,
                      "--entry-turn": `${index % 2 ? 3 : -3}deg`,
                    } as CSSProperties
                  }
                  disabled
                  aria-label={`第 ${index + 1} 张，未翻开`}
                >
                  <span className="failure-card-back" aria-hidden="true">
                    <Icon name="leaf" />
                  </span>
                  <span className="failure-card-front" aria-hidden="true">
                    {faces.map((face, value) => (
                      <span key={face} data-symbol={value}>
                        <Icon name={face} />
                      </span>
                    ))}
                    <span className="failure-card-check">
                      <Icon name="check" />
                    </span>
                  </span>
                </Button>
              ))}
            </div>
            <p
              className="failure-game-message"
              data-game-message
              role="status"
              aria-live="polite"
            >
              <UiText text="翻开任意一张牌开始配对。" />
            </p>
            <div className="failure-game-actions">
              <Button className="failure-restart" data-restart hidden disabled>
                <Icon name="refresh" />
                <UiText text="重新开始" />
              </Button>
            </div>
            <noscript>
              <p className="failure-game-note">
                <UiText text="启用 JavaScript 后可玩配对；返回首页不受影响。" />
              </p>
            </noscript>
          </section>
        </div>
      </div>
    </section>
  );
}
