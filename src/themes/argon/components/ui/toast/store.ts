export type ToastTone = "loading" | "success" | "error" | "info";
export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Undefined means no progress track; null means indeterminate. */
  progress?: number | null;
  duration?: number;
  dismissible?: boolean;
  placement?: "top-center";
  countdown?: boolean;
  actions?: ToastAction[];
}
export interface ToastEntry extends ToastMessage {
  closing: boolean;
  version: number;
}
/** One in-memory theme scope; stable IDs update existing notifications rather than stacking duplicates. */
export class ToastStore {
  private entries: ToastEntry[] = [];
  private listeners = new Set<() => void>();
  snapshot = () => this.entries;
  subscribe = (callback: () => void) => {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  };
  private emit() {
    this.listeners.forEach((callback) => callback());
  }
  show = (message: ToastMessage) => {
    const existing = this.entries.find((item) => item.id === message.id);
    const entry = {
      ...message,
      closing: false,
      version: (existing?.version ?? 0) + 1,
    };
    this.entries = existing
      ? this.entries.map((item) => (item.id === message.id ? entry : item))
      : [...this.entries, entry];
    this.emit();
  };
  dismiss = (id: string) => {
    this.entries = this.entries.map((item) =>
      item.id === id ? { ...item, closing: true } : item,
    );
    this.emit();
  };
  remove = (id: string) => {
    this.entries = this.entries.filter((item) => item.id !== id);
    this.emit();
  };
}
