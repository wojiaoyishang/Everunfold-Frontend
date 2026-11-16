"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ConnectionDraft, ConnectionList } from "@/core/nodes/local";
import {
  decodeConnectionBundle,
  maxConnectionEncodingLength,
} from "@/core/nodes/connection-bundle";
import {
  nodeError,
  readLocalConnections,
  saveLocalConnection,
} from "@/core/nodes/use-console";
import {
  Button,
  Form,
  TextArea,
  TextField,
} from "@/themes/argon/components/ui/primitives";
import { FormField } from "@/themes/argon/components/ui/form-field";
import { Select } from "@/themes/argon/components/ui/select";
import styles from "./console.module.css";

const blank: ConnectionDraft = {
  id: "",
  nodeId: "web-main",
  publicUrl: "",
  internalUrl: "",
  sourceEpoch: "",
  allowedPeerIps: ["127.0.0.1", "::1"],
  inboundToken: "",
  outboundToken: "",
};

export function ConnectionEditor({
  onSaved,
}: {
  onSaved: () => Promise<void>;
}) {
  const [list, setList] = useState<ConnectionList>();
  const [selected, setSelected] = useState("");
  const [draft, setDraft] = useState<ConnectionDraft>({ ...blank });
  const [peers, setPeers] = useState(blank.allowedPeerIps.join(", "));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [encoded, setEncoded] = useState("");

  function choose(value: string, data = list) {
    setEncoded("");
    const profile = data?.profiles.find((item) => item.id === value);
    setSelected(value);
    setDraft(
      profile
        ? { ...profile, inboundToken: "", outboundToken: "" }
        : { ...blank },
    );
    setPeers((profile?.allowedPeerIps ?? blank.allowedPeerIps).join(", "));
  }
  useEffect(() => {
    let current = true;
    void readLocalConnections().then(
      (data) => {
        if (!current) return;
        setList(data);
        const profile = data.profiles.find((item) => item.id === data.active);
        setSelected(data.active);
        if (profile) {
          setDraft({ ...profile, inboundToken: "", outboundToken: "" });
          setPeers(profile.allowedPeerIps.join(", "));
        }
      },
      (cause) => {
        if (current) setError(nodeError(cause));
      },
    );
    return () => {
      current = false;
    };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!list || pending) return;
    setPending(true);
    setError("");
    setSuccess("");
    try {
      const result = await saveLocalConnection(
        {
          ...draft,
          allowedPeerIps: peers
            .split(",")
            .map((value) => value.trim())
            .filter(Boolean),
        },
        list.revision,
        selected === "",
      );
      setSuccess(
        `已保存并选用连接 ${draft.id}。文件：${result.filename}。请重启前端进程或容器，再从后端重新同步；无需重新编译。`,
      );
      setDraft((value) => ({ ...value, inboundToken: "", outboundToken: "" }));
      const data = await readLocalConnections();
      setList(data);
      choose(data.active, data);
      void onSaved();
    } catch (cause) {
      setError(nodeError(cause));
    } finally {
      setPending(false);
    }
  }
  const original = list?.profiles.find((item) => item.id === selected);
  const field = (
    key: Exclude<keyof ConnectionDraft, "allowedPeerIps">,
    label: string,
    options: { secret?: boolean; hint?: string; required?: boolean } = {},
  ) => (
    <FormField id={`connection-${key}`} label={label}>
      <TextField
        id={`connection-${key}`}
        name={key}
        value={draft[key]}
        type={options.secret ? "password" : "text"}
        autoComplete={options.secret ? "new-password" : "off"}
        maxLength={
          options.secret ? 4096 : key === "id" || key === "nodeId" ? 64 : 2048
        }
        required={options.required ?? !options.secret}
        disabled={pending || (key === "id" && selected !== "")}
        onChange={(event) =>
          setDraft((value) => ({ ...value, [key]: event.target.value }))
        }
      />
      {options.hint && <small className={styles.muted}>{options.hint}</small>}
    </FormField>
  );
  return (
    <section className={styles.panel} aria-labelledby="connections-heading">
      <h2 id="connections-heading">编辑后端连接</h2>
      {list && (
        <p>
          配置文件：<code>{list.filename}</code>
        </p>
      )}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" data-tone="positive">
          {success}
        </p>
      )}
      {!list && !error && <p role="status">正在读取配置…</p>}
      {list && !list.editable && (
        <p>
          当前使用旧 TOML。请用 setup 保存部署 YAML，并将 CONFIG_FILE
          指向该文件后重启。
        </p>
      )}
      {list?.editable && (
        <Form className={styles.stack} onSubmit={save}>
          <FormField id="connection-select" label="连接">
            <Select
              id="connection-select"
              name="connection"
              label="连接"
              value={selected}
              disabled={pending}
              options={[
                ...list.profiles.map((item) => ({
                  value: item.id,
                  label: item.id + (item.id === list.active ? "（当前）" : ""),
                })),
                { value: "", label: "新增连接…" },
              ]}
              onValueChange={(value) => {
                choose(value);
                setError("");
                setSuccess("");
              }}
            />
          </FormField>
          <FormField id="connection-base64" label="后端连接 Base64">
            <TextArea
              id="connection-base64"
              value={encoded}
              onChange={(event) => setEncoded(event.target.value)}
              rows={3}
              maxLength={maxConnectionEncodingLength}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              placeholder="粘贴后端导出的完整编码"
            />
            <small className={styles.muted}>
              包含节点令牌。导入只填写下方表单，检查内部 URL 和来源 IP 后保存。
            </small>
          </FormField>
          <div className={styles.actions}>
            <Button
              type="button"
              className="admin-button"
              disabled={pending || !encoded.trim()}
              onClick={() => {
                setError("");
                setSuccess("");
                try {
                  const imported = decodeConnectionBundle(encoded);
                  setDraft((value) => ({
                    ...value,
                    ...imported,
                    id: value.id || imported.nodeId,
                  }));
                  setEncoded("");
                  setSuccess(
                    "已填入连接信息，尚未保存。请检查内部 URL 和来源 IP。",
                  );
                } catch {
                  setError("连接编码无效，请粘贴后端导出的完整 Base64。");
                }
              }}
            >
              导入 Base64
            </Button>
          </div>
          <div className={styles.summary}>
            {field("id", "连接名称")}
            {field("nodeId", "前端节点 ID")}
          </div>
          {field("publicUrl", "后端发布 URL", {
            hint: "浏览器访问 API 的公开根地址，例如 https://api.example.com。",
          })}
          {field("internalUrl", "后端内部 URL", {
            required: false,
            hint: "前端 Node.js 访问后端的地址，支持容器别名；留空沿用发布 URL。",
          })}
          {field("sourceEpoch", "后端来源 UUID", {
            hint: "粘贴后端连接 Base64 自动填写。",
          })}
          <FormField
            id="connection-peers"
            label="允许后端调用前端的来源 IP/CIDR"
          >
            <TextField
              id="connection-peers"
              value={peers}
              onChange={(event) => setPeers(event.target.value)}
              disabled={pending}
              maxLength={4096}
            />
            <small className={styles.muted}>
              逗号分隔，填写实际来源。自动允许的 Docker 子网会另外追加。
            </small>
          </FormField>
          <div className={styles.summary}>
            {field("inboundToken", "前端 → 后端令牌", {
              secret: true,
              required: !original?.hasInboundToken,
              hint: original?.hasInboundToken
                ? "已配置，留空保留。"
                : "导入 Base64 自动填写，也可手动填写。",
            })}
            {field("outboundToken", "后端 → 前端令牌", {
              secret: true,
              required: !original?.hasOutboundToken,
              hint: original?.hasOutboundToken
                ? "已配置，留空保留。"
                : "导入 Base64 自动填写，也可手动填写。",
            })}
          </div>
          <div className={styles.actions}>
            <Button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={pending}
            >
              {pending ? "正在保存…" : "保存并使用"}
            </Button>
            <Button
              type="button"
              className="admin-button"
              disabled={pending}
              onClick={() => {
                setPending(true);
                void readLocalConnections()
                  .then(
                    (data) => {
                      setList(data);
                      choose(data.active, data);
                      setError("");
                    },
                    (cause) => setError(nodeError(cause)),
                  )
                  .finally(() => setPending(false));
              }}
            >
              重新读取
            </Button>
          </div>
        </Form>
      )}
    </section>
  );
}
