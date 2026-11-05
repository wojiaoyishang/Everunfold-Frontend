import { UiText } from "@/core/i18n/provider";
import type { CSSProperties } from "react";
import {
  failurePage,
  type FailureStatus,
} from "@/core/navigation/failure-page";
import { Icon, type IconName } from "../components/icon";
import { Button, TextLink } from "../components/ui/primitives";
import { CelebrationFireworks } from "../components/ui/celebration-fireworks";

const faces: IconName[] = ["star", "moon", "leaf", "heart"];

/** Presentational markup shared by React boundaries and the standalone HTTP document. */
export function FailureSurface({
  status,
  embedded = false,
}: {
  status: FailureStatus;
  embedded?: boolean;
}) {
  const page = failurePage(status);
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
              <span className="failure-code">{page.code}</span>
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
              <UiText text="找出 4 组相同图案，不计时。" />
            </p>
            <Button className="failure-start" data-restart disabled>
              <Icon name="play" />
              <span>
                <UiText text="开始配对" />
              </span>
            </Button>
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
