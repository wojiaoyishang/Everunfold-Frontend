"use client";
import { randomUUID } from "@/core/browser/crypto";
import * as Y from "yjs";
import {
  acquireHtmlSource,
  renewHtmlSource,
  releaseHtmlSource,
  applyHtmlSource,
} from "@/generated/collaboration-client";
import type {
  SourceAcquired,
  SourceApply,
  SourceState,
} from "@/generated/collaboration-contract";
import { RequestError } from "@/core/http/request";

interface SourceHost {
  id: string;
  doc: Y.Doc;
  cutoff: () => Promise<number>;
  notify: () => void;
  applyOwn: (payload: string, seq: number) => void;
}
/** Staged HTML is per verified account, document and browser tab, separate from published content. */
export class SourceEditing {
  states = new Map<string, SourceState>();
  readonly held = new Set<string>();
  readonly observed = new Set<string>();
  readonly opened = new Set<string>();
  readonly drafts = new Map<string, string>();
  private pending = new Map<string, SourceApply>();
  private key: string;
  constructor(
    private host: SourceHost,
    private base: string,
    private csrf: string,
    user: string,
  ) {
    this.key = `everunfold-source:${base}:${user}:${host.id}`;
    try {
      const saved: unknown = JSON.parse(
        sessionStorage.getItem(this.key) ?? "{}",
      );
      if (saved && typeof saved === "object")
        for (const [id, html] of Object.entries(saved))
          if (typeof html === "string" && html.length <= 100000)
            this.drafts.set(id, html);
    } catch {
      /* Storage availability is checked again on the first edit. */
    }
  }
  get staged() {
    return new Set([...this.opened, ...this.drafts.keys()]).size;
  }
  accept(states: SourceState[]) {
    this.states = new Map(states.map((s) => [s.block_id, s]));
    this.host.notify();
  }
  version(id: string) {
    return this.states.get(id)?.generation ?? 0;
  }
  locked(id: string) {
    const state = this.states.get(id);
    return Boolean(
      state?.expires_at && Date.parse(state.expires_at) > Date.now(),
    );
  }
  setDraft(id: string, html: string) {
    this.drafts.set(id, html);
    this.store();
    this.host.notify();
  }
  private store() {
    sessionStorage.setItem(
      this.key,
      JSON.stringify(Object.fromEntries(this.drafts)),
    );
  }
  async acquire(id: string): Promise<SourceAcquired> {
    await this.host.cutoff();
    const { data } = await acquireHtmlSource(
      this.base,
      { id: this.host.id, block_id: id, client_id: this.host.doc.clientID },
      this.csrf,
    );
    this.opened.add(id);
    this.host.notify();
    return data;
  }
  async renew(id: string, lease: string) {
    await renewHtmlSource(
      this.base,
      { id: this.host.id, block_id: id, lease_id: lease },
      this.csrf,
    );
  }
  async release(id: string, lease: string, discard = true) {
    if (this.pending.has(id))
      throw new Error("请先重试并确认上次应用的结果，源码仍已保留。");
    await releaseHtmlSource(
      this.base,
      { id: this.host.id, block_id: id, lease_id: lease },
      this.csrf,
    );
    this.opened.delete(id);
    if (discard) this.drafts.delete(id);
    this.store();
    this.host.notify();
  }
  async apply(id: string, lease: SourceAcquired, html: string) {
    const input = this.pending.get(id) ?? {
      id: this.host.id,
      block_id: id,
      lease_id: lease.lease_id,
      operation_id: randomUUID(),
      expected_hash: lease.expected_hash,
      html,
    };
    this.pending.set(id, input);
    this.held.add(input.operation_id);
    try {
      const { data } = await applyHtmlSource(this.base, input, this.csrf);
      const previous = this.states.get(id);
      this.states.set(id, {
        block_id: id,
        generation: Math.max(previous?.generation ?? 0, data.generation),
        expires_at: null,
        client_id: null,
      });
      this.host.applyOwn(data.payload, data.committed_seq);
    } catch (error) {
      if (!this.observed.has(input.operation_id)) {
        if (
          error instanceof RequestError &&
          error.kind === "http" &&
          (error.status ?? 500) < 500
        ) {
          this.pending.delete(id);
          this.held.delete(input.operation_id);
        }
        throw new Error(
          error instanceof RequestError && error.status === 409
            ? "正文或源码编辑权已变化。请下载本地源码，重新获取后对照合并。"
            : "尚未确认应用结果，请重试。源码已保留，请勿关闭页面。",
        );
      }
    }
    this.pending.delete(id);
    this.held.delete(input.operation_id);
    this.observed.delete(input.operation_id);
    this.opened.delete(id);
    this.drafts.delete(id);
    this.store();
    this.host.notify();
  }
  hasPending(id: string) {
    return this.pending.has(id);
  }
}
