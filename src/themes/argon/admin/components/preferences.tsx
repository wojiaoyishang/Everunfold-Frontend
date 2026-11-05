"use client";
import { UiText } from "@/core/i18n/provider";

import { useId } from "react";
import type { AdminPreferences } from "@/core/admin/preferences";
import { Icon } from "../../components/icon";
import { Button, Popover } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { useAnchoredPopover } from "../../components/ui/use-anchored-popover";
export function AdminAppearance({
  preferences,
  onChange,
}: {
  preferences: AdminPreferences;
  onChange: (patch: Partial<AdminPreferences>) => void;
}) {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    close,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(300);
  return (
    <>
      <Button
        ref={trigger}
        className="admin-icon-button"
        aria-label="后台外观"
        title="后台外观"
        disabled={!ready}
        popoverTarget={id}
        aria-expanded={open}
        aria-controls={id}
      >
        <Icon name="settings" />
      </Button>
      <Popover
        ref={panel}
        id={id}
        className="ui-anchored-panel admin-preferences"
        aria-labelledby={`${id}-title`}
        onBeforeToggle={onBeforeToggle}
        onToggle={onToggle}
        onKeyDown={onPanelKeyDown}
      >
        <header>
          <h2 id={`${id}-title`}>
            <UiText text="后台外观" />
          </h2>
          <Button
            className="admin-icon-button"
            aria-label="关闭外观设置"
            onClick={close}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="admin-preference-field">
          <span>
            <UiText text="颜色模式" />
          </span>
          <Select
            programOptions
            name="admin-mode"
            label="后台颜色模式"
            value={preferences.mode}
            onValueChange={(value) =>
              onChange({ mode: value as AdminPreferences["mode"] })
            }
            options={[
              { value: "system", label: "跟随系统" },
              { value: "light", label: "浅色" },
              { value: "dark", label: "深色" },
            ]}
          />
        </div>
        <div className="admin-preference-field">
          <span>
            <UiText text="内容间距" />
          </span>
          <Select
            programOptions
            name="admin-density"
            label="后台内容间距"
            value={preferences.density}
            onValueChange={(value) =>
              onChange({ density: value as AdminPreferences["density"] })
            }
            options={[
              { value: "comfortable", label: "舒适" },
              { value: "compact", label: "紧凑" },
            ]}
          />
        </div>
        <div className="admin-preference-field">
          <span>
            <UiText text="界面动效" />
          </span>
          <Select
            programOptions
            name="admin-motion"
            label="后台界面动效"
            value={preferences.motion}
            onValueChange={(value) =>
              onChange({ motion: value as AdminPreferences["motion"] })
            }
            options={[
              { value: "full", label: "轻量动效" },
              { value: "system", label: "跟随系统" },
              { value: "reduced", label: "减少动态" },
            ]}
          />
        </div>
        <p>
          <UiText text="仅调整后台，在此浏览器中记住。" />
        </p>
      </Popover>
    </>
  );
}
