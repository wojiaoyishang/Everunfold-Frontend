"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import { useIconLibrary } from "@/core/media/icon-library";
import { builtinIconNames, Icon } from "../../components/icon";
import { LibraryIcon } from "../../components/library-icon";
import { Button, TextField } from "../../components/ui/primitives";
import { UploadQueueView } from "../../components/ui/upload-queue";
import { FilePicker } from "../../components/ui/file-picker";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
export interface IconChoice {
  id: string;
  label: string;
  url?: string;
}
const labels: Record<string, string> = {
  crop: "裁剪",
  rotate: "旋转",
  "flip-horizontal": "水平翻转",
  "flip-vertical": "垂直翻转",
  undo: "撤销",
  redo: "重做",
  list: "列表",
  home: "首页",
  archive: "归档",
  trash: "垃圾桶",
  leaf: "叶片",
  book: "书本",
  folder: "文件夹",
  tag: "标签",
  link: "链接",
  star: "星星",
  bell: "铃铛",
  flask: "实验",
  grid: "网格",
  image: "图片",
  upload: "上传",
  sidebar: "侧栏",
  lock: "锁定",
  logout: "退出",
  "eye-off": "隐藏",
  cloud: "云端",
  "cloud-check": "已同步",
  "cloud-off": "离线",
  refresh: "刷新",
  external: "外部链接",
  copy: "复制",
  check: "确认",
  plus: "添加",
  minus: "减少",
  heart: "喜欢",
  reply: "回复",
  smile: "表情",
  send: "发送",
  eye: "查看",
  edit: "编辑",
  play: "播放",
  pause: "暂停",
  settings: "设置",
  chevron: "向右",
  "chevron-left": "向左",
  expand: "展开",
  search: "搜索",
  menu: "菜单",
  close: "关闭",
  sun: "太阳",
  moon: "月亮",
  calendar: "日期",
  comment: "评论",
  clock: "时间",
  user: "用户",
  arrow: "右箭头",
  "arrow-left": "左箭头",
  up: "上箭头",
  down: "下箭头",
  pin: "置顶",
  campfire: "篝火",
};
/** Identical browsing and upload experience in the library route and menu picker. */
export function IconBrowser({
  value,
  onSelect,
}: {
  value?: string;
  onSelect?: (icon: IconChoice) => void;
}) {
  const library = useIconLibrary();
  const user = useAdminAccount();
  const [source, setSource] = useState<"builtin" | "uploaded">("builtin");
  const [selected, setSelected] = useState<IconChoice | null>(null);
  const builtin = builtinIconNames
    .map((id) => ({ id, label: labels[id] ?? id }))
    .filter((item) =>
      `${item.id} ${item.label}`
        .toLowerCase()
        .includes(library.query.toLowerCase()),
    );
  const items: IconChoice[] = source === "builtin" ? builtin : library.items;
  const choose = (icon: IconChoice) => {
    setSelected(icon);
    onSelect?.(icon);
  };
  return (
    <div className="admin-icon-browser">
      <div className="admin-library-toolbar">
        <TextField
          type="search"
          aria-label="搜索图标"
          placeholder="搜索名称或标识…"
          value={library.query}
          onChange={(event) => library.setQuery(event.target.value)}
        />
        <div className="admin-upload-actions">
          <FilePicker
            disabled={!can(user, "media:upload")}
            label="上传图标"
            onFiles={(files) => {
              setSource("uploaded");
              library.upload(files);
            }}
          />
          <span className="admin-upload-hint">
            SVG / PNG / WebP
            <small>
              <UiText text="支持多选 · 单文件 1 MB 内" />
            </small>
          </span>
        </div>
      </div>
      <div className="admin-library-tabs" aria-label="图标来源">
        {(
          [
            ["builtin", "内置图标"],
            ["uploaded", "我的上传"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            aria-pressed={source === key}
            onClick={() => setSource(key)}
          >
            {label}
            <span>
              {key === "builtin" ? builtinIconNames.length : library.total}
            </span>
          </Button>
        ))}
      </div>
      {library.error && (
        <div className="admin-library-feedback" role="status">
          {library.error}
          {library.canRetry && (
            <Button
              className="admin-button"
              onClick={() => void library.retry()}
            >
              <UiText text="重试" />
            </Button>
          )}
        </div>
      )}
      <UploadQueueView
        items={library.uploads}
        onRetry={(id) => library.queue.retry(id)}
        onCancel={(id) => library.queue.cancel(id)}
        onClear={() => library.queue.clearFinished()}
        onSelect={onSelect ? choose : undefined}
      />

      <div
        className="admin-icon-grid"
        aria-busy={source === "uploaded" && library.loading}
      >
        {items.map((icon) => (
          <Button
            key={icon.id}
            className="admin-icon-tile"
            title={icon.label}
            aria-label={`选择图标 ${icon.label}`}
            aria-pressed={(value ?? selected?.id) === icon.id}
            onClick={() => choose(icon)}
          >
            <LibraryIcon name={icon.id} url={icon.url} />
            <span>{icon.label}</span>
            {(value ?? selected?.id) === icon.id && (
              <Icon name="check" className="admin-icon-selected" />
            )}
          </Button>
        ))}
      </div>
      {items.length === 0 && (
        <p className="admin-library-empty">
          {library.loading && source === "uploaded" ? (
            <UiText text="正在读取图标…" />
          ) : library.query ? (
            <UiText text="没有匹配的图标" />
          ) : (
            <UiText text="上传一个图标，即可在菜单中使用" />
          )}
        </p>
      )}
      {source === "uploaded" && library.total > 60 && (
        <div className="admin-library-pagination">
          <Button
            className="admin-button"
            disabled={library.page === 1}
            onClick={() => library.setPage(library.page - 1)}
          >
            <UiText text="上一页" />
          </Button>
          <span>
            <UiText text="第" />
            {library.page} <UiText text="页" />
          </span>
          <Button
            className="admin-button"
            disabled={library.page * 60 >= library.total}
            onClick={() => library.setPage(library.page + 1)}
          >
            <UiText text="下一页" />
          </Button>
        </div>
      )}
    </div>
  );
}
