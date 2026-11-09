"use client";
import { useState } from "react";
import Image from "next/image";
import type { InstalledPlugin } from "@/core/contracts/settings";
import { commentMarkdown } from "@/core/rendering/comment-markdown";
import { resourceUrl, publicHref } from "@/core/content/urls";
import { Modal } from "../../components/ui/modal";
import { TextLink } from "../../components/ui/primitives";
import { UiText } from "@/core/i18n/provider";
import styles from "./plugins.module.css";
export function PluginDetails({
  plugin,
  onClose,
}: {
  plugin: InstalledPlugin;
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false),
    [broken, setBroken] = useState(false);
  const preview = resourceUrl(plugin.preview ?? ""),
    homepage = publicHref(plugin.homepage ?? "");
  return (
    <Modal
      title={plugin.title}
      className={styles.dialog}
      closeLabel="关闭插件详情"
      onClose={() => setClosing(true)}
      closing={closing}
      onExited={onClose}
    >
      <div className={styles.body}>
        {preview && !broken && (
          <Image
            unoptimized
            width={800}
            height={400}
            src={preview}
            alt={plugin.title}
            onError={() => setBroken(true)}
          />
        )}
        <p>{plugin.description}</p>
        <dl>
          <dt>
            <UiText text="版本" />
          </dt>
          <dd>{plugin.version ?? "—"}</dd>
          <dt>
            <UiText text="作者" />
          </dt>
          <dd>{plugin.author || "—"}</dd>
          <dt>
            <UiText text="许可证" />
          </dt>
          <dd>{plugin.license || "—"}</dd>
        </dl>
        {homepage && (
          <TextLink href={homepage} target="_blank" rel="noopener noreferrer">
            <UiText text="项目主页" />
          </TextLink>
        )}
        <div className={styles.markdown}>
          {commentMarkdown(plugin.readme || "暂无详细介绍。")}
        </div>
        <small>
          {plugin.id} · {plugin.build.slice(0, 12)}
        </small>
      </div>
    </Modal>
  );
}
