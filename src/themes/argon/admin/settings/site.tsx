"use client";
import { useSettingsEditor } from "@/core/settings/editor";
import {
  SettingsFrame,
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "./shared";
import { MenuEditor } from "./menu-editor";
export function SiteSettingsPage() {
  const { draft, setDraft } = useSettingsEditor();
  const site = draft?.site;
  const update = (value: Partial<NonNullable<typeof site>>) =>
    setDraft((current) =>
      current ? { ...current, site: { ...current.site, ...value } } : current,
    );
  return (
    <SettingsFrame
      title="站点设置"
      description="维护站点的基本资料、导航与搜索展示。"
    >
      {site && (
        <>
          <SettingsSection
            title="基本资料"
            description="名称与简介会用于站点导航、侧栏及页面信息。"
          >
            <div className="admin-settings-two-col">
              <SettingsText
                label="站点名称"
                value={site.name}
                maxLength={120}
                onChange={(name) => update({ name })}
              />
              <SettingsText
                label="作者名称"
                value={site.author}
                maxLength={100}
                onChange={(author) => update({ author })}
              />
            </div>
            <SettingsText
              label="站点简介"
              value={site.description}
              maxLength={300}
              onChange={(description) => update({ description })}
            />
            <SettingsText
              label="头像地址"
              hint="填写已可访问的图片地址。媒体上传将在媒体库接入后提供。"
              value={site.avatar_url ?? ""}
              onChange={(avatar_url) => update({ avatar_url })}
            />
            <SettingsText
              label="站点公告"
              value={site.notice ?? ""}
              maxLength={1000}
              multiline
              onChange={(notice) => update({ notice })}
            />
          </SettingsSection>
          <SettingsSection
            title="导航菜单"
            description="顶栏、侧栏与移动菜单使用同一份内容。每层都可添加子菜单。"
          >
            <MenuEditor
              value={site.navigation ?? []}
              iconUrls={draft?.icon_urls}
              onIconUrl={(id, url) =>
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        icon_urls: { ...current.icon_urls, [id]: url },
                      }
                    : current,
                )
              }
              onChange={(navigation) => update({ navigation })}
            />
          </SettingsSection>
          <SettingsSection
            title="搜索展示"
            description="这些内容会输出在页面的搜索元信息中。"
          >
            <SettingsText
              label="页面标题格式"
              hint="%s 表示页面标题，%site% 表示站点名称。"
              value={site.title_template ?? "%s · %site%"}
              maxLength={160}
              onChange={(title_template) => update({ title_template })}
            />
            <SettingsText
              label="搜索描述"
              hint="留空时使用站点简介；文章仍优先使用各自的摘要。"
              value={site.seo_description ?? ""}
              maxLength={300}
              multiline
              onChange={(seo_description) => update({ seo_description })}
            />
            <div className="admin-seo-preview">
              <small>搜索展示预览</small>
              <strong>
                {(site.title_template ?? "%s · %site%")
                  .replaceAll("%site%", site.name)
                  .replace("%s", "文章标题")}
              </strong>
              <p>
                {site.seo_description ||
                  site.description ||
                  "在这里填写站点简介，让读者了解你的站点。"}
              </p>
            </div>
            <SettingsToggle
              label="允许搜索引擎收录"
              hint="关闭后页面输出 noindex。搜索引擎处理需要时间，这不是访问权限控制。"
              value={site.allow_indexing ?? true}
              onChange={(allow_indexing) => update({ allow_indexing })}
            />
          </SettingsSection>
        </>
      )}
    </SettingsFrame>
  );
}
