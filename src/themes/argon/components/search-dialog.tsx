"use client";
import { UiText } from "@/core/i18n/provider";

import {
  Button,
  TextField,
  Dialog,
} from "@/themes/argon/components/ui/primitives";

import { useId } from "react";
import { useModalDialog } from "../hooks/use-modal-dialog";
import { SearchContentType } from "./search-content-type";
import { SearchForm } from "./navigation-link";
import { Icon } from "./icon";
import { SearchLanguages } from "./search-languages";
export function SearchDialog() {
  const { dialog, open, close } = useModalDialog();
  const id = useId();
  return (
    <>
      <Button
        className="icon-button"
        type="button"
        aria-label="站内搜索"
        title="站内搜索"
        aria-haspopup="dialog"
        onClick={open}
      >
        <Icon name="search" />
      </Button>
      <Dialog
        ref={dialog}
        className="search-dialog"
        aria-labelledby={`${id}-title`}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            const bounds = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < bounds.left ||
              event.clientX > bounds.right ||
              event.clientY < bounds.top ||
              event.clientY > bounds.bottom
            )
              close();
          }
        }}
      >
        <header>
          <div>
            <span className="search-eyebrow">AROUND THE CAMPFIRE</span>
            <h2 id={`${id}-title`}>
              <UiText text="寻找一段故事" />
            </h2>
          </div>
          <Button className="icon-button" aria-label="关闭搜索" onClick={close}>
            <Icon name="close" />
          </Button>
        </header>
        <SearchForm className="search-dialog-form" onSearch={close}>
          <label>
            <span className="sr-only">
              <UiText text="搜索关键词" />
            </span>
            <Icon name="search" />
            <TextField
              name="q"
              autoFocus
              placeholder="搜索文章、说说或术语…"
              maxLength={160}
            />
          </label>
          <div className="search-dialog-controls">
            <div className="search-filter-group">
              <SearchContentType />
              <SearchLanguages />
            </div>
            <Button className="primary-button" type="submit">
              <UiText text="开始寻找" />
              <Icon name="arrow" />
            </Button>
          </div>
        </SearchForm>
        <p>
          <UiText text="按 Enter 搜索 · Esc 回到阅读" />
        </p>
      </Dialog>
    </>
  );
}
