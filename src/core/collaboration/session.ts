import { randomUUID } from "@/core/browser/crypto";
import * as Y from "yjs";
import { ySyncPluginKey, defaultDeleteFilter } from "@tiptap/y-tiptap";
import { SourceEditing } from "./source-editing";
import {
  Awareness,
  applyAwarenessUpdate,
  removeAwarenessStates,
} from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import type { DraftFields } from "@/generated/content-admin-contract";
import type {
  ClientUpdate,
  Peer,
  ServerFrame,
  PresenceInput,
  MediaURL,
} from "@/generated/collaboration-contract";
import { createCollaborationTicket } from "@/generated/collaboration-client";
import { RequestError } from "@/core/http/request";
import {
  applyFields,
  fromBase64,
  LOCAL,
  projectDocument,
  REMOTE,
  SOURCE_OWN,
  toBase64,
  removedBlocks,
} from "./document";
import { mergeLocalDocuments, openLocalDocument } from "./local-store";
import { readServerFrame } from "./wire";
import { commandDocument } from "./block-commands";
import type { BlockCommand } from "@/core/editor/block-commands";

export type CollaborationStatus = {
  phase: "connecting" | "ready" | "offline" | "stopped";
  ready: boolean;
  pending: number;
  seq: number;
  error: string;
  local: boolean;
  localSaving: boolean;
  peers: Peer[];
  sourceStaged: number;
};
export class DraftSession {
  readonly doc = new Y.Doc();
  readonly awareness = new Awareness(this.doc);
  readonly undo = new Y.UndoManager(
    [
      this.doc.getMap("meta"),
      this.doc.getMap("blocks"),
      this.doc.getArray("order"),
    ],
    {
      trackedOrigins: new Set([LOCAL, SOURCE_OWN, ySyncPluginKey]),
      captureTimeout: 500,
      deleteFilter: (item) =>
        defaultDeleteFilter(
          item,
          new Set([
            "paragraph",
            "heading",
            "codeBlock",
            "listItem",
            "tableCell",
            "tableHeader",
          ]),
        ),
    },
  );
  state: CollaborationStatus = {
    phase: "connecting",
    ready: false,
    pending: 0,
    seq: 0,
    error: "",
    local: true,
    localSaving: false,
    peers: [],
    sourceStaged: 0,
  };
  epoch = "";
  mediaUrls: Record<string, MediaURL> = {};
  readonly sources: SourceEditing;
  private localWrites = 0;
  private acknowledged: Record<string, number> = {};
  private pending: ClientUpdate[] = [];
  private vault: Awaited<ReturnType<typeof openLocalDocument>> | null = null;
  private chain = Promise.resolve();
  private socket: WebSocket | null = null;
  private retry: ReturnType<typeof setTimeout> | undefined;
  private heartbeat: ReturnType<typeof setInterval> | undefined;
  private disposed = false;
  private inFlight: string | null = null;
  private highestAck = 0;
  private retryCount = 0;
  private clocks = new Map<number, number>();
  private revision = 0;
  private connection = false;
  private lastMessageAt = 0;
  private sentAt = 0;
  private authAbort: AbortController | null = null;
  private wake = () => {
    if (!this.connection && this.state.phase !== "stopped") void this.connect();
  };
  private stopped() {
    return this.state.phase === "stopped";
  }
  onChange: () => void = () => {};
  onRevision: (revision: number) => void = () => {};

  constructor(
    private baseUrl: string,
    private csrf: string,
    readonly id: string,
    private userId: string,
  ) {
    this.sources = new SourceEditing(
      {
        id,
        doc: this.doc,
        cutoff: () => this.cutoff(),
        notify: () => this.publish(),
        applyOwn: (payload, seq) => {
          this.undo.stopCapturing();
          Y.applyUpdate(this.doc, fromBase64(payload), SOURCE_OWN);
          this.undo.stopCapturing();
          this.highestAck = Math.max(this.highestAck, seq);
          void this.persist();
          this.publish();
        },
      },
      baseUrl,
      csrf,
      userId,
    );
    this.awareness.setLocalState({});
    this.doc.on("update", this.changed);
    this.awareness.on("change", this.presenceChanged);
    window.addEventListener("online", this.wake);
  }
  project(privateFields: DraftFields) {
    return projectDocument(this.doc, privateFields);
  }
  removedBlocks(fields: DraftFields) {
    return removedBlocks(this.doc, fields);
  }
  setFields(fields: DraftFields, previous: DraftFields) {
    if (this.state.ready && this.state.phase !== "stopped")
      applyFields(this.doc, fields, previous);
  }
  commandBlock(fields: DraftFields, command: BlockCommand) {
    if (!this.state.ready || this.stopped()) return false;
    this.undo.stopCapturing();
    const changed = commandDocument(this.doc, fields, command);
    this.undo.stopCapturing();
    return changed;
  }
  private publish(patch: Partial<CollaborationStatus> = {}) {
    this.state = {
      ...this.state,
      ...patch,
      pending: this.pending.length,
      sourceStaged: this.sources?.staged ?? 0,
    };
    if (!this.disposed) this.onChange();
  }
  private changed = (
    _update: Uint8Array,
    origin: unknown,
    _doc: Y.Doc,
    transaction: Y.Transaction,
  ) => {
    if (origin === REMOTE || origin === SOURCE_OWN || !this.state.ready) return;
    const versions: Record<string, number> = {};
    const changedTypes = new Set<unknown>(
      transaction.changedParentTypes.keys(),
    );
    for (const [id, block] of this.doc.getMap<Y.Map<unknown>>("blocks")) {
      const rich = block.get("rich");
      if (
        rich instanceof Y.XmlFragment &&
        (changedTypes.has(rich) || changedTypes.has(block))
      )
        versions[id] = this.sources.version(id);
    }
    this.pending.push({
      type: "update",
      epoch: this.epoch,
      update_id: randomUUID(),
      payload: toBase64(_update),
      rich_versions: versions,
    });
    this.publish();
    void this.persist().then(() => this.flush());
  };
  private persist() {
    const snapshot = {
      epoch: this.epoch,
      state: Y.encodeStateAsUpdate(this.doc),
      pending: [...this.pending],
      acknowledged: { ...this.acknowledged },
    };
    this.localWrites++;
    this.publish({ localSaving: true });
    this.chain = this.chain
      .then(async () => {
        if (this.vault) await this.vault.write(snapshot);
      })
      .catch(() =>
        this.publish({
          local: false,
          error: "本地保存不可用，请及时导出；服务器同步仍会继续。",
        }),
      )
      .finally(() => {
        this.localWrites--;
        if (!this.localWrites) this.publish({ localSaving: false });
      });
    return this.chain;
  }
  async start() {
    try {
      this.vault = await openLocalDocument(
        `${this.baseUrl}|${this.userId}|${this.id}`,
      );
      this.vault.watch(() => {
        void this.restoreLocal()
          .then(() => this.flush())
          .catch(() =>
            this.publish({
              local: false,
              error: "本地同步暂不可用，请及时导出。",
            }),
          );
      });
      await this.restoreLocal();
    } catch {
      this.publish({ local: false, error: "本地保存不可用，请及时导出。" });
    }
    if (!this.disposed) void this.connect();
  }
  private async restoreLocal() {
    if (this.disposed || !this.vault) return;
    const local = await this.vault.read();
    if (!local || this.disposed) return;
    if (this.epoch && this.epoch !== local.epoch) {
      this.stop("本地草稿版本已变化，请先导出当前内容。");
      return;
    }
    this.epoch = local.epoch;
    const merged = mergeLocalDocuments(local, {
      epoch: this.epoch,
      state: Y.encodeStateAsUpdate(this.doc),
      pending: this.pending,
      acknowledged: this.acknowledged,
    });
    Y.applyUpdate(this.doc, merged.state, REMOTE);
    this.pending = merged.pending;
    if (
      this.inFlight &&
      !this.pending.some((update) => update.update_id === this.inFlight)
    )
      this.inFlight = null;
    for (const seq of Object.values(merged.acknowledged ?? {}))
      this.highestAck = Math.max(this.highestAck, seq);
    this.publish({ ready: true });
  }
  private async connect() {
    if (this.disposed || this.connection || this.state.phase === "stopped")
      return;
    this.connection = true;
    this.publish({ phase: "connecting" });
    try {
      await this.restoreLocal();
      if (this.disposed || this.stopped()) return;
      this.authAbort = new AbortController();
      const { data } = await createCollaborationTicket(
        this.baseUrl,
        { id: this.id },
        this.csrf,
        { signal: this.authAbort.signal },
      );
      if (this.disposed) return;
      if (this.epoch && this.epoch !== data.epoch) {
        this.stop("草稿协同版本已变化。请先导出本地内容，再重新打开编辑页。");
        return;
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
            state_vector: toBase64(Y.encodeStateVector(this.doc)),
          }),
        );
      socket.onmessage = (event) => {
        try {
          this.lastMessageAt = Date.now();
          this.receive(readServerFrame(String(event.data)));
        } catch {
          this.stop("同步数据无效，请先导出本地内容。");
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
        (error.status === 401 || error.status === 403 || error.status === 404)
      )
        this.stop(
          "登录、权限或草稿状态已变化。请先导出本地内容，再重新登录检查。",
        );
      else this.disconnected();
    }
  }
  private receive(frame: ServerFrame) {
    if (frame.media_urls) this.mediaUrls = frame.media_urls;
    if (frame.type === "sync") {
      if (
        frame.epoch !== this.epoch ||
        !frame.payload ||
        frame.committed_seq == null
      )
        throw new Error("版本不符");
      Y.applyUpdate(this.doc, fromBase64(frame.payload), REMOTE);
      this.retryCount = 0;
      this.state.seq = frame.committed_seq;
      this.setRevision(frame.revision ?? 0);
      this.publish({
        ready: true,
        phase: "ready",
        error: this.state.local ? "" : this.state.error,
      });
      void this.persist().then(() => this.flush());
    } else if (
      frame.type === "update" &&
      frame.payload &&
      frame.committed_seq != null
    ) {
      if (frame.committed_seq <= this.state.seq) return;
      if (frame.committed_seq !== this.state.seq + 1)
        throw new Error("更新序号不连续");
      const own = frame.update_id && this.sources.held.has(frame.update_id);
      if (own) {
        this.undo.stopCapturing();
        this.sources.observed.add(frame.update_id!);
      }
      Y.applyUpdate(
        this.doc,
        fromBase64(frame.payload),
        own ? SOURCE_OWN : REMOTE,
      );
      if (own) this.undo.stopCapturing();
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
    } else if (frame.type === "sources") {
      this.sources.accept(frame.sources ?? []);
    } else if (frame.type === "peers") {
      this.applyPeers(frame.peers ?? []);
      this.publish({ peers: frame.peers ?? [] });
    } else if (frame.type === "media") {
      this.publish();
    } else if (frame.type === "revision") {
      this.highestAck = Math.max(
        this.highestAck,
        frame.committed_seq ?? this.state.seq,
      );
      this.setRevision(frame.revision ?? 0);
    } else if (frame.type === "error") {
      if ((frame.code ?? 0) >= 50000 || frame.code === 42970)
        this.socket?.close();
      else this.stop(frame.msg ?? "同步已停止，请先导出本地内容。");
    }
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
      this.state.phase !== "ready" ||
      this.socket?.readyState !== WebSocket.OPEN
    )
      return;
    const next = this.pending[0];
    if (!next) return;
    this.inFlight = next.update_id;
    this.sentAt = Date.now();
    this.socket.send(JSON.stringify(next));
  }
  async cutoff() {
    await this.persist();
    const deadline = Date.now() + 12000;
    while (this.pending.length || this.state.seq < this.highestAck) {
      if (
        this.disposed ||
        this.state.phase !== "ready" ||
        Date.now() > deadline
      )
        throw new Error("请等待同步完成后再保存或发布。");
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    if (this.state.phase !== "ready")
      throw new Error("尚未连接协同服务，输入已保留。");
    return this.state.seq;
  }
  private presenceChanged = (_changes: unknown, origin: unknown) => {
    if (origin !== REMOTE) this.sendPresence();
  };
  private sendPresence() {
    if (
      this.socket?.readyState !== WebSocket.OPEN ||
      this.state.phase !== "ready"
    )
      return;
    const local = this.awareness.getLocalState();
    const cursor = local?.cursor;
    const value: PresenceInput = {
      type: "presence",
      block_id: local?.blockId ?? null,
      cursor: cursor
        ? {
            anchor: toBase64(Y.encodeRelativePosition(cursor.anchor)),
            head: toBase64(Y.encodeRelativePosition(cursor.head)),
          }
        : null,
    };
    this.socket.send(JSON.stringify(value));
  }
  private applyPeers(peers: Peer[]) {
    const visible = peers.filter((p) => p.client_id !== this.doc.clientID);
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
        /* Ignore invalid ephemeral cursors. */
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
    clearTimeout(this.retry);
    this.applyPeers([]);
    this.publish({ phase: "offline", peers: [] });
    this.retry = setTimeout(
      this.wake,
      Math.min(15000, 800 * 2 ** this.retryCount++),
    );
  }
  private stop(error: string) {
    this.publish({ phase: "stopped", error });
    this.socket?.close();
  }
  async dispose() {
    this.disposed = true;
    window.removeEventListener("online", this.wake);
    clearTimeout(this.retry);
    clearInterval(this.heartbeat);
    this.authAbort?.abort();
    this.socket?.close();
    await this.chain;
    this.vault?.close();
    this.awareness.destroy();
    this.undo.destroy();
    this.doc.destroy();
  }
}
