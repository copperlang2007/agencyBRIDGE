import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Scale,
  Phone,
  UserCog,
  Briefcase,
  ShieldCheck,
  RefreshCw,
  HeartPulse,
  ChevronLeft,
  BookOpen,
  Headphones,
  Lock,
  KanbanSquare,
  Search,
  FolderOpen,
  Zap,
  BarChart3,
  Globe,
  ShieldAlert,
  ArrowLeftRight,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/shared/BrandMark";
import { Button } from "@/components/ui/button";
import { useRole, routePermissions, type RoleId } from "@/lib/roleContext";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: RoleId[];
}

const navGroups: { label: string; items: NavItem[] }[] = [
  {
    label: "Main",
    items: [
      { to: "/", label: "Dashboard", icon: LayoutDashboard, roles: routePermissions["/"] },
      { to: "/clients", label: "Clients & Leads", icon: Users, roles: routePermissions["/clients"] },
      { to: "/pipeline", label: "Sales Pipeline", icon: KanbanSquare, roles: routePermissions["/pipeline"] },
      { to: "/calendar", label: "Calendar", icon: CalendarDays, roles: routePermissions["/calendar"] },
      { to: "/policies", label: "Policies & Commissions", icon: FileText, roles: routePermissions["/policies"] },
      { to: "/reconciliation", label: "Reconciliation", icon: Scale, roles: routePermissions["/reconciliation"] },
      { to: "/dialer", label: "Softphone", icon: Phone, roles: routePermissions["/dialer"] },
      { to: "/supervisor", label: "Supervisor", icon: Headphones, roles: routePermissions["/supervisor"] },
    ],
  },
  {
    label: "Sales Tools",
    items: [
      { to: "/quoting", label: "Quoting Engine", icon: Search, roles: routePermissions["/quoting"] },
      { to: "/documents", label: "Documents", icon: FolderOpen, roles: routePermissions["/documents"] },
      { to: "/workflows", label: "Workflow Automation", icon: Zap, roles: routePermissions["/workflows"] },
      { to: "/data-tools", label: "Import / Export", icon: ArrowLeftRight, roles: routePermissions["/data-tools"] },
      { to: "/email-campaigns", label: "Omnichannel Campaigns", icon: Mail, roles: routePermissions["/email-campaigns"] },
      { to: "/client-portal", label: "Client Portal", icon: Globe, roles: routePermissions["/client-portal"] },
    ],
  },
  {
    label: "Management",
    items: [
      { to: "/agents", label: "Agents", icon: UserCog, roles: routePermissions["/agents"] },
      { to: "/backoffice", label: "Agent Backoffice", icon: Briefcase, roles: routePermissions["/backoffice"] },
      { to: "/admin", label: "Admin", icon: ShieldCheck, roles: routePermissions["/admin"] },
      { to: "/retention", label: "Retention", icon: RefreshCw, roles: routePermissions["/retention"] },
      { to: "/compliance", label: "Compliance", icon: HeartPulse, roles: routePermissions["/compliance"] },
      { to: "/compliance-center", label: "Compliance Center", icon: ShieldAlert, roles: routePermissions["/compliance-center"] },
      { to: "/reporting", label: "Reporting", icon: BarChart3, roles: routePermissions["/reporting"] },
      { to: "/security", label: "Security", icon: Lock, roles: routePermissions["/security"] },
      { to: "/knowledge-base", label: "Knowledge Base", icon: BookOpen, roles: routePermissions["/knowledge-base"] },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, role } = useRole();

  // Filter nav items by the current user's role
  const currentRole = role || user?.role || "readonly";
  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.roles.includes(currentRole)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width,transform] duration-300 ease-in-out",
          collapsed ? "w-[76px]" : "w-64",
          // Mobile: slide in/out, desktop: always visible
          !mobileOpen && "-translate-x-full lg:translate-x-0",
          mobileOpen && "translate-x-0"
        )}
      >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <BrandLockup
          size={36}
          compact={collapsed}
          subtitle="Agency Platform"
          wordmarkClassName="text-white text-sm"
          className="text-sidebar-foreground"
        />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-6">
        {visibleGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            {!collapsed && (
              <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = location.pathname === item.to;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                      : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    collapsed && "justify-center"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-3 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className={cn(
            "w-full text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            collapsed && "justify-center"
          )}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform", collapsed && "rotate-180")} />
          {!collapsed && <span className="ml-2">Collapse</span>}
        </Button>
      </div>

      {/* Mobile close button */}
      <button
        onClick={onMobileClose}
        className="lg:hidden absolute top-4 right-3 z-10 p-1.5 rounded-md bg-sidebar-accent text-sidebar-accent-foreground hover:opacity-80"
        aria-label="Close menu"
      >
        <ChevronLeft className="h-4 w-4 rotate-90" />
      </button>
    </aside>
    </>
  );
}
