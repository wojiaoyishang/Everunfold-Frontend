import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type {
  AdminFormFieldActionProps,
  AdminFormFieldSource,
} from "@everunfold/plugin-sdk";
import {
  Button,
  Icon,
  Modal,
  Select,
  TextField,
  randomUUID,
  useAdminRequest,
} from "@everunfold/plugin-sdk/client";
import { refreshAvailability, useWritingAvailability } from "./availability";
import { startGeneration, WritingRequestError } from "./client";
import type { Availability, GenerationRequest } from "./contract";
import { writingScenes } from "./fields";
import { useGenerationJob } from "./generation-job";
import { jobError, requestError, useWritingText } from "./messages";
import styles from "./writing.module.css";

const accessDefaults: Record<string, string> = {
  "content.article.edit": "article",
  "content.shuoshuo.edit": "shuoshuo",
  "pages.edit": "page",
};

function boundedText(value: string | undefined, limit: number) {
  return Array.from(value?.trim() ?? "")
    .slice(0, limit)
    .join("");
}

type Field = AdminFormFieldActionProps["field"];
type Material = { source: AdminFormFieldSource; restricted: boolean };
type Review = {
  availability: Availability;
  scene: GenerationRequest["scene"];
  source: Promise<AdminFormFieldSource>;
  fieldValue: string;
};

function reviewedMaterial(
  source: AdminFormFieldSource,
  review: Review,
): Material {
  const defaultAccess = accessDefaults[review.scene];
  return {
    source,
    restricted: Boolean(
      source.restricted ||
      (defaultAccess &&
        review.availability.restricted_by_default?.[defaultAccess]),
    ),
  };
}

function materialText(material: Material | null, topic: string) {
  return {
    title: boundedText(
      material?.restricted ? topic : material?.source.title,
      300,
    ),
    summary: material?.restricted
      ? ""
      : boundedText(material?.source.summary, 1000),
    body: material?.restricted ? "" : boundedText(material?.source.body, 8000),
  };
}

export function GenerationAction({ field }: AdminFormFieldActionProps) {
  const t = useWritingText();
  const availability = useWritingAvailability(!field.disabled);
  const [review, setReview] = useState<Review | null>(null);
  const scene = writingScenes.find((item) => item.scene === field.scene)?.scene;
  const allowed = Boolean(
    scene &&
    availability?.enabled &&
    availability.fields[scene]?.includes(field.field),
  );
  if (!review && (!allowed || field.disabled)) return null;
  return (
    <>
      {allowed && !field.disabled && (
        <Button
          className={styles.fieldAction}
          onClick={() => {
            if (availability && scene)
              setReview({
                availability,
                scene,
                source: Promise.resolve().then(field.source),
                fieldValue: field.value,
              });
          }}
        >
          <Icon name="star" />
          {t("AI 辅助生成")}
        </Button>
      )}
      {review && (
        <GenerationDialog
          field={field}
          review={review}
          currentRevision={allowed ? availability?.revision : undefined}
          close={() => setReview(null)}
        />
      )}
    </>
  );
}

function GenerationDialog({
  field,
  review,
  currentRevision,
  close,
}: {
  field: Field;
  review: Review;
  currentRevision: number | undefined;
  close: () => void;
}) {
  const t = useWritingText();
  const admin = useAdminRequest();
  const job = useGenerationJob();
  const providerFieldId = useId();
  const providers = review.availability.providers;
  const [providerId, setProviderId] = useState(
    () =>
      providers.find(({ id }) => id === review.availability.default_provider_id)
        ?.id ??
      providers[0]?.id ??
      "",
  );
  const [closing, setClosing] = useState(false);
  const [material, setMaterial] = useState<Material | null>(null);
  const [sourceError, setSourceError] = useState(false);
  const [topic, setTopic] = useState("");
  const [startValue, setStartValue] = useState(review.fieldValue);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [applyError, setApplyError] = useState(false);
  const [checkingMaterial, setCheckingMaterial] = useState(false);
  const [materialChanged, setMaterialChanged] = useState(false);
  const action = useRef<AbortController>(null);
  useLayoutEffect(() => () => action.current?.abort(), []);

  useEffect(() => {
    let alive = true;
    void review.source
      .then((source) => {
        if (!alive) return;
        setMaterial(reviewedMaterial(source, review));
      })
      .catch(() => {
        if (alive) setSourceError(true);
      });
    return () => {
      alive = false;
    };
  }, [review]);

  const { title, summary, body } = materialText(material, topic);
  const ready = Boolean(material && (title || summary || body));
  const available =
    !field.disabled && review.availability.revision === currentRevision;
  const result = job.status?.status === "succeeded" ? job.status.text : "";
  const tooLong = Boolean(
    result && field.maxLength && result.length > field.maxLength,
  );
  const changedValue = field.value !== startValue;
  const transportFailure =
    Boolean(job.failure) && !(job.failure instanceof WritingRequestError);
  const error = job.failure
    ? requestError(job.failure)
    : job.status && ["failed", "unknown"].includes(job.status.status)
      ? jobError(job.status.error)
      : "";

  const send = (checked: Material) => {
    const next: GenerationRequest = {
      request_id: randomUUID(),
      expected_revision: review.availability.revision,
      provider_id: providerId,
      scene: review.scene,
      field: field.field,
      resource_id: checked.source.resourceId || undefined,
      language: checked.source.language,
      title,
      summary: summary || undefined,
      body: body || undefined,
      restricted: checked.restricted,
    };
    setStartValue(field.value);
    setConfirm(null);
    setApplyError(false);
    void job.run(next.request_id, (signal) =>
      startGeneration(admin, next, signal),
    );
  };

  const generate = async () => {
    if (
      !material ||
      !ready ||
      !available ||
      !providerId ||
      job.busy ||
      action.current
    )
      return;
    const operation = new AbortController();
    action.current = operation;
    setCheckingMaterial(true);
    setSourceError(false);
    setMaterialChanged(false);
    try {
      const checked = reviewedMaterial(await field.source(), review);
      if (operation.signal.aborted) return;
      const text = materialText(checked, topic);
      if (
        checked.restricted !== material.restricted ||
        checked.source.resourceId !== material.source.resourceId ||
        checked.source.language !== material.source.language ||
        text.title !== title ||
        text.summary !== summary ||
        text.body !== body
      ) {
        setMaterial(checked);
        setMaterialChanged(true);
        return;
      }
      send(checked);
    } catch {
      if (!operation.signal.aborted) setSourceError(true);
    } finally {
      action.current = null;
      if (!operation.signal.aborted) setCheckingMaterial(false);
    }
  };

  const adopt = () => {
    if (!result || tooLong || !available || job.busy) return;
    if (changedValue && confirm !== field.value) {
      setConfirm(field.value);
      return;
    }
    if (field.apply(result) === false) setApplyError(true);
    else setClosing(true);
  };

  return (
    <Modal
      title={t("AI 辅助生成")}
      closeLabel={t("关闭 AI 辅助生成")}
      className={styles.dialog}
      onClose={() => {
        action.current?.abort();
        setClosing(true);
      }}
      closing={closing}
      onExited={close}
    >
      <div className={`admin-density-controls ${styles.flow}`}>
        <strong className={styles.reviewHeading}>{t(field.label)}</strong>
        {providers.length ? (
          <div className={styles.field}>
            <label htmlFor={providerFieldId}>{t("生成服务商")}</label>
            <Select
              id={providerFieldId}
              name="provider_id"
              label={t("生成服务商")}
              className={styles.providerChooser}
              options={providers.map(({ id, name, model }) => ({
                value: id,
                label: `${name} · ${model}`,
              }))}
              value={providerId}
              disabled={
                closing ||
                !available ||
                job.busy ||
                checkingMaterial ||
                transportFailure
              }
              onValueChange={(value) => {
                if (value === providerId) return;
                setProviderId(value);
                job.reset();
                setConfirm(null);
                setApplyError(false);
              }}
            />
          </div>
        ) : (
          <p role="status" className={styles.hint}>
            {t("暂无可用的生成服务商。")}
          </p>
        )}
        {sourceError && (
          <p role="alert" className={styles.error}>
            {t("素材暂时无法读取。")}
          </p>
        )}
        {materialChanged && (
          <p role="status" className={styles.hint}>
            {t("发送素材有变化，请核对后重新点击生成。")}
          </p>
        )}
        {!material && !sourceError ? (
          <p role="status">{t("正在读取素材…")}</p>
        ) : material ? (
          <section
            className={styles.material}
            aria-label={t("将发送给模型的素材")}
          >
            {material.restricted && (
              <>
                <p className={styles.hint}>
                  {t("受限内容的正文和摘要留在站内。可手动填写要发送的主题。")}
                </p>
                <label className={styles.field}>
                  {t("填写主题")}
                  <TextField
                    value={topic}
                    maxLength={300}
                    disabled={job.busy || checkingMaterial || !available}
                    onChange={(event) => setTopic(event.target.value)}
                  />
                </label>
              </>
            )}
            {!material.restricted &&
              (ready ? (
                <dl className={styles.sources}>
                  {(
                    [
                      ["标题", title],
                      ["摘要", summary],
                      ["正文片段", body],
                    ] as const
                  )
                    .filter(([, text]) => text)
                    .map(([label, text]) => (
                      <div key={label}>
                        <dt>{t(label)}</dt>
                        <dd dir="auto">{text}</dd>
                      </div>
                    ))}
                </dl>
              ) : (
                <p className={styles.hint}>{t("请先填写可用于生成的内容。")}</p>
              ))}
          </section>
        ) : null}
        {result && (
          <section className={styles.candidate} aria-label={t("建议文案")}>
            <strong>{t("建议文案")}</strong>
            <p lang={material?.source.language} dir="auto">
              {result}
            </p>
          </section>
        )}
        {!available && (
          <p className={styles.error} role="alert">
            {t("模型配置已更改。请关闭并重新打开生成窗口。")}
          </p>
        )}
        {error && (
          <p className={styles.error} role="alert">
            {t(error)}
          </p>
        )}
        {tooLong && (
          <p className={styles.error} role="alert">
            {t("文案超出字段长度限制，请重新生成。")}
          </p>
        )}
        {applyError && (
          <p className={styles.error} role="alert">
            {t("当前字段已改变，请重新打开生成窗口。")}
          </p>
        )}
        {result && changedValue && (
          <p className={styles.hint} role="status">
            {t("生成期间此字段已修改。采用建议会覆盖当前内容。")}
          </p>
        )}
        <div className={styles.actions}>
          <div className={styles.notice} role="status">
            {checkingMaterial && t("正在读取素材…")}
            {job.busy &&
              t(job.status?.status === "queued" ? "正在排队…" : "正在生成…")}
          </div>
          {transportFailure && job.requestId ? (
            <Button
              className="admin-button"
              disabled={job.busy}
              onClick={() => void job.run(job.requestId)}
            >
              {t("查看结果")}
            </Button>
          ) : (
            <Button
              className={`admin-button${result ? "" : " admin-button-primary"}`}
              disabled={
                !ready ||
                !available ||
                !providerId ||
                job.busy ||
                checkingMaterial
              }
              onClick={() => {
                refreshAvailability(admin);
                void generate();
              }}
            >
              <Icon name={result ? "refresh" : "star"} />
              {t(result ? "重新生成" : "生成")}
            </Button>
          )}
          {result && (
            <Button
              className="admin-button admin-button-primary"
              disabled={tooLong || !available || job.busy}
              onClick={adopt}
            >
              <Icon name="check" />
              {t(changedValue && confirm === field.value ? "确认覆盖" : "采用")}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
