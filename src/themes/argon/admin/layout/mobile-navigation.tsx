"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useId, useState } from "react";
import { Icon } from "../../components/icon";
import { Button, Dialog } from "../../components/ui/primitives";
import { useModalDialog } from "../../hooks/use-modal-dialog";
import { AdminNavigation } from "./navigation";
export function AdminMobileNavigation({ pathname }: { pathname: string }) {
  const { dialog, open, close } = useModalDialog();
  const [expanded, setExpanded] = useState(false);
  const id = useId();
  useEffect(() => {
    const media = window.matchMedia("(min-width: 861px)");
    const resize = () => {
      if (media.matches) close();
    };
    media.addEventListener("change", resize);
    return () => media.removeEventListener("change", resize);
  }, [close]);
  return (
    <div className="admin-mobile-navigation">
      <Button
        className="admin-icon-button"
        aria-label="打开后台导航"
        aria-controls={id}
        aria-expanded={expanded}
        onClick={() => {
          open();
          setExpanded(true);
        }}
      >
        <Icon name="menu" />
      </Button>
      <Dialog
        ref={dialog}
        id={id}
        className="admin-mobile-drawer"
        aria-label="后台导航"
        onClose={() => setExpanded(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
      >
        <div className="admin-drawer-content">
          <div className="admin-drawer-heading">
            <strong>
              <UiText text="工作空间" />
            </strong>
            <Button
              className="admin-icon-button"
              aria-label="关闭后台导航"
              onClick={close}
            >
              <Icon name="close" />
            </Button>
          </div>
          <AdminNavigation pathname={pathname} onNavigate={close} />
        </div>
      </Dialog>
    </div>
  );
}
