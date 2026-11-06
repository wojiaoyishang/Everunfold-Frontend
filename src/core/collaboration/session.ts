import { randomUUID } from "@/core/browser/crypto";
import * as Y from "yjs";
import { ySyncPluginKey } from "@tiptap/y-tiptap";
import {
  Awareness,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import type { DraftFields } from "@/core/contracts/content-admin";
import type {
  ClientUpdate,
  Peer,
  ServerFrame,
  PresenceInput,
  MediaURL,
  MergeLock,
  BranchUpload,
} from "@/core/contracts/collaboration";
import { createCollaborationTicket } from "@/core/contracts/collaboration";
import { RequestError } from "@/core/http/request";
import {
  applyFields,
  blockText,
  createScratch,
  makeBlock,
  fromBase64,
  LOCAL,
  projectDocument,
  REMOTE,
  SOURCE_OWN,
  toBase64,
  removedBlocks,
} from "./document";
import { openLocalDocument } from "./local-store";
import { readServerFrame } from "./wire";
import { commandDocument } from "./block-commands";
import type { BlockCommand } from "@/core/editor/block-commands";
import { SourceEditing } from "./source-editing";
import {
  newLocalBranch,
  privateDraftFields,
  writeLocalBranch,
  listLocalBranches,
  type LocalBranch,
  branchTimestamp,
} from "./branches";
import { sourceSplice } from "@/core/editor/source-lines";
import { capturedSourceRange } from "@/core/editor/captured-source-range";
import { hasUploadMarkers } from "@/core/editor/upload-placeholders";
import type { SharedSource } from "./editor-binding";
import { pageIdentity } from "./page-identity";

export const browserDraftStorage = {
  open: openLocalDocument,
  writeBranch: writeLocalBranch,
  listBranches: listLocalBranches,
};

export type CollaborationStatus = {
  phase: "connecting" | "ready" | "offline" | "stopped";
  mode: "shared" | "paused" | "local" | "review";
  ready: boolean;
  pending: number;
  seq: number;
  documentVersion: number;
  error: string;
  local: boolean;
  localSaving: boolean;
  peers: Peer[];
  sourceStaged: number;
  merge: MergeLock | null;
  branchId: string | null;
};
function makeUndo(doc: Y.Doc) {
  return new Y.UndoManager(
    [doc.getMap("meta"), doc.getMap("blocks"), doc.getArray("order")],
    {
      trackedOrigins: new Set([LOCAL, SOURCE_OWN, ySyncPluginKey]),
      captureTimeout: 500,
    },
  );
}

/** A live head and its server-confirmed replica are kept separate from detached drafts. */
export class DraftSession {
  doc = new Y.Doc();
  awareness = new Awareness(this.doc);
  undo = makeUndo(this.doc);
  sources: SourceEditing;
  readonly scope: string;
  readonly pageId: string;
  state: CollaborationStatus = {
    phase: "connecting",
    mode: "shared",
    ready: false,
    pending: 0,
    seq: 0,
    documentVersion: 0,
    error: "",
    local: true,
    localSaving: false,
    peers: [],
    sourceStaged: 0,
    merge: null,
    branchId: null,
  };
  epoch = "";
  mediaUrls: Record<string, MediaURL> = {};
  private confirmed = new Y.Doc();
  private template: DraftFields | undefined;
  private confirmedSeq = 0;
  private pending: ClientUpdate[] = [];
  private unconfirmed = new Map<string, ClientUpdate>();
  private acknowledged: Record<string, number> = {};
  private branch: LocalBranch | null = null;
  private frozen: BranchUpload | null = null;
  private vault: Awaited<ReturnType<typeof openLocalDocument>> | null = null;
  private chain = Promise.resolve();
  private writes = 0;
  private socket: WebSocket | null = null;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private flushTimer: ReturnType<typeof setTimeout> | undefined;
  private presenceTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private connection = false;
  private inFlight: string | null = null;
  private highestAck = 0;
  private revision = 0;
  private lastMessageAt = 0;
  private sentAt = 0;
  private clocks = new Map<number, number>();
  private authAbort: AbortController | null = null;
  private resetting = false;
  private bindings = new Map<string, SharedSource>();
  binding(blockId: string) {
    if (!this.state.ready) return undefined;
    let binding = this.bindings.get(blockId);
    if (!binding) {
      binding = {
        text: blockText(this.doc, blockId),
        awareness: this.awareness,
        undo: this.undo,
        blockId,
        host: this,
      };
      this.bindings.set(blockId, binding);
    }
    return binding;
  }
  registerLocator(locator: typeof this.onLocate) {
    this.onLocate = locator;
    return () => {
      if (this.onLocate === locator) this.onLocate = () => false;
    };
  }
  onChange: () => void = () => {};
  onRevision: (revision: number) => void = () => {};
  onLocate: (range: {
    blockId: string;
    start: number;
    end: number;
  }) => boolean = () => false;
  locatePeer(peer: Peer) {
    const range = this.peerRange(peer);
    return Boolean(range && this.onLocate(range));
  }
  private wake = () => {
    if (!this.connection && this.state.mode === "shared") void this.connect();
  };

  constructor(
    private baseUrl: string,
    private csrf: string,
    readonly id: string,
    private userId: string,
    initial?: DraftFields,
    private storage = browserDraftStorage,
  ) {
    this.template = initial;
    this.scope = `${baseUrl}|${userId}|${id}`;
    const key = `everunfold-editor-page:${this.scope}`;
    let pageId = randomUUID();
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as
        PerformanceNavigationTiming | undefined;
      const identity = pageIdentity(
        sessionStorage.getItem(key),
        performance.timeOrigin,
        navigation?.type,
        pageId,
      );
      pageId = identity.id;
      sessionStorage.setItem(key, JSON.stringify(identity));
    } catch {
      /* IDB failure is reported separately. */
    }
    this.pageId = pageId;
    this.sources = this.makeSources();
    this.bind();
    window.addEventListener("online", this.wake);
  }
  private makeSources() {
    return new SourceEditing(
      {
        id: this.id,
        doc: this.doc,
        cutoff: () => this.cutoff(),
        notify: () => this.publish(),
        applyOwn: (payload, seq) => {
          Y.applyUpdate(this.doc, fromBase64(payload), SOURCE_OWN);
          this.highestAck = Math.max(this.highestAck, seq);
          void this.persist();
          this.publish();
        },
      },
      this.baseUrl,
      this.csrf,
      this.userId,
    );
  }
  private bind() {
    this.awareness.setLocalState({});
    this.doc.on("update", this.changed);
    this.awareness.on("change", this.presenceChanged);
  }
  get canEdit() {
    return (
      this.state.ready &&
      this.state.phase !== "stopped" &&
      (this.state.mode === "local" ||
        (this.state.mode === "shared" &&
          this.state.phase === "ready" &&
          !this.state.merge))
    );
  }
  get currentBranch() {
    return this.branch;
  }
  get currentFields() {
    return this.template && this.state.ready
      ? projectDocument(this.doc, this.template)
      : undefined;
  }
  get confirmedFields() {
    return this.template && this.confirmed.getMap("meta").size
      ? projectDocument(this.confirmed, this.template)
      : undefined;
  }
  async prepareNavigation() {
    if (this.branch) this.refreshBranch();
    await this.persist();
    if (!this.state.local)
      throw new Error("本地保存失败，请导出草稿后再离开。");
  }
  project(privateFields: DraftFields) {
    this.template = privateFields;
    return projectDocument(this.doc, privateFields);
  }
  removedBlocks(fields: DraftFields) {
    return removedBlocks(this.doc, fields);
  }
  setFields(fields: DraftFields, previous: DraftFields) {
    if (this.canEdit || (this.state.ready && this.state.mode !== "shared"))
      applyFields(this.doc, fields, previous, true);
  }
  setSource(id: string, value: string, previous: string) {
    if (!this.canEdit && !(this.state.ready && this.state.mode !== "shared"))
      return;
    const text = blockText(this.doc, id),
      current = text.toString();
    const change = sourceSplice(previous, value);
    const range = capturedSourceRange(previous, current, {
      start: change.from,
      end: change.to,
    });
    if (!range) {
      const fields = this.template && this.project(this.template);
      if (fields) {
        this.detachFields(
          {
            ...fields,
            body: fields.body.map((block) =>
              block.id === id ? { ...block, content: value } : block,
            ),
          },
          "重叠编辑恢复草稿",
          { review_blocks: [id] },
        );
        this.publish({
          error: "这处内容同时发生修改，输入已保留为本地草稿，请比较后合并。",
        });
      }
      return;
    }
    this.doc.transact(() => {
      text.delete(range.start, range.end - range.start);
      text.insert(range.start, change.insert);
    }, LOCAL);
  }
  commandBlock(fields: DraftFields, command: BlockCommand) {
    if (!this.canEdit) return false;
    this.undo.stopCapturing();
    const changed = commandDocument(this.doc, fields, command, true);
    this.undo.stopCapturing();
    return changed;
  }
  private publish(patch: Partial<CollaborationStatus> = {}) {
    this.state = {
      ...this.state,
      ...patch,
      pending: this.pending.length,
      sourceStaged: this.sources?.staged ?? 0,
      branchId: this.branch?.id ?? null,
    };
    if (!this.disposed) this.onChange();
  }
  private changed = (update: Uint8Array, origin: unknown) => {
    this.state.documentVersion++;
    if (
      this.resetting ||
      origin === REMOTE ||
      origin === SOURCE_OWN ||
      !this.state.ready
    )
      return;
    if (this.state.mode === "local") {
      this.refreshBranch(true);
      void this.persist();
      this.publish();
      return;
    }
    if (this.state.mode === "paused" || this.state.mode === "review") {
      // A lock can arrive during IME composition. Its final transaction belongs
      // to recovery, even though ordinary editing has already been disabled.
      const payload = this.frozen ?? this.candidate();
      if (!this.branch && payload)
        this.branch = newLocalBranch(this.scope, payload);
      this.refreshBranch(true);
      this.publish({
        error: "暂停时的最后输入已保留为本地草稿，请比较后合并。",
      });
      void this.persist();
      return;
    }
    if (!this.canEdit) {
      this.freeze("编辑已暂停，输入已保留。");
      return;
    }
    const next: ClientUpdate = {
      type: "update",
      epoch: this.epoch,
      update_id: randomUUID(),
      payload: toBase64(update),
      rich_versions: {},
    };
    this.pending.push(next);
    this.unconfirmed.set(next.update_id, next);
    this.publish();
    clearTimeout(this.flushTimer);
    this.flushTimer = setTimeout(() => {
      this.compactPending();
      void this.persist().then(() => this.flush());
    }, 120);
    void this.persist();
  };
  private compactPending() {
    if (this.inFlight || this.pending.length < 2) return;
    const prior = this.pending;
    const next: ClientUpdate = {
      type: "update",
      epoch: this.epoch,
      update_id: randomUUID(),
      payload: toBase64(
        Y.mergeUpdates(prior.map((u) => fromBase64(u.payload))),
      ),
      rich_versions: {},
    };
    for (const item of prior) {
      this.acknowledged[item.update_id] = 0;
      this.unconfirmed.delete(item.update_id);
    }
    this.pending = [next];
    this.unconfirmed.set(next.update_id, next);
  }
  private persist() {
    const detached = this.state.mode !== "shared";
    const snapshot = {
      epoch: this.epoch,
      state: Y.encodeStateAsUpdate(detached ? this.confirmed : this.doc),
      confirmed: Y.encodeStateAsUpdate(this.confirmed),
      seq: this.confirmedSeq,
      pending: [...this.pending],
      unconfirmed: [...this.unconfirmed.values()],
      acknowledged: { ...this.acknowledged },
      mode: this.state.mode,
      branchId: this.branch?.id,
      writtenAt: Date.now(),
    };
    const branch = this.branch ? structuredClone(this.branch) : null;
    this.writes++;
    this.publish({ localSaving: true });
    this.chain = this.chain
      .then(async () => {
        if (branch) await this.storage.writeBranch(branch);
        if (this.vault && snapshot.epoch) await this.vault.write(snapshot);
      })
      .catch(() =>
        this.publish({
          local: false,
          error: "本地保存失败，请立即导出当前草稿。",
        }),
      )
      .finally(() => {
        this.writes--;
        if (!this.writes) this.publish({ localSaving: false });
      });
    return this.chain;
  }
  private clearVault() {
    this.chain = this.chain
      .then(async () => {
        await this.vault?.clear();
      })
      .catch(() =>
        this.publish({
          local: false,
          error: "本地基线更新失败，请导出当前草稿。",
        }),
      );
  }
  async start() {
    try {
      this.vault = await this.storage.open(`${this.scope}|${this.pageId}`);
      const local = await this.vault.read();
      if (local) {
        this.epoch = local.epoch;
        this.confirmedSeq = local.seq ?? 0;
        this.state.seq = this.confirmedSeq;
        Y.applyUpdate(this.doc, local.state, REMOTE);
        if (local.confirmed)
          Y.applyUpdate(this.confirmed, local.confirmed, REMOTE);
        this.pending = local.pending;
        this.unconfirmed = new Map(
          (local.unconfirmed ?? local.pending).map((u) => [u.update_id, u]),
        );
        this.acknowledged = local.acknowledged ?? {};
        this.state.ready = Boolean(this.doc.getMap("meta").size);
        if (local.branchId)
          this.branch =
            (await this.storage.listBranches(this.scope)).find(
              (b) => b.id === local.branchId,
            ) ?? null;
        if (this.branch) {
          this.replaceLive(this.branchDocument(this.branch));
          this.publish({
            mode: local.mode === "local" ? "local" : "review",
            ready: true,
          });
        } else if (this.pending.length || this.unconfirmed.size)
          this.freeze("已恢复上次未确认的输入，请重新连接并比较版本。");
      } else await this.restoreLegacy();
    } catch {
      this.publish({ local: false, error: "本地草稿存储不可用，请及时导出。" });
    }
    if (!this.disposed) void this.connect();
  }
  private async restoreLegacy() {
    if (!this.template) return;
    const vault = await this.storage.open(this.scope);
    let legacy;
    try {
      legacy = await vault.read();
    } finally {
      vault.close();
    }
    if (!legacy?.pending.length) return;
    const doc = new Y.Doc();
    try {
      Y.applyUpdate(doc, legacy.state, REMOTE);
      const fields = privateDraftFields(projectDocument(doc, this.template));
      const entries = await this.storage.listBranches(this.scope);
      this.branch =
        entries.find(
          (entry) =>
            entry.payload.note === "旧编辑器恢复草稿" &&
            entry.payload.base_epoch === legacy.epoch &&
            JSON.stringify(entry.payload.fields) === JSON.stringify(fields),
        ) ??
        newLocalBranch(this.scope, {
          id: this.id,
          note: "旧编辑器恢复草稿",
          base_epoch: legacy.epoch,
          base_seq: 0,
          fields,
          updates: legacy.pending.map(({ update_id, payload }) => ({
            update_id,
            payload,
          })),
        });
      this.branch.removedBlocks = removedBlocks(doc, fields);
      await this.storage.writeBranch(this.branch);
      this.epoch = legacy.epoch;
      this.replaceLive(this.branchDocument(this.branch));
      this.publish({
        ready: true,
        mode: "review",
        error: "旧编辑器未确认的输入已保留为草稿，请比较后合并。",
      });
    } finally {
      doc.destroy();
    }
  }
  private async connect() {
    if (this.disposed || this.connection || this.state.phase === "stopped")
      return;
    this.connection = true;
    this.publish({ phase: "connecting" });
    try {
      this.authAbort = new AbortController();
      const { data } = await createCollaborationTicket(
        this.baseUrl,
        { id: this.id, source_first: true },
        this.csrf,
        { signal: this.authAbort.signal },
      );
      if (this.disposed) return;
      if (this.epoch && this.epoch !== data.epoch) {
        if (this.pending.length || this.unconfirmed.size)
          this.freeze("服务器已有合并后的新版本，输入已保留为本地草稿。");
        this.confirmed.destroy();
        this.confirmed = new Y.Doc();
        this.clearVault();
      }
      this.epoch = data.epoch;
      const url = new URL(data.ws_path, this.baseUrl);
      url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
      if (url.host !== new URL(this.baseUrl).host || url.search || url.hash)
        throw new Error("协同地址无效");
      const socket = new WebSocket(url);
      this.socket = socket;
      socket.onopen = () =>
        socket.send(
          JSON.stringify({
            type: "auth",
            ticket: data.ticket,
            client_id: this.doc.clientID,
            state_vector: toBase64(Y.encodeStateVector(new Y.Doc())),
          }),
        );
      socket.onmessage = (event) => {
        try {
          this.lastMessageAt = Date.now();
          this.receive(readServerFrame(String(event.data)));
        } catch {
          this.stop("同步数据无效，请导出当前草稿。");
        }
      };
      socket.onclose = () => {
        if (this.socket === socket) this.disconnected();
      };
      socket.onerror = () => socket.close();
      this.lastMessageAt = Date.now();
      this.heartbeat = setInterval(() => {
        if (
          Date.now() - this.lastMessageAt > 10000 ||
          (this.inFlight && Date.now() - this.sentAt > 8000)
        )
          socket.close();
        this.sendPresence();
      }, 2500);
    } catch (error) {
      if (
        error instanceof RequestError &&
        [401, 403, 404].includes(error.status ?? 0)
      )
        this.stop("登录、权限或草稿状态已变化，请导出本地内容后重新登录检查。");
      else this.disconnected();
    }
  }
  private receive(frame: ServerFrame) {
    if (frame.media_urls) this.mediaUrls = frame.media_urls;
    if (frame.type === "sync" || frame.type === "reset") {
      if (!frame.payload || frame.committed_seq == null || !frame.epoch)
        throw new Error("版本不符");
      if (frame.type === "reset") {
        if (this.pending.length || this.unconfirmed.size)
          this.freeze("最新版已完成合并，尚未确认的输入已保存为恢复草稿。");
        this.confirmed.destroy();
        this.confirmed = new Y.Doc();
        this.clearVault();
      }
      this.epoch = frame.epoch;
      Y.applyUpdate(this.confirmed, fromBase64(frame.payload), REMOTE);
      this.confirmedSeq = frame.committed_seq;
      this.state.seq = frame.committed_seq;
      this.highestAck = frame.committed_seq;
      if (!this.branch) {
        this.pending = [];
        this.unconfirmed.clear();
        this.inFlight = null;
        this.replaceLive(this.copyConfirmed());
      }
      this.setRevision(frame.revision ?? 0);
      this.publish({
        ready: true,
        phase: "ready",
        mode: this.branch
          ? this.state.mode === "local"
            ? "local"
            : "review"
          : "shared",
        merge: frame.merge ?? null,
        error: this.state.local ? "" : this.state.error,
      });
      void this.persist();
    } else if (
      frame.type === "update" &&
      frame.payload &&
      frame.committed_seq != null
    ) {
      if (frame.committed_seq <= this.confirmedSeq) return;
      if (frame.committed_seq !== this.confirmedSeq + 1)
        throw new Error("更新序号不连续");
      const payload = fromBase64(frame.payload);
      Y.applyUpdate(this.confirmed, payload, REMOTE);
      if (this.state.mode === "shared")
        Y.applyUpdate(this.doc, payload, REMOTE);
      this.confirmedSeq = frame.committed_seq;
      if (frame.update_id) this.unconfirmed.delete(frame.update_id);
      this.publish({ seq: frame.committed_seq });
      void this.persist();
    } else if (
      frame.type === "ack" &&
      frame.update_id &&
      frame.committed_seq != null
    ) {
      this.highestAck = Math.max(this.highestAck, frame.committed_seq);
      this.acknowledged[frame.update_id] = frame.committed_seq;
      this.pending = this.pending.filter(
        (u) => u.update_id !== frame.update_id,
      );
      if (this.inFlight === frame.update_id) this.inFlight = null;
      this.publish();
      void this.persist().then(() => this.flush());
    } else if (frame.type === "control") {
      if (frame.epoch && frame.epoch !== this.epoch) return;
      const merge = frame.merge ?? null;
      if (merge && !this.state.merge)
        this.freeze("正在合并版本，最新版暂时只读。你的未确认输入已保留。");
      this.publish({ merge });
      if (
        !merge &&
        this.state.mode === "paused" &&
        !this.branch &&
        this.state.phase === "ready"
      )
        this.returnToLatest();
    } else if (frame.type === "sources")
      this.sources.accept(frame.sources ?? []);
    else if (frame.type === "peers") {
      const peers = frame.peers ?? [];
      if (JSON.stringify(peers) !== JSON.stringify(this.state.peers)) {
        this.applyPeers(peers);
        this.publish({ peers });
      }
    } else if (frame.type === "media") this.publish();
    else if (frame.type === "revision") {
      this.highestAck = Math.max(
        this.highestAck,
        frame.committed_seq ?? this.state.seq,
      );
      this.setRevision(frame.revision ?? 0);
    } else if (frame.type === "error") {
      if (frame.code === 40980 || frame.code === 40970)
        this.freeze(frame.msg ?? "最新版已变化，输入已保留为恢复草稿。");
      else if ((frame.code ?? 0) >= 50000 || frame.code === 42970)
        this.socket?.close();
      else this.stop(frame.msg ?? "同步已停止，请导出当前草稿。");
    }
  }
  private copyConfirmed() {
    const doc = new Y.Doc();
    Y.applyUpdate(doc, Y.encodeStateAsUpdate(this.confirmed), REMOTE);
    return doc;
  }
  private replaceLive(next: Y.Doc) {
    this.resetting = true;
    const old = this.doc,
      clientId = old.clientID;
    old.off("update", this.changed);
    this.awareness.off("change", this.presenceChanged);
    this.awareness.destroy();
    this.undo.destroy();
    next.clientID = clientId;
    this.doc = next;
    this.bindings.clear();
    this.awareness = new Awareness(next);
    this.undo = makeUndo(next);
    this.sources = this.makeSources();
    this.bind();
    this.state.documentVersion++;
    this.resetting = false;
    // React releases editor bindings during its next effect cleanup.
    setTimeout(() => old.destroy(), 0);
  }
  private setRevision(value: number) {
    if (value > this.revision) {
      this.revision = value;
      this.onRevision(value);
    }
  }
  private flush() {
    if (
      this.disposed ||
      this.inFlight ||
      !this.canEdit ||
      this.state.mode !== "shared" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    if (this.template && hasUploadMarkers(this.project(this.template).body))
      return;
    this.compactPending();
    const next = this.pending[0];
    if (!next) return;
    // Persist the exact update identifier before it can be accepted remotely.
    void this.persist().then(() => {
      if (
        this.inFlight ||
        !this.canEdit ||
        this.state.mode !== "shared" ||
        this.socket?.readyState !== WebSocket.OPEN ||
        !this.pending.some((u) => u.update_id === next.update_id)
      )
        return;
      this.inFlight = next.update_id;
      this.sentAt = Date.now();
      this.socket.send(JSON.stringify(next));
    });
  }
  async cutoff() {
    this.compactPending();
    this.flush();
    await this.persist();
    const deadline = Date.now() + 12000;
    while (this.pending.length || this.confirmedSeq < this.highestAck) {
      if (
        this.disposed ||
        this.state.phase !== "ready" ||
        this.state.mode !== "shared" ||
        this.state.merge ||
        Date.now() > deadline
      )
        throw new Error("请等待同步完成，或先处理本地草稿与合并状态。");
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    if (
      this.state.phase !== "ready" ||
      this.state.mode !== "shared" ||
      this.state.merge
    )
      throw new Error("当前不能提交最新版，输入已保留。");
    return this.confirmedSeq;
  }
  private candidate(note = "离线恢复草稿"): BranchUpload | null {
    if (!this.template || !this.confirmed.getMap("meta").size) return null;
    return {
      id: this.id,
      branch_id: randomUUID(),
      note,
      base_epoch: this.epoch,
      base_seq: this.confirmedSeq,
      base_revision: this.revision || undefined,
      fields: privateDraftFields(this.project(this.template)),
      updates: [...this.unconfirmed.values()].map(({ update_id, payload }) => ({
        update_id,
        payload,
      })),
    };
  }
  private freeze(error: string) {
    if (this.disposed || this.state.phase === "stopped") return;
    if (this.state.mode === "shared") {
      this.frozen = this.candidate();
      if ((this.pending.length || this.unconfirmed.size) && this.frozen)
        this.branch = newLocalBranch(this.scope, this.frozen);
      if (this.branch && this.template)
        this.branch.removedBlocks = this.removedBlocks(
          this.project(this.template),
        );
    }
    this.inFlight = null;
    this.publish({
      mode: this.branch && this.state.mode === "local" ? "local" : "paused",
      error,
    });
    clearTimeout(this.flushTimer);
    void this.persist();
  }
  continueLocal() {
    if (!this.state.ready || this.state.phase === "stopped") return;
    if (!this.branch) {
      const payload = this.frozen ?? this.candidate();
      if (!payload) return;
      this.branch = newLocalBranch(this.scope, payload);
      if (this.template)
        this.branch.removedBlocks = this.removedBlocks(
          this.project(this.template),
        );
    }
    this.publish({
      mode: "local",
      error: "正在编辑独立的本地草稿，恢复后需要比较并合并版本。",
    });
    void this.persist();
  }
  private refreshBranch(fork = false) {
    if (!this.branch || !this.template) return;
    if (fork && this.branch.submitted)
      this.branch = newLocalBranch(this.scope, this.branch.payload);
    this.branch = {
      ...this.branch,
      updatedAt: branchTimestamp(),
      removedBlocks: this.removedBlocks(this.project(this.template)),
      payload: {
        ...this.branch.payload,
        fields: privateDraftFields(this.project(this.template)),
      },
    };
  }
  detachFields(
    fields: DraftFields,
    note: string,
    baseline?: Pick<
      BranchUpload,
      "base_revision" | "base_epoch" | "base_seq" | "review_blocks"
    >,
  ) {
    if (this.pending.length || this.unconfirmed.size)
      this.freeze("切换前的输入已保留为恢复草稿。");
    if (this.branch) {
      this.refreshBranch();
      void this.persist();
    }
    const payload = this.candidate(note);
    if (!payload) return;
    this.branch = newLocalBranch(this.scope, {
      ...payload,
      ...(baseline ?? {}),
      fields,
    });
    this.replaceLive(createScratch(fields, true));
    this.publish({ mode: "local", ready: true });
    void this.persist();
  }
  openBranch(branch: LocalBranch) {
    if (branch.scope !== this.scope) return;
    if (this.pending.length || this.unconfirmed.size)
      this.freeze("已保留当前未确认输入。");
    if (this.branch) {
      this.refreshBranch();
      void this.persist();
    }
    this.branch = branch;
    this.replaceLive(this.branchDocument(branch));
    this.publish({ mode: "local", ready: true, error: "正在编辑本地草稿。" });
    void this.persist();
  }
  async branchForMerge(note?: string) {
    this.refreshBranch();
    if (this.branch?.submitted && note && note !== this.branch.payload.note)
      this.branch = {
        ...newLocalBranch(this.scope, this.branch.payload),
        removedBlocks: this.branch.removedBlocks,
      };
    if (note && this.branch) this.branch.payload.note = note;
    await this.persist();
    if (!this.branch || !this.state.local)
      throw new Error("请先确认本地草稿已保存，或导出备份。");
    return this.branch.payload;
  }
  async markBranchUploaded() {
    if (this.branch) {
      this.branch.submitted = true;
      await this.persist();
    }
  }
  private branchDocument(branch: LocalBranch) {
    const doc = createScratch(branch.payload.fields, true);
    const blocks = doc.getMap<Y.Map<unknown>>("blocks");
    doc.transact(() => {
      for (const removed of branch.removedBlocks ?? []) {
        if (blocks.has(removed.id)) continue;
        const block = makeBlock(removed, true);
        blocks.set(removed.id, block);
        block.set("deleted", true);
      }
    }, REMOTE);
    return doc;
  }
  returnToLatest() {
    if (this.state.phase !== "ready" || !this.confirmed.getMap("meta").size)
      return;
    if (this.branch) this.refreshBranch();
    void this.persist();
    this.clearVault();
    this.branch = null;
    this.frozen = null;
    this.pending = [];
    this.unconfirmed.clear();
    this.inFlight = null;
    this.replaceLive(this.copyConfirmed());
    this.publish({ mode: this.state.merge ? "paused" : "shared", error: "" });
    void this.persist();
  }
  reconnect() {
    if (this.state.phase === "stopped") return;
    if (this.state.phase === "ready") {
      this.publish({
        mode: this.branch ? "review" : this.state.merge ? "paused" : "shared",
      });
      return;
    }
    this.connection = false;
    clearInterval(this.heartbeat);
    this.socket?.close();
    this.socket = null;
    void this.connect();
  }
  async followMergedHead(revision: number) {
    const old = this.socket;
    this.socket = null;
    old?.close();
    clearInterval(this.heartbeat);
    this.connection = false;
    void this.connect();
    const deadline = Date.now() + 12000;
    while (this.state.phase !== "ready" || this.revision < revision) {
      if (this.disposed || Date.now() > deadline)
        throw new Error("合并已保存，请重新连接后返回最新版。");
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    this.returnToLatest();
  }
  setPresence(blockId: string, range: { start: number; end: number }) {
    if (!this.canEdit || this.state.mode !== "shared") return;
    const text = blockText(this.doc, blockId);
    const cursor = {
      anchor: Y.createRelativePositionFromTypeIndex(
        text,
        Math.min(range.start, text.length),
      ),
      head: Y.createRelativePositionFromTypeIndex(
        text,
        Math.min(range.end, text.length),
      ),
    };
    this.awareness.setLocalState({
      ...this.awareness.getLocalState(),
      blockId,
      cursor,
    });
  }
  peerRange(peer: Peer) {
    try {
      if (!peer.cursor || !peer.block_id || this.state.mode !== "shared")
        return null;
      const text = blockText(this.doc, peer.block_id);
      const anchor = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(fromBase64(peer.cursor.anchor)),
        this.doc,
      );
      const head = Y.createAbsolutePositionFromRelativePosition(
        Y.decodeRelativePosition(fromBase64(peer.cursor.head)),
        this.doc,
      );
      if (!anchor || !head || anchor.type !== text || head.type !== text)
        return null;
      return { blockId: peer.block_id, start: anchor.index, end: head.index };
    } catch {
      return null;
    }
  }
  private presenceChanged = (_changes: unknown, origin: unknown) => {
    if (origin !== REMOTE && !this.resetting && !this.presenceTimer)
      this.presenceTimer = setTimeout(() => {
        this.presenceTimer = undefined;
        this.sendPresence();
      }, 60);
  };
  private sendPresence() {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.state.phase !== "ready"
    )
      return;
    const local =
      this.state.mode === "shared" ? this.awareness.getLocalState() : null;
    const cursor = local?.cursor;
    const presence: PresenceInput = {
      type: "presence",
      block_id: local?.blockId ?? null,
      cursor: cursor
        ? {
            anchor: toBase64(Y.encodeRelativePosition(cursor.anchor)),
            head: toBase64(Y.encodeRelativePosition(cursor.head)),
          }
        : null,
    };
    this.socket.send(JSON.stringify(presence));
  }
  private applyPeers(peers: Peer[]) {
    const visible =
      this.state.mode === "shared"
        ? peers.filter((p) => p.client_id !== this.doc.clientID)
        : [];
    const missing = [...this.awareness.getStates().keys()].filter(
      (id) =>
        id !== this.doc.clientID && !visible.some((p) => p.client_id === id),
    );
    removeAwarenessStates(this.awareness, missing, REMOTE);
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, visible.length);
    for (const peer of visible) {
      const clock = (this.clocks.get(peer.client_id) ?? 0) + 1;
      this.clocks.set(peer.client_id, clock);
      encoding.writeVarUint(encoder, peer.client_id);
      encoding.writeVarUint(encoder, clock);
      let cursor = null;
      try {
        if (peer.cursor)
          cursor = {
            anchor: Y.decodeRelativePosition(fromBase64(peer.cursor.anchor)),
            head: Y.decodeRelativePosition(fromBase64(peer.cursor.head)),
          };
      } catch {
        /* Presence is ephemeral. */
      }
      encoding.writeVarString(
        encoder,
        JSON.stringify({
          user: {
            name: peer.name,
            color: peer.color,
            colorLight: peer.color + "22",
          },
          blockId: peer.block_id,
          cursor,
        }),
      );
    }
    applyAwarenessUpdate(
      this.awareness,
      encoding.toUint8Array(encoder),
      REMOTE,
    );
  }
  private disconnected() {
    if (this.disposed || this.state.phase === "stopped") return;
    this.connection = false;
    this.inFlight = null;
    clearInterval(this.heartbeat);
    this.applyPeers([]);
    this.freeze("连接已断开。请选择重新连接，或继续编辑独立的本地草稿。");
    this.publish({ phase: "offline", peers: [] });
  }
  private stop(error: string) {
    this.freeze(error);
    this.publish({ phase: "stopped", error });
    this.socket?.close();
  }
  async dispose() {
    this.disposed = true;
    window.removeEventListener("online", this.wake);
    clearInterval(this.heartbeat);
    clearTimeout(this.flushTimer);
    clearTimeout(this.presenceTimer);
    this.authAbort?.abort();
    this.socket?.close();
    if (this.branch) this.refreshBranch();
    await this.persist();
    await this.chain;
    this.vault?.close();
    this.awareness.destroy();
    this.undo.destroy();
    this.doc.destroy();
    this.confirmed.destroy();
  }
}
