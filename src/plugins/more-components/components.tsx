"use client";

import { useId, useState } from "react";
import { Button, Icon, UiText, useT } from "@everunfold/plugin-sdk/client";
import { Greeting } from "./greeting";
import { mediaUrl, text, type WidgetProps } from "./values";
import styles from "./widgets.module.css";

function Disclosure({ values, children, preview }: WidgetProps) {
  const id = useId();
  const t = useT();
  const [open, setOpen] = useState<boolean>();
  const expanded = preview || (open ?? values.open === true);
  return (
    <section className={styles.disclosure}>
      <Button
        className={styles.toggle}
        aria-expanded={expanded}
        aria-controls={id}
        disabled={preview}
        onClick={() => setOpen(!expanded)}
      >
        <span>{text(values, "title") || t("展开详情")}</span>
        <Icon name="chevron-down" />
      </Button>
      <div className={styles.reveal} data-open={expanded} inert={!expanded}>
        <div className={styles.clip} id={id}>
          <div
            className={styles.disclosureBody}
            data-preview={preview || undefined}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}

function Notice({ values, children, preview }: WidgetProps) {
  const title = text(values, "title");
  const warning = values.tone === "warning";
  return (
    <aside className={styles.notice} data-warning={warning || undefined}>
      <Icon name={warning ? "warning" : "comment"} />
      <div className={styles.noticeBody} data-preview={preview || undefined}>
        {title && <strong>{title}</strong>}
        {children}
      </div>
    </aside>
  );
}

function PeopleGroup({ values, children, preview }: WidgetProps) {
  const title = text(values, "title");
  return (
    <section
      className={styles.people}
      data-appearance={values.appearance === "cards" ? "cards" : "cloud"}
    >
      {title && <h2>{title}</h2>}
      <div className={styles.peopleItems} data-preview={preview || undefined}>
        {children}
      </div>
    </section>
  );
}

function Video({ values, media, preview }: WidgetProps) {
  const t = useT();
  const source = mediaUrl(text(values, "source"), media);
  if (!source)
    return preview ? (
      <p className={styles.empty}>
        <UiText text="选择视频" />
      </p>
    ) : null;
  const title = text(values, "title");
  const captions = mediaUrl(text(values, "captions"), media);
  const language = text(values, "language") || "zh-CN";
  return (
    <figure className={styles.video}>
      <video
        aria-label={title || t("视频")}
        controls
        playsInline
        preload="metadata"
        src={source}
        poster={mediaUrl(text(values, "poster"), media)}
      >
        {captions && (
          <track
            kind="captions"
            src={captions}
            srcLang={language}
            label={language}
          />
        )}
      </video>
      {title && <figcaption>{title}</figcaption>}
    </figure>
  );
}

const components = {
  "core.more-components.disclosure": Disclosure,
  "core.more-components.notice": Notice,
  "core.more-components.people": PeopleGroup,
  "core.more-components.greeting": Greeting,
  "core.more-components.video": Video,
};

export default components;
