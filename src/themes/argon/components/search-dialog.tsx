"use client";
import { useId } from "react";
import { useModalDialog } from "../hooks/use-modal-dialog";
import { SearchForm } from "./navigation-link";
import { Icon } from "./icon";
export function SearchDialog() {
  const { dialog, open, close } = useModalDialog();
  const id = useId();
  return (
    <>
      <button
        className="icon-button"
        type="button"
        aria-label="站内搜索"
        title="站内搜索"
        aria-haspopup="dialog"
        onClick={open}
      >
        <Icon name="search" />
      </button>
      <dialog
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
            <h2 id={`${id}-title`}>寻找一段故事</h2>
          </div>
          <button className="icon-button" aria-label="关闭搜索" onClick={close}>
            <Icon name="close" />
          </button>
        </header>
        <SearchForm className="search-dialog-form" onSearch={close}>
          <label>
            <span className="navigation-status">搜索关键词</span>
            <Icon name="search" />
            <input
              name="q"
              autoFocus
              placeholder="文章、说说，或者记忆中的几个字…"
              maxLength={160}
            />
          </label>
          <div>
            <select name="type" aria-label="搜索内容类型">
              <option value="all">全部内容</option>
              <option value="article">文章</option>
              <option value="shuoshuo">说说</option>
              <option value="page">页面</option>
            </select>
            <button className="primary-button" type="submit">
              开始寻找 <Icon name="arrow" />
            </button>
          </div>
        </SearchForm>
        <p>按 Enter 搜索 · Esc 回到阅读</p>
      </dialog>
    </>
  );
}
