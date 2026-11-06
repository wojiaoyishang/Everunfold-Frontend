"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  readAccountAvatars,
  uploadAccountAvatar,
} from "@/core/contracts/accounts";
import type {
  AvatarCatalog,
  AvatarItem,
  AvatarUpload,
  AvatarPolicyState,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { UploadQueue, InvalidUpload } from "@/core/media/upload-queue";
import { randomUUID } from "@/core/browser/crypto";
import { RequestError } from "@/core/http/request";
import { accountFailure } from "./use-action";

class AvatarUploadRules {
  private limit: number | undefined;
  update(policy: AvatarPolicyState) {
    this.limit = policy.max_bytes ?? 2097152;
  }
  prepare = async (file: File) => {
    if (this.limit === undefined)
      throw new InvalidUpload("请等待头像图库读取完成。");
    if (!/\.(jpe?g|png|webp)$/i.test(file.name))
      throw new InvalidUpload("请选择静态 JPG、PNG 或 WebP 图片。");
    if (file.size > this.limit)
      throw new InvalidUpload("头像文件超过当前上传限制。");
    return { file, metadata: { upload_id: randomUUID(), filename: file.name } };
  };
}

export function useAvatarLibrary() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [catalog, setCatalog] = useState<AvatarCatalog | null>(null);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  const rules = useMemo(() => new AvatarUploadRules(), []);
  useEffect(() => {
    const request = new AbortController();
    readAccountAvatars(baseUrl, { signal: request.signal })
      .then(({ data }) => {
        if (!request.signal.aborted) {
          rules.update(data.policy);
          setCatalog(data);
          setError("");
        }
      })
      .catch((failure) => {
        if (!request.signal.aborted) setError(accountFailure(failure));
      });
    return () => request.abort();
  }, [baseUrl, csrfToken, version, rules]);
  const queue = useMemo(
    () =>
      new UploadQueue<AvatarItem, { file: File; metadata: AvatarUpload }>({
        prepare: rules.prepare,
        send: async (payload, signal, onUploadProgress) => {
          try {
            return (
              await uploadAccountAvatar(
                baseUrl,
                payload.metadata,
                payload.file,
                csrfToken,
                { signal, onUploadProgress, timeoutMs: 60000 },
              )
            ).data;
          } catch (failure) {
            if (
              failure instanceof RequestError &&
              failure.status &&
              [409, 413, 422, 429].includes(failure.status)
            )
              throw new InvalidUpload(accountFailure(failure));
            throw failure;
          }
        },
        completed: () => setVersion((value) => value + 1),
        rejected: "头像上传未完成，请检查格式与限制。",
      }),
    [baseUrl, csrfToken, rules],
  );
  useEffect(() => {
    queue.start();
    return () => queue.dispose();
  }, [queue]);
  const uploads = useSyncExternalStore(
    queue.subscribe,
    queue.snapshot,
    queue.snapshot,
  );
  return {
    catalog,
    error,
    queue,
    uploads,
    refresh: () => setVersion((value) => value + 1),
  };
}
