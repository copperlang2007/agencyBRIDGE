/**
 * Omnichannel marketing campaign data — email + SMS campaigns, templates,
 * tracking, unsubscribes, and SMS opt-outs.
 * Persisted to localStorage so campaigns survive page reloads.
 */

import { logAudit } from "@/lib/auditLog";

// ── Types ──────────────────────────────────────────────────────────

export type CampaignChannel = "email" | "sms";
export type CampaignStatus = "draft" | "scheduled" | "sending" | "sent" | "paused";

export interface EmailTemplate {
  id: string;
  name: string;
  channel: CampaignChannel;
  subject: string;
  preheader: string;
  bodyHtml: string;
  bodyText: string; // SMS body (plain text, 160 char segments)
  category: "AEP" | "OEP" | "Retention" | "Educational" | "Welcome" | "Custom";
  createdAt: string;
  updatedAt: string;
}

export interface CampaignRecipient {
  email: string;
  phone?: string;
  name: string;
  status: "pending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed" | "unsubscribed" | "opted_out";
  sentAt?: string;
  deliveredAt?: string;
  openedAt?: string;
  clickedAt?: string;
  clickedUrl?: string;
}

export interface ABVariant {
  id: string;
  label: string;           // "Variant A" / "Variant B"
  subject: string;         // subject line being tested
  preheader: string;
  testSize: number;        // number of recipients in this variant's test sample
  opens: number;
  clicks: number;
  sent: number;
}

export interface ABTestConfig {
  enabled: boolean;
  variants: ABVariant[];
  testPercentage: number;     // % of audience to use for the test phase (e.g. 20)
  winnerCriteria: "open_rate" | "click_rate";
  winnerVariantId: string | null;  // set after test phase completes
  status: "none" | "testing" | "winner_selected" | "completed";
  testStartedAt: string | null;
  winnerSelectedAt: string | null;
}

export interface EmailCampaign {
  id: string;
  name: string;
  channel: CampaignChannel;
  templateId: string;
  status: CampaignStatus;
  audience: "all_clients" | "active" | "prospects" | "ma_only" | "mapd_only" | "custom";
  recipientCount: number;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  stats: {
    sent: number;
    delivered: number;
    opens: number;
    clicks: number;
    bounces: number;
    unsubscribes: number;
    failed: number;     // SMS
    optOuts: number;    // SMS
  };
  recipients: CampaignRecipient[];
  abTest?: ABTestConfig;
}

export interface UnsubscribeEntry {
  email: string;
  reason: string;
  unsubscribedAt: string;
  campaignId: string;
}

export interface SmsOptOutEntry {
  phone: string;
  reason: string;
  optedOutAt: string;
  campaignId: string;
}

// ── Seed templates (email) ─────────────────────────────────────────

const seedTemplates: EmailTemplate[] = [
  {
    id: "tpl_aep_reminder",
    name: "AEP Enrollment Reminder",
    channel: "email",
    subject: "Don't miss the Oct 15–Dec 7 Medicare Open Enrollment window",
    preheader: "Your Annual Election Period is open — review your plan options now.",
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>The Medicare Annual Election Period (AEP) runs <strong>October 15 through December 7</strong>. This is your yearly window to switch Medicare Advantage or Part D plans.</p>
<p>Plan benefits, formularies, and networks change every year. Even if your current plan worked well this year, it may not be the best fit for 2026.</p>
<p>Call us at {{agency_phone}} to schedule a free plan review.</p>
<p style="font-size:12px;color:#666;margin-top:24px;">{{unsubscribe_text}}</p>`,
    bodyText: "",
    category: "AEP",
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
  },
  {
    id: "tpl_retention_checkin",
    name: "Retention Check-In",
    channel: "email",
    subject: "Quick check-in: how is your Medicare Advantage plan working?",
    preheader: "We want to make sure your plan still fits your needs.",
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>It's been a few months since you enrolled in your {{plan_type}} plan with {{carrier}}. We want to check in:</p>
<ul>
  <li>Are your doctors still in-network?</li>
  <li>Are your medications covered at an affordable tier?</li>
  <li>Any surprise bills or issues with prior authorization?</li>
</ul>
<p>If anything has changed, we can review your options during the next enrollment window.</p>
<p>Reply to this email or call {{agency_phone}}.</p>
<p style="font-size:12px;color:#666;margin-top:24px;">{{unsubscribe_text}}</p>`,
    bodyText: "",
    category: "Retention",
    createdAt: "2026-08-02T10:00:00Z",
    updatedAt: "2026-08-02T10:00:00Z",
  },
  {
    id: "tpl_lis_outreach",
    name: "Extra Help / LIS Outreach",
    channel: "email",
    subject: "You may qualify for Extra Help with prescription drug costs",
    preheader: "Free federal program that lowers Part D premiums and copays.",
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>Based on your income, you may qualify for <strong>Extra Help (LIS)</strong> — a federal program that can reduce or eliminate your Part D premium, deductible, and copays.</p>
<p>The application is free at <a href="https://www.ssa.gov/extrahelp">ssa.gov/extrahelp</a>. If approved, it can save you thousands per year.</p>
<p>Need help applying? Call us at {{agency_phone}}.</p>
<p style="font-size:12px;color:#666;margin-top:24px;">{{unsubscribe_text}}</p>`,
    bodyText: "",
    category: "Educational",
    createdAt: "2026-08-03T10:00:00Z",
    updatedAt: "2026-08-03T10:00:00Z",
  },
  {
    id: "tpl_welcome",
    name: "New Client Welcome",
    channel: "email",
    subject: "Welcome to {{agency_name}} — here's what to expect",
    preheader: "Your Medicare enrollment is complete. Here are your next steps.",
    bodyHtml: `<p>Hi {{first_name}},</p>
<p>Welcome to {{agency_name}}! Your enrollment in {{plan_type}} with {{carrier}} is complete.</p>
<p>Here's what to expect:</p>
<ul>
  <li>Your plan ID card arrives within 7–10 business days</li>
  <li>Coverage begins on your effective date</li>
  <li>Keep this email for your records</li>
</ul>
<p>Questions? Call {{agency_phone}} or reply to this email.</p>
<p style="font-size:12px;color:#666;margin-top:24px;">{{unsubscribe_text}}</p>`,
    bodyText: "",
    category: "Welcome",
    createdAt: "2026-08-04T10:00:00Z",
    updatedAt: "2026-08-04T10:00:00Z",
  },
  // ── SMS templates ────────────────────────────────────────────────
  {
    id: "tpl_sms_aep",
    name: "AEP Reminder (SMS)",
    channel: "sms",
    subject: "",
    preheader: "",
    bodyHtml: "",
    bodyText: "Hi {{first_name}}, it's {{agency_name}}. AEP is open Oct 15–Dec 7. Review your Medicare plan before it's too late. Call {{agency_phone}} to schedule a free review. Reply STOP to opt out.",
    category: "AEP",
    createdAt: "2026-08-01T11:00:00Z",
    updatedAt: "2026-08-01T11:00:00Z",
  },
  {
    id: "tpl_sms_retention",
    name: "Retention Check-In (SMS)",
    channel: "sms",
    subject: "",
    preheader: "",
    bodyHtml: "",
    bodyText: "Hi {{first_name}}, it's {{agent_name}} from {{agency_name}}. How is your {{plan_type}} plan working? Any issues with doctors or prescriptions? Reply or call {{agency_phone}}. Reply STOP to opt out.",
    category: "Retention",
    createdAt: "2026-08-02T11:00:00Z",
    updatedAt: "2026-08-02T11:00:00Z",
  },
  {
    id: "tpl_sms_lis",
    name: "LIS Qualification Alert (SMS)",
    channel: "sms",
    subject: "",
    preheader: "",
    bodyHtml: "",
    bodyText: "Hi {{first_name}}, you may qualify for Extra Help (LIS) — lower Part D costs. Apply free at ssa.gov/extrahelp or call {{agency_phone}}. Reply STOP to opt out.",
    category: "Educational",
    createdAt: "2026-08-03T11:00:00Z",
    updatedAt: "2026-08-03T11:00:00Z",
  },
  {
    id: "tpl_sms_appointment",
    name: "Appointment Reminder (SMS)",
    channel: "sms",
    subject: "",
    preheader: "",
    bodyHtml: "",
    bodyText: "Reminder: You have a Medicare review appointment with {{agent_name}} on {{appointment_date}}. Call {{agency_phone}} to reschedule. Reply STOP to opt out.",
    category: "Welcome",
    createdAt: "2026-08-04T11:00:00Z",
    updatedAt: "2026-08-04T11:00:00Z",
  },
];

// ── Seed campaigns ─────────────────────────────────────────────────

function makeRecipients(count: number, channel: CampaignChannel = "email"): CampaignRecipient[] {
  const names = [
    "Margaret Olson", "Robert Hayes", "Dorothy Bell", "James Carter", "Patricia Reed",
    "William Foster", "Barbara Howard", "Richard Ward", "Elizabeth Cole", "Thomas Brooks",
    "Jennifer Hughes", "Charles Long", "Sandra Price", "Joseph Sanders", "Karen Bennett",
    "David Murphy", "Nancy Griffin", "Larry Powell", "Donna Russell", "Kevin Ortiz",
  ];
  return names.slice(0, count).map((name, i) => {
    const email = `${name.toLowerCase().replace(/\s+/g, ".")}@email.com`;
    const phone = `+1${5550000000 + i}`;
    const emailStatuses: CampaignRecipient["status"][] = ["sent", "opened", "clicked", "opened", "sent", "opened", "clicked", "bounced", "unsubscribed", "opened"];
    const smsStatuses: CampaignRecipient["status"][] = ["delivered", "delivered", "clicked", "delivered", "sent", "delivered", "clicked", "failed", "opted_out", "delivered"];
    const statuses = channel === "sms" ? smsStatuses : emailStatuses;
    const status = statuses[i % statuses.length];
    return {
      email,
      phone,
      name,
      status,
      sentAt: status !== "pending" ? `2026-08-${String(5 + (i % 20)).padStart(2, "0")}T10:00:00Z` : undefined,
      deliveredAt: (status === "delivered" || status === "clicked") && channel === "sms" ? `2026-08-${String(5 + (i % 20)).padStart(2, "0")}T10:00:05Z` : undefined,
      openedAt: status === "opened" || status === "clicked" ? `2026-08-${String(5 + (i % 20)).padStart(2, "0")}T14:00:00Z` : undefined,
      clickedAt: status === "clicked" ? `2026-08-${String(5 + (i % 20)).padStart(2, "0")}T15:00:00Z` : undefined,
      clickedUrl: status === "clicked" ? (channel === "sms" ? "https://ab.bridge/r/aep" : "https://agencybridge.com/review") : undefined,
    };
  });
}

const seedCampaigns: EmailCampaign[] = [
  {
    id: "camp_001",
    name: "AEP 2026 Kickoff",
    channel: "email",
    templateId: "tpl_aep_reminder",
    status: "sent",
    audience: "all_clients",
    recipientCount: 20,
    scheduledFor: null,
    sentAt: "2026-08-05T10:00:00Z",
    createdAt: "2026-08-01T09:00:00Z",
    updatedAt: "2026-08-05T10:00:00Z",
    createdBy: "Patricia Chen",
    stats: { sent: 20, delivered: 19, opens: 11, clicks: 5, bounces: 1, unsubscribes: 1, failed: 0, optOuts: 0 },
    recipients: makeRecipients(20, "email"),
  },
  {
    id: "camp_002",
    name: "Retention Q3 Check-In",
    channel: "email",
    templateId: "tpl_retention_checkin",
    status: "sent",
    audience: "ma_only",
    recipientCount: 15,
    scheduledFor: null,
    sentAt: "2026-08-08T10:00:00Z",
    createdAt: "2026-08-06T09:00:00Z",
    updatedAt: "2026-08-08T10:00:00Z",
    createdBy: "Diane Foster",
    stats: { sent: 15, delivered: 15, opens: 9, clicks: 3, bounces: 0, unsubscribes: 0, failed: 0, optOuts: 0 },
    recipients: makeRecipients(15, "email"),
  },
  {
    id: "camp_003",
    name: "LIS Outreach — September",
    channel: "email",
    templateId: "tpl_lis_outreach",
    status: "scheduled",
    audience: "prospects",
    recipientCount: 50,
    scheduledFor: "2026-09-01T09:00:00Z",
    sentAt: null,
    createdAt: "2026-08-09T09:00:00Z",
    updatedAt: "2026-08-09T09:00:00Z",
    createdBy: "Patricia Chen",
    stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0, failed: 0, optOuts: 0 },
    recipients: [],
  },
  {
    id: "camp_004",
    name: "New Client Welcome Series",
    channel: "email",
    templateId: "tpl_welcome",
    status: "draft",
    audience: "active",
    recipientCount: 0,
    scheduledFor: null,
    sentAt: null,
    createdAt: "2026-08-10T09:00:00Z",
    updatedAt: "2026-08-10T09:00:00Z",
    createdBy: "Sarah Chen",
    stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0, failed: 0, optOuts: 0 },
    recipients: [],
  },
  // ── SMS campaigns ────────────────────────────────────────────────
  {
    id: "camp_sms_001",
    name: "AEP SMS Blast",
    channel: "sms",
    templateId: "tpl_sms_aep",
    status: "sent",
    audience: "all_clients",
    recipientCount: 20,
    scheduledFor: null,
    sentAt: "2026-08-06T10:00:00Z",
    createdAt: "2026-08-05T09:00:00Z",
    updatedAt: "2026-08-06T10:00:00Z",
    createdBy: "Patricia Chen",
    stats: { sent: 20, delivered: 18, opens: 0, clicks: 4, bounces: 0, unsubscribes: 0, failed: 1, optOuts: 1 },
    recipients: makeRecipients(20, "sms"),
  },
  {
    id: "camp_sms_002",
    name: "Retention SMS Check-In",
    channel: "sms",
    templateId: "tpl_sms_retention",
    status: "sent",
    audience: "ma_only",
    recipientCount: 15,
    scheduledFor: null,
    sentAt: "2026-08-09T10:00:00Z",
    createdAt: "2026-08-08T09:00:00Z",
    updatedAt: "2026-08-09T10:00:00Z",
    createdBy: "Diane Foster",
    stats: { sent: 15, delivered: 14, opens: 0, clicks: 2, bounces: 0, unsubscribes: 0, failed: 1, optOuts: 0 },
    recipients: makeRecipients(15, "sms"),
  },
  {
    id: "camp_sms_003",
    name: "LIS SMS Outreach",
    channel: "sms",
    templateId: "tpl_sms_lis",
    status: "scheduled",
    audience: "prospects",
    recipientCount: 80,
    scheduledFor: "2026-09-02T09:00:00Z",
    sentAt: null,
    createdAt: "2026-08-09T10:00:00Z",
    updatedAt: "2026-08-09T10:00:00Z",
    createdBy: "Patricia Chen",
    stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0, failed: 0, optOuts: 0 },
    recipients: [],
  },
];

const seedUnsubscribes: UnsubscribeEntry[] = [
  {
    email: "margaret.olson@email.com",
    reason: "No longer interested",
    unsubscribedAt: "2026-08-05T16:00:00Z",
    campaignId: "camp_001",
  },
];

const seedSmsOptOuts: SmsOptOutEntry[] = [
  {
    phone: "+15550000008",
    reason: "Replied STOP",
    optedOutAt: "2026-08-06T16:00:00Z",
    campaignId: "camp_sms_001",
  },
];

// ── Storage helpers ────────────────────────────────────────────────

const TEMPLATES_KEY = "ab_email_templates";
const CAMPAIGNS_KEY = "ab_email_campaigns";
const UNSUBS_KEY = "ab_email_unsubscribes";
const SMS_OPTOUTS_KEY = "ab_sms_optouts";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full or unavailable — non-fatal
  }
}

// ── Public API: Templates ──────────────────────────────────────────

export function getTemplates(): EmailTemplate[] {
  return load(TEMPLATES_KEY, seedTemplates);
}

export function getTemplatesByChannel(channel: CampaignChannel): EmailTemplate[] {
  return getTemplates().filter((t) => t.channel === channel);
}

export function saveTemplate(tpl: EmailTemplate): EmailTemplate[] {
  const all = getTemplates();
  const idx = all.findIndex((t) => t.id === tpl.id);
  const now = new Date().toISOString();
  const updated = { ...tpl, updatedAt: now };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, createdAt: now });
  save(TEMPLATES_KEY, all);
  return all;
}

export function deleteTemplate(id: string): EmailTemplate[] {
  const all = getTemplates().filter((t) => t.id !== id);
  save(TEMPLATES_KEY, all);
  return all;
}

// ── Public API: Campaigns ──────────────────────────────────────────

export function getCampaigns(): EmailCampaign[] {
  return load(CAMPAIGNS_KEY, seedCampaigns);
}

export function getCampaignsByChannel(channel: CampaignChannel): EmailCampaign[] {
  return getCampaigns().filter((c) => c.channel === channel);
}

export function saveCampaign(camp: EmailCampaign): EmailCampaign[] {
  const all = getCampaigns();
  const idx = all.findIndex((c) => c.id === camp.id);
  const now = new Date().toISOString();
  const updated = { ...camp, updatedAt: now };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, createdAt: now });
  save(CAMPAIGNS_KEY, all);
  return all;
}

export function deleteCampaign(id: string): EmailCampaign[] {
  const all = getCampaigns().filter((c) => c.id !== id);
  save(CAMPAIGNS_KEY, all);
  return all;
}

// ── Public API: Email Unsubscribes ──────────────────────────────────

export function getUnsubscribes(): UnsubscribeEntry[] {
  return load(UNSUBS_KEY, seedUnsubscribes);
}

export function addUnsubscribe(entry: UnsubscribeEntry): UnsubscribeEntry[] {
  const all = getUnsubscribes();
  if (!all.some((u) => u.email === entry.email)) {
    all.push(entry);
    save(UNSUBS_KEY, all);
  }
  return all;
}

export function removeUnsubscribe(email: string): UnsubscribeEntry[] {
  const all = getUnsubscribes().filter((u) => u.email !== email);
  save(UNSUBS_KEY, all);
  return all;
}

export function isUnsubscribed(email: string): boolean {
  return getUnsubscribes().some((u) => u.email === email);
}

// ── Public API: SMS Opt-Outs ────────────────────────────────────────

export function getSmsOptOuts(): SmsOptOutEntry[] {
  return load(SMS_OPTOUTS_KEY, seedSmsOptOuts);
}

export function addSmsOptOut(entry: SmsOptOutEntry): SmsOptOutEntry[] {
  const all = getSmsOptOuts();
  if (!all.some((o) => o.phone === entry.phone)) {
    all.push(entry);
    save(SMS_OPTOUTS_KEY, all);
  }
  return all;
}

export function removeSmsOptOut(phone: string): SmsOptOutEntry[] {
  const all = getSmsOptOuts().filter((o) => o.phone !== phone);
  save(SMS_OPTOUTS_KEY, all);
  return all;
}

export function isSmsOptedOut(phone: string): boolean {
  return getSmsOptOuts().some((o) => o.phone === phone);
}

// ── Template variable helpers ──────────────────────────────────────

export const emailTemplateVariables = [
  { token: "{{first_name}}", label: "Recipient First Name" },
  { token: "{{last_name}}", label: "Recipient Last Name" },
  { token: "{{agency_name}}", label: "Agency Name" },
  { token: "{{agency_phone}}", label: "Agency Phone" },
  { token: "{{agent_name}}", label: "Agent Name" },
  { token: "{{plan_type}}", label: "Plan Type" },
  { token: "{{carrier}}", label: "Carrier" },
  { token: "{{unsubscribe_text}}", label: "Unsubscribe Notice (required)" },
];

export const smsTemplateVariables = [
  { token: "{{first_name}}", label: "Recipient First Name" },
  { token: "{{agency_name}}", label: "Agency Name" },
  { token: "{{agency_phone}}", label: "Agency Phone" },
  { token: "{{agent_name}}", label: "Agent Name" },
  { token: "{{plan_type}}", label: "Plan Type" },
  { token: "{{appointment_date}}", label: "Appointment Date" },
];

// Keep backward compat
export const templateVariables = emailTemplateVariables;

export function newTemplate(channel: CampaignChannel = "email"): EmailTemplate {
  return {
    id: `tpl_${Date.now()}`,
    name: "Untitled Template",
    channel,
    subject: "",
    preheader: "",
    bodyHtml: channel === "email" ? "<p>Hi {{first_name}},</p>\n\n<p></p>\n\n<p style=\"font-size:12px;color:#666;\">{{unsubscribe_text}}</p>" : "",
    bodyText: channel === "sms" ? "Hi {{first_name}}, it's {{agency_name}}. " : "",
    category: "Custom",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function newCampaign(createdBy: string, channel: CampaignChannel = "email"): EmailCampaign {
  return {
    id: `camp_${Date.now()}`,
    name: "Untitled Campaign",
    channel,
    templateId: "",
    status: "draft",
    audience: "all_clients",
    recipientCount: 0,
    scheduledFor: null,
    sentAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy,
    stats: { sent: 0, delivered: 0, opens: 0, clicks: 0, bounces: 0, unsubscribes: 0, failed: 0, optOuts: 0 },
    recipients: [],
    abTest: {
      enabled: false,
      variants: [
        { id: `var_a_${Date.now()}`, label: "Variant A", subject: "", preheader: "", testSize: 0, opens: 0, clicks: 0, sent: 0 },
        { id: `var_b_${Date.now() + 1}`, label: "Variant B", subject: "", preheader: "", testSize: 0, opens: 0, clicks: 0, sent: 0 },
      ],
      testPercentage: 20,
      winnerCriteria: "open_rate",
      winnerVariantId: null,
      status: "none",
      testStartedAt: null,
      winnerSelectedAt: null,
    },
  };
}

// ── Drip Sequences ─────────────────────────────────────────────────

export type LifecycleTrigger = "enrollment" | "renewal" | "lapse" | "birthday" | "welcome" | "winback";

export const triggerLabels: Record<LifecycleTrigger, string> = {
  enrollment: "New Enrollment",
  renewal: "Annual Renewal",
  lapse: "Policy Lapse",
  birthday: "Birthday",
  welcome: "New Client Welcome",
  winback: "Win-Back",
};

export interface DripStep {
  id: string;
  delayDays: number;       // days after trigger (0 = immediate)
  templateId: string;      // email or SMS template
  channel: CampaignChannel;
  subject: string;         // step label
}

export interface DripSequence {
  id: string;
  name: string;
  trigger: LifecycleTrigger;
  active: boolean;
  steps: DripStep[];
  enrolledCount: number;
  completedCount: number;
  openRate: number;        // aggregate across steps
  clickRate: number;
  createdAt: string;
  updatedAt: string;
}

const SEQUENCES_KEY = "ab_drip_sequences";

const seedSequences: DripSequence[] = [
  {
    id: "drip_welcome",
    name: "New Client Welcome Series",
    trigger: "welcome",
    active: true,
    enrolledCount: 142,
    completedCount: 118,
    openRate: 68,
    clickRate: 22,
    createdAt: "2026-07-01T10:00:00Z",
    updatedAt: "2026-08-08T10:00:00Z",
    steps: [
      { id: "s1", delayDays: 0, templateId: "tpl_welcome", channel: "email", subject: "Welcome + what to expect" },
      { id: "s2", delayDays: 3, templateId: "tpl_sms_appointment", channel: "sms", subject: "Schedule your onboarding call" },
      { id: "s3", delayDays: 14, templateId: "tpl_retention_checkin", channel: "email", subject: "How's your plan working?" },
      { id: "s4", delayDays: 30, templateId: "tpl_sms_appointment", channel: "sms", subject: "30-day check-in" },
    ],
  },
  {
    id: "drip_renewal",
    name: "AEP Renewal Reminder Sequence",
    trigger: "renewal",
    active: true,
    enrolledCount: 387,
    completedCount: 245,
    openRate: 72,
    clickRate: 31,
    createdAt: "2026-06-15T10:00:00Z",
    updatedAt: "2026-08-09T10:00:00Z",
    steps: [
      { id: "s1", delayDays: 0, templateId: "tpl_aep_reminder", channel: "email", subject: "AEP is open — review your plan" },
      { id: "s2", delayDays: 7, templateId: "tpl_sms_aep", channel: "sms", subject: "SMS reminder: AEP deadline approaching" },
      { id: "s3", delayDays: 21, templateId: "tpl_aep_reminder", channel: "email", subject: "Last chance: AEP closes Dec 7" },
      { id: "s4", delayDays: 35, templateId: "tpl_sms_aep", channel: "sms", subject: "Final reminder: enroll today" },
    ],
  },
  {
    id: "drip_lapse",
    name: "Lapsed Client Win-Back",
    trigger: "lapse",
    active: true,
    enrolledCount: 56,
    completedCount: 23,
    openRate: 41,
    clickRate: 12,
    createdAt: "2026-07-10T10:00:00Z",
    updatedAt: "2026-08-05T10:00:00Z",
    steps: [
      { id: "s1", delayDays: 0, templateId: "tpl_sms_retention", channel: "sms", subject: "We noticed your plan lapsed" },
      { id: "s2", delayDays: 7, templateId: "tpl_retention_checkin", channel: "email", subject: "Let's find a better fit" },
      { id: "s3", delayDays: 21, templateId: "tpl_sms_lis", channel: "sms", subject: "You may qualify for Extra Help" },
    ],
  },
  {
    id: "drip_enrollment",
    name: "Post-Enrollment Onboarding",
    trigger: "enrollment",
    active: false,
    enrolledCount: 0,
    completedCount: 0,
    openRate: 0,
    clickRate: 0,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    steps: [
      { id: "s1", delayDays: 0, templateId: "tpl_welcome", channel: "email", subject: "Enrollment confirmed" },
      { id: "s2", delayDays: 5, templateId: "tpl_sms_appointment", channel: "sms", subject: "ID card arriving — schedule review" },
    ],
  },
];

export function getDripSequences(): DripSequence[] {
  return load(SEQUENCES_KEY, seedSequences);
}

export function saveDripSequence(seq: DripSequence): DripSequence[] {
  const all = getDripSequences();
  const idx = all.findIndex((s) => s.id === seq.id);
  const now = new Date().toISOString();
  const updated = { ...seq, updatedAt: now };
  if (idx >= 0) all[idx] = updated;
  else all.push({ ...updated, createdAt: now });
  save(SEQUENCES_KEY, all);
  return all;
}

export function deleteDripSequence(id: string): DripSequence[] {
  const all = getDripSequences().filter((s) => s.id !== id);
  save(SEQUENCES_KEY, all);
  return all;
}

export function toggleDripSequence(id: string): DripSequence[] {
  const all = getDripSequences();
  const seq = all.find((s) => s.id === id);
  if (seq) {
    seq.active = !seq.active;
    seq.updatedAt = new Date().toISOString();
    save(SEQUENCES_KEY, all);
  }
  return all;
}

export function newDripSequence(): DripSequence {
  return {
    id: `drip_${Date.now()}`,
    name: "Untitled Sequence",
    trigger: "enrollment",
    active: false,
    steps: [
      { id: `step_${Date.now()}`, delayDays: 0, templateId: "", channel: "email", subject: "Step 1" },
    ],
    enrolledCount: 0,
    completedCount: 0,
    openRate: 0,
    clickRate: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ── SMS segment calculation ───────────────────────────────────────

export function calculateSmsSegments(text: string): number {
  const len = text.length;
  if (len <= 160) return 1;
  return Math.ceil(len / 153); // multi-segment messages use 153 chars each
}

// ── A/B Test helpers ───────────────────────────────────────────────

export function pickABWinner(variants: ABVariant[], criteria: "open_rate" | "click_rate"): string | null {
  if (variants.length < 2) return null;
  const scored = variants.map((v) => {
    const rate = v.sent > 0 ? (criteria === "open_rate" ? v.opens / v.sent : v.clicks / v.sent) : 0;
    return { id: v.id, rate };
  });
  scored.sort((a, b) => b.rate - a.rate);
  return scored[0].id;
}

export function simulateABTestPhase(campaignId: string, actor: string): EmailCampaign[] {
  const all = getCampaigns();
  const camp = all.find((c) => c.id === campaignId);
  if (!camp || !camp.abTest || camp.abTest.variants.length < 2) return all;

  const testPoolSize = Math.floor((camp.recipientCount || 20) * (camp.abTest.testPercentage / 100));
  const perVariant = Math.floor(testPoolSize / camp.abTest.variants.length);

  const updatedVariants = camp.abTest.variants.map((v) => {
    const sent = perVariant;
    const delivered = sent - Math.floor(sent * 0.05);
    const opens = Math.floor(delivered * (0.4 + Math.random() * 0.35));
    const clicks = Math.floor(opens * (0.2 + Math.random() * 0.25));
    return { ...v, sent, opens, clicks, testSize: sent };
  });

  const winnerId = pickABWinner(updatedVariants, camp.abTest.winnerCriteria);
  const winner = updatedVariants.find((v) => v.id === winnerId);

  const updated: EmailCampaign = {
    ...camp,
    abTest: {
      ...camp.abTest,
      variants: updatedVariants,
      winnerVariantId: winnerId,
      status: "winner_selected",
      testStartedAt: new Date().toISOString(),
      winnerSelectedAt: new Date().toISOString(),
    },
  };

  logAudit({
    actor,
    actorId: "system",
    action: `A/B test completed for "${camp.name}" — winner: ${winner?.label ?? "N/A"} (${winner?.subject.slice(0, 50) ?? ""})`,
    category: "campaign",
    entity: "ab_test",
    entityId: camp.id,
    severity: "info",
  });

  return saveCampaign(updated);
}

export function simulateABFullSend(campaignId: string, actor: string): EmailCampaign[] {
  const all = getCampaigns();
  const camp = all.find((c) => c.id === campaignId);
  if (!camp || !camp.abTest || !camp.abTest.winnerVariantId) return all;

  const winner = camp.abTest.variants.find((v) => v.id === camp.abTest!.winnerVariantId);
  if (!winner) return all;

  const remainingAudience = (camp.recipientCount || 20) - camp.abTest.variants.reduce((s, v) => s + v.sent, 0);
  const sent = remainingAudience;
  const delivered = sent - Math.floor(sent * 0.05);
  const opens = Math.floor(delivered * (0.4 + Math.random() * 0.35));
  const clicks = Math.floor(opens * (0.2 + Math.random() * 0.25));
  const bounces = sent - delivered;
  const unsubscribes = Math.floor(delivered * 0.02);

  const totalSent = sent + camp.abTest.variants.reduce((s, v) => s + v.sent, 0);
  const totalOpens = opens + camp.abTest.variants.reduce((s, v) => s + v.opens, 0);
  const totalClicks = clicks + camp.abTest.variants.reduce((s, v) => s + v.clicks, 0);

  const updated: EmailCampaign = {
    ...camp,
    status: "sent",
    sentAt: new Date().toISOString(),
    stats: { sent: totalSent, delivered: delivered + camp.abTest.variants.reduce((s, v) => s + v.sent - Math.floor(v.sent * 0.05), 0), opens: totalOpens, clicks: totalClicks, bounces, unsubscribes, failed: 0, optOuts: 0 },
    recipients: makeRecipients(camp.recipientCount || 20, camp.channel),
    abTest: { ...camp.abTest, status: "completed" },
  };

  logAudit({
    actor,
    actorId: "system",
    action: `Full send completed for "${camp.name}" using winning subject line — ${totalSent} total recipients`,
    category: "campaign",
    entity: "email_campaign",
    entityId: camp.id,
    severity: "info",
  });

  return saveCampaign(updated);
}

// ── Simulated send (for demo) ──────────────────────────────────────

export function simulateSend(campaignId: string, actor: string): EmailCampaign[] {
  const all = getCampaigns();
  const camp = all.find((c) => c.id === campaignId);
  if (!camp) return all;

  const recipients = makeRecipients(camp.recipientCount || 20, camp.channel);
  const sent = recipients.length;

  if (camp.channel === "sms") {
    const delivered = sent - Math.floor(sent * 0.05);
    const failed = sent - delivered;
    const clicks = Math.floor(delivered * 0.2);
    const optOuts = Math.floor(delivered * 0.03);

    const updated: EmailCampaign = {
      ...camp,
      status: "sent",
      sentAt: new Date().toISOString(),
      stats: { sent, delivered, opens: 0, clicks, bounces: 0, unsubscribes: 0, failed, optOuts },
      recipients: recipients.map((r, i) => ({
        ...r,
        status: i < clicks ? "clicked" : i < delivered ? "delivered" : i < sent ? "failed" : "delivered",
      })),
    };

    logAudit({
      actor,
      actorId: "system",
      action: `Sent SMS campaign "${camp.name}" to ${sent} recipients`,
      category: "campaign",
      entity: "sms_campaign",
      entityId: camp.id,
      severity: "info",
    });

    return saveCampaign(updated);
  }

  // Email send
  const delivered = sent - Math.floor(sent * 0.05);
  const opens = Math.floor(delivered * 0.55);
  const clicks = Math.floor(opens * 0.3);
  const bounces = sent - delivered;
  const unsubscribes = Math.floor(delivered * 0.02);

  const updated: EmailCampaign = {
    ...camp,
    status: "sent",
    sentAt: new Date().toISOString(),
    stats: { sent, delivered, opens, clicks, bounces, unsubscribes, failed: 0, optOuts: 0 },
    recipients: recipients.map((r, i) => ({
      ...r,
      status: i < opens ? (i < clicks ? "clicked" : "opened") : i < sent - bounces ? "sent" : i < sent ? "bounced" : "sent",
    })),
  };

  logAudit({
    actor,
    actorId: "system",
    action: `Sent email campaign "${camp.name}" to ${sent} recipients`,
    category: "campaign",
    entity: "email_campaign",
    entityId: camp.id,
    severity: "info",
  });

  return saveCampaign(updated);
}
