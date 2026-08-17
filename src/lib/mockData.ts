// Mock data for the Medicare Agency platform
import { format, parseISO } from "date-fns";

export type ClientStatus = "Active" | "Pending" | "Lapsed" | "Prospect";
export type PlanType = "MA" | "MAPD" | "CSNP" | "DSNP" | "MED SUPP" | "PART D" | "HOSPITAL INDEMNITY" | "FINAL EXPENSE" | "OTHER";
export type LeadSource = "Referral" | "Online" | "Walk-in" | "Phone" | "Event";
export type PolicyStatus = "Active" | "Pending" | "Lapsed" | "Cancelled";
export type TaskPriority = "High" | "Medium" | "Low";
export type ComplianceStatus = "Compliant" | "Expiring" | "Overdue" | "Missing";
export type AppointmentType = "Enrollment" | "Review" | "Renewal" | "Consultation";
export type AgentRole = "Agent" | "Admin" | "Retention";

export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: ClientStatus;
  planType: PlanType;
  carrier: string;
  enrollmentDate: string;
  renewalDate: string;
  premium: number;
  commission: number;
  agent: string;
  age: number;
  zip: string;
  leadSource: LeadSource;
  notes?: string;
}

export interface Policy {
  id: string;
  client: string;
  carrier: string;
  planType: PlanType;
  status: PolicyStatus;
  premium: number;
  commission: number;
  effectiveDate: string;
  renewalDate: string;
  agent: string;
}

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  email: string;
  phone: string;
  status: "Active" | "On Leave" | "Terminated";
  contracted: boolean;
  hireDate: string;
  bookSize: number;
  ytdCommissions: number;
  complianceScore: number;
  ahip: ComplianceStatus;
  ahipExpiry: string;
  carrierAppointments: { carrier: string; status: ComplianceStatus; expiry: string }[];
  certifications: { name: string; status: ComplianceStatus; expiry: string }[];
  w9OnFile: boolean;
  taxInfoComplete: boolean;
  tasks: { id: string; title: string; priority: TaskPriority; due: string; done: boolean }[];
  payments: { id: string; date: string; amount: number; type: "Commission" | "Bonus"; status: "Paid" | "Pending" }[];
}

export interface Appointment {
  id: string;
  client: string;
  agent: string;
  type: AppointmentType;
  date: string; // ISO date
  time: string;
  duration: number; // minutes
  status: "Confirmed" | "Pending" | "Completed" | "Cancelled";
  location: string;
  notes?: string;
}

export interface ComplianceItem {
  id: string;
  agent: string;
  category: string;
  item: string;
  status: ComplianceStatus;
  dueDate: string;
  severity: TaskPriority;
}

const carriers = ["UnitedHealthcare", "Humana", "Aetna", "Cigna", "Anthem", "WellCare", "Mutual of Omaha", "AARP"];
const planTypes: PlanType[] = ["MA", "MAPD", "CSNP", "DSNP", "MED SUPP", "PART D", "HOSPITAL INDEMNITY", "FINAL EXPENSE", "OTHER"];
const leadSources: LeadSource[] = ["Referral", "Online", "Walk-in", "Phone", "Event"];
const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez", "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin"];
const zips = ["33101", "33139", "33132", "33135", "33142", "33150", "33155", "33160", "33162", "33165"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dateOffset(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export const agents: Agent[] = [
  {
    id: "AG-001", name: "Daniel Reyes", role: "Agent", email: "daniel.reyes@agencybridge.com", phone: "(305) 555-0142",
    status: "Active", contracted: true, hireDate: "2021-03-15", bookSize: 248, ytdCommissions: 184500, complianceScore: 92,
    ahip: "Compliant", ahipExpiry: dateOffset(220),
    carrierAppointments: [
      { carrier: "UnitedHealthcare", status: "Compliant", expiry: dateOffset(180) },
      { carrier: "Humana", status: "Compliant", expiry: dateOffset(95) },
      { carrier: "Aetna", status: "Expiring", expiry: dateOffset(12) },
    ],
    certifications: [
      { name: "AHIP 2026", status: "Compliant", expiry: dateOffset(220) },
      { name: "Ethics Training", status: "Compliant", expiry: dateOffset(150) },
      { name: "Marketplace Cert", status: "Missing", expiry: dateOffset(-5) },
    ],
    w9OnFile: true, taxInfoComplete: true,
    tasks: [
      { id: "T1", title: "Complete Aetna reappointment", priority: "High", due: dateOffset(12), done: false },
      { id: "T2", title: "Submit Q3 commission reconciliation", priority: "Medium", due: dateOffset(7), done: false },
      { id: "T3", title: "Follow up with 5 pending renewals", priority: "High", due: dateOffset(3), done: false },
      { id: "T4", title: "Update Marketplace certification", priority: "Medium", due: dateOffset(-5), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-2), amount: 8420, type: "Commission", status: "Paid" },
      { id: "P2", date: dateOffset(-32), amount: 7100, type: "Commission", status: "Paid" },
      { id: "P3", date: dateOffset(-62), amount: 6350, type: "Commission", status: "Paid" },
      { id: "P4", date: dateOffset(5), amount: 9200, type: "Bonus", status: "Pending" },
    ],
  },
  {
    id: "AG-002", name: "Sophia Martinez", role: "Agent", email: "sophia.martinez@agencybridge.com", phone: "(305) 555-0188",
    status: "Active", contracted: true, hireDate: "2022-07-01", bookSize: 186, ytdCommissions: 142300, complianceScore: 78,
    ahip: "Expiring", ahipExpiry: dateOffset(18),
    carrierAppointments: [
      { carrier: "UnitedHealthcare", status: "Compliant", expiry: dateOffset(200) },
      { carrier: "Cigna", status: "Expiring", expiry: dateOffset(18) },
      { carrier: "WellCare", status: "Missing", expiry: dateOffset(-10) },
    ],
    certifications: [
      { name: "AHIP 2026", status: "Expiring", expiry: dateOffset(18) },
      { name: "Ethics Training", status: "Compliant", expiry: dateOffset(90) },
    ],
    w9OnFile: true, taxInfoComplete: false,
    tasks: [
      { id: "T1", title: "Renew AHIP certification", priority: "High", due: dateOffset(18), done: false },
      { id: "T2", title: "Complete WellCare appointment packet", priority: "High", due: dateOffset(-10), done: false },
      { id: "T3", title: "Submit updated W-9 and tax info", priority: "Medium", due: dateOffset(5), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-2), amount: 6200, type: "Commission", status: "Paid" },
      { id: "P2", date: dateOffset(-32), amount: 5400, type: "Commission", status: "Paid" },
      { id: "P3", date: dateOffset(8), amount: 4800, type: "Commission", status: "Pending" },
    ],
  },
  {
    id: "AG-003", name: "Marcus Johnson", role: "Agent", email: "marcus.johnson@agencybridge.com", phone: "(305) 555-0199",
    status: "Active", contracted: false, hireDate: "2024-01-10", bookSize: 94, ytdCommissions: 67800, complianceScore: 65,
    ahip: "Overdue", ahipExpiry: dateOffset(-30),
    carrierAppointments: [
      { carrier: "Humana", status: "Compliant", expiry: dateOffset(120) },
      { carrier: "Anthem", status: "Overdue", expiry: dateOffset(-15) },
    ],
    certifications: [
      { name: "AHIP 2026", status: "Overdue", expiry: dateOffset(-30) },
      { name: "Ethics Training", status: "Missing", expiry: dateOffset(-10) },
    ],
    w9OnFile: false, taxInfoComplete: false,
    tasks: [
      { id: "T1", title: "Complete AHIP certification immediately", priority: "High", due: dateOffset(-30), done: false },
      { id: "T2", title: "Submit W-9 and contractor agreement", priority: "High", due: dateOffset(-5), done: false },
      { id: "T3", title: "Reappoint with Anthem", priority: "High", due: dateOffset(-15), done: false },
      { id: "T4", title: "Complete Ethics Training", priority: "Medium", due: dateOffset(-10), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-3), amount: 3100, type: "Commission", status: "Paid" },
      { id: "P2", date: dateOffset(10), amount: 2800, type: "Commission", status: "Pending" },
    ],
  },
  {
    id: "AG-004", name: "Elena Vasquez", role: "Agent", email: "elena.vasquez@agencybridge.com", phone: "(305) 555-0177",
    status: "On Leave", contracted: true, hireDate: "2020-11-20", bookSize: 312, ytdCommissions: 210400, complianceScore: 88,
    ahip: "Compliant", ahipExpiry: dateOffset(190),
    carrierAppointments: [
      { carrier: "UnitedHealthcare", status: "Compliant", expiry: dateOffset(160) },
      { carrier: "Mutual of Omaha", status: "Compliant", expiry: dateOffset(140) },
      { carrier: "AARP", status: "Compliant", expiry: dateOffset(210) },
    ],
    certifications: [
      { name: "AHIP 2026", status: "Compliant", expiry: dateOffset(190) },
      { name: "Ethics Training", status: "Compliant", expiry: dateOffset(120) },
    ],
    w9OnFile: true, taxInfoComplete: true,
    tasks: [
      { id: "T1", title: "Review book during leave coverage plan", priority: "Medium", due: dateOffset(14), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-4), amount: 9100, type: "Commission", status: "Paid" },
      { id: "P2", date: dateOffset(-34), amount: 8600, type: "Commission", status: "Paid" },
    ],
  },
  {
    id: "AG-005", name: "Sarah Chen", role: "Agent", email: "sarah@agencybridge.com", phone: "(305) 555-0166",
    status: "Active", contracted: true, hireDate: "2023-02-01", bookSize: 156, ytdCommissions: 118200, complianceScore: 84,
    ahip: "Compliant", ahipExpiry: dateOffset(120),
    carrierAppointments: [
      { carrier: "UnitedHealthcare", status: "Compliant", expiry: dateOffset(150) },
      { carrier: "Humana", status: "Compliant", expiry: dateOffset(90) },
      { carrier: "Aetna", status: "Expiring", expiry: dateOffset(20) },
    ],
    certifications: [
      { name: "AHIP 2026", status: "Compliant", expiry: dateOffset(120) },
      { name: "Ethics Training", status: "Compliant", expiry: dateOffset(100) },
    ],
    w9OnFile: true, taxInfoComplete: true,
    tasks: [
      { id: "T1", title: "Follow up with 3 pending enrollments", priority: "High", due: dateOffset(2), done: false },
      { id: "T2", title: "Aetna reappointment due soon", priority: "Medium", due: dateOffset(20), done: false },
      { id: "T3", title: "Review 8 upcoming renewals", priority: "Medium", due: dateOffset(5), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-3), amount: 5600, type: "Commission", status: "Paid" },
      { id: "P2", date: dateOffset(-33), amount: 4900, type: "Commission", status: "Paid" },
      { id: "P3", date: dateOffset(7), amount: 4200, type: "Commission", status: "Pending" },
    ],
  },
  {
    id: "ADM-001", name: "Patricia Chen", role: "Admin", email: "patricia.chen@agencybridge.com", phone: "(305) 555-0100",
    status: "Active", contracted: true, hireDate: "2019-05-01", bookSize: 0, ytdCommissions: 0, complianceScore: 100,
    ahip: "Compliant", ahipExpiry: dateOffset(300),
    carrierAppointments: [],
    certifications: [{ name: "Admin Compliance", status: "Compliant", expiry: dateOffset(300) }],
    w9OnFile: true, taxInfoComplete: true,
    tasks: [
      { id: "T1", title: "Review Marcus Johnson compliance issues", priority: "High", due: dateOffset(1), done: false },
      { id: "T2", title: "Approve Q3 agent bonuses", priority: "Medium", due: dateOffset(5), done: false },
    ],
    payments: [],
  },
  {
    id: "RET-001", name: "Kevin O'Brien", role: "Retention", email: "kevin.obrien@agencybridge.com", phone: "(305) 555-0155",
    status: "Active", contracted: true, hireDate: "2021-09-15", bookSize: 840, ytdCommissions: 0, complianceScore: 95,
    ahip: "Compliant", ahipExpiry: dateOffset(250),
    carrierAppointments: [
      { carrier: "UnitedHealthcare", status: "Compliant", expiry: dateOffset(200) },
      { carrier: "Humana", status: "Compliant", expiry: dateOffset(180) },
    ],
    certifications: [{ name: "Retention Specialist", status: "Compliant", expiry: dateOffset(250) }],
    w9OnFile: true, taxInfoComplete: true,
    tasks: [
      { id: "T1", title: "Contact 23 at-risk clients", priority: "High", due: dateOffset(2), done: false },
      { id: "T2", title: "Review churn prediction model inputs", priority: "Medium", due: dateOffset(7), done: false },
    ],
    payments: [
      { id: "P1", date: dateOffset(-2), amount: 5200, type: "Bonus", status: "Paid" },
    ],
  },
];

export const clients: Client[] = Array.from({ length: 48 }, (_, i) => {
  const status: ClientStatus = rand(["Active", "Active", "Active", "Pending", "Prospect", "Lapsed"]);
  const planType = rand(planTypes);
  const carrier = rand(carriers);
  const fn = rand(firstNames);
  const ln = rand(lastNames);
  return {
    id: `CL-${(i + 1).toString().padStart(4, "0")}`,
    name: `${fn} ${ln}`,
    email: `${fn.toLowerCase()}.${ln.toLowerCase()}@email.com`,
    phone: `(305) 555-${randInt(1000, 9999)}`,
    status,
    planType,
    carrier,
    enrollmentDate: dateOffset(-randInt(30, 900)),
    renewalDate: dateOffset(randInt(-20, 300)),
    premium: randInt(0, 3) === 0 ? 0 : randInt(80, 280),
    commission: randInt(150, 620),
    agent: rand(agents.filter(a => a.role === "Agent")).name,
    age: randInt(65, 89),
    zip: rand(zips),
    leadSource: rand(leadSources),
    notes: randInt(0, 2) === 0 ? "Prefers phone contact. Spouse also enrolled." : undefined,
  };
});

export const policies: Policy[] = clients
  .filter(c => c.status === "Active" || c.status === "Pending" || c.status === "Lapsed")
  .map((c, i) => ({
    id: `PL-${(i + 1).toString().padStart(4, "0")}`,
    client: c.name,
    carrier: c.carrier,
    planType: c.planType,
    status: c.status === "Active" ? "Active" : c.status === "Pending" ? "Pending" : c.status === "Lapsed" ? "Lapsed" : "Cancelled",
    premium: c.premium,
    commission: c.commission,
    effectiveDate: c.enrollmentDate,
    renewalDate: c.renewalDate,
    agent: c.agent,
  }));

export const appointments: Appointment[] = [
  { id: "AP-001", client: "James Smith", agent: "Daniel Reyes", type: "Enrollment", date: dateOffset(0), time: "09:00", duration: 60, status: "Confirmed", location: "Office", notes: "First-time enrollment, turning 65" },
  { id: "AP-002", client: "Mary Johnson", agent: "Daniel Reyes", type: "Review", date: dateOffset(0), time: "11:00", duration: 45, status: "Confirmed", location: "Phone" },
  { id: "AP-003", client: "Robert Williams", agent: "Sophia Martinez", type: "Renewal", date: dateOffset(0), time: "14:00", duration: 30, status: "Pending", location: "Zoom" },
  { id: "AP-004", client: "Patricia Brown", agent: "Daniel Reyes", type: "Consultation", date: dateOffset(1), time: "10:00", duration: 60, status: "Confirmed", location: "Office" },
  { id: "AP-005", client: "John Davis", agent: "Sophia Martinez", type: "Enrollment", date: dateOffset(1), time: "13:30", duration: 90, status: "Confirmed", location: "Home Visit" },
  { id: "AP-006", client: "Jennifer Miller", agent: "Marcus Johnson", type: "Review", date: dateOffset(2), time: "09:30", duration: 45, status: "Pending", location: "Phone" },
  { id: "AP-007", client: "Michael Wilson", agent: "Daniel Reyes", type: "Renewal", date: dateOffset(2), time: "15:00", duration: 30, status: "Confirmed", location: "Office" },
  { id: "AP-008", client: "Linda Moore", agent: "Sophia Martinez", type: "Consultation", date: dateOffset(3), time: "11:30", duration: 60, status: "Confirmed", location: "Zoom" },
  { id: "AP-009", client: "David Taylor", agent: "Daniel Reyes", type: "Enrollment", date: dateOffset(4), time: "10:30", duration: 60, status: "Pending", location: "Office" },
  { id: "AP-010", client: "Elizabeth Anderson", agent: "Marcus Johnson", type: "Review", date: dateOffset(5), time: "14:30", duration: 45, status: "Confirmed", location: "Phone" },
  { id: "AP-011", client: "William Thomas", agent: "Daniel Reyes", type: "Renewal", date: dateOffset(-1), time: "09:00", duration: 30, status: "Completed", location: "Office" },
  { id: "AP-012", client: "Barbara Jackson", agent: "Sophia Martinez", type: "Consultation", date: dateOffset(-2), time: "13:00", duration: 60, status: "Completed", location: "Zoom" },
];

export const complianceItems: ComplianceItem[] = agents
  .filter(a => a.role === "Agent")
  .flatMap(a => [
    { id: `${a.id}-AHIP`, agent: a.name, category: "Certification", item: "AHIP 2026", status: a.ahip, dueDate: a.ahipExpiry, severity: "High" as TaskPriority },
    { id: `${a.id}-W9`, agent: a.name, category: "Tax", item: "W-9 on File", status: a.w9OnFile ? "Compliant" : "Missing", dueDate: a.hireDate, severity: "Medium" as TaskPriority },
    ...a.carrierAppointments.map(ca => ({
      id: `${a.id}-${ca.carrier}`, agent: a.name, category: "Carrier Appointment", item: ca.carrier, status: ca.status, dueDate: ca.expiry, severity: ca.status === "Overdue" ? "High" as TaskPriority : "Medium" as TaskPriority,
    })),
  ]);

// Dashboard metrics
export const dashboardStats = {
  activeClients: clients.filter(c => c.status === "Active").length,
  pendingRenewals: clients.filter(c => c.renewalDate <= dateOffset(60) && c.renewalDate >= dateOffset(0) && c.status === "Active").length,
  ytdCommissions: agents.reduce((sum, a) => sum + a.ytdCommissions, 0),
  upcomingAppointments: appointments.filter(a => a.date >= dateOffset(0) && a.date <= dateOffset(7)).length,
  totalBookSize: agents.reduce((sum, a) => sum + a.bookSize, 0),
  newClientsThisMonth: 8,
  pendingEnrollments: clients.filter(c => c.status === "Pending").length,
  lapsedPolicies: policies.filter(p => p.status === "Lapsed").length,
};

export const commissionTrend = [
  { month: "Jan", commission: 142000, policies: 38 },
  { month: "Feb", commission: 156000, policies: 42 },
  { month: "Mar", commission: 168000, policies: 45 },
  { month: "Apr", commission: 151000, policies: 40 },
  { month: "May", commission: 174000, policies: 48 },
  { month: "Jun", commission: 182000, policies: 51 },
  { month: "Jul", commission: 195000, policies: 54 },
  { month: "Aug", commission: 188000, policies: 49 },
];

export const carrierDistribution = [
  { name: "UnitedHealthcare", value: 142, color: "#1e3a5f" },
  { name: "Humana", value: 98, color: "#3b6fa0" },
  { name: "Aetna", value: 76, color: "#5b8cbe" },
  { name: "Cigna", value: 54, color: "#8fb0d4" },
  { name: "Anthem", value: 42, color: "#c2d4ea" },
  { name: "Other", value: 38, color: "#e8edf3" },
];

export const planTypeDistribution = [
  { name: "MA", value: 142, color: "#0f1b3d" },
  { name: "MAPD", value: 118, color: "#1e3a5f" },
  { name: "MED SUPP", value: 84, color: "#3b6fa0" },
  { name: "PART D", value: 62, color: "#5b8cbe" },
  { name: "DSNP", value: 38, color: "#8fb0d4" },
  { name: "CSNP", value: 24, color: "#c2d4ea" },
  { name: "HOSPITAL INDEMNITY", value: 18, color: "#e8edf3" },
  { name: "FINAL EXPENSE", value: 14, color: "#d4a574" },
  { name: "OTHER", value: 8, color: "#c9b99a" },
];

export const retentionData = [
  { month: "Jan", retained: 94, churned: 6 },
  { month: "Feb", retained: 93, churned: 7 },
  { month: "Mar", retained: 92, churned: 8 },
  { month: "Apr", retained: 91, churned: 9 },
  { month: "May", retained: 90, churned: 10 },
  { month: "Jun", retained: 89, churned: 11 },
  { month: "Jul", retained: 88, churned: 12 },
  { month: "Aug", retained: 87, churned: 13 },
];

export const atRiskClients = clients
  .filter(c => c.status === "Active")
  .slice(0, 6)
  .map((c, i) => ({
    ...c,
    churnRisk: randInt(62, 95),
    lastContact: dateOffset(-randInt(10, 90)),
    nextBestAction: rand([
      "Schedule annual review call",
      "Send plan comparison for upcoming changes",
      "Confirm renewal preferences",
      "Address premium increase concern",
      "Offer supplemental coverage review",
    ]),
  }));

// ---- Medicare Advantage retention ----
export type MAChurnFactor =
  | "Premium Increase"
  | "Network Change"
  | "Star Rating Drop"
  | "Benefit Reduction"
  | "LIS/Extra Help Loss"
  | "AEP Competitor Switch"
  | "Non-Renewal Notice"
  | "Dissatisfaction";

export type ElectionPeriod = "AEP" | "OEP" | "ICEP" | "SEP" | "None";

export interface MARiskClient {
  id: string;
  name: string;
  carrier: string;
  planName: string;
  starRating: number;
  churnRisk: number;
  lastContact: string;
  electionPeriod: ElectionPeriod;
  churnFactors: MAChurnFactor[];
  nextBestAction: string;
  premium: number;
  renewalDate: string;
  lisEligible: boolean;
  agent: string;
  age: number;
}

export const maAtRiskClients: MARiskClient[] = [
  {
    id: "MA-001", name: "Margaret Collins", carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage HMO",
    starRating: 4, churnRisk: 92, lastContact: dateOffset(-67), electionPeriod: "AEP",
    churnFactors: ["Premium Increase", "Network Change", "AEP Competitor Switch"],
    nextBestAction: "Schedule AEP plan comparison — UHC premium up $18/mo, Humana HMO $0 premium available in same network",
    premium: 142, renewalDate: dateOffset(98), lisEligible: false, agent: "Daniel Reyes", age: 71,
  },
  {
    id: "MA-002", name: "Harold Bennett", carrier: "Humana", planName: "Humana Honor MA PPO",
    starRating: 5, churnRisk: 88, lastContact: dateOffset(-45), electionPeriod: "AEP",
    churnFactors: ["Benefit Reduction", "Star Rating Drop"],
    nextBestAction: "Send benefit change notice — dental benefit reduced from $1,500 to $1,000 annual. Compare Aetna MA for dental coverage",
    premium: 0, renewalDate: dateOffset(102), lisEligible: true, agent: "Sophia Martinez", age: 68,
  },
  {
    id: "MA-003", name: "Dorothy Foster", carrier: "Aetna", planName: "Aetna Medicare Eagle HMO",
    starRating: 3, churnRisk: 85, lastContact: dateOffset(-89), electionPeriod: "OEP",
    churnFactors: ["Star Rating Drop", "Network Change", "Dissatisfaction"],
    nextBestAction: "OEP plan switch opportunity — 3-star plan losing providers. Present UHC 4.5-star PPO with same primary care network",
    premium: 64, renewalDate: dateOffset(75), lisEligible: true, agent: "Daniel Reyes", age: 74,
  },
  {
    id: "MA-004", name: "Raymond Hughes", carrier: "WellCare", planName: "WellCare Value MA PPO",
    starRating: 3, churnRisk: 91, lastContact: dateOffset(-112), electionPeriod: "SEP",
    churnFactors: ["Non-Renewal Notice", "LIS/Extra Help Loss"],
    nextBestAction: "Urgent: WellCare non-renewing this plan. SEP eligible — present 3 alternative MA plans with LIS coverage before disenrollment",
    premium: 0, renewalDate: dateOffset(30), lisEligible: true, agent: "Marcus Johnson", age: 77,
  },
  {
    id: "MA-005", name: "Gloria Simmons", carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage PPO",
    starRating: 5, churnRisk: 78, lastContact: dateOffset(-34), electionPeriod: "AEP",
    churnFactors: ["Premium Increase", "AEP Competitor Switch"],
    nextBestAction: "Proactive AEP retention call — premium up $12/mo. Highlight UHC $0 premium D-SNP alternative with Extra Help integration",
    premium: 88, renewalDate: dateOffset(95), lisEligible: false, agent: "Daniel Reyes", age: 69,
  },
  {
    id: "MA-006", name: "Frank Sullivan", carrier: "Cigna", planName: "Cigna Medicare Select HMO",
    starRating: 4, churnRisk: 82, lastContact: dateOffset(-56), electionPeriod: "None",
    churnFactors: ["Network Change", "Dissatisfaction"],
    nextBestAction: "Schedule network review — specialist left Cigna network. Verify alternatives or AEP switch to Aetna PPO with broader network",
    premium: 44, renewalDate: dateOffset(120), lisEligible: false, agent: "Sophia Martinez", age: 72,
  },
  {
    id: "MA-007", name: "Helen Walker", carrier: "Humana", planName: "Humana Gold Plus HMO",
    starRating: 4, churnRisk: 74, lastContact: dateOffset(-28), electionPeriod: "AEP",
    churnFactors: ["Benefit Reduction", "Premium Increase"],
    nextBestAction: "Send AEP comparison packet — OTC benefit cut from $75 to $50/qtr. Compare WellCare MA with $100/qtr OTC allowance",
    premium: 28, renewalDate: dateOffset(100), lisEligible: true, agent: "Marcus Johnson", age: 70,
  },
  {
    id: "MA-008", name: "Walter Reed", carrier: "Aetna", planName: "Aetna Medicare Prime PPO",
    starRating: 5, churnRisk: 68, lastContact: dateOffset(-21), electionPeriod: "None",
    churnFactors: ["AEP Competitor Switch"],
    nextBestAction: "Wellness check + benefit review — client inquired about competitor mailers. Reinforce 5-star benefits and agent relationship",
    premium: 52, renewalDate: dateOffset(140), lisEligible: false, agent: "Daniel Reyes", age: 66,
  },
];

export const maCarrierRetention = [
  { carrier: "UnitedHealthcare", total: 142, retained: 131, churned: 11, starRating: 4.5, retentionRate: 92 },
  { carrier: "Humana", total: 98, retained: 87, churned: 11, starRating: 4.0, retentionRate: 89 },
  { carrier: "Aetna", total: 76, retained: 64, churned: 12, starRating: 4.0, retentionRate: 84 },
  { carrier: "WellCare", total: 38, retained: 29, churned: 9, starRating: 3.0, retentionRate: 76 },
  { carrier: "Cigna", total: 34, retained: 28, churned: 6, starRating: 4.0, retentionRate: 82 },
];

export const maChurnDrivers = [
  { driver: "Premium Increase", count: 38, color: "#e85d3a" },
  { driver: "Network Change", count: 29, color: "#d97757" },
  { driver: "Benefit Reduction", count: 24, color: "#c97a6e" },
  { driver: "AEP Competitor Switch", count: 22, color: "#3b6fa0" },
  { driver: "Star Rating Drop", count: 18, color: "#5b8cbe" },
  { driver: "LIS/Extra Help Loss", count: 14, color: "#8fb0d4" },
  { driver: "Non-Renewal Notice", count: 9, color: "#1e3a5f" },
  { driver: "Dissatisfaction", count: 7, color: "#c2d4ea" },
];

export const aepOepTimeline = [
  { period: "ICEP", label: "Initial Coverage Election", start: "Jan 1", end: "Mar 31", active: false, description: "First-time MA enrollment for newly eligible" },
  { period: "AEP", label: "Annual Election Period", start: "Oct 15", end: "Dec 7", active: true, description: "Open MA plan changes — highest churn window" },
  { period: "OEP", label: "Open Enrollment Period", start: "Jan 1", end: "Mar 31", active: false, description: "One-time MA plan switch opportunity" },
];

export interface AlternativePlan {
  carrier: string;
  planName: string;
  premium: number;
  starRating: number;
  lisCompatible: boolean;
  monthlySavings: number;
  keyBenefits: string[];
  networkMatch: boolean;
}

export interface NonRenewalNotice {
  id: string;
  clientName: string;
  carrier: string;
  planName: string;
  nonRenewalDate: string;
  sepDeadline: string;
  daysUntilDeadline: number;
  lisEligible: boolean;
  agent: string;
  age: number;
  currentPremium: number;
  starRating: number;
  status: "Action Needed" | "Workflow Generated" | "Contacted" | "Enrolled";
  alternativePlans: AlternativePlan[];
  workflowSteps: { id: string; step: string; done: boolean }[];
}

export const maNonRenewalNotices: NonRenewalNotice[] = [
  {
    id: "NR-001", clientName: "Raymond Hughes", carrier: "WellCare", planName: "WellCare Value MA PPO",
    nonRenewalDate: dateOffset(30), sepDeadline: dateOffset(30), daysUntilDeadline: 30,
    lisEligible: true, agent: "Marcus Johnson", age: 77, currentPremium: 0, starRating: 3,
    status: "Action Needed",
    alternativePlans: [
      { carrier: "UnitedHealthcare", planName: "UHC Dual Complete HMO", premium: 0, starRating: 4.5, lisCompatible: true, monthlySavings: 0, keyBenefits: ["Dental $1,500/yr", "Vision $200", "OTC $100/qtr", "Transportation"], networkMatch: true },
      { carrier: "Humana", planName: "Humana Dual Honor PPO", premium: 0, starRating: 4, lisCompatible: true, monthlySavings: 0, keyBenefits: ["Dental $1,200/yr", "OTC $75/qtr", "SilverSneakers", "Meals post-discharge"], networkMatch: true },
      { carrier: "Aetna", planName: "Aetna Eagle Dual HMO", premium: 0, starRating: 4, lisCompatible: true, monthlySavings: 0, keyBenefits: ["Dental $1,000/yr", "Vision $150", "OTC $50/qtr", "In-home support"], networkMatch: false },
    ],
    workflowSteps: [
      { id: "S1", step: "Send non-renewal notification acknowledgment", done: true },
      { id: "S2", step: "Verify SEP eligibility and LIS status", done: true },
      { id: "S3", step: "Generate alternative plan comparison", done: false },
      { id: "S4", step: "Schedule enrollment appointment", done: false },
      { id: "S5", step: "Submit new MA enrollment application", done: false },
      { id: "S6", step: "Confirm disenrollment from WellCare plan", done: false },
    ],
  },
  {
    id: "NR-002", clientName: "Dorothy Foster", carrier: "Aetna", planName: "Aetna Medicare Eagle HMO",
    nonRenewalDate: dateOffset(45), sepDeadline: dateOffset(45), daysUntilDeadline: 45,
    lisEligible: true, agent: "Daniel Reyes", age: 74, currentPremium: 64, starRating: 3,
    status: "Workflow Generated",
    alternativePlans: [
      { carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage PPO", premium: 0, starRating: 4.5, lisCompatible: true, monthlySavings: 64, keyBenefits: ["Dental $1,500/yr", "Vision $200", "OTC $100/qtr", "Fitness"], networkMatch: true },
      { carrier: "Humana", planName: "Humana Gold Plus HMO", premium: 28, starRating: 4, lisCompatible: true, monthlySavings: 36, keyBenefits: ["Dental $1,200/yr", "OTC $75/qtr", "SilverSneakers"], networkMatch: true },
    ],
    workflowSteps: [
      { id: "S1", step: "Send non-renewal notification acknowledgment", done: true },
      { id: "S2", step: "Verify SEP eligibility and LIS status", done: true },
      { id: "S3", step: "Generate alternative plan comparison", done: true },
      { id: "S4", step: "Schedule enrollment appointment", done: true },
      { id: "S5", step: "Submit new MA enrollment application", done: false },
      { id: "S6", step: "Confirm disenrollment from Aetna plan", done: false },
    ],
  },
  {
    id: "NR-003", clientName: "Harold Bennett", carrier: "Humana", planName: "Humana Honor MA PPO",
    nonRenewalDate: dateOffset(60), sepDeadline: dateOffset(60), daysUntilDeadline: 60,
    lisEligible: true, agent: "Sophia Martinez", age: 68, currentPremium: 0, starRating: 5,
    status: "Contacted",
    alternativePlans: [
      { carrier: "UnitedHealthcare", planName: "UHC Dual Complete HMO", premium: 0, starRating: 4.5, lisCompatible: true, monthlySavings: 0, keyBenefits: ["Dental $1,500/yr", "Vision $200", "OTC $100/qtr", "Transportation"], networkMatch: true },
      { carrier: "WellCare", planName: "WellCare Dual Complete PPO", premium: 0, starRating: 3, lisCompatible: true, monthlySavings: 0, keyBenefits: ["Dental $1,000/yr", "OTC $100/qtr", "Meals post-discharge"], networkMatch: false },
    ],
    workflowSteps: [
      { id: "S1", step: "Send non-renewal notification acknowledgment", done: true },
      { id: "S2", step: "Verify SEP eligibility and LIS status", done: true },
      { id: "S3", step: "Generate alternative plan comparison", done: true },
      { id: "S4", step: "Schedule enrollment appointment", done: true },
      { id: "S5", step: "Submit new MA enrollment application", done: true },
      { id: "S6", step: "Confirm disenrollment from Humana plan", done: false },
    ],
  },
  {
    id: "NR-004", clientName: "Gloria Simmons", carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage PPO",
    nonRenewalDate: dateOffset(15), sepDeadline: dateOffset(15), daysUntilDeadline: 15,
    lisEligible: false, agent: "Daniel Reyes", age: 69, currentPremium: 88, starRating: 5,
    status: "Action Needed",
    alternativePlans: [
      { carrier: "Aetna", planName: "Aetna Medicare Prime PPO", premium: 52, starRating: 5, lisCompatible: false, monthlySavings: 36, keyBenefits: ["Dental $1,500/yr", "Vision $250", "OTC $75/qtr", "Fitness"], networkMatch: true },
      { carrier: "Humana", planName: "Humana Gold Plus HMO", premium: 28, starRating: 4, lisCompatible: false, monthlySavings: 60, keyBenefits: ["Dental $1,200/yr", "OTC $75/qtr", "SilverSneakers"], networkMatch: true },
      { carrier: "Cigna", planName: "Cigna Medicare Select HMO", premium: 44, starRating: 4, lisCompatible: false, monthlySavings: 44, keyBenefits: ["Dental $1,000/yr", "Vision $150", "Telehealth $0"], networkMatch: false },
    ],
    workflowSteps: [
      { id: "S1", step: "Send non-renewal notification acknowledgment", done: true },
      { id: "S2", step: "Verify SEP eligibility", done: false },
      { id: "S3", step: "Generate alternative plan comparison", done: false },
      { id: "S4", step: "Schedule enrollment appointment", done: false },
      { id: "S5", step: "Submit new MA enrollment application", done: false },
      { id: "S6", step: "Confirm disenrollment from UHC plan", done: false },
    ],
  },
  {
    id: "NR-005", clientName: "Frank Sullivan", carrier: "Cigna", planName: "Cigna Medicare Select HMO",
    nonRenewalDate: dateOffset(75), sepDeadline: dateOffset(75), daysUntilDeadline: 75,
    lisEligible: false, agent: "Sophia Martinez", age: 72, currentPremium: 44, starRating: 4,
    status: "Workflow Generated",
    alternativePlans: [
      { carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage PPO", premium: 0, starRating: 4.5, lisCompatible: false, monthlySavings: 44, keyBenefits: ["Dental $1,500/yr", "Vision $200", "OTC $100/qtr", "Fitness"], networkMatch: true },
      { carrier: "Aetna", planName: "Aetna Medicare Prime PPO", premium: 52, starRating: 5, lisCompatible: false, monthlySavings: -8, keyBenefits: ["Dental $1,500/yr", "Vision $250", "OTC $75/qtr"], networkMatch: true },
    ],
    workflowSteps: [
      { id: "S1", step: "Send non-renewal notification acknowledgment", done: true },
      { id: "S2", step: "Verify SEP eligibility", done: true },
      { id: "S3", step: "Generate alternative plan comparison", done: true },
      { id: "S4", step: "Schedule enrollment appointment", done: false },
      { id: "S5", step: "Submit new MA enrollment application", done: false },
      { id: "S6", step: "Confirm disenrollment from Cigna plan", done: false },
    ],
  },
];

// ---- AEP Campaign Scheduler ----
export interface AEPCampaignTask {
  id: string;
  clientId: string;
  clientName: string;
  carrier: string;
  planName: string;
  starRating: number;
  churnRisk: number;
  lisEligible: boolean;
  outreachType: "Call" | "Email" | "SMS" | "In-Person" | "Plan Comparison";
  scheduledDate: string;
  status: "Pending" | "Scheduled" | "Completed" | "Overdue";
  priority: "High" | "Medium" | "Low";
  agent: string;
  notes: string;
}

export const aepCampaignInfo = {
  name: "AEP 2026 Retention Campaign",
  startDate: "Oct 15",
  endDate: "Dec 7",
  totalDays: 54,
};

export const aepCampaignTasks: AEPCampaignTask[] = maAtRiskClients.flatMap((c, i) => {
  const firstTouchDay = 70 + (i % 4) * 3;
  const tasks: AEPCampaignTask[] = [
    {
      id: `AEP-${c.id}-1`,
      clientId: c.id,
      clientName: c.name,
      carrier: c.carrier,
      planName: c.planName,
      starRating: c.starRating,
      churnRisk: c.churnRisk,
      lisEligible: c.lisEligible,
      outreachType: "Call",
      scheduledDate: dateOffset(firstTouchDay),
      status: i < 3 ? "Completed" : "Scheduled",
      priority: c.churnRisk >= 85 ? "High" : c.churnRisk >= 70 ? "Medium" : "Low",
      agent: c.agent,
      notes: c.nextBestAction,
    },
  ];
  if (c.churnRisk >= 75) {
    tasks.push({
      id: `AEP-${c.id}-2`,
      clientId: c.id,
      clientName: c.name,
      carrier: c.carrier,
      planName: c.planName,
      starRating: c.starRating,
      churnRisk: c.churnRisk,
      lisEligible: c.lisEligible,
      outreachType: "Plan Comparison",
      scheduledDate: dateOffset(firstTouchDay + 14),
      status: "Pending",
      priority: c.churnRisk >= 85 ? "High" : "Medium",
      agent: c.agent,
      notes: `Send personalized plan comparison packet for ${c.carrier} vs alternatives`,
    });
  }
  if (c.churnRisk >= 85) {
    tasks.push({
      id: `AEP-${c.id}-3`,
      clientId: c.id,
      clientName: c.name,
      carrier: c.carrier,
      planName: c.planName,
      starRating: c.starRating,
      churnRisk: c.churnRisk,
      lisEligible: c.lisEligible,
      outreachType: "In-Person",
      scheduledDate: dateOffset(firstTouchDay + 28),
      status: "Pending",
      priority: "High",
      agent: c.agent,
      notes: "In-home enrollment visit — finalize plan switch before Dec 7 deadline",
    });
  }
  return tasks;
});

export const maRetentionStats = {
  maActiveBook: 388,
  maRetentionRate: 87,
  maAtRisk: 8,
  avgStarRating: 4.1,
  lisClients: 94,
  aepRenewals: 142,
  oepSwitches: 38,
  nonRenewalNotices: 9,
  churnPredicted: 47,
};

// ---- Two-way communication timeline ----
export type MessageChannel = "sms" | "email";
export type MessageDirection = "inbound" | "outbound";

export interface TimelineMessage {
  id: string;
  channel: MessageChannel;
  direction: MessageDirection;
  body: string;
  timestamp: string; // ISO
  status: "delivered" | "read" | "sent" | "failed";
}

export const messageTemplates: { id: string; label: string; channel: MessageChannel; body: string }[] = [
  { id: "tpl-1", label: "Renewal reminder", channel: "sms", body: "Hi {firstName}, your Medicare {planType} renewal with {carrier} is coming up on {renewalDate}. Reply or call us to confirm. – agencyBRIDGE" },
  { id: "tpl-2", label: "Appointment confirmation", channel: "sms", body: "Hi {firstName}, confirming your appointment on {renewalDate}. Reply Y to confirm or R to reschedule. – agencyBRIDGE" },
  { id: "tpl-3", label: "Welcome email", channel: "email", body: "Welcome {firstName}! Thank you for choosing agencyBRIDGE. Your {planType} plan with {carrier} is now active. Attached is your enrollment summary and agent contact card. Reach out anytime. – The agencyBRIDGE Team" },
  { id: "tpl-4", label: "Missing info follow-up", channel: "email", body: "Hi {firstName}, we're missing a few details to finalize your enrollment with {carrier}. Please log in or reply to complete your {planType} application before {renewalDate}. – agencyBRIDGE" },
  { id: "tpl-5", label: "Annual review invite", channel: "sms", body: "Hi {firstName}, it's time for your annual Medicare review. Reply with a good time to chat and we'll schedule it. – agencyBRIDGE" },
  { id: "tpl-6", label: "Premium change notice", channel: "email", body: "Dear {firstName}, {carrier} has updated premium details for your {planType} plan effective {renewalDate}. Review changes and options with your agent. – agencyBRIDGE" },
];

function buildTimeline(c: Client): TimelineMessage[] {
  const msgs: Omit<TimelineMessage, "id">[] = [
    { channel: "email", direction: "outbound", body: `Hi ${c.name.split(" ")[0]}, welcome to agencyBRIDGE. Your ${c.planType} enrollment with ${c.carrier} is being processed.`, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), status: "read" },
    { channel: "sms", direction: "inbound", body: "Got it, thank you! When will it be active?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), status: "read" },
    { channel: "sms", direction: "outbound", body: `Your plan goes active on ${format(parseISO(c.enrollmentDate), "MMM d")}. I'll send a reminder closer to the date.`, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(), status: "delivered" },
    { channel: "email", direction: "outbound", body: `Reminder: your ${c.planType} renewal with ${c.carrier} is scheduled. Please review the attached summary.`, timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(), status: "read" },
    { channel: "sms", direction: "inbound", body: "Can we move the renewal call to next week?", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), status: "read" },
  ];
  return msgs.map((m, i) => ({ ...m, id: `${c.id}-M${i + 1}` }));
}

export const clientTimelines: Record<string, TimelineMessage[]> = Object.fromEntries(
  clients.slice(0, 12).map(c => [c.id, buildTimeline(c)])
);

export interface ContactStats {
  lastContacted: string | null; // ISO timestamp
  responseRate: number; // 0-100
  preferredChannel: MessageChannel;
  totalMessages: number;
  inboundCount: number;
  outboundCount: number;
}

// ---- MA Plan Comparison Tool ----
export interface MAPlan {
  id: string;
  carrier: string;
  planName: string;
  planType: "HMO" | "PPO" | "SNP" | "D-SNP";
  premium: number;
  starRating: number;
  moop: number; // max out-of-pocket
  lisCompatible: boolean;
  networkType: string;
  pcpRequired: boolean;
  referralRequired: boolean;
  dental: number; // annual allowance
  vision: number;
  hearing: number;
  otcQuarterly: number;
  transportation: number; // one-way trips/year
  fitness: boolean;
  mealsPostDischarge: boolean;
  telehealth: boolean;
  partBGiveback: number; // monthly Part B premium reduction
  keyBenefits: string[];
  enrollmentCount: number;
  market: string;
}

export const maPlansForComparison: MAPlan[] = [
  {
    id: "PL-UHC-1", carrier: "UnitedHealthcare", planName: "UHC Medicare Advantage PPO", planType: "PPO",
    premium: 0, starRating: 4.5, moop: 4900, lisCompatible: false, networkType: "National PPO",
    pcpRequired: false, referralRequired: false, dental: 1500, vision: 200, hearing: 500,
    otcQuarterly: 100, transportation: 24, fitness: true, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 142, market: "Miami-Dade",
    keyBenefits: ["National network", "$0 premium", "SilverSneakers", "OTC allowance"],
  },
  {
    id: "PL-UHC-2", carrier: "UnitedHealthcare", planName: "UHC Dual Complete HMO", planType: "D-SNP",
    premium: 0, starRating: 4.5, moop: 3400, lisCompatible: true, networkType: "Regional HMO",
    pcpRequired: true, referralRequired: true, dental: 1500, vision: 200, hearing: 500,
    otcQuarterly: 100, transportation: 60, fitness: true, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 68, market: "Miami-Dade",
    keyBenefits: ["LIS/Extra Help integrated", "Enhanced transportation", "Care coordination"],
  },
  {
    id: "PL-HUM-1", carrier: "Humana", planName: "Humana Gold Plus HMO", planType: "HMO",
    premium: 28, starRating: 4, moop: 5900, lisCompatible: false, networkType: "Regional HMO",
    pcpRequired: true, referralRequired: true, dental: 1200, vision: 150, hearing: 400,
    otcQuarterly: 75, transportation: 12, fitness: true, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 98, market: "Miami-Dade",
    keyBenefits: ["SilverSneakers", "OTC allowance", "Meals post-discharge"],
  },
  {
    id: "PL-HUM-2", carrier: "Humana", planName: "Humana Honor MA PPO", planType: "PPO",
    premium: 0, starRating: 5, moop: 4500, lisCompatible: true, networkType: "National PPO",
    pcpRequired: false, referralRequired: false, dental: 1500, vision: 200, hearing: 500,
    otcQuarterly: 100, transportation: 24, fitness: true, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 25, enrollmentCount: 54, market: "Miami-Dade",
    keyBenefits: ["5-star plan", "Part B giveback $25/mo", "National PPO", "LIS compatible"],
  },
  {
    id: "PL-AET-1", carrier: "Aetna", planName: "Aetna Medicare Prime PPO", planType: "PPO",
    premium: 52, starRating: 5, moop: 4200, lisCompatible: false, networkType: "National PPO",
    pcpRequired: false, referralRequired: false, dental: 1500, vision: 250, hearing: 600,
    otcQuarterly: 75, transportation: 12, fitness: true, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 76, market: "Miami-Dade",
    keyBenefits: ["5-star plan", "Enhanced vision", "National PPO", "Telehealth $0"],
  },
  {
    id: "PL-AET-2", carrier: "Aetna", planName: "Aetna Eagle Dual HMO", planType: "D-SNP",
    premium: 0, starRating: 4, moop: 3100, lisCompatible: true, networkType: "Regional HMO",
    pcpRequired: true, referralRequired: true, dental: 1000, vision: 150, hearing: 400,
    otcQuarterly: 50, transportation: 36, fitness: false, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 32, market: "Miami-Dade",
    keyBenefits: ["LIS/Extra Help", "In-home support", "Transportation 36 trips"],
  },
  {
    id: "PL-CIG-1", carrier: "Cigna", planName: "Cigna Medicare Select HMO", planType: "HMO",
    premium: 44, starRating: 4, moop: 5500, lisCompatible: false, networkType: "Regional HMO",
    pcpRequired: true, referralRequired: true, dental: 1000, vision: 150, hearing: 400,
    otcQuarterly: 50, transportation: 0, fitness: false, mealsPostDischarge: false, telehealth: true,
    partBGiveback: 0, enrollmentCount: 34, market: "Miami-Dade",
    keyBenefits: ["Telehealth $0", "Dental $1,000/yr", "Lower premium"],
  },
  {
    id: "PL-WC-1", carrier: "WellCare", planName: "WellCare Value MA PPO", planType: "PPO",
    premium: 0, starRating: 3, moop: 6500, lisCompatible: true, networkType: "Regional PPO",
    pcpRequired: false, referralRequired: false, dental: 1000, vision: 150, hearing: 400,
    otcQuarterly: 100, transportation: 24, fitness: false, mealsPostDischarge: true, telehealth: true,
    partBGiveback: 0, enrollmentCount: 38, market: "Miami-Dade",
    keyBenefits: ["$0 premium", "OTC $100/qtr", "Meals post-discharge"],
  },
];

export function getClientCurrentPlan(clientId: string): MAPlan | null {
  const client = maAtRiskClients.find(c => c.id === clientId);
  if (!client) return null;
  return maPlansForComparison.find(p =>
    p.carrier === client.carrier && p.planName.toLowerCase().includes(client.planName.toLowerCase().split(" ").slice(-2).join(" "))
  ) ?? maPlansForComparison.find(p => p.carrier === client.carrier) ?? null;
}

export function getClientContactStats(clientId: string): ContactStats {
  const msgs = clientTimelines[clientId] ?? [];
  const outbound = msgs.filter(m => m.direction === "outbound");
  const inbound = msgs.filter(m => m.direction === "inbound");
  const smsCount = msgs.filter(m => m.channel === "sms").length;
  const emailCount = msgs.filter(m => m.channel === "email").length;
  const lastTs = msgs.length
    ? msgs.reduce((latest, m) => (m.timestamp > latest ? m.timestamp : latest), msgs[0].timestamp)
    : null;

  // response rate: share of outbound messages that received at least one inbound reply after them
  let replied = 0;
  outbound.forEach((o) => {
    if (inbound.some(i => i.timestamp > o.timestamp)) replied++;
  });
  const responseRate = outbound.length ? Math.round((replied / outbound.length) * 100) : 0;

  return {
    lastContacted: lastTs,
    responseRate,
    preferredChannel: smsCount >= emailCount ? "sms" : "email",
    totalMessages: msgs.length,
    inboundCount: inbound.length,
    outboundCount: outbound.length,
  };
}

// ── Commission Reconciliation ──────────────────────────────────────

export type VarianceClass =
  | "paid_on_time"
  | "paid_late"
  | "short_pay"
  | "over_pay"
  | "chargeback_valid"
  | "chargeback_disputable"
  | "missing"
  | "unexpected_payment"
  | "split_mismatch"
  | "tax_form_drift";

export type CommissionEventType =
  | "initial_payment"
  | "renewal_payment"
  | "chargeback_rapid_disenrollment"
  | "chargeback_other"
  | "adjustment_positive"
  | "adjustment_negative"
  | "true_up"
  | "split_payment"
  | "override";

export type DisputeStatus = "open" | "in_review" | "resolved" | "rejected";

export interface CommissionEvent {
  event_id: string;
  carrier: string;
  plan_type: PlanType;
  agent: string;
  agent_npn: string;
  event_type: CommissionEventType;
  plan_year: number;
  effective_date: string;
  gross_amount: number;
  net_amount: number;
  expected_amount: number;
  variance: number;
  variance_class: VarianceClass;
  source_ref: string;
  ingested_at: string;
}

export interface DisputeRecord {
  id: string;
  event_id: string;
  carrier: string;
  agent: string;
  variance_class: VarianceClass;
  variance_amount: number;
  status: DisputeStatus;
  opened_date: string;
  aging_days: number;
  summary: string;
  citation: string;
  suggested_response: string;
}

export interface CarrierQuirk {
  carrier: string;
  statement_format: string;
  known_issues: string[];
}

const varianceClasses: VarianceClass[] = [
  "paid_on_time", "paid_late", "short_pay", "over_pay",
  "chargeback_valid", "chargeback_disputable", "missing",
  "unexpected_payment", "split_mismatch", "tax_form_drift",
];

const eventTypes: CommissionEventType[] = [
  "initial_payment", "renewal_payment", "chargeback_rapid_disenrollment",
  "chargeback_other", "adjustment_positive", "adjustment_negative",
  "true_up", "split_payment", "override",
];

const npnPool = ["1234567", "2345678", "3456789", "4567890", "5678901", "6789012"];
const agentNames = agents.filter(a => a.role === "Agent").map(a => a.name);

function deterministicVariance(vc: VarianceClass, expected: number): { net: number; variance: number } {
  switch (vc) {
    case "paid_on_time": return { net: expected, variance: 0 };
    case "paid_late": return { net: expected, variance: 0 };
    case "short_pay": { const v = -Math.round(expected * (0.05 + Math.random() * 0.2)); return { net: expected + v, variance: v }; }
    case "over_pay": { const v = Math.round(expected * (0.03 + Math.random() * 0.12)); return { net: expected + v, variance: v }; }
    case "chargeback_valid": { const v = -expected; return { net: 0, variance: v }; }
    case "chargeback_disputable": { const v = -Math.round(expected * (0.5 + Math.random() * 0.5)); return { net: expected + v, variance: v }; }
    case "missing": return { net: 0, variance: -expected };
    case "unexpected_payment": { const v = Math.round(200 + Math.random() * 600); return { net: v, variance: v }; }
    case "split_mismatch": { const v = -Math.round(expected * (0.02 + Math.random() * 0.08)); return { net: expected + v, variance: v }; }
    case "tax_form_drift": { const v = -Math.round(expected * (0.01 + Math.random() * 0.04)); return { net: expected + v, variance: v }; }
  }
}

export const commissionEvents: CommissionEvent[] = Array.from({ length: 48 }, (_, i) => {
  const carrier = rand(carriers);
  const planType = rand(planTypes);
  const agent = rand(agentNames);
  const eventType = rand(eventTypes);
  const vc = rand(varianceClasses);
  const expected = randInt(150, 650);
  const { net, variance } = deterministicVariance(vc, expected);
  const effectiveDate = dateOffset(-randInt(1, 90));
  return {
    event_id: `EVT-${String(i + 1).padStart(4, "0")}`,
    carrier,
    plan_type: planType,
    agent,
    agent_npn: rand(npnPool),
    event_type: eventType,
    plan_year: 2026,
    effective_date: effectiveDate,
    gross_amount: expected,
    net_amount: net,
    expected_amount: expected,
    variance,
    variance_class: vc,
    source_ref: `STMT-${carrier.slice(0, 3).toUpperCase()}-${2026}-${String(randInt(1, 12)).padStart(2, "0")}`,
    ingested_at: `${effectiveDate}T10:${String(randInt(0, 59)).padStart(2, "0")}:00Z`,
  };
});

export const carrierQuirks: CarrierQuirk[] = [
  { carrier: "Humana", statement_format: "CSV", known_issues: ["Negative amounts in 'Comm Amount' column rather than separate chargeback rows", "Late-month splits often arrive following month with no reference back"] },
  { carrier: "UnitedHealthcare", statement_format: "CSV", known_issues: ["Column headers renamed between Q1 and Q2 exports", "Rounding to whole dollars on some rows, cents on others"] },
  { carrier: "Aetna", statement_format: "PDF", known_issues: ["Multi-page totals split — last page carries the true total", "Chargeback reason codes in a separate lookup file not included in export"] },
  { carrier: "Cigna", statement_format: "CSV", known_issues: ["Date format switches from MM/DD/YYYY to YYYY-MM-DD mid-file", "Override rows lack agent NPN — must join by name"] },
  { carrier: "WellCare", statement_format: "CSV", known_issues: ["Renewal payments labeled as 'adjustment' with no plan_year field", "Beneficiary names appear in statement export — PHI redaction required before storage"] },
  { carrier: "Anthem", statement_format: "PDF", known_issues: ["Table layout shifts when a row wraps to two lines", "Star rating column sometimes blank — must join from CMS Star Ratings file"] },
];

const disputeableClasses: VarianceClass[] = ["short_pay", "chargeback_disputable", "missing", "split_mismatch", "over_pay"];

export const disputeRecords: DisputeRecord[] = commissionEvents
  .filter(e => disputeableClasses.includes(e.variance_class))
  .slice(0, 12)
  .map((e, i) => {
    const aging = randInt(2, 65);
    const summaries: Record<string, string> = {
      short_pay: `Carrier paid $${Math.abs(e.variance).toFixed(2)} less than the expected commission of $${e.expected_amount.toFixed(2)} for ${e.plan_type} enrollment. No explanation or adjustment code present on the statement.`,
      chargeback_disputable: `Chargeback of $${Math.abs(e.variance).toFixed(2)} applied outside the RDR window (3-month rapid disenrollment period). Enrollment was effective ${e.effective_date}; chargeback appeared ${randInt(4, 9)} months later.`,
      missing: `Expected ${e.event_type.replace(/_/g, " ")} of $${e.expected_amount.toFixed(2)} for plan year ${e.plan_year} has no matching payment event on any carrier statement in the last 60 days.`,
      split_mismatch: `Agency hierarchy split produced a $${Math.abs(e.variance).toFixed(2)} shortfall. Expected net $${e.expected_amount.toFixed(2)}, received $${e.net_amount.toFixed(2)}. Likely FMO override percentage misapplied.`,
      over_pay: `Overpayment of $${e.variance.toFixed(2)} detected. Expected $${e.expected_amount.toFixed(2)}, received $${e.net_amount.toFixed(2)}. Reserve for likely future chargeback.`,
    };
    const citations: Record<string, string> = {
      short_pay: "42 CFR §422.2274 — broker compensation may not exceed FMV; carrier underpayment constitutes a breach of the published compensation schedule.",
      chargeback_disputable: "42 CFR §422.2274(b) — chargebacks permitted only within the rapid disenrollment window (first 3 months of plan year). Chargeback outside this window is not permitted.",
      missing: "Carrier contract Schedule A, §3.2 — commission payments due within 30 days of effective date. No payment received after 60 days constitutes a material breach.",
      split_mismatch: "Agency hierarchy agreement §4.1 — FMO override capped at published percentage. Variance indicates misconfiguration in carrier's hierarchy table.",
      over_pay: "42 CFR §422.2274 — overpayment above FMV must be returned. Reserve and await carrier reconciliation statement.",
    };
    return {
      id: `DSP-${String(i + 1).padStart(4, "0")}`,
      event_id: e.event_id,
      carrier: e.carrier,
      agent: e.agent,
      variance_class: e.variance_class,
      variance_amount: e.variance,
      status: (["open", "open", "in_review", "resolved", "rejected"] as DisputeStatus[])[randInt(0, 4)],
      opened_date: dateOffset(-aging),
      aging_days: aging,
      summary: summaries[e.variance_class] || "Variance detected during reconciliation.",
      citation: citations[e.variance_class] || "42 CFR §422.2274",
      suggested_response: `Per 42 CFR §422.2274 and the published ${e.plan_year} compensation schedule, we are disputing the variance of $${Math.abs(e.variance).toFixed(2)} on event ${e.event_id}. Please review the attached expected-vs-actual table and provide a corrected payment or written explanation within 30 days.`,
    };
  });

export const reconciliationStats = {
  totalEvents: commissionEvents.length,
  matched: commissionEvents.filter(e => e.variance_class === "paid_on_time").length,
  variances: commissionEvents.filter(e => e.variance_class !== "paid_on_time").length,
  openDisputes: disputeRecords.filter(d => d.status === "open").length,
  totalVarianceAmount: commissionEvents.reduce((s, e) => s + e.variance, 0),
  shortPays: commissionEvents.filter(e => e.variance_class === "short_pay").length,
  chargebacks: commissionEvents.filter(e => e.variance_class === "chargeback_valid" || e.variance_class === "chargeback_disputable").length,
  missingPayments: commissionEvents.filter(e => e.variance_class === "missing").length,
};

// ── Anomaly Detection ──────────────────────────────────────────────
export interface AnomalyAlert {
  id: string;
  type: "agent_zscore" | "carrier_drop";
  severity: "high" | "medium";
  entity: string;       // agent name or carrier name
  metric: string;       // human-readable metric
  value: string;        // formatted value
  threshold: string;    // formatted threshold
  detail: string;       // explanation
}

export const anomalyAlerts: AnomalyAlert[] = (() => {
  const alerts: AnomalyAlert[] = [];

  // Per-agent monthly commission Z-score
  const agentTotals: Record<string, number[]> = {};
  commissionEvents.forEach(e => {
    const month = e.effective_date.slice(0, 7);
    const key = `${e.agent}__${month}`;
    agentTotals[key] = agentTotals[key] || [0, 0];
    agentTotals[key][0] += e.net_amount;
    agentTotals[key][1] += 1;
  });

  // Aggregate per-agent monthly totals
  const agentMonthly: Record<string, number[]> = {};
  Object.entries(agentTotals).forEach(([key, [total]]) => {
    const [agent] = key.split("__");
    agentMonthly[agent] = agentMonthly[agent] || [];
    agentMonthly[agent].push(total);
  });

  // Compute mean/std per agent, flag Z > 2.5
  Object.entries(agentMonthly).forEach(([agent, totals]) => {
    if (totals.length < 2) return;
    const mean = totals.reduce((s, t) => s + t, 0) / totals.length;
    const variance = totals.reduce((s, t) => s + (t - mean) ** 2, 0) / totals.length;
    const std = Math.sqrt(variance);
    if (std < 1) return;
    const latest = totals[totals.length - 1];
    const z = (latest - mean) / std;
    if (Math.abs(z) > 2.5) {
      alerts.push({
        id: `anom-agent-${agent.replace(/\s/g, "")}`,
        type: "agent_zscore",
        severity: "high",
        entity: agent,
        metric: "Monthly commission Z-score",
        value: z.toFixed(2),
        threshold: "> 2.5",
        detail: z < 0
          ? `${agent}'s latest monthly commission is ${Math.abs(z).toFixed(1)} std dev below their average — investigate possible chargeback spike or carrier reporting gap.`
          : `${agent}'s latest monthly commission is ${z.toFixed(1)} std dev above their average — verify for unexpected payments or split-write of another agent's policy.`,
      });
    }
  });

  // Per-carrier total commission drop > 15%
  const carrierTotals: Record<string, number> = {};
  commissionEvents.forEach(e => {
    const month = e.effective_date.slice(0, 7);
    const key = `${e.carrier}__${month}`;
    carrierTotals[key] = (carrierTotals[key] || 0) + e.net_amount;
  });
  const carrierMonthly: Record<string, number[]> = {};
  Object.entries(carrierTotals).forEach(([key, total]) => {
    const [carrier] = key.split("__");
    carrierMonthly[carrier] = carrierMonthly[carrier] || [];
    carrierMonthly[carrier].push(total);
  });
  Object.entries(carrierMonthly).forEach(([carrier, totals]) => {
    if (totals.length < 2) return;
    const prev = totals[totals.length - 2];
    const curr = totals[totals.length - 1];
    if (prev === 0) return;
    const dropPct = ((prev - curr) / prev) * 100;
    if (dropPct > 15) {
      alerts.push({
        id: `anom-carrier-${carrier.replace(/\s/g, "")}`,
        type: "carrier_drop",
        severity: "medium",
        entity: carrier,
        metric: "Month-over-month commission drop",
        value: `${dropPct.toFixed(1)}%`,
        threshold: "> 15%",
        detail: `${carrier} commission total dropped ${dropPct.toFixed(1)}% month-over-month without a corresponding enrollment drop — possible statement gap or carrier reporting issue.`,
      });
    }
  });

  return alerts;
})();

// ── 1099 Annual Reconciliation ──────────────────────────────────────
export interface Agent1099 {
  agent: string;
  npn: string;
  taxYear: number;
  grossPayments: number;       // sum of gross_amount across all events
  netPayments: number;          // sum of net_amount across all events
  eventCount: number;
  chargebacks: number;          // absolute value of chargebacks
  adjustments: number;          // net of positive/negative adjustments
  reported1099: number;         // what the carrier reported on the 1099
  drift: number;                // reported1099 - netPayments
  driftFlag: boolean;
  status: "matched" | "drift" | "pending" | "overdue";
  lastStatement: string;
  carriers: string[];
}

const agentNpnMap: Record<string, string> = Object.fromEntries(
  agentNames.map((name, i) => [name, npnPool[i % npnPool.length]])
);

export const agent1099Data: Agent1099[] = agentNames.map((name, idx) => {
  const agentEvents = commissionEvents.filter(e => e.agent === name);
  const grossPayments = agentEvents.reduce((s, e) => s + e.gross_amount, 0);
  const netPayments = agentEvents.reduce((s, e) => s + e.net_amount, 0);
  const chargebacks = agentEvents
    .filter(e => e.event_type === "chargeback_rapid_disenrollment" || e.event_type === "chargeback_other")
    .reduce((s, e) => s + Math.abs(e.variance), 0);
  const adjustments = agentEvents
    .filter(e => e.event_type === "adjustment_positive" || e.event_type === "adjustment_negative" || e.event_type === "true_up")
    .reduce((s, e) => s + e.variance, 0);
  // Simulate 1099 reported amount with some drift
  const driftAmount = idx === 0 ? -340 : idx === 1 ? 125 : idx === 2 ? -85 : 0;
  const reported1099 = netPayments + driftAmount;
  const drift = reported1099 - netPayments;
  const driftFlag = Math.abs(drift) > 50;
  const carriersList = Array.from(new Set(agentEvents.map(e => e.carrier)));
  const statuses: Agent1099["status"][] = ["drift", "matched", "drift", "pending", "overdue"];
  return {
    agent: name,
    npn: agentNpnMap[name] || "0000000",
    taxYear: 2026,
    grossPayments,
    netPayments,
    eventCount: agentEvents.length,
    chargebacks,
    adjustments,
    reported1099,
    drift,
    driftFlag,
    status: driftFlag ? "drift" : statuses[idx % statuses.length],
    lastStatement: dateOffset(-randInt(5, 45)),
    carriers: carriersList,
  };
});

export const reconciliation1099Stats = {
  totalAgents: agent1099Data.length,
  matched: agent1099Data.filter(a => a.status === "matched").length,
  drift: agent1099Data.filter(a => a.driftFlag).length,
  pending: agent1099Data.filter(a => a.status === "pending").length,
  overdue: agent1099Data.filter(a => a.status === "overdue").length,
  totalGross: agent1099Data.reduce((s, a) => s + a.grossPayments, 0),
  totalNet: agent1099Data.reduce((s, a) => s + a.netPayments, 0),
  totalReported: agent1099Data.reduce((s, a) => s + a.reported1099, 0),
  totalDrift: agent1099Data.reduce((s, a) => s + a.drift, 0),
  cutoffDate: "December 15, 2026",
};

// ── Treasury Reconciliation Feed ────────────────────────────────────
export type ExportFormat = "quickbooks" | "sage" | "generic";

export interface AccountingMapping {
  eventType: CommissionEventType;
  qbAccount: string;
  sageAccount: string;
  genericAccount: string;
  debitCredit: "debit" | "credit";
  description: string;
}

export const accountingMappings: AccountingMapping[] = [
  { eventType: "initial_payment", qbAccount: "6200 - Commission Expense", sageAccount: "5000 - Commissions", genericAccount: "commission_expense", debitCredit: "debit", description: "Initial enrollment commission payment" },
  { eventType: "renewal_payment", qbAccount: "6210 - Renewal Commission Expense", sageAccount: "5010 - Renewal Commissions", genericAccount: "renewal_commission_expense", debitCredit: "debit", description: "Annual renewal commission payment" },
  { eventType: "chargeback_rapid_disenrollment", qbAccount: "1200 - Accounts Receivable", sageAccount: "1100 - Trade Debtors", genericAccount: "accounts_receivable", debitCredit: "credit", description: "Rapid disenrollment chargeback reversal" },
  { eventType: "chargeback_other", qbAccount: "1200 - Accounts Receivable", sageAccount: "1100 - Trade Debtors", genericAccount: "accounts_receivable", debitCredit: "credit", description: "Other chargeback reversal" },
  { eventType: "adjustment_positive", qbAccount: "6290 - Commission Adjustments", sageAccount: "5090 - Commission Adjustments", genericAccount: "commission_adjustment", debitCredit: "debit", description: "Positive adjustment / true-up credit" },
  { eventType: "adjustment_negative", qbAccount: "6290 - Commission Adjustments", sageAccount: "5090 - Commission Adjustments", genericAccount: "commission_adjustment", debitCredit: "credit", description: "Negative adjustment / clawback" },
  { eventType: "true_up", qbAccount: "6295 - Commission True-Ups", sageAccount: "5095 - Commission True-Ups", genericAccount: "commission_trueup", debitCredit: "debit", description: "Quarterly or annual true-up payment" },
  { eventType: "split_payment", qbAccount: "6220 - Override Commission Expense", sageAccount: "5020 - Override Commissions", genericAccount: "override_commission_expense", debitCredit: "debit", description: "Agency hierarchy split / override payment" },
  { eventType: "override", qbAccount: "6220 - Override Commission Expense", sageAccount: "5020 - Override Commissions", genericAccount: "override_commission_expense", debitCredit: "debit", description: "FMO/MGA override commission" },
];

export interface TreasuryFeedEntry {
  journalId: string;
  date: string;
  eventId: string;
  carrier: string;
  agent: string;
  eventType: CommissionEventType;
  account: string;
  debit: number;
  credit: number;
  memo: string;
  className: string;
}

export interface TreasuryFeedSummary {
  totalDebits: number;
  totalCredits: number;
  netJournal: number;
  entryCount: number;
  byCategory: { category: string; debit: number; credit: number; count: number }[];
  byCarrier: { carrier: string; debit: number; credit: number; count: number }[];
}

export function getAccountingMapping(eventType: CommissionEventType, format: ExportFormat): AccountingMapping | undefined {
  return accountingMappings.find(m => m.eventType === eventType);
}

export function buildTreasuryFeed(format: ExportFormat): TreasuryFeedEntry[] {
  const accountKey = format === "quickbooks" ? "qbAccount" : format === "sage" ? "sageAccount" : "genericAccount";
  return commissionEvents.map((e, i) => {
    const mapping = getAccountingMapping(e.event_type, format);
    const account = mapping ? mapping[accountKey as keyof AccountingMapping] as string : "9999 - Uncategorized";
    const isDebit = mapping?.debitCredit === "debit";
    const amount = Math.abs(e.net_amount);
    return {
      journalId: `JE-${String(i + 1).padStart(4, "0")}`,
      date: e.effective_date,
      eventId: e.event_id,
      carrier: e.carrier,
      agent: e.agent,
      eventType: e.event_type,
      account,
      debit: isDebit ? amount : 0,
      credit: isDebit ? 0 : amount,
      memo: mapping?.description || e.event_type.replace(/_/g, " "),
      className: e.agent,
    };
  });
}

export function buildTreasurySummary(format: ExportFormat): TreasuryFeedSummary {
  const feed = buildTreasuryFeed(format);
  const totalDebits = feed.reduce((s, e) => s + e.debit, 0);
  const totalCredits = feed.reduce((s, e) => s + e.credit, 0);
  const byCategoryMap: Record<string, { debit: number; credit: number; count: number }> = {};
  const byCarrierMap: Record<string, { debit: number; credit: number; count: number }> = {};
  feed.forEach(e => {
    byCategoryMap[e.account] = byCategoryMap[e.account] || { debit: 0, credit: 0, count: 0 };
    byCategoryMap[e.account].debit += e.debit;
    byCategoryMap[e.account].credit += e.credit;
    byCategoryMap[e.account].count += 1;
    byCarrierMap[e.carrier] = byCarrierMap[e.carrier] || { debit: 0, credit: 0, count: 0 };
    byCarrierMap[e.carrier].debit += e.debit;
    byCarrierMap[e.carrier].credit += e.credit;
    byCarrierMap[e.carrier].count += 1;
  });
  return {
    totalDebits,
    totalCredits,
    netJournal: totalDebits - totalCredits,
    entryCount: feed.length,
    byCategory: Object.entries(byCategoryMap).map(([category, v]) => ({ category, ...v })).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)),
    byCarrier: Object.entries(byCarrierMap).map(([carrier, v]) => ({ carrier, ...v })).sort((a, b) => (b.debit + b.credit) - (a.debit + a.credit)),
  };
}

export function exportTreasuryCSV(format: ExportFormat): string {
  const feed = buildTreasuryFeed(format);
  if (format === "quickbooks") {
    const header = ["Date","Transaction No.","Account","Debit","Credit","Memo","Class"];
    const rows = feed.map(e => [e.date, e.journalId, e.account, e.debit.toFixed(2), e.credit.toFixed(2), e.memo, e.className]);
    return [header, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  }
  if (format === "sage") {
    const header = ["DATE","REFERENCE","ACCOUNT","DEBIT","CREDIT","DETAILS","DEPARTMENT"];
    const rows = feed.map(e => [e.date, e.journalId, e.account, e.debit.toFixed(2), e.credit.toFixed(2), e.memo, e.className]);
    return [header, ...rows].map(r => r.join(",")).join("\n");
  }
  const header = ["date","journal_id","event_id","carrier","agent","event_type","account","debit","credit","memo","class"];
  const rows = feed.map(e => [e.date, e.journalId, e.eventId, e.carrier, e.agent, e.eventType, e.account, e.debit.toFixed(2), e.credit.toFixed(2), e.memo, e.className]);
  return [header, ...rows].map(r => r.join(",")).join("\n");
}

// ── Agent Backoffice: Carrier Portals & Certifications ──────────────
export interface CarrierPortal {
  carrier: string;
  portalName: string;
  url: string;
  logoColor: string;
  description: string;
  capabilities: string[];
}

export const carrierPortals: CarrierPortal[] = [
  { carrier: "UnitedHealthcare", portalName: "UHC Jarvis", url: "https://www.uhcjarvis.com/content/jarvis/en/sign_in.html", logoColor: "#002677", description: "UHC Jarvis broker portal for appointments, quoting, and commission statements.", capabilities: ["Quoting", "Enrollment", "Commissions", "E&O Upload", "Appointments"] },
  { carrier: "Humana", portalName: "Humana Vantage", url: "https://agents.humana.com", logoColor: "#00583C", description: "Humana's broker portal with plan quoting, enrollment tracking, and certification.", capabilities: ["Quoting", "Enrollment", "Certifications", "Commissions", "Lead Portal"] },
{ carrier: "Aetna", portalName: "Aetna Producer Portal", url: "https://www.aetna.com/producer_public/login.fcc", logoColor: "#9E1B32", description: "Aetna CVS Health producer portal for appointments, quoting, and certifications.", capabilities: ["Quoting", "Enrollment", "Certifications", "Appointments"] },
  { carrier: "Cigna", portalName: "Cigna for Brokers", url: "https://www.cigna.com/brokers", logoColor: "#0066B3", description: "Cigna Healthcare broker portal with Medicare Advantage and Supplement quoting.", capabilities: ["Quoting", "Enrollment", "Commissions", "Certifications"] },
  { carrier: "Anthem", portalName: "Anthem Broker Connection", url: "https://www.anthem.com/broker", logoColor: "#0061AF", description: "Anthem Blue Cross Blue Shield broker portal for appointments and quoting.", capabilities: ["Quoting", "Enrollment", "Appointments", "Commissions"] },
  { carrier: "WellCare", portalName: "WellCare Broker Portal", url: "https://www.wellcarebrokers.com", logoColor: "#0066B3", description: "WellCare (Centene) broker portal for Medicare Advantage and Part D.", capabilities: ["Quoting", "Enrollment", "Certifications", "Commissions"] },
  { carrier: "Mutual of Omaha", portalName: "Mutual of Omaha Broker", url: "https://broker.mutualofomaha.com", logoColor: "#003DA5", description: "Mutual of Omaha broker portal for Medicare Supplement and Final Expense.", capabilities: ["Quoting", "Enrollment", "Commissions", "Certifications"] },
  { carrier: "AARP", portalName: "AARP UnitedHealthcare Broker", url: "https://www.aarpsupplementalhealthinsurance.com", logoColor: "#660000", description: "AARP-branded UHC Medicare Supplement broker portal.", capabilities: ["Quoting", "Enrollment", "Commissions"] },
];

export interface AhipModule {
  id: string;
  name: string;
  description: string;
  status: "Not Started" | "In Progress" | "Completed" | "Expired";
  durationMinutes: number;
  required: boolean;
}

export const ahipModules: AhipModule[] = [
  { id: "AHIP-01", name: "Medicare Overview & Basics", description: "History, structure, and fundamentals of the Medicare program.", status: "Completed", durationMinutes: 45, required: true },
  { id: "AHIP-02", name: "Medicare Advantage Plans", description: "MA plan types, network models, and CMS marketing rules.", status: "Completed", durationMinutes: 60, required: true },
  { id: "AHIP-03", name: "Medicare Part D", description: "Prescription drug coverage, formulary tiers, and LIS/Extra Help.", status: "Completed", durationMinutes: 50, required: true },
  { id: "AHIP-04", name: "Ethics, Compliance & TPMO Rules", description: "CMS TPMO marketing rules, steering prohibitions, and disclaimers.", status: "In Progress", durationMinutes: 55, required: true },
  { id: "AHIP-05", name: "Medicare Supplement (Medigap)", description: "Medigap plan types, open enrollment, and underwriting rules.", status: "Not Started", durationMinutes: 40, required: true },
  { id: "AHIP-06", name: "Special Needs Plans", description: "D-SNP, C-SNP, and I-SNP eligibility and enrollment.", status: "Not Started", durationMinutes: 35, required: true },
  { id: "AHIP-07", name: "Final Exam", description: "Comprehensive certification exam — 80% required to pass.", status: "Not Started", durationMinutes: 90, required: true },
];

export interface BackofficeTask {
  id: string;
  title: string;
  category: "AHIP" | "Carrier" | "Compliance" | "Admin";
  priority: "High" | "Medium" | "Low";
  due: string;
  done: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export function getBackofficeTasks(agent: Agent): BackofficeTask[] {
  const tasks: BackofficeTask[] = [];
  // AHIP tasks
  if (agent.ahip !== "Compliant") {
    tasks.push({
      id: "BT-AHIP-1", title: `Complete AHIP 2026 Certification — currently ${agent.ahip.toLowerCase()}`,
      category: "AHIP", priority: agent.ahip === "Overdue" ? "High" : "Medium", due: agent.ahipExpiry, done: false,
      actionUrl: "https://ahip.org", actionLabel: "Launch AHIP",
    });
  }
  // Carrier appointment tasks
  agent.carrierAppointments.forEach((ca, i) => {
    if (ca.status !== "Compliant") {
      const portal = carrierPortals.find(p => p.carrier === ca.carrier);
      tasks.push({
        id: `BT-CA-${i}`, title: `${ca.status === "Expiring" ? "Renew" : "Complete"} ${ca.carrier} appointment — expires ${ca.expiry}`,
        category: "Carrier", priority: ca.status === "Overdue" || ca.status === "Missing" ? "High" : "Medium", due: ca.expiry, done: false,
        actionUrl: portal?.url, actionLabel: `Open ${ca.carrier} Portal`,
      });
    }
  });
  // Certification tasks
  agent.certifications.forEach((cert, i) => {
    if (cert.status !== "Compliant") {
      tasks.push({
        id: `BT-CERT-${i}`, title: `${cert.status === "Expiring" ? "Renew" : "Complete"} ${cert.name} — expires ${cert.expiry}`,
        category: "Compliance", priority: cert.status === "Overdue" || cert.status === "Missing" ? "High" : "Medium", due: cert.expiry, done: false,
      });
    }
  });
  // Admin tasks
  if (!agent.w9OnFile) {
    tasks.push({ id: "BT-ADMIN-1", title: "Submit W-9 form", category: "Admin", priority: "High", due: dateOffset(-5), done: false });
  }
  if (!agent.taxInfoComplete) {
    tasks.push({ id: "BT-ADMIN-2", title: "Complete tax information form", category: "Admin", priority: "Medium", due: dateOffset(5), done: false });
  }
  if (!agent.contracted) {
    tasks.push({ id: "BT-ADMIN-3", title: "Sign contractor agreement", category: "Admin", priority: "High", due: dateOffset(-5), done: false });
  }
  // Pull from agent.tasks too
  agent.tasks.filter(t => !t.done).forEach(t => {
    // Avoid duplicates by checking if title already in list
    if (!tasks.some(bt => bt.title.toLowerCase().includes(t.title.toLowerCase().slice(0, 20)))) {
      tasks.push({
        id: `BT-AGT-${t.id}`, title: t.title, category: "Admin", priority: t.priority, due: t.due, done: false,
      });
    }
  });
  return tasks.sort((a, b) => {
    const order = { High: 0, Medium: 1, Low: 2 };
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return new Date(a.due).getTime() - new Date(b.due).getTime();
  });
}

export function getReadinessScore(agent: Agent): number {
  let score = 0;
  let total = 0;
  // AHIP (25%)
  total += 25;
  if (agent.ahip === "Compliant") score += 25;
  else if (agent.ahip === "Expiring") score += 15;
  // Carrier appointments (25%)
  total += 25;
  const caCount = agent.carrierAppointments.length;
  if (caCount > 0) {
    const compliant = agent.carrierAppointments.filter(c => c.status === "Compliant").length;
    score += Math.round((compliant / caCount) * 25);
  }
  // Certifications (20%)
  total += 20;
  const certCount = agent.certifications.length;
  if (certCount > 0) {
    const compliant = agent.certifications.filter(c => c.status === "Compliant").length;
    score += Math.round((compliant / certCount) * 20);
  }
  // Admin docs (15%)
  total += 15;
  if (agent.w9OnFile) score += 5;
  if (agent.taxInfoComplete) score += 5;
  if (agent.contracted) score += 5;
  // Open tasks (15%)
  total += 15;
  const openTasks = agent.tasks.filter(t => !t.done).length;
  if (openTasks === 0) score += 15;
  else score += Math.max(0, 15 - openTasks * 3);
  return Math.min(100, Math.round((score / total) * 100));
}
