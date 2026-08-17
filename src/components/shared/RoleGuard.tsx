import { Navigate } from "react-router-dom";
import { useRole } from "@/lib/roleContext";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";

interface RoleGuardProps {
  route: string;
  children: ReactNode;
}

/**
 * Wraps a page to enforce role-based access.
 * If the current user's role is not permitted for the route,
 * renders an access-denied screen instead of the page content.
 */
export function RoleGuard({ route, children }: RoleGuardProps) {
  const { hasAccess, user, roleLabel } = useRole();
  const navigate = useNavigate();

  if (hasAccess(route)) {
    return <>{children}</>;
  }

  const userName = user?.name || "Unknown user";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full border-destructive/30">
        <CardContent className="pt-6 pb-6 text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">Access Restricted</h2>
            <p className="text-sm text-muted-foreground mt-2">
              Your current role <span className="font-semibold text-foreground">{roleLabel}</span> ({userName}) does not have permission to view this page.
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Route: <code className="font-mono text-[11px] bg-muted px-1.5 py-0.5 rounded">{route}</code>
            </p>
          </div>
          <Button onClick={() => navigate("/")} className="w-full">
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
