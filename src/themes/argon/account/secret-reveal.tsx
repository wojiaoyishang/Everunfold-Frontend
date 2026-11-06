"use client";
import { useId, useRef, useState } from "react";
import { UiText } from "@/core/i18n/provider";
import { Modal } from "../components/ui/modal";
import { Button, TextArea } from "../components/ui/primitives";

export function SecretReveal({
  entries,
  onClose,
}: {
  entries: { label: string; value: string }[];
  onClose: () => void;
}) {
  const [closing, setClosing] = useState(false);
  return (
    <Modal
      title="请保存你的密钥"
      className="account-secret-modal"
      closing={closing}
      onClose={() => setClosing(true)}
      onExited={onClose}
    >
      <p className="account-secret-warning">
        <UiText text="密钥只在这一次显示，关闭后无法再次读取。请保存到安全的位置。" />
      </p>
      {entries.map((entry) => (
        <SecretEntry key={entry.label} {...entry} />
      ))}
      <div className="account-actions">
        <Button
          className="admin-button admin-button-primary"
          onClick={() => setClosing(true)}
        >
          <UiText text="已保存，关闭" />
        </Button>
      </div>
    </Modal>
  );
}
function SecretEntry({ label, value }: { label: string; value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null),
    id = useId();
  const [message, setMessage] = useState("");
  const copy = async () => {
    try {
      if (navigator.clipboard?.writeText)
        await navigator.clipboard.writeText(value);
      else {
        ref.current?.select();
        if (!document.execCommand("copy")) throw new Error("clipboard");
      }
      setMessage("已复制。");
    } catch {
      ref.current?.select();
      setMessage("已选中文字，请手动复制。");
    }
  };
  return (
    <div className="account-secret-entry account-field">
      <label htmlFor={id}>
        <UiText text={label} />
      </label>
      <TextArea
        ref={ref}
        id={id}
        value={value}
        readOnly
        rows={3}
        spellCheck={false}
        autoComplete="off"
      />
      <div className="account-secret-actions">
        <Button className="admin-button" onClick={() => void copy()}>
          <UiText text="复制密钥" />
        </Button>
        <span role="status">
          <UiText text={message} />
        </span>
      </div>
    </div>
  );
}
