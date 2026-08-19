import { Component, type ErrorInfo, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { AlertCircle, RotateCw } from "lucide-react";
import { logAudit } from "@/lib/auditLog";

/**
 * Contains a page failure to the page area instead of the whole shell.
 *
 * Route components are code-split, so `import()` can reject at navigation time.
 * Without this the rejection reaches the root boundary and replaces the entire
 * app — sidebar and navigation included — for what is often recoverable.
 */

/**
 * A rejected dynamic import, as opposed to a render error inside a page that
 * loaded fine. The two need different recovery, and different wording: telling
 * someone the page "couldn't be fetched" when it fetched and then threw sends
 * them chasing their network connection.
 */
function isChunkLoadError(error: Error): boolean {
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    `${error.name} ${error.message}`,
  );
}

class RouteErrorBoundaryInner extends Component<
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
      action: isChunkLoadError(error) ? "route_chunk_load_failed" : "route_render_error",
      category: "system",
      entity: this.props.routeKey,
      severity: "warning",
      details: `${error.message} — ${(info.componentStack || "").split("\n")[1]?.trim() ?? ""}`,
    });
  }

  componentDidUpdate(prev: { routeKey: string }) {
    // routeKey is the concrete pathname, so moving between two records of the
    // same parameterised route clears a stale error too.
    if (prev.routeKey !== this.props.routeKey && this.state.error) {
      this.setState({ error: null, attempt: 0 });
    }
  }

  render() {
    const { error, attempt } = this.state;
    if (!error) return <div key={attempt}>{this.props.children}</div>;

    // A deploy replaces hashed chunk filenames. A user still running the old
    // bundle requests a URL that no longer exists, and remounting re-requests the
    // same dead URL — only a reload picks up an index.html with current hashes.
    // So once a retry has already failed, reload becomes the primary action.
    const chunkFailure = isChunkLoadError(error);
    const reloadFirst = chunkFailure && attempt > 0;

    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="max-w-md rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-destructive" />
          <h2 className="mt-3 font-display text-lg font-semibold">
            {chunkFailure ? "This page didn't load" : "This page hit an error"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {reloadFirst
              ? "The app was probably updated while this tab was open. Reloading will pick up the new version."
              : chunkFailure
                ? "The page couldn't be fetched. Your session and the rest of the app are unaffected."
                : "Something went wrong rendering this page. The rest of the app is unaffected."}
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            {reloadFirst ? (
              <>
                <Button onClick={() => window.location.reload()}>
                  <RotateCw className="mr-2 h-4 w-4" /> Reload page
                </Button>
                <Button
                  variant="outline"
                  onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}
                >
                  Try again
                </Button>
              </>
            ) : (
              <>
                <Button onClick={() => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }))}>
                  <RotateCw className="mr-2 h-4 w-4" /> Try again
                </Button>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reload page
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
}

/** Keys the boundary on the concrete pathname so param changes reset it. */
export function RouteErrorBoundary({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return <RouteErrorBoundaryInner routeKey={pathname}>{children}</RouteErrorBoundaryInner>;
}

/** For surfaces rendered outside the router, where there is no location. */
export function StaticErrorBoundary({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  return <RouteErrorBoundaryInner routeKey={routeKey}>{children}</RouteErrorBoundaryInner>;
}
