"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorNotice } from "./ErrorNotice";

/**
 * Wraps a client widget so its crash takes down only that widget, not the page.
 *
 * Next's error.tsx catches render errors for a whole route; this is for the
 * smaller blast radius — a calculator, a gallery, a signature pad — where the
 * rest of the page is still useful. Reach for it around any self-contained
 * interactive section, not around everything.
 *
 * Must be a class: there is still no hook equivalent of componentDidCatch.
 */
export class ErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; label?: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Widget error", {
      label: this.props.label,
      message: error.message,
      componentStack: info.componentStack,
    });
  }

  private reset = () => this.setState({ hasError: false });

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      this.props.fallback ?? (
        <ErrorNotice
          title="This part didn't load"
          message="The rest of the page is fine. Try loading this section again."
          onRetry={this.reset}
        />
      )
    );
  }
}
