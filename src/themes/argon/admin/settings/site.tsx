"use client";
import { SitePublishingSettings } from "./site-publishing";
import { DiscoverySettings } from "./discovery";
import { UiText, useT } from "@/core/i18n/provider";

import { useSettingsEditor } from "@/core/settings/editor";
import {
  SettingsFrame,
  SettingsSection,
  SettingsText,
  SettingsToggle,
} from "./shared";
import { SettingsMediaField } from "./media-field";
import { SettingsLanguages } from "./languages";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { randomUUID } from "@/core/browser/crypto";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
export function SiteSettingsPage() {
  const { draft, setDraft } = useSettingsEditor();
  const t = useT();
  const site = draft?.site;
  const update = (value: Partial<NonNullable<typeof site>>) =>
    setDraft((current) =>
      current ? { ...current, site: { ...current.site, ...value } } : current,
    );
  return (
    <SettingsFrame title="站点设置">
      {site && (
        <>
          <SettingsSection
            id="settings-profile"
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
              label="作者格言"
              hint="显示在侧栏作者名称下方；留空时使用站点简介。"
              value={site.author_tagline ?? ""}
              maxLength={160}
              onChange={(author_tagline) => update({ author_tagline })}
            />
            <SettingsMediaField
              label="站点图标"
              hint={t("用于后台导航和浏览器标签页，也作为邮件品牌的默认图标。")}
              kind="image"
              value={site.icon_url ?? ""}
              mediaId={site.icon_media_id}
              onChange={(icon_url, icon_media_id) =>
                update({ icon_url, icon_media_id })
              }
            />
            <SettingsText
              label="公告标题"
              hint="可留空；未填写标题时，首页直接显示公告内容。"
              value={site.notice_title ?? ""}
              maxLength={120}
              onChange={(notice_title) => update({ notice_title })}
            />
            <SettingsText
              label="公告内容"
              hint="超过一行可展开阅读；清空标题和内容后隐藏公告。"
              value={site.notice ?? ""}
              maxLength={1000}
              multiline
              onChange={(notice) => update({ notice })}
            />
          </SettingsSection>
          <SettingsSection
            id="settings-footer"
            title="页脚"
            description="版权说明和备案、友链等结构化链接；不执行自定义 HTML。"
          >
            <SettingsText
              label="版权说明"
              hint="留空时显示“© 年份 作者 · 站点名称”。"
              value={site.footer?.copyright ?? ""}
              maxLength={300}
              onChange={(copyright) =>
                update({
                  footer: {
                    ...site.footer,
                    copyright,
                  },
                })
              }
            />
            <div className="admin-settings-field">
              <label>页脚链接</label>
              <div className="admin-settings-list-editor">
                {(site.footer?.links ?? []).map((link, index) => (
                  <div key={link.id} className="admin-settings-list-row">
                    <TextField
                      aria-label={`页脚链接 ${index + 1} 名称`}
                      placeholder="名称"
                      value={link.label}
                      maxLength={60}
                      onChange={(event) =>
                        update({
                          footer: {
                            ...site.footer,
                            links: (site.footer?.links ?? []).map((item) =>
                              item.id === link.id
                                ? { ...item, label: event.target.value }
                                : item,
                            ),
                          },
                        })
                      }
                    />
                    <TextField
                      aria-label={`页脚链接 ${index + 1} 地址`}
                      placeholder="https://… 或 /站内路径"
                      value={link.href}
                      maxLength={2048}
                      onChange={(event) =>
                        update({
                          footer: {
                            ...site.footer,
                            links: (site.footer?.links ?? []).map((item) =>
                              item.id === link.id
                                ? { ...item, href: event.target.value }
                                : item,
                            ),
                          },
                        })
                      }
                    />
                    <Button
                      type="button"
                      className="admin-icon-button"
                      aria-label={`移除页脚链接 ${link.label || index + 1}`}
                      onClick={() =>
                        update({
                          footer: {
                            ...site.footer,
                            links: (site.footer?.links ?? []).filter(
                              (item) => item.id !== link.id,
                            ),
                          },
                        })
                      }
                    >
                      <Icon name="trash" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  className="admin-button"
                  disabled={(site.footer?.links ?? []).length >= 8}
                  onClick={() =>
                    update({
                      footer: {
                        ...site.footer,
                        links: [
                          ...(site.footer?.links ?? []),
                          {
                            id: `footer-${randomUUID()}`,
                            label: "",
                            href: "",
                            icon: "link",
                          },
                        ],
                      },
                    })
                  }
                >
                  <Icon name="plus" />
                  添加页脚链接
                </Button>
              </div>
              <small>最多 8 个链接；空名称或地址会在保存时被拒绝。</small>
            </div>
          </SettingsSection>
          <SettingsLanguages
            value={normalizeCatalog(site.language_catalog)}
            onChange={(language_catalog) => update({ language_catalog })}
          />
          <SettingsSection
            id="settings-seo"
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
              <small>
                <UiText text="搜索展示预览" />
              </small>
              <strong>
                {(site.title_template ?? "%s · %site%")
                  .replaceAll("%site%", site.name)
                  .replace("%s", "文章标题")}
              </strong>
              <p>
                {site.seo_description || site.description || (
                  <UiText text="在这里填写站点简介，让读者了解你的站点。" />
                )}
              </p>
            </div>
            <SettingsToggle
              label="允许搜索引擎收录"
              hint="关闭后页面输出 noindex。搜索引擎处理需要时间，这不是访问权限控制。"
              value={site.allow_indexing ?? true}
              onChange={(allow_indexing) => update({ allow_indexing })}
            />
          </SettingsSection>
          <SitePublishingSettings site={site} update={update} />
          <DiscoverySettings />
          <SettingsSection
            id="settings-glossary"
            title="正文术语识别"
            description="这里是全站匹配总开关；每篇文章、说说和页面可在各自设置中关闭悬浮提示或脚注。"
          >
            <SettingsToggle
              label="启用正文术语识别"
              hint="只处理正文中的普通文字，不处理代码、链接和公式；逐内容显示设置在此开关启用后生效。"
              value={site.glossary?.auto_match ?? true}
              onChange={(auto_match) =>
                update({
                  glossary: { ...site.glossary, auto_match },
                })
              }
            />
            <div className="admin-settings-field">
              <label>每页最多提示数</label>
              <TextField
                type="number"
                min={1}
                max={100}
                value={String(site.glossary?.max_matches_per_page ?? 20)}
                onChange={(event) =>
                  update({
                    glossary: {
                      ...site.glossary,
                      max_matches_per_page: Math.max(
                        1,
                        Math.min(100, Number(event.target.value) || 1),
                      ),
                    },
                  })
                }
              />
            </div>
            <div className="admin-settings-field">
              <label>提示内容</label>
              <Select
                programOptions
                name="glossary-popup-source"
                label="提示内容"
                value={site.glossary?.popup_source ?? "content"}
                options={[
                  { value: "summary", label: "简短提示" },
                  { value: "content", label: "完整词条说明" },
                ]}
                onValueChange={(popup_source) =>
                  update({
                    glossary: {
                      ...site.glossary,
                      popup_source: popup_source as "summary" | "content",
                    },
                  })
                }
              />
              <small>
                完整说明只随命中的文章一起加载，不会发送整份术语索引。
              </small>
            </div>
          </SettingsSection>
        </>
      )}
    </SettingsFrame>
  );
}
