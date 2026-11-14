"use client";

import { Component, Suspense, type ReactNode } from "react";

/** The host keeps rendering when an optional plugin surface fails. */
export class OptionalPluginBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? (
      this.props.fallback
    ) : (
      <Suspense fallback={null}>{this.props.children}</Suspense>
    );
  }
}
