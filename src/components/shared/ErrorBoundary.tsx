import { Component, type ReactNode, type ErrorInfo } from "react";
import { logAudit } from "@/lib/auditLog";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Global error boundary — catches unhandled render errors and prevents
 * a white-screen crash. Logs the error to the audit trail for diagnostics.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    logAudit({
      actor: "system",
      action: "RENDER_ERROR",
      category: "system",
      entity: "ErrorBoundary",
      severity: "critical",
      details: `${error.message} — ${errorInfo.componentStack?.split("\n")[1]?.trim() ?? "unknown component"}`,
    });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="max-w-md w-full space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive/10 mb-2">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. The error has been logged for review.
              Try reloading the page — your data is safe.
            </p>
            {this.state.error && (
              <pre className="text-xs text-muted-foreground/70 bg-muted rounded-lg p-3 overflow-x-auto text-left">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleReload} className="w-full">
              <RotateCw className="h-4 w-4 mr-2" />
              Reload Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
