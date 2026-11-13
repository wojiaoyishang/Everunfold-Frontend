"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type RefObject,
  type SetStateAction,
} from "react";

interface NavigationState {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  triggerRef: RefObject<HTMLButtonElement | null>;
  searchRequest: { trigger: HTMLButtonElement } | null;
  openSearch: (trigger: HTMLButtonElement) => void;
}

const NavigationContext = createContext<NavigationState | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [searchRequest, setSearchRequest] =
    useState<NavigationState["searchRequest"]>(null);
  const openSearch = useCallback((trigger: HTMLButtonElement) => {
    setOpen(false);
    setSearchRequest({ trigger });
  }, []);
  return (
    <NavigationContext.Provider
      value={{ open, setOpen, triggerRef, searchRequest, openSearch }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const state = useContext(NavigationContext);
  if (!state)
    throw new Error("Navigation components must share their layout provider");
  return state;
}
