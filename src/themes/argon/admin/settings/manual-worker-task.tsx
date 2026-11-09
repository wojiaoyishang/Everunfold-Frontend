"use client";
import { useId, useState } from "react";
import type { RuntimeOverview } from "@/core/contracts/settings";
import { useManualWorkerTask } from "@/core/tasks/use-manual-worker-task";
import {
  asRecord,
  checkTaskParameters,
  initialTaskParameters,
  type TaskParameterValues,
} from "@/core/tasks/task-parameters";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Modal } from "../../components/ui/modal";
import { Select } from "../../components/ui/select";
import { FormField } from "../../components/ui/form-field";
import { Icon } from "../../components/icon";
import styles from "./manual-worker-task.module.css";
import { TaskParameters } from "./task-parameters";

export function ManualWorkerTaskDialog({
  plans,
  onClose,
  onSubmitted,
}: {
  plans: RuntimeOverview["plans"];
  onClose: () => void;
  onSubmitted: (overview: RuntimeOverview, taskId: string) => void;
}) {
  const id = useId(),
    t = useT(),
    request = useManualWorkerTask();
  const [search, setSearch] = useState(""),
    [taskId, setTaskId] = useState("");
  const [parameters, setParameters] = useState<TaskParameterValues>({}),
    [parametersValid, setParametersValid] = useState(true);
  const [closing, setClosing] = useState(false),
    [result, setResult] = useState<RuntimeOverview | null>(null);
  const available = plans.filter((plan) => plan.kind === "periodic");
  const query = search.trim().toLocaleLowerCase();
  const filtered = available.filter((plan) =>
    `${plan.title} ${plan.id} ${plan.handler}`
      .toLocaleLowerCase()
      .includes(query),
  );
  const selected = available.find((plan) => plan.id === taskId);
  const parameterSchema = asRecord(selected?.parameters_schema);
  const hasParameters = Object.keys(parameterSchema).length > 0;
  const ready =
    selected?.enabled &&
    selected.available &&
    parametersValid &&
    checkTaskParameters(parameterSchema, parameters).length === 0;
  const chooseTask = (next: string) => {
    const plan = available.find((item) => item.id === next);
    const schema = asRecord(plan?.parameters_schema);
    const values = initialTaskParameters(
      schema,
      asRecord(plan?.parameter_defaults),
    );
    setTaskId(next);
    setParameters(values);
    setParametersValid(checkTaskParameters(schema, values).length === 0);
  };
  const close = () => {
    if (!request.busy) setClosing(true);
  };
  return (
    <Modal
      title="手动触发 Worker 任务"
      className={styles.dialog}
      onClose={close}
      closing={closing}
      onExited={() => {
        if (result) onSubmitted(result, taskId);
        else onClose();
      }}
    >
      <Form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          if (!ready || request.busy) return;
          void request.submit(taskId, parameters).then((overview) => {
            if (!overview) return;
            setResult(overview);
            setClosing(true);
          });
        }}
      >
        <p className={styles.hint}>
          <UiText text="选择已注册的有限任务，加入队列后由 Worker 执行。" />
        </p>
        <FormField id={`${id}-search`} label="搜索任务名称或函数" icon="search">
          <TextField
            id={`${id}-search`}
            value={search}
            placeholder={t("任务名称、函数注册名或任务 ID")}
            maxLength={200}
            disabled={request.busy}
            onChange={(event) => {
              setSearch(event.target.value);
              chooseTask("");
            }}
          />
        </FormField>
        <div className={styles.field}>
          <span>
            <UiText text="注册任务" />
            <span className={styles.required} aria-hidden="true">
              {" "}
              *
            </span>
          </span>
          <Select
            name="manual-worker-task"
            label="注册任务"
            value={taskId}
            onValueChange={chooseTask}
            disabled={request.busy || !filtered.length}
            options={[
              { value: "", label: t("选择 Worker 任务"), disabled: true },
              ...filtered.map((plan) => ({
                value: plan.id,
                label: `${plan.title} · ${plan.handler || plan.id}${!plan.available ? ` · ${t("不可用")}` : !plan.enabled ? ` · ${t("未启用")}` : ""}`,
                disabled: !plan.enabled || !plan.available,
              })),
            ]}
          />
          {!filtered.length && (
            <small>
              <UiText text="没有匹配的 Worker 任务。" />
            </small>
          )}
        </div>
        {selected && (
          <dl className={styles.details}>
            <div>
              <dt>
                <UiText text="任务名称" />
              </dt>
              <dd>{selected.title}</dd>
            </div>
            <div>
              <dt>
                <UiText text="函数注册名" />
              </dt>
              <dd>
                <code>{selected.handler || "—"}</code>
              </dd>
            </div>
            <div>
              <dt>
                <UiText text="任务 ID" />
              </dt>
              <dd>
                <code>{selected.id}</code>
              </dd>
            </div>
          </dl>
        )}
        {selected && hasParameters && (
          <TaskParameters
            key={selected.id}
            schema={parameterSchema}
            value={parameters}
            disabled={request.busy}
            onChange={(value, valid) => {
              setParameters(value);
              setParametersValid(valid);
            }}
          />
        )}
        <p className={styles.hint}>
          <UiText text="相同参数的活动执行会继续跟踪；参数不同则需等待原执行结束。" />
        </p>
        {request.error && (
          <p className={styles.error} role="alert">
            <UiText text={request.error} />
          </p>
        )}
        <footer className={styles.actions}>
          <Button
            className="admin-button"
            disabled={request.busy}
            onClick={close}
          >
            <UiText text="取消" />
          </Button>
          <Button
            type="submit"
            className="admin-button admin-button-primary"
            disabled={!ready || request.busy}
          >
            <Icon name={request.busy ? "refresh" : "play"} />
            <UiText text={request.busy ? "正在加入队列…" : "加入队列"} />
          </Button>
        </footer>
      </Form>
    </Modal>
  );
}
