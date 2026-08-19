import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleProvider, useRole } from "@/lib/roleContext";
import { RoleGuard } from "@/components/shared/RoleGuard";
import LoginPage from "@/pages/LoginPage";
import LandingPage from "@/pages/LandingPage";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { ReactNode } from "react";
import { useState, useEffect, lazy, Suspense } from "react";
import NotFound from "./pages/NotFound";

// Route-level code splitting: the authenticated pages are the bulk of the bundle
// and none of them are reachable until after sign-in, so they load on demand.
const AdminPage = lazy(() => import("@/pages/AdminPage"));
const AgentBackofficePage = lazy(() => import("@/pages/AgentBackofficePage"));
const AgentsPage = lazy(() => import("@/pages/AgentsPage"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const ClientPortalPage = lazy(() => import("@/pages/ClientPortalPage"));
const ClientsCRM = lazy(() => import("@/pages/ClientsCRM"));
const ComplianceCenterPage = lazy(() => import("@/pages/ComplianceCenterPage"));
const CompliancePage = lazy(() => import("@/pages/CompliancePage"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const DataToolsPage = lazy(() => import("@/pages/DataToolsPage"));
const DialerPage = lazy(() => import("@/pages/DialerPage"));
const DocumentsPage = lazy(() => import("@/pages/DocumentsPage"));
const EmailCampaignPage = lazy(() => import("@/pages/EmailCampaignPage"));
const KnowledgeBasePage = lazy(() => import("@/pages/KnowledgeBasePage"));
const OnboardingWizard = lazy(() => import("@/pages/OnboardingWizard"));
const PipelinePage = lazy(() => import("@/pages/PipelinePage"));
const PoliciesCommissions = lazy(() => import("@/pages/PoliciesCommissions"));
const QuotingPage = lazy(() => import("@/pages/QuotingPage"));
const ReconciliationPage = lazy(() => import("@/pages/ReconciliationPage"));
const ReportingPage = lazy(() => import("@/pages/ReportingPage"));
const RetentionPage = lazy(() => import("@/pages/RetentionPage"));
const SecurityPage = lazy(() => import("@/pages/SecurityPage"));
const SupervisorPage = lazy(() => import("@/pages/SupervisorPage"));
const WorkflowPage = lazy(() => import("@/pages/WorkflowPage"));


/** Shown while a route chunk is in flight. Mirrors the page header + card rhythm
 *  so the layout does not jump when the real page arrives. */
function RouteFallback() {
  return (
    <div className="space-y-6 p-1" role="status" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading page</span>
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
        <div className="h-4 w-80 animate-pulse rounded-md bg-muted/60" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 animate-pulse rounded-lg border bg-muted/40" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-lg border bg-muted/30" />
    </div>
  );
}

const queryClient = new QueryClient();

const routes: { path: string; element: ReactNode }[] = [
  { path: "/", element: <Dashboard /> },
  { path: "/clients", element: <ClientsCRM /> },
  { path: "/calendar", element: <CalendarPage /> },
  { path: "/policies", element: <PoliciesCommissions /> },
  { path: "/pipeline", element: <PipelinePage /> },
  { path: "/quoting", element: <QuotingPage /> },
  { path: "/documents", element: <DocumentsPage /> },
  { path: "/workflows", element: <WorkflowPage /> },
  { path: "/reporting", element: <ReportingPage /> },
  { path: "/client-portal", element: <ClientPortalPage /> },
  { path: "/data-tools", element: <DataToolsPage /> },
  { path: "/email-campaigns", element: <EmailCampaignPage /> },
  { path: "/compliance-center", element: <ComplianceCenterPage /> },
  { path: "/agents", element: <AgentsPage /> },
  { path: "/agents/:agentId", element: <AgentsPage /> },
  { path: "/admin", element: <AdminPage /> },
  { path: "/retention", element: <RetentionPage /> },
  { path: "/compliance", element: <CompliancePage /> },
  { path: "/dialer", element: <DialerPage /> },
  { path: "/knowledge-base", element: <KnowledgeBasePage /> },
  { path: "/supervisor", element: <SupervisorPage /> },
  { path: "/security", element: <SecurityPage /> },
  { path: "/reconciliation", element: <ReconciliationPage /> },
  { path: "/backoffice", element: <AgentBackofficePage /> },
];

function AuthenticatedApp() {
  const { isAuthenticated } = useRole();
  const [onboardingDone, setOnboardingDone] = useState<boolean>(() => {
    try {
      return !!localStorage.getItem("onboarding_completed");
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handler = () => setOnboardingDone(true);
    window.addEventListener("onboarding-done", handler);
    return () => window.removeEventListener("onboarding-done", handler);
  }, []);

  // If authenticated, go straight to the app
  if (isAuthenticated) {
    if (!onboardingDone) {
      return (
        <Suspense fallback={<RouteFallback />}>
          <OnboardingWizard />
        </Suspense>
      );
    }

    return (
      <BrowserRouter>
        <Routes>
          {routes.map((r) => (
            <Route
              key={r.path}
              path={r.path}
              element={
                <AppLayout>
                  <RoleGuard route={r.path}>
                    <Suspense fallback={<RouteFallback />}>{r.element}</Suspense>
                  </RoleGuard>
                </AppLayout>
              }
            />
          ))}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Not authenticated — show landing page with login route
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ErrorBoundary>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <RoleProvider>
          <AuthenticatedApp />
        </RoleProvider>
      </TooltipProvider>
    </ErrorBoundary>
  </QueryClientProvider>
);

export default App;
