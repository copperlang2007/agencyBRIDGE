import { Search, Bell, HelpCircle, ChevronDown, ShieldCheck, Headphones, Phone, Eye, RefreshCw, LogOut, UserRoundCog, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useRole, roleLabels, getVisibleRoles, getImpersonatableRoles, type RoleId } from "@/lib/roleContext";
import { cn } from "@/lib/utils";

const roleIcons: Record<RoleId, typeof ShieldCheck> = {
  admin: ShieldCheck,
  supervisor: Headphones,
  agent: Phone,
  retention: RefreshCw,
  readonly: Eye,
};

const roleColors: Record<RoleId, string> = {
  admin: "from-navy-600 to-navy-800",
  supervisor: "from-purple-600 to-purple-800",
  agent: "from-teal-600 to-teal-800",
  retention: "from-amber-600 to-amber-800",
  readonly: "from-slate-500 to-slate-700",
};

interface TopbarProps {
  onMobileMenuOpen: () => void;
}

export function Topbar({ onMobileMenuOpen }: TopbarProps) {
  const { user, setRole, roleLabel, logout, isImpersonating, impersonate, endImpersonation, originalUser } = useRole();
  if (!user) return null;
  const RoleIcon = roleIcons[user.role];
  const initials = user.name.split(" ").map((n) => n[0]).join("").slice(0, 2);

  // Determine which roles are visible based on scoping rules.
  // Admin sees all roles. Supervisor sees self + agents (their reports).
  // Other roles see only their own. When impersonating, the original user's
  // role determines what can be impersonated.
  const scopeRole = isImpersonating && originalUser ? originalUser.role : user.role;
  const visibleRoles = isImpersonating
    ? getImpersonatableRoles(scopeRole)
    : getVisibleRoles(scopeRole);

  const handleRoleSwitch = (id: RoleId) => {
    if (isImpersonating) {
      impersonate(id);
    } else {
      setRole(id);
    }
  };

  return (
    <header
      className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-card/80 px-4 sm:px-6 backdrop-blur-sm"
    >
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onMobileMenuOpen}
        className="lg:hidden shrink-0"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Search */}
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search clients, policies, agents..."
          className="pl-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
        />
      </div>

      {/* Role badge */}
      <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/60 border border-border">
        <RoleIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-muted-foreground">{roleLabel}</span>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive ring-2 ring-card" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              Notifications
              <Badge variant="secondary" className="text-[10px]">4 new</Badge>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Renewal due: Mary Johnson</span>
              <span className="text-xs text-muted-foreground">Medicare Advantage renewal in 12 days</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Compliance alert: Marcus Johnson</span>
              <span className="text-xs text-muted-foreground">AHIP certification overdue</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">New lead assigned</span>
              <span className="text-xs text-muted-foreground">Robert Williams — Referral</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 py-3">
              <span className="text-sm font-medium">Appointment confirmed</span>
              <span className="text-xs text-muted-foreground">Patricia Brown — Tomorrow 10:00 AM</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="icon">
          <HelpCircle className="h-5 w-5" />
        </Button>

        {/* User menu with role switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2.5 rounded-full pl-1 pr-3 py-1 hover:bg-muted/60 transition-colors">
              <Avatar className="h-9 w-9 border-2 border-accent/20">
                <AvatarFallback className={cn("bg-gradient-to-br text-white text-sm font-semibold", roleColors[user.role])}>
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:flex flex-col items-start leading-tight">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-[11px] text-muted-foreground">{roleLabel}</span>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden md:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Agency Settings</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            {visibleRoles.length > 1 && (
              <>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                  {isImpersonating ? "Impersonate Role (Debugging)" : "Switch Role (Demo)"}
                </DropdownMenuLabel>
                {visibleRoles.map((id) => {
                  const label = roleLabels[id];
                  const Icon = roleIcons[id];
                  return (
                    <DropdownMenuItem
                      key={id}
                      onClick={() => handleRoleSwitch(id)}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer",
                        user.role === id && "bg-accent/40 font-medium"
                      )}
                    >
                      <Icon className={cn("h-3.5 w-3.5", user.role === id ? "text-accent-foreground" : "text-muted-foreground")} />
                      {label}
                      {user.role === id && <Badge variant="secondary" className="ml-auto text-[9px]">Current</Badge>}
                    </DropdownMenuItem>
                  );
                })}
              </>
            )}
            {isImpersonating && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="flex items-center gap-2 cursor-pointer text-amber-600 dark:text-amber-400"
                  onClick={endImpersonation}
                >
                  <UserRoundCog className="h-3.5 w-3.5" />
                  End Impersonation — Return to {originalUser ? roleLabels[originalUser.role] : "Admin"}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive flex items-center gap-2 cursor-pointer" onClick={logout}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
