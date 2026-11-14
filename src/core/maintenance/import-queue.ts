"use client";

import {
  previewMaintenanceImport,
  validateMaintenanceImportRequest,
  type MaintenanceBundle,
  type MaintenancePreview,
} from "@/core/contracts/maintenance";
import { uploadTransport } from "@/core/http/upload-transport";
import { InvalidUpload, UploadQueue } from "@/core/media/upload-queue";

export interface ImportPlan {
  bundle: MaintenanceBundle;
  preview: MaintenancePreview;
}

export function maintenanceImportQueue(baseUrl: string, csrfToken: string) {
  return new UploadQueue<ImportPlan, MaintenanceBundle>(
    {
      async prepare(file) {
        if (file.size > 16 * 1024 * 1024)
          throw new InvalidUpload("数据包不能超过 16 MiB。");
        let bundle: unknown;
        try {
          bundle = JSON.parse(await file.text());
        } catch {
          throw new InvalidUpload("请选择有效的 Everunfold JSON 数据包。");
        }
        const request = { bundle };
        if (!validateMaintenanceImportRequest(request))
          throw new InvalidUpload("数据包格式或版本不受支持。");
        return request.bundle;
      },
      async send(bundle, signal, onUploadProgress) {
        const { data } = await previewMaintenanceImport(
          baseUrl,
          { bundle },
          csrfToken,
          {
            signal,
            timeoutMs: 60000,
            fetcher: uploadTransport(onUploadProgress),
          },
        );
        return { bundle, preview: data };
      },
      completed: () => {},
      rejected: "无法预览此数据包，请检查文件。",
    },
    1,
  );
}
