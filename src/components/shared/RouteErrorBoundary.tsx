import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCw } from "lucide-react";
import { logAudit } from "@/lib/auditLog";

/**
 * Contains a failure to the page area instead of the whole shell.
 *
 * Route components are code-split, so a dropped connection or a stale chunk
 * after a deploy makes `import()` reject at navigation time. Without this the
 * rejection reaches the root boundary and replaces the entire app — sidebar and
 * navigation included — for what is usually a recoverable network blip.
 *
 * Retry remounts the subtree via `key`, which lets React re-attempt the import;
 * a chunk that failed once is not cached as failed.
 */
export class RouteErrorBoundary extends Component<
  { children: ReactNode; routeKey: string },
  { error: Error | null; attempt: number }
> {
  state = { error: null as Error | null, attempt: 0 };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logAudit({
      actor: "system",
      action: "route_load_failed",
      category: "system",
      entity: this.props.routeKey,
      severity: "warning",
      details: `${error.message} — ${(info.componentStack || "").split("\n")[1]?.trim() ?? ""}`,
    });
  }

  componentDidUpdate(prev: { routeKey: string }) {
    // Navigating away from a broken route should clear the error.
    if (prev.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) {
      return <div key={this.state.attempt}>{this.props.children}</div>;
    }

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-semibold">This page didn't load</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            The page couldn't be fetched. Your session and the rest of the app are unaffected.
          </p>
          <Button
            className="mt-4"
            onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}
          >
            <RotateCw className="mr-2 h-4 w-4" /> Try again
          </Button>
        </div>
      </div>
    );
  }
}
