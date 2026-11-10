"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { isEmbeddedEditor } from "@/core/preview/bridge";

type Changes = { dirty: boolean; busy: boolean };
interface AccountNavigation {
  busy: boolean;
  register: (id: symbol, changes: Changes | null) => void;
  request: (action: () => void) => void;
}
const AccountNavigationContext = createContext<AccountNavigation | null>(null);

export function useAccountNavigation() {
  return useContext(AccountNavigationContext);
}

/** Account tabs share one leave dialog; browser-native unload prompts are disabled here. */
export function AccountNavigationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [changes, setChanges] = useState(new Map<symbol, Changes>());
  const [pending, setPending] = useState<(() => void) | null>(null);
  const dirty = [...changes.values()].some((value) => value.dirty);
  const busy = [...changes.values()].some((value) => value.busy);
  const register = useCallback((id: symbol, value: Changes | null) => {
    setChanges((current) => {
      const next = new Map(current);
      if (value) next.set(id, value);
      else next.delete(id);
      return next;
    });
  }, []);
  const request = useCallback(
    (action: () => void) => {
      if (busy) return;
      if (dirty) setPending(() => action);
      else action();
    },
    [dirty, busy],
  );
  const navigate = useCallback(
    (href: string) => request(() => location.assign(href)),
    [request],
  );
  useEditorNavigation(dirty, busy, navigate);
  return (
    <AccountNavigationContext value={{ register, request, busy }}>
      {children}
      <ConfirmDialog
        open={!!pending}
        title="放弃未保存的修改？"
        description="当前输入尚未保存，离开页面会丢失这些修改。"
        confirmLabel="放弃修改并离开"
        onCancel={() => setPending(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          const action = pending;
          setPending(null);
          action?.();
        }}
      />
    </AccountNavigationContext>
  );
}

export function UnsavedAccountChanges({
  dirty,
  busy,
}: {
  dirty: boolean;
  busy: boolean;
}) {
  const scope = useAccountNavigation();
  return scope ? (
    <ScopedAccountChanges scope={scope} dirty={dirty} busy={busy} />
  ) : (
    <StandaloneChanges dirty={dirty} busy={busy} />
  );
}

function ScopedAccountChanges({
  scope,
  dirty,
  busy,
}: Changes & { scope: AccountNavigation }) {
  const id = useRef(Symbol("account-changes"));
  const { register } = scope;
  useEffect(() => {
    const key = id.current;
    register(key, { dirty, busy });
    return () => register(key, null);
  }, [register, dirty, busy]);
  return null;
}

function StandaloneChanges({ dirty, busy }: Changes) {
  const [destination, setDestination] = useState("");
  const confirmedLeave = useRef(false);
  const request = useCallback((href: string) => setDestination(href), []);
  useEditorNavigation(dirty, busy, request);
  useEffect(() => {
    if ((!dirty && !busy) || isEmbeddedEditor()) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (!confirmedLeave.current) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);
  return (
    <ConfirmDialog
      open={!!destination}
      title="放弃未保存的修改？"
      description="当前输入尚未保存，离开页面会丢失这些修改。"
      confirmLabel="放弃修改并离开"
      onCancel={() => setDestination("")}
      onConfirm={() => true}
      onConfirmed={() => {
        confirmedLeave.current = true;
        location.assign(destination);
      }}
    />
  );
}
