"use client";

import {
  createContext,
  useContext,
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
}

const NavigationContext = createContext<NavigationState | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return (
    <NavigationContext.Provider value={{ open, setOpen, triggerRef }}>
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
