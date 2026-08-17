import { useRole } from "@/lib/roleContext";
import type { ReactNode } from "react";

interface CanProps {
  /** The action permission key, e.g. "policy:edit_commission" */
  action: string;
  children: ReactNode;
  /** If provided, renders this instead of hiding when permission is denied */
  fallback?: ReactNode;
  /** If true, renders children but disables interactive elements when denied */
  disableInsteadOfHide?: boolean;
}

/**
 * Action-level permission guard.
 * Hides (or disables) children when the current role lacks the given action permission.
 *
 * @example
 * <Can action="policy:create"><Button>Add Policy</Button></Can>
 * <Can action="policy:edit_commission" disableInsteadOfHide>
 *   <Button>Edit Commission</Button>
 * </Can>
 */
export function Can({ action, children, fallback = null, disableInsteadOfHide = false }: CanProps) {
  const { can } = useRole();
  const allowed = can(action);

  if (allowed) return <>{children}</>;

  if (disableInsteadOfHide) {
    return (
      <div className="inline-flex opacity-50 pointer-events-none cursor-not-allowed select-none" aria-disabled>
        {children}
      </div>
    );
  }

  return <>{fallback}</>;
}
