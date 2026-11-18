"use client";

import { useEffect, useId, useState } from "react";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  readRequestIPDiagnostic,
  readRequestIPPolicy,
  saveRequestIPPolicy,
  type SettingsContract,
} from "@/core/contracts/settings";
import { UiText } from "@/core/i18n/provider";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { Button, Form } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { AdminLoadingState } from "../components/loading-state";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import { SettingsSaveBar, SettingsSection, SettingsText } from "./shared";
import styles from "./real-ip.module.css";

type Policy = SettingsContract["request_ip_policy"]["data"];
type Observation = SettingsContract["request_ip_diagnostic"]["data"]["fastapi"];
type Draft = {
  source: NonNullable<Policy["source"]>;
  fallback: NonNullable<Policy["fallback"]>;
  proxies: string;
};
const sourceOptions = [
  { value: "peer", label: "直连来源 IP" },
  { value: "x-real-ip", label: "X-Real-IP" },
  { value: "x-forwarded-for", label: "X-Forwarded-For" },
  { value: "forwarded", label: "Forwarded" },
  { value: "cf-connecting-ip", label: "CF-Connecting-IP" },
  { value: "true-client-ip", label: "True-Client-IP" },
] as const;
const fallbackOptions = [...sourceOptions, { value: "none", label: "留空" }];
const reportedHeaders = [
  ["X-Real-IP", "x_real_ip"],
  ["X-Forwarded-For", "x_forwarded_for"],
  ["Forwarded（for）", "forwarded"],
  ["CF-Connecting-IP", "cf_connecting_ip"],
  ["True-Client-IP", "true_client_ip"],
] as const;

function toDraft(policy: Policy): Draft {
  return {
    source: policy.source ?? "peer",
    fallback: policy.fallback ?? "peer",
    proxies: (policy.trusted_proxies ?? []).join("\n"),
  };
}

function ConnectionReport({
  title,
  report,
  revision,
  unavailable,
}: {
  title: string;
  report: Observation | null;
  revision: number;
  unavailable?: string;
}) {
  return (
    <section className={styles.report}>
      <h3>{title}</h3>
      {report ? (
        <dl>
          <dt>
            <UiText text="直连来源 IP" />
          </dt>
          <dd>
            <code>{report.peer_ip ?? "—"}</code>
          </dd>
          <dt>
            <UiText text="采用的客户端 IP" />
          </dt>
          <dd>
            <code>{report.client_ip ?? "—"}</code>
            {report.client_ip_source && (
              <small>
                {" "}
                ·{" "}
                <UiText
                  text={
                    sourceOptions.find(
                      ({ value }) => value === report.client_ip_source,
                    )?.label ?? report.client_ip_source
                  }
                />
              </small>
            )}
          </dd>
          <dt>
            <UiText text="命中可信代理" />
          </dt>
          <dd>
            <UiText text={report.trusted_proxy ? "是" : "否"} />
          </dd>
          <dt>
            <UiText text="生效版本" />
          </dt>
          <dd>
            {report.ip_policy_revision ?? <UiText text="直连模式" />}
            {report.ip_policy_revision !== revision && (
              <small>
                {" "}
                · <UiText text="等待获取已保存规则" />
              </small>
            )}
          </dd>
          {reportedHeaders.map(([label, key]) => (
            <div className={styles.header} key={key}>
              <dt>{label}</dt>
              <dd>
                {report[key]?.length
                  ? report[key].map((ip, index) => (
                      <span key={index}>
                        {index > 0 && ", "}
                        {ip ? <code>{ip}</code> : <UiText text="无效" />}
                      </span>
                    ))
                  : "—"}
              </dd>
            </div>
          ))}
          <dt>X-Forwarded-Proto</dt>
          <dd>
            <code>{report.x_forwarded_proto ?? "—"}</code>
          </dd>
        </dl>
      ) : (
        <p className={styles.empty}>
          <UiText text={unavailable ?? "尚未检测"} />
        </p>
      )}
    </section>
  );
}

export function RequestIPPage({ nodeId }: { nodeId: string }) {
  const user = useAdminAccount();
  const { baseUrl, csrfToken } = useAdminRequest();
  const form = useId();
  const sourceId = useId();
  const fallbackId = useId();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [sample, setSample] = useState<{
    fastapi: Observation;
    node: Observation | null;
    unavailable?: string;
  } | null>(null);
  const save = useAccountAction();
  const diagnostic = useAccountAction();
  const isAdmin = user.role === "admin";
  const dirty =
    !!policy &&
    !!draft &&
    JSON.stringify(toDraft(policy)) !== JSON.stringify(draft);

  useEffect(() => {
    if (!isAdmin) return;
    const controller = new AbortController();
    void readRequestIPPolicy(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setPolicy(data);
        setDraft(toDraft(data));
      })
      .catch((reason) => {
        if (!controller.signal.aborted) setError(accountFailure(reason));
      });
    return () => controller.abort();
  }, [baseUrl, isAdmin, reload]);

  function submit() {
    if (!policy || !draft || !dirty) return;
    void save.run(async (signal) => {
      const { data } = await saveRequestIPPolicy(
        baseUrl,
        {
          expected_revision: policy.revision ?? 0,
          source: draft.source,
          fallback: draft.fallback,
          trusted_proxies: draft.proxies.split(/[\s,，]+/).filter(Boolean),
        },
        csrfToken,
        { signal },
      );
      if (signal.aborted) return;
      setPolicy(data);
      setDraft(toDraft(data));
      setSample(null);
    }, "已保存，两端会定期读取新规则。");
  }

  function check() {
    void diagnostic.run(async (signal) => {
      const { data } = await readRequestIPDiagnostic(
        baseUrl,
        { node_id: nodeId },
        { signal },
      );
      let node: Observation | null = null;
      let unavailable: string | undefined;
      if (!data.node_ticket) unavailable = "当前前端节点尚未配对或启用。";
      else {
        try {
          const response = await fetch("/admin/settings/real-ip/diagnostics", {
            method: "POST",
            cache: "no-store",
            redirect: "error",
            headers: { Authorization: `Bearer ${data.node_ticket}` },
            signal: AbortSignal.any([signal, AbortSignal.timeout(8000)]),
          });
          if (!response.ok) throw new Error("Node.js diagnostics unavailable");
          node = (await response.json()) as Observation;
        } catch {
          unavailable =
            "前端诊断请求失败，请检查节点令牌和反代是否转发 Authorization。";
        }
      }
      if (!signal.aborted)
        setSample({ fastapi: data.fastapi, node, unavailable });
    }, "");
  }

  return (
    <SettingsLayout>
      <AdminPageHeading title="真实 IP 来源配置" />
      <UnsavedAccountChanges dirty={dirty} busy={save.busy} />
      {!isAdmin ? (
        <p role="alert">
          <UiText text="仅限站点管理员访问。" />
        </p>
      ) : error ? (
        <div className="admin-settings-message is-error" role="alert">
          <UiText text={error} />
          <Button
            className="admin-button"
            onClick={() => {
              setError("");
              setReload((value) => value + 1);
            }}
          >
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : !policy || !draft ? (
        <AdminLoadingState label="正在读取真实 IP 来源配置…" />
      ) : (
        <>
          <Form
            id={form}
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <fieldset className="admin-settings-form" disabled={save.busy}>
              <SettingsSection
                id="ip-source"
                title="来源规则"
                description="Node.js 和 FastAPI 共用这套日志规则。只有直连地址命中可信代理时，才会采用代理传来的请求头。"
              >
                <div className="admin-settings-field">
                  <label htmlFor={sourceId}>
                    <UiText text="首选来源" />
                  </label>
                  <Select
                    id={sourceId}
                    name="source"
                    label="首选来源"
                    options={sourceOptions}
                    programOptions
                    value={draft.source}
                    onValueChange={(source) =>
                      setDraft({ ...draft, source: source as Draft["source"] })
                    }
                  />
                </div>
                <div className="admin-settings-field">
                  <label htmlFor={fallbackId}>
                    <UiText text="回退策略" />
                  </label>
                  <Select
                    id={fallbackId}
                    name="fallback"
                    label="回退策略"
                    options={fallbackOptions}
                    programOptions
                    value={draft.fallback}
                    onValueChange={(fallback) =>
                      setDraft({
                        ...draft,
                        fallback: fallback as Draft["fallback"],
                      })
                    }
                  />
                  <small>
                    <UiText text="首选来源不可用时，尝试这里选定的来源。" />
                  </small>
                </div>
                <SettingsText
                  multiline
                  maxLength={4096}
                  label="可信代理 IP/CIDR"
                  hint="每行填写一个反代地址或网段。代理链从右向左检查，跳过已知代理。"
                  placeholder={"172.18.0.1\n2001:db8::/64"}
                  value={draft.proxies}
                  onChange={(proxies) => setDraft({ ...draft, proxies })}
                />
              </SettingsSection>
            </fieldset>
          </Form>
          {dirty && save.message && (
            <p className="admin-settings-message is-error" role="alert">
              <UiText text={save.message} />
            </p>
          )}
          <SettingsSection
            id="ip-diagnostics"
            title="请求诊断"
            description="从当前浏览器访问两端，显示这次请求收到的地址和已保存规则的判定结果。"
            action={
              <Button
                className="admin-button"
                disabled={diagnostic.busy || save.busy}
                onClick={check}
              >
                <UiText text={diagnostic.busy ? "检测中…" : "检测当前连接"} />
              </Button>
            }
          >
            {diagnostic.message && (
              <p role="alert">
                <UiText text={diagnostic.message} />
              </p>
            )}
            <div className={styles.diagnostics} aria-live="polite">
              <ConnectionReport
                title="Node.js"
                report={sample?.node ?? null}
                unavailable={sample?.unavailable}
                revision={policy.revision ?? 0}
              />
              <ConnectionReport
                title="FastAPI"
                report={sample?.fastapi ?? null}
                revision={policy.revision ?? 0}
              />
            </div>
          </SettingsSection>
          <SettingsSaveBar
            dirty={dirty}
            busy={save.busy}
            status={<UiText text={save.message || "已保存"} />}
            form={form}
            onReset={() => {
              setDraft(toDraft(policy));
              save.setMessage("");
            }}
          />
        </>
      )}
    </SettingsLayout>
  );
}
