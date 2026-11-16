import "server-only";
import { cache } from "react";
import { readPageConfiguration } from "@/core/config/server";
import {
  readGlossaryDetail,
  type GlossaryContract,
} from "@/core/contracts/glossary";
import { RequestError } from "@/core/http/request";

type GlossaryDetail = GlossaryContract["public_detail"]["data"];

export type GlossaryRead =
  | { status: "ready"; term: GlossaryDetail }
  | { status: "missing" | "unavailable" | "plugin-sync" };

export const readPublicGlossaryTerm = cache(
  async (slug: string, language: string): Promise<GlossaryRead> => {
    const config = readPageConfiguration();
    try {
      const response = await readGlossaryDetail(
        config.backend.baseUrl,
        slug,
        language,
        {
          timeoutMs: config.backend.requestTimeoutSeconds * 1000,
        },
      );
      return { status: "ready", term: response.data };
    } catch (error) {
      if (error instanceof RequestError) {
        if (error.status === 404) return { status: "missing" };
        if (error.status === 503 && error.code === 50389)
          return { status: "plugin-sync" };
      }
      return { status: "unavailable" };
    }
  },
);
