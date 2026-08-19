import { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { AgentAssist } from "@/components/shared/AgentAssist";
import { cn } from "@/lib/utils";
import { useRole, roleLabels } from "@/lib/roleContext";
import { Eye, X, Menu, FlaskConical } from "lucide-react";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isImpersonating, originalUser, user, endImpersonation, isDemo } = useRole();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div
        className={cn(
          "flex flex-col min-h-screen transition-[margin] duration-300 ease-in-out",
          collapsed ? "lg:ml-[76px]" : "lg:ml-64"
        )}
      >
        {/* Demo state is a property of the session, so it is stated on every
            page rather than only at the door the visitor came through. */}
        {isDemo && (
          <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-sky-500/10 border-b border-sky-500/30 text-sky-800 dark:text-sky-300 text-sm">
            <FlaskConical className="h-4 w-4 shrink-0" />
            <span className="font-medium">Demo</span>
            <span className="text-sky-700/80 dark:text-sky-400/80">
              Sample agency, invented data. Changes are disabled.
            </span>
          </div>
        )}
        {isImpersonating && originalUser && user && (
          <div className="flex items-center gap-3 px-4 sm:px-6 py-2 bg-amber-500/10 border-b border-amber-500/30 text-amber-700 dark:text-amber-300 text-sm">
            <Eye className="h-4 w-4 shrink-0" />
            <span className="font-medium hidden sm:inline">
              Viewing as {user.name} ({roleLabels[user.role]})
            </span>
            <span className="text-amber-600/70 dark:text-amber-400/70 hidden md:inline">
              — You are impersonating this role from {originalUser.name} ({roleLabels[originalUser.role]}). All actions are audit-logged under your identity.
            </span>
            <button
              onClick={endImpersonation}
              className="ml-auto flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0"
            >
              <X className="h-3 w-3" />
              <span className="hidden sm:inline">End Impersonation</span>
            </button>
          </div>
        )}
        <Topbar onMobileMenuOpen={() => setMobileOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
      <AgentAssist />
    </div>
  );
}
