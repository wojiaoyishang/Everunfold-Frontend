"use client";
import "./site-notice.css";
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Button } from "./ui/primitives";
import { Icon } from "./icon";

/** One source of announcement content for both homepage list renderers. */
export function SiteNotice({
  title = "",
  content = "",
}: {
  title?: string;
  content?: string;
}) {
  const heading = title.trim();
  const body = content.trim();
  const identity = `${heading}\0${body}`;
  const id = useId();
  const textRef = useRef<HTMLDivElement>(null);
  const [opened, setOpened] = useState<string | null>(null);
  const [size, setSize] = useState({ height: 0, line: 24 });
  const expanded = opened === identity;
  useLayoutEffect(() => {
    const text = textRef.current;
    if (!text) return;
    const measure = () => {
      const line = parseFloat(getComputedStyle(text).lineHeight) || 24;
      const height = text.scrollHeight;
      setSize((current) =>
        current.height === height && current.line === line
          ? current
          : { height, line },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(text);
    return () => observer.disconnect();
  }, [heading, body]);
  if (!heading && !body) return null;
  const canExpand = size.height > size.line + 1;
  return (
    <section
      className="surface site-notice"
      aria-label="站点公告"
      data-expanded={expanded}
      data-collapsible={canExpand}
    >
      <Icon name="bell" />
      <div
        id={id}
        className="site-notice-viewport"
        style={
          {
            "--notice-height": `${expanded ? size.height : size.line}px`,
          } as CSSProperties
        }
      >
        <div ref={textRef} className="site-notice-copy">
          {heading && <p className="site-notice-title">{heading}</p>}
          {body && <p className="site-notice-body">{body}</p>}
        </div>
      </div>
      {canExpand && (
        <Button
          className="site-notice-toggle"
          aria-expanded={expanded}
          aria-controls={id}
          onClick={() => setOpened(expanded ? null : identity)}
        >
          <span>{expanded ? "收起" : "展开更多"}</span>
          <Icon name="chevron" />
        </Button>
      )}
    </section>
  );
}
