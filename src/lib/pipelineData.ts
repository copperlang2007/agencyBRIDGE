// Pipeline / Kanban deal-stage management
// Tracks clients through the enrollment funnel: lead → enrolled

export type DealStage =
  | "lead"
  | "contacted"
  | "appointment_scheduled"
  | "needs_analysis"
  | "application_submitted"
  | "enrolled"
  | "lost";

export interface PipelineDeal {
  id: string;
  clientId: string;
  clientName: string;
  agentName: string;
  carrier: string;
  planType: string;
  stage: DealStage;
  dealValue: number; // estimated annual commission
  probability: number; // 0-100
  lastActivity: string;
  nextAction?: string;
  nextActionDate?: string;
  notes?: string;
  lostReason?: string;
}

export const STAGE_CONFIG: { id: DealStage; label: string; color: string; probability: number }[] = [
  { id: "lead", label: "New Lead", color: "bg-slate-500", probability: 10 },
  { id: "contacted", label: "Contacted", color: "bg-blue-500", probability: 25 },
  { id: "appointment_scheduled", label: "Appointment Scheduled", color: "bg-indigo-500", probability: 40 },
  { id: "needs_analysis", label: "Needs Analysis", color: "bg-purple-500", probability: 55 },
  { id: "application_submitted", label: "Application Submitted", color: "bg-amber-500", probability: 75 },
  { id: "enrolled", label: "Enrolled", color: "bg-green-600", probability: 100 },
  { id: "lost", label: "Lost", color: "bg-red-500", probability: 0 },
];

export const mockPipelineDeals: PipelineDeal[] = [
  { id: "PD-001", clientId: "CL-0001", clientName: "James Smith", agentName: "Daniel Reyes", carrier: "UnitedHealthcare", planType: "MAPD", stage: "application_submitted", dealValue: 580, probability: 75, lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(), nextAction: "Follow up on carrier approval", nextActionDate: new Date(Date.now() + 2 * 86400000).toISOString() },
  { id: "PD-002", clientId: "CL-0005", clientName: "Patricia Johnson", agentName: "Daniel Reyes", carrier: "Humana", planType: "MED SUPP", stage: "needs_analysis", dealValue: 420, probability: 55, lastActivity: new Date(Date.now() - 2 * 86400000).toISOString(), nextAction: "Schedule enrollment appointment", nextActionDate: new Date(Date.now() + 3 * 86400000).toISOString() },
  { id: "PD-003", clientId: "CL-0012", clientName: "Robert Williams", agentName: "Sophia Martinez", carrier: "Aetna", planType: "MA", stage: "enrolled", dealValue: 510, probability: 100, lastActivity: new Date(Date.now() - 5 * 86400000).toISOString() },
  { id: "PD-004", clientId: "CL-0018", clientName: "Jennifer Davis", agentName: "Sarah Chen", carrier: "Cigna", planType: "MAPD", stage: "enrolled", dealValue: 620, probability: 100, lastActivity: new Date(Date.now() - 10 * 86400000).toISOString() },
  { id: "PD-005", clientId: "CL-0022", clientName: "Michael Brown", agentName: "Marcus Johnson", carrier: "Anthem", planType: "PART D", stage: "lead", dealValue: 280, probability: 10, lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(), nextAction: "Initial outreach call", nextActionDate: new Date(Date.now() + 1 * 86400000).toISOString() },
  { id: "PD-006", clientId: "CL-0028", clientName: "Linda Anderson", agentName: "Daniel Reyes", carrier: "WellCare", planType: "DSNP", stage: "appointment_scheduled", dealValue: 450, probability: 40, lastActivity: new Date(Date.now() - 3 * 86400000).toISOString(), nextAction: "Conduct needs analysis", nextActionDate: new Date(Date.now() + 4 * 86400000).toISOString() },
  { id: "PD-007", clientId: "CL-0031", clientName: "David Rodriguez", agentName: "Sophia Martinez", carrier: "UnitedHealthcare", planType: "MA", stage: "contacted", dealValue: 380, probability: 25, lastActivity: new Date(Date.now() - 4 * 86400000).toISOString(), nextAction: "Schedule appointment", nextActionDate: new Date(Date.now() + 2 * 86400000).toISOString() },
  { id: "PD-008", clientId: "CL-0035", clientName: "Barbara Wilson", agentName: "Sarah Chen", carrier: "Mutual of Omaha", planType: "FINAL EXPENSE", stage: "needs_analysis", dealValue: 320, probability: 55, lastActivity: new Date(Date.now() - 2 * 86400000).toISOString(), nextAction: "Present plan options", nextActionDate: new Date(Date.now() + 5 * 86400000).toISOString() },
  { id: "PD-009", clientId: "CL-0040", clientName: "Richard Garcia", agentName: "Marcus Johnson", carrier: "Aetna", planType: "MAPD", stage: "lost", dealValue: 510, probability: 0, lastActivity: new Date(Date.now() - 7 * 86400000).toISOString(), lostReason: "Went with competitor" },
  { id: "PD-010", clientId: "CL-0042", clientName: "Susan Martinez", agentName: "Daniel Reyes", carrier: "Humana", planType: "CSNP", stage: "application_submitted", dealValue: 580, probability: 75, lastActivity: new Date().toISOString(), nextAction: "Verify carrier received application", nextActionDate: new Date(Date.now() + 1 * 86400000).toISOString() },
  { id: "PD-011", clientId: "CL-0044", clientName: "Joseph Lopez", agentName: "Sophia Martinez", carrier: "Cigna", planType: "MA", stage: "lead", dealValue: 380, probability: 10, lastActivity: new Date(Date.now() - 2 * 86400000).toISOString(), nextAction: "Initial outreach call", nextActionDate: new Date(Date.now() + 1 * 86400000).toISOString() },
  { id: "PD-012", clientId: "CL-0046", clientName: "Jessica Gonzalez", agentName: "Sarah Chen", carrier: "UnitedHealthcare", planType: "MAPD", stage: "contacted", dealValue: 580, probability: 25, lastActivity: new Date(Date.now() - 1 * 86400000).toISOString(), nextAction: "Send plan comparison", nextActionDate: new Date(Date.now() + 3 * 86400000).toISOString() },
];

// ── Lead Routing & Distribution ─────────────────────────────────────
export type RoutingStrategy = "round_robin" | "weighted" | "territory" | "performance" | "carrier_appointment";

export interface LeadRoutingRule {
  id: string;
  name: string;
  strategy: RoutingStrategy;
  description: string;
  active: boolean;
  conditions: { field: string; operator: string; value: string }[];
  targetAgents: string[];
  weight?: Record<string, number>;
  createdAt: string;
  matchesThisMonth: number;
}

export const mockRoutingRules: LeadRoutingRule[] = [
  {
    id: "LR-001",
    name: "MA/MAPD leads → certified agents",
    strategy: "carrier_appointment",
    description: "Routes MA/MAPD leads only to agents certified with the selected carrier.",
    active: true,
    conditions: [{ field: "planType", operator: "in", value: "MA,MAPD,CSNP,DSNP" }],
    targetAgents: ["Daniel Reyes", "Sarah Chen", "Sophia Martinez"],
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    matchesThisMonth: 14,
  },
  {
    id: "LR-002",
    name: "Med Supp round-robin",
    strategy: "round_robin",
    description: "Equal distribution of Med Supp leads among available agents.",
    active: true,
    conditions: [{ field: "planType", operator: "in", value: "MED SUPP,FINAL EXPENSE" }],
    targetAgents: ["Daniel Reyes", "Elena Vasquez", "Sarah Chen"],
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    matchesThisMonth: 8,
  },
  {
    id: "LR-003",
    name: "Territory: North Miami ZIPs",
    strategy: "territory",
    description: "Geographic assignment based on North Miami ZIP code clusters.",
    active: true,
    conditions: [{ field: "zip", operator: "in", value: "33150,33160,33162" }],
    targetAgents: ["Marcus Johnson"],
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    matchesThisMonth: 5,
  },
  {
    id: "LR-004",
    name: "High-value leads → top performers",
    strategy: "performance",
    description: "High-value leads are weighted toward top-performing agents.",
    active: true,
    conditions: [{ field: "estimatedValue", operator: ">", value: "500" }],
    targetAgents: ["Daniel Reyes", "Elena Vasquez"],
    weight: { "Daniel Reyes": 60, "Elena Vasquez": 40 },
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
    matchesThisMonth: 3,
  },
];

export interface LeadQueueEntry {
  id: string;
  name: string;
  phone: string;
  email: string;
  zip: string;
  planType: string;
  source: string;
  estimatedValue: number;
  priority: "high" | "medium" | "low";
  createdAt: string;
  assignedAgent?: string;
  status: "unassigned" | "assigned" | "accepted" | "rejected";
}

export const mockLeadQueue: LeadQueueEntry[] = [
  { id: "LQ-001", name: "Margaret Thompson", phone: "(305) 555-0301", email: "mthompson@email.com", zip: "33101", planType: "MAPD", source: "Online", estimatedValue: 580, priority: "high", createdAt: new Date(Date.now() - 0.5 * 86400000).toISOString(), status: "unassigned" },
  { id: "LQ-002", name: "Frank Adams", phone: "(305) 555-0302", email: "fadams@email.com", zip: "33150", planType: "MA", source: "Referral", estimatedValue: 510, priority: "high", createdAt: new Date(Date.now() - 0.2 * 86400000).toISOString(), status: "unassigned" },
  { id: "LQ-003", name: "Helen Carter", phone: "(305) 555-0303", email: "hcarter@email.com", zip: "33160", planType: "MED SUPP", source: "Phone", estimatedValue: 420, priority: "medium", createdAt: new Date(Date.now() - 1 * 86400000).toISOString(), status: "unassigned" },
  { id: "LQ-004", name: "George Mitchell", phone: "(305) 555-0304", email: "gmitchell@email.com", zip: "33139", planType: "FINAL EXPENSE", source: "Event", estimatedValue: 320, priority: "low", createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), status: "unassigned" },
  { id: "LQ-005", name: "Dorothy Phillips", phone: "(305) 555-0305", email: "dphillips@email.com", zip: "33142", planType: "DSNP", source: "Online", estimatedValue: 450, priority: "high", createdAt: new Date(Date.now() - 0.1 * 86400000).toISOString(), status: "unassigned" },
];
