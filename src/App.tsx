import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { RoleProvider, useRole } from "@/lib/roleContext";
import { RoleGuard } from "@/components/shared/RoleGuard";
import Dashboard from "@/pages/Dashboard";
import ClientsCRM from "@/pages/ClientsCRM";
import CalendarPage from "@/pages/CalendarPage";
import PoliciesCommissions from "@/pages/PoliciesCommissions";
import AgentsPage from "@/pages/AgentsPage";
import AdminPage from "@/pages/AdminPage";
import RetentionPage from "@/pages/RetentionPage";
import CompliancePage from "@/pages/CompliancePage";
import DialerPage from "@/pages/DialerPage";
import KnowledgeBasePage from "@/pages/KnowledgeBasePage";
import SupervisorPage from "@/pages/SupervisorPage";
import SecurityPage from "@/pages/SecurityPage";
import ReconciliationPage from "@/pages/ReconciliationPage";
import AgentBackofficePage from "@/pages/AgentBackofficePage";
import LoginPage from "@/pages/LoginPage";
import LandingPage from "@/pages/LandingPage";
import OnboardingWizard from "@/pages/OnboardingWizard";
import ComplianceCenterPage from "@/pages/ComplianceCenterPage";
import PipelinePage from "@/pages/PipelinePage";
import QuotingPage from "@/pages/QuotingPage";
import DocumentsPage from "@/pages/DocumentsPage";
import WorkflowPage from "@/pages/WorkflowPage";
import ReportingPage from "@/pages/ReportingPage";
import ClientPortalPage from "@/pages/ClientPortalPage";
import DataToolsPage from "@/pages/DataToolsPage";
import EmailCampaignPage from "@/pages/EmailCampaignPage";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import NotFound from "./pages/NotFound";

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
      return <OnboardingWizard />;
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
                  <RoleGuard route={r.path}>{r.element}</RoleGuard>
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
