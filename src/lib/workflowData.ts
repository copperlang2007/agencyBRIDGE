// Task / Workflow Automation Engine
// Trigger-based automated task creation

export type WorkflowTrigger =
  | "new_client_assigned"
  | "policy_lapsing"
  | "aep_approaching"
  | "appointment_scheduled"
  | "enrollment_submitted"
  | "carrier_approval_received"
  | "chargeback_received"
  | "ahip_expiring"
  | "carrier_appointment_expiring"
  | "birthday"
  | "renewal_approaching"
  | "lost_client";

export type WorkflowAction = "create_task" | "send_email" | "send_sms" | "create_appointment" | "notify_supervisor" | "update_status";

export interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: { type: WorkflowAction; config: Record<string, string> }[];
  active: boolean;
  createdAt: string;
  runsThisMonth: number;
  lastRun?: string;
}

export const mockWorkflowRules: WorkflowRule[] = [
  {
    id: "WF-001",
    name: "New client welcome sequence",
    description: "When a new client is assigned, create a welcome call task and send a welcome email",
    trigger: "new_client_assigned",
    actions: [
      { type: "create_task", config: { title: "Welcome call to {clientName}", priority: "High", dueInDays: "2" } },
      { type: "send_email", config: { template: "welcome_new_client" } },
    ],
    active: true,
    createdAt: new Date(Date.now() - 90 * 86400000).toISOString(),
    runsThisMonth: 12,
    lastRun: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "WF-002",
    name: "Policy lapsing alert",
    description: "When a policy is 30 days from lapsing, create a retention task and notify the agent",
    trigger: "policy_lapsing",
    actions: [
      { type: "create_task", config: { title: "Retention outreach: {clientName}", priority: "High", dueInDays: "1" } },
      { type: "send_sms", config: { template: "policy_lapsing_reminder" } },
      { type: "notify_supervisor", config: { message: "Policy for {clientName} lapsing in 30 days" } },
    ],
    active: true,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    runsThisMonth: 7,
    lastRun: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: "WF-003",
    name: "AEP outreach campaign",
    description: "60 days before AEP (Aug 15), create outreach tasks for all at-risk MA clients",
    trigger: "aep_approaching",
    actions: [
      { type: "create_task", config: { title: "AEP outreach: {clientName}", priority: "High", dueInDays: "14" } },
      { type: "create_appointment", config: { type: "Review", notes: "AEP plan review" } },
    ],
    active: true,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    runsThisMonth: 45,
    lastRun: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: "WF-004",
    name: "AHIP expiring reminder",
    description: "30 days before AHIP expires, create a task and notify supervisor",
    trigger: "ahip_expiring",
    actions: [
      { type: "create_task", config: { title: "Renew AHIP certification", priority: "High", dueInDays: "7" } },
      { type: "notify_supervisor", config: { message: "{agentName} AHIP expiring in 30 days" } },
    ],
    active: true,
    createdAt: new Date(Date.now() - 180 * 86400000).toISOString(),
    runsThisMonth: 2,
    lastRun: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "WF-005",
    name: "Enrollment submitted follow-up",
    description: "After enrollment is submitted, create a 5-day carrier follow-up task",
    trigger: "enrollment_submitted",
    actions: [
      { type: "create_task", config: { title: "Verify carrier received {clientName} application", priority: "Medium", dueInDays: "5" } },
    ],
    active: true,
    createdAt: new Date(Date.now() - 45 * 86400000).toISOString(),
    runsThisMonth: 8,
    lastRun: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "WF-006",
    name: "Birthday outreach",
    description: "On client birthday, send a greeting and schedule a plan review",
    trigger: "birthday",
    actions: [
      { type: "send_email", config: { template: "birthday_greeting" } },
      { type: "create_task", config: { title: "Birthday plan review: {clientName}", priority: "Low", dueInDays: "7" } },
    ],
    active: false,
    createdAt: new Date(Date.now() - 200 * 86400000).toISOString(),
    runsThisMonth: 0,
  },
];

// ── Document Management ─────────────────────────────────────────────
export interface ClientDocument {
  id: string;
  clientId: string;
  clientName: string;
  agentName: string;
  name: string;
  category: "Enrollment Form" | "SOA" | "Medical Record" | "Carrier Correspondence" | "EOB" | "Tax Document" | "Authorization" | "Other";
  uploadedAt: string;
  uploadedBy: string;
  fileSizeKB: number;
  fileType: string;
  version: number;
  versionHistory: { version: number; uploadedAt: string; uploadedBy: string; note: string }[];
  accessLog: { timestamp: string; accessedBy: string; action: string }[];
}

export const mockClientDocuments: ClientDocument[] = [
  {
    id: "DOC-001",
    clientId: "CL-0001",
    clientName: "James Smith",
    agentName: "Daniel Reyes",
    name: "UHC_MAPD_Enrollment_2026.pdf",
    category: "Enrollment Form",
    uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    uploadedBy: "Daniel Reyes",
    fileSizeKB: 245,
    fileType: "pdf",
    version: 2,
    versionHistory: [
      { version: 1, uploadedAt: new Date(Date.now() - 5 * 86400000).toISOString(), uploadedBy: "Daniel Reyes", note: "Initial upload" },
      { version: 2, uploadedAt: new Date(Date.now() - 3 * 86400000).toISOString(), uploadedBy: "Daniel Reyes", note: "Updated with corrected ZIP" },
    ],
    accessLog: [
      { timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), accessedBy: "Daniel Reyes", action: "viewed" },
      { timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), accessedBy: "Ryan Mitchell", action: "viewed" },
    ],
  },
  {
    id: "DOC-002",
    clientId: "CL-0001",
    clientName: "James Smith",
    agentName: "Daniel Reyes",
    name: "SOA_JSmith_2026.pdf",
    category: "SOA",
    uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    uploadedBy: "Daniel Reyes",
    fileSizeKB: 120,
    fileType: "pdf",
    version: 1,
    versionHistory: [{ version: 1, uploadedAt: new Date(Date.now() - 4 * 86400000).toISOString(), uploadedBy: "Daniel Reyes", note: "SOA signed" }],
    accessLog: [],
  },
  {
    id: "DOC-003",
    clientId: "CL-0005",
    clientName: "Patricia Johnson",
    agentName: "Daniel Reyes",
    name: "Humana_MedSupp_Application.pdf",
    category: "Enrollment Form",
    uploadedAt: new Date().toISOString(),
    uploadedBy: "Daniel Reyes",
    fileSizeKB: 310,
    fileType: "pdf",
    version: 1,
    versionHistory: [{ version: 1, uploadedAt: new Date().toISOString(), uploadedBy: "Daniel Reyes", note: "Initial upload" }],
    accessLog: [],
  },
  {
    id: "DOC-004",
    clientId: "CL-0012",
    clientName: "Robert Williams",
    agentName: "Sophia Martinez",
    name: "Aetna_MA_EOB_2026Q1.pdf",
    category: "EOB",
    uploadedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    uploadedBy: "Sophia Martinez",
    fileSizeKB: 180,
    fileType: "pdf",
    version: 1,
    versionHistory: [{ version: 1, uploadedAt: new Date(Date.now() - 10 * 86400000).toISOString(), uploadedBy: "Sophia Martinez", note: "EOB from Q1" }],
    accessLog: [{ timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), accessedBy: "Sophia Martinez", action: "viewed" }],
  },
  {
    id: "DOC-005",
    clientId: "CL-0018",
    clientName: "Jennifer Davis",
    agentName: "Sarah Chen",
    name: "Cigna_Authorization_Form.pdf",
    category: "Authorization",
    uploadedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    uploadedBy: "Sarah Chen",
    fileSizeKB: 95,
    fileType: "pdf",
    version: 1,
    versionHistory: [{ version: 1, uploadedAt: new Date(Date.now() - 14 * 86400000).toISOString(), uploadedBy: "Sarah Chen", note: "Agent authorization form" }],
    accessLog: [],
  },
];

// ── Reporting & Analytics ───────────────────────────────────────────
export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  category: "Production" | "Commission" | "Compliance" | "Retention" | "Carrier" | "AEP" | "Custom";
  schedule: "on_demand" | "daily" | "weekly" | "monthly" | "quarterly" | "annually";
  lastRun?: string;
  format: "pdf" | "csv" | "excel";
  fields: string[];
}

export const mockReportTemplates: ReportTemplate[] = [
  { id: "RPT-001", name: "Agent Production Report", description: "Monthly production by agent: enrollments, premium, commission", category: "Production", schedule: "monthly", lastRun: new Date(Date.now() - 5 * 86400000).toISOString(), format: "pdf", fields: ["Agent", "Enrollments", "Premium", "Commission", "Chargebacks", "Net"] },
  { id: "RPT-002", name: "Carrier Production Summary", description: "Production broken down by carrier and plan type", category: "Carrier", schedule: "monthly", lastRun: new Date(Date.now() - 5 * 86400000).toISOString(), format: "excel", fields: ["Carrier", "Plan Type", "Policies", "Premium", "Commission"] },
  { id: "RPT-003", name: "AEP Performance Dashboard", description: "AEP enrollment metrics vs prior year", category: "AEP", schedule: "daily", lastRun: new Date(Date.now() - 1 * 86400000).toISOString(), format: "pdf", fields: ["Date", "Enrollments", "Appointments", "Conversion Rate", "YoY %"] },
  { id: "RPT-004", name: "Compliance Status Report", description: "All agents' compliance items: AHIP, carrier appointments, certifications", category: "Compliance", schedule: "weekly", lastRun: new Date(Date.now() - 2 * 86400000).toISOString(), format: "pdf", fields: ["Agent", "AHIP", "Carrier Appointments", "Certifications", "W-9", "Score"] },
  { id: "RPT-005", name: "Retention & Churn Report", description: "Churn rate, at-risk clients, retention actions taken", category: "Retention", schedule: "monthly", lastRun: new Date(Date.now() - 7 * 86400000).toISOString(), format: "excel", fields: ["Month", "Churn Rate", "At-Risk Count", "Retained", "Lost"] },
  { id: "RPT-006", name: "Commission Reconciliation Summary", description: "Variance summary, open disputes, chargeback totals", category: "Commission", schedule: "monthly", lastRun: new Date(Date.now() - 3 * 86400000).toISOString(), format: "csv", fields: ["Agent", "Expected", "Received", "Variance", "Disputes"] },
  { id: "RPT-007", name: "Conversion Funnel Report", description: "Lead → enrolled conversion by stage, agent, and source", category: "Production", schedule: "weekly", format: "pdf", fields: ["Stage", "Count", "Conversion Rate", "Avg Days"] },
];

// ── Quoting Engine Data ─────────────────────────────────────────────
export interface QuotePlan {
  id: string;
  carrier: string;
  planName: string;
  planType: string;
  premiumMonthly: number;
  partDPremium: number;
  moopInNetwork: number;
  moopCombined: number;
  starRating: number;
  deductible: number;
  extraBenefits: string[];
  networkType: "HMO" | "PPO" | "SNP";
  formularyMatch: number; // % of client's drugs covered
  doctorMatch: number; // % of client's doctors in-network
  score: number; // weighted score 0-100
}

export const mockQuotePlans: QuotePlan[] = [
  { id: "QP-001", carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage Premier", planType: "MAPD", premiumMonthly: 0, partDPremium: 0, moopInNetwork: 4900, moopCombined: 6700, starRating: 4.5, deductible: 0, extraBenefits: ["Dental $1,500", "Vision $250", "Hearing", "OTC $100/mo", "Gym Membership", "Transportation 24 trips"], networkType: "HMO", formularyMatch: 92, doctorMatch: 85, score: 88 },
  { id: "QP-002", carrier: "Humana", planName: "Humana Gold Plus HMO", planType: "MAPD", premiumMonthly: 0, partDPremium: 0, moopInNetwork: 5200, moopCombined: 7500, starRating: 4.0, deductible: 0, extraBenefits: ["Dental $1,200", "Vision $200", "OTC $75/mo", "Gym", "Meals post-discharge"], networkType: "HMO", formularyMatch: 88, doctorMatch: 78, score: 82 },
  { id: "QP-003", carrier: "Aetna", planName: "Aetna Medicare Eagle Choice", planType: "MAPD", premiumMonthly: 25, partDPremium: 0, moopInNetwork: 3500, moopCombined: 5500, starRating: 4.5, deductible: 0, extraBenefits: ["Dental $2,000", "Vision $300", "Hearing", "OTC $120/mo", "Transportation 36 trips", "Flex Card $500"], networkType: "PPO", formularyMatch: 95, doctorMatch: 90, score: 91 },
  { id: "QP-004", carrier: "Cigna", planName: "Cigna HealthSpring Extra", planType: "MAPD", premiumMonthly: 0, partDPremium: 0, moopInNetwork: 4500, moopCombined: 6200, starRating: 3.5, deductible: 0, extraBenefits: ["Dental $1,000", "Vision $150", "OTC $50/mo", "Gym"], networkType: "HMO", formularyMatch: 80, doctorMatch: 72, score: 74 },
  { id: "QP-005", carrier: "WellCare", planName: "WellCare Honor Plus", planType: "MAPD", premiumMonthly: 0, partDPremium: 0, moopInNetwork: 3900, moopCombined: 5800, starRating: 4.0, deductible: 0, extraBenefits: ["Dental $1,500", "Vision $250", "Hearing", "OTC $100/mo", "Gym", "Transportation 24 trips", "Flex Card $300"], networkType: "HMO", formularyMatch: 90, doctorMatch: 82, score: 85 },
  { id: "QP-006", carrier: "Mutual of Omaha", planName: "Mutual of Omaha Med Supp Plan G", planType: "MED SUPP", premiumMonthly: 165, partDPremium: 35, moopInNetwork: 0, moopCombined: 0, starRating: 5.0, deductible: 0, extraBenefits: [], networkType: "PPO", formularyMatch: 100, doctorMatch: 100, score: 79 },
  { id: "QP-007", carrier: "Anthem", planName: "Anthem Blue Cross MA PPO", planType: "MA", premiumMonthly: 0, partDPremium: 30, moopInNetwork: 6800, moopCombined: 9250, starRating: 3.5, deductible: 198, extraBenefits: ["Dental $800", "Vision $100", "Gym"], networkType: "PPO", formularyMatch: 85, doctorMatch: 88, score: 72 },
  { id: "QP-008", carrier: "UnitedHealthcare", planName: "UHC Dual Complete", planType: "DSNP", premiumMonthly: 0, partDPremium: 0, moopInNetwork: 0, moopCombined: 0, starRating: 4.5, deductible: 0, extraBenefits: ["Dental $2,000", "Vision $400", "Hearing", "OTC $150/mo", "Transportation 48 trips", "Flex Card $900", "Meals"], networkType: "HMO", formularyMatch: 98, doctorMatch: 90, score: 95 },
];

// ── Formulary / Drug Lookup ─────────────────────────────────────────
export interface DrugFormularyEntry {
  drugName: string;
  genericName: string;
  drugClass: string;
  tier: number;
  covered: boolean;
  priorAuth: boolean;
  stepTherapy: boolean;
  quantityLimit: string;
  copay30day: number;
  copay90day: number;
}

export const mockFormulary: Record<string, DrugFormularyEntry[]> = {
  QP001: [
    { drugName: "Metformin", genericName: "Metformin HCl", drugClass: "Diabetes - Biguanide", tier: 1, covered: true, priorAuth: false, stepTherapy: false, quantityLimit: "360 tabs/90 days", copay30day: 0, copay90day: 0 },
    { drugName: "Atorvastatin", genericName: "Atorvastatin Calcium", drugClass: "Cholesterol - Statin", tier: 1, covered: true, priorAuth: false, stepTherapy: false, quantityLimit: "90 tabs/90 days", copay30day: 0, copay90day: 0 },
    { drugName: "Lisinopril", genericName: "Lisinopril", drugClass: "Blood Pressure - ACE", tier: 1, covered: true, priorAuth: false, stepTherapy: false, quantityLimit: "90 tabs/90 days", copay30day: 0, copay90day: 0 },
    { drugName: "Eliquis", genericName: "Apixaban", drugClass: "Anticoagulant", tier: 5, covered: true, priorAuth: true, stepTherapy: false, quantityLimit: "60 tabs/30 days", copay30day: 47, copay90day: 94 },
    { drugName: "Jardiance", genericName: "Empagliflozin", drugClass: "Diabetes - SGLT2", tier: 4, covered: true, priorAuth: true, stepTherapy: true, quantityLimit: "30 tabs/30 days", copay30day: 35, copay90day: 95 },
    { drugName: "Trulicity", genericName: "Dulaglutide", drugClass: "Diabetes - GLP-1", tier: 5, covered: true, priorAuth: true, stepTherapy: true, quantityLimit: "4 pens/28 days", copay30day: 47, copay90day: 0 },
  ],
};

// ── Provider Network Lookup ──────────────────────────────────────────
export interface ProviderEntry {
  npi: string;
  name: string;
  specialty: string;
  practice: string;
  address: string;
  phone: string;
  inNetwork: Record<string, boolean>;
  acceptingNew: boolean;
  distance: number;
}

export const mockProviders: ProviderEntry[] = [
  { npi: "1234567", name: "Dr. Robert Kim", specialty: "Primary Care", practice: "Miami Health Partners", address: "1234 NW 7th Ave, Miami FL 33136", phone: "(305) 555-1001", inNetwork: { "QP-001": true, "QP-002": true, "QP-003": true, "QP-004": false, "QP-005": true }, acceptingNew: true, distance: 2.3 },
  { npi: "2345678", name: "Dr. Maria Santos", specialty: "Cardiology", practice: "Heart Care Miami", address: "5678 SW 8th St, Miami FL 33144", phone: "(305) 555-1002", inNetwork: { "QP-001": true, "QP-002": true, "QP-003": true, "QP-004": true, "QP-005": false }, acceptingNew: true, distance: 4.1 },
  { npi: "3456789", name: "Dr. James Wilson", specialty: "Endocrinology", practice: "Diabetes & Endocrine Center", address: "910 NW 12th Ave, Miami FL 33136", phone: "(305) 555-1003", inNetwork: { "QP-001": true, "QP-002": false, "QP-003": true, "QP-004": false, "QP-005": true }, acceptingNew: false, distance: 3.5 },
  { npi: "4567890", name: "Dr. Patricia Lee", specialty: "Oncology", practice: "Miami Cancer Center", address: "2000 NW 10th Ave, Miami FL 33136", phone: "(305) 555-1004", inNetwork: { "QP-001": true, "QP-002": true, "QP-003": true, "QP-004": true, "QP-005": true }, acceptingNew: true, distance: 5.2 },
  { npi: "5678901", name: "Dr. Henry Brown", specialty: "Orthopedics", practice: "Bone & Joint Institute", address: "4500 Biscayne Blvd, Miami FL 33137", phone: "(305) 555-1005", inNetwork: { "QP-001": false, "QP-002": true, "QP-003": true, "QP-004": false, "QP-005": true }, acceptingNew: true, distance: 6.8 },
];

// ── Agent Hierarchy / Downline ───────────────────────────────────────
export interface HierarchyNode {
  id: string;
  name: string;
  role: "FMO" | "MGA" | "Agency" | "Agent";
  parentId: string | null;
  bookSize: number;
  ytdCommissions: number;
  overrideRate: number;
  overrideIncome: number;
  downlineCount: number;
}

export const mockHierarchy: HierarchyNode[] = [
  { id: "H-001", name: "artificialBRIDGE (FMO)", role: "FMO", parentId: null, bookSize: 996, ytdCommissions: 723800, overrideRate: 0, overrideIncome: 0, downlineCount: 5 },
  { id: "H-002", name: "South Florida MGA", role: "MGA", parentId: "H-001", bookSize: 680, ytdCommissions: 511400, overrideRate: 5, overrideIncome: 25570, downlineCount: 3 },
  { id: "H-003", name: "Daniel Reyes", role: "Agency", parentId: "H-002", bookSize: 248, ytdCommissions: 184500, overrideRate: 3, overrideIncome: 5535, downlineCount: 0 },
  { id: "H-004", name: "Sophia Martinez", role: "Agent", parentId: "H-002", bookSize: 186, ytdCommissions: 142300, overrideRate: 0, overrideIncome: 0, downlineCount: 0 },
  { id: "H-005", name: "Marcus Johnson", role: "Agent", parentId: "H-002", bookSize: 94, ytdCommissions: 67800, overrideRate: 0, overrideIncome: 0, downlineCount: 0 },
  { id: "H-006", name: "Elena Vasquez", role: "Agency", parentId: "H-001", bookSize: 312, ytdCommissions: 210400, overrideRate: 3, overrideIncome: 6312, downlineCount: 0 },
  { id: "H-007", name: "Sarah Chen", role: "Agent", parentId: "H-001", bookSize: 156, ytdCommissions: 118200, overrideRate: 0, overrideIncome: 0, downlineCount: 0 },
];

// ── Chargeback Tracking ─────────────────────────────────────────────
export interface Chargeback {
  id: string;
  policyId: string;
  clientName: string;
  agentName: string;
  carrier: string;
  planType: string;
  amount: number;
  reason: "rapid_disenrollment" | "plan_termination" | "death_within_90_days" | "other";
  chargebackDate: string;
  originalEnrollDate: string;
  status: "pending" | "applied" | "disputed" | "reversed";
  daysFromEnrollment: number;
}

export const mockChargebacks: Chargeback[] = [
  { id: "CB-001", policyId: "PL-0003", clientName: "Robert Williams", agentName: "Sophia Martinez", carrier: "Aetna", planType: "MA", amount: 510, reason: "rapid_disenrollment", chargebackDate: new Date(Date.now() - 5 * 86400000).toISOString(), originalEnrollDate: new Date(Date.now() - 70 * 86400000).toISOString(), status: "applied", daysFromEnrollment: 65 },
  { id: "CB-002", policyId: "PL-0007", clientName: "Susan Garcia", agentName: "Daniel Reyes", carrier: "Humana", planType: "MAPD", amount: 580, reason: "rapid_disenrollment", chargebackDate: new Date(Date.now() - 2 * 86400000).toISOString(), originalEnrollDate: new Date(Date.now() - 45 * 86400000).toISOString(), status: "pending", daysFromEnrollment: 43 },
  { id: "CB-003", policyId: "PL-0012", clientName: "Margaret Brown", agentName: "Marcus Johnson", carrier: "Anthem", planType: "PART D", amount: 280, reason: "plan_termination", chargebackDate: new Date(Date.now() - 10 * 86400000).toISOString(), originalEnrollDate: new Date(Date.now() - 200 * 86400000).toISOString(), status: "applied", daysFromEnrollment: 190 },
  { id: "CB-004", policyId: "PL-0015", clientName: "James Davis", agentName: "Daniel Reyes", carrier: "UnitedHealthcare", planType: "MAPD", amount: 580, reason: "death_within_90_days", chargebackDate: new Date(Date.now() - 15 * 86400000).toISOString(), originalEnrollDate: new Date(Date.now() - 80 * 86400000).toISOString(), status: "disputed", daysFromEnrollment: 65 },
  { id: "CB-005", policyId: "PL-0022", clientName: "Dorothy Wilson", agentName: "Sarah Chen", carrier: "Cigna", planType: "MA", amount: 510, reason: "rapid_disenrollment", chargebackDate: new Date().toISOString(), originalEnrollDate: new Date(Date.now() - 50 * 86400000).toISOString(), status: "pending", daysFromEnrollment: 50 },
];

// ── Renewal Forecasting ──────────────────────────────────────────────
export interface RenewalForecast {
  month: string;
  totalUpForRenewal: number;
  projectedRetained: number;
  projectedLost: number;
  estimatedRevenue: number;
  atRiskCount: number;
  confidenceScore: number;
}

export const mockRenewalForecast: RenewalForecast[] = [
  { month: "Sep 2026", totalUpForRenewal: 12, projectedRetained: 11, projectedLost: 1, estimatedRevenue: 6320, atRiskCount: 2, confidenceScore: 92 },
  { month: "Oct 2026", totalUpForRenewal: 28, projectedRetained: 25, projectedLost: 3, estimatedRevenue: 14700, atRiskCount: 5, confidenceScore: 89 },
  { month: "Nov 2026", totalUpForRenewal: 45, projectedRetained: 39, projectedLost: 6, estimatedRevenue: 23100, atRiskCount: 8, confidenceScore: 87 },
  { month: "Dec 2026", totalUpForRenewal: 18, projectedRetained: 16, projectedLost: 2, estimatedRevenue: 9450, atRiskCount: 3, confidenceScore: 88 },
  { month: "Jan 2027", totalUpForRenewal: 22, projectedRetained: 19, projectedLost: 3, estimatedRevenue: 11200, atRiskCount: 4, confidenceScore: 86 },
  { month: "Feb 2027", totalUpForRenewal: 15, projectedRetained: 13, projectedLost: 2, estimatedRevenue: 7660, atRiskCount: 3, confidenceScore: 87 },
];
