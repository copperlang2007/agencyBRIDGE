// CMS TPMO compliance utilities — 42 CFR §422.2260 / §423.2260
// Provides disclaimer text, PEWC capture, SOA tracking, and call recording retention helpers.

export const TPMO_DISCLAIMER =
  "We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.";

export const TPMO_DISCLAIMER_FIELD =
  "We do not offer every plan available in your area. Currently we represent {N} organizations which offer {M} products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Assistance Program (SHIP) to get information on all of your options.";

export const LANGUAGE_ASSISTANCE_NOTICE =
  "ATTENTION: If you speak a language other than English, language assistance services are available to you free of charge. Call 1-800-MEDICARE (1-800-633-4227). TTY users can call 1-877-486-2048. Auxiliary aids and services are available free of charge to people with disabilities.";

export const PEWC_DISCLOSURE =
  "Before we connect you, I need your clear permission. If you say yes: (1) I will share your first name, ZIP code, and contact info with a licensed insurance agent in your state. (2) The agent may contact you about Medicare Advantage, Medicare Supplement, and Part D prescription drug plans they are licensed to sell. (3) You do not have to agree in order to get the information I've already prepared for you. (4) You can withdraw this permission at any time by replying STOP. Do you agree to share your contact information for the purpose described above?";

// ── SOA (Scope of Appointment) ──────────────────────────────────────
export interface SOARecord {
  id: string;
  clientId: string;
  clientName: string;
  agentName: string;
  appointmentDate: string;
  productsDiscussed: string[];
  beneficiaryConsent: boolean;
  consentTimestamp: string;
  signatureStatus: "pending" | "signed" | "expired";
  signedAt?: string;
  expiresAt: string;
  notes?: string;
}

export const SOA_PRODUCTS = [
  "Medicare Advantage (MA)",
  "Medicare Advantage Prescription Drug (MAPD)",
  "Medicare Supplement (Medigap)",
  "Part D Prescription Drug",
  "Hospital Indemnity",
  "Final Expense",
  "Dental/Vision/Hearing",
];

export const mockSOAs: SOARecord[] = [
  {
    id: "SOA-001",
    clientId: "CL-0001",
    clientName: "James Smith",
    agentName: "Daniel Reyes",
    appointmentDate: new Date(Date.now() + 2 * 86400000).toISOString(),
    productsDiscussed: ["Medicare Advantage (MA)", "Medicare Advantage Prescription Drug (MAPD)"],
    beneficiaryConsent: true,
    consentTimestamp: new Date(Date.now() - 1 * 86400000).toISOString(),
    signatureStatus: "signed",
    signedAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
  },
  {
    id: "SOA-002",
    clientId: "CL-0005",
    clientName: "Patricia Johnson",
    agentName: "Daniel Reyes",
    appointmentDate: new Date(Date.now() + 5 * 86400000).toISOString(),
    productsDiscussed: ["Medicare Supplement (Medigap)", "Part D Prescription Drug"],
    beneficiaryConsent: true,
    consentTimestamp: new Date().toISOString(),
    signatureStatus: "pending",
    expiresAt: new Date(Date.now() + 3 * 86400000).toISOString(),
  },
  {
    id: "SOA-003",
    clientId: "CL-0012",
    clientName: "Robert Williams",
    agentName: "Sophia Martinez",
    appointmentDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    productsDiscussed: ["Medicare Advantage Prescription Drug (MAPD)"],
    beneficiaryConsent: true,
    consentTimestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    signatureStatus: "expired",
    expiresAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
  {
    id: "SOA-004",
    clientId: "CL-0018",
    clientName: "Jennifer Davis",
    agentName: "Sarah Chen",
    appointmentDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    productsDiscussed: ["Medicare Advantage (MA)", "Hospital Indemnity", "Final Expense"],
    beneficiaryConsent: true,
    consentTimestamp: new Date().toISOString(),
    signatureStatus: "signed",
    signedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
  },
];

// ── PEWC (Prior Express Written Consent) ────────────────────────────
export interface PEWCRecord {
  id: string;
  clientId: string;
  clientName: string;
  consentGiven: boolean;
  consentResponse: string; // verbatim
  consentTimestamp: string;
  agentName: string;
  sharedWith: string;
  contactInfoShared: string;
  status: "active" | "withdrawn";
  withdrawnAt?: string;
}

export const mockPEWCs: PEWCRecord[] = [
  {
    id: "PEWC-001",
    clientId: "CL-0003",
    clientName: "Mary Garcia",
    consentGiven: true,
    consentResponse: "Yes, I agree",
    consentTimestamp: new Date(Date.now() - 2 * 86400000).toISOString(),
    agentName: "Daniel Reyes",
    sharedWith: "Sarah Chen (Agent)",
    contactInfoShared: "First name, ZIP, phone",
    status: "active",
  },
  {
    id: "PEWC-002",
    clientId: "CL-0008",
    clientName: "John Miller",
    consentGiven: false,
    consentResponse: "No",
    consentTimestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
    agentName: "Sophia Martinez",
    sharedWith: "",
    contactInfoShared: "",
    status: "active",
  },
  {
    id: "PEWC-003",
    clientId: "CL-0015",
    clientName: "Linda Anderson",
    consentGiven: true,
    consentResponse: "Yes, I agree",
    consentTimestamp: new Date(Date.now() - 10 * 86400000).toISOString(),
    agentName: "Marcus Johnson",
    sharedWith: "Daniel Reyes (Agent)",
    contactInfoShared: "First name, ZIP, email",
    status: "withdrawn",
    withdrawnAt: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
];

// ── Call Recording Retention (10-year CMS requirement) ──────────────
export interface CallRecordingRecord {
  id: string;
  callId: string;
  clientName: string;
  agentName: string;
  date: string;
  durationSec: number;
  storageStatus: "stored" | "processing" | "failed";
  retentionExpires: string; // 10 years from recording date
  chainOfCustody: { timestamp: string; action: string; actor: string }[];
  accessLog: { timestamp: string; accessedBy: string; purpose: string }[];
  fileSizeMB: number;
  encryptionStatus: "encrypted" | "pending";
}

export const mockCallRecordings: CallRecordingRecord[] = [
  {
    id: "CR-001",
    callId: "CL-0001-20260101",
    clientName: "James Smith",
    agentName: "Daniel Reyes",
    date: new Date(Date.now() - 5 * 86400000).toISOString(),
    durationSec: 842,
    storageStatus: "stored",
    retentionExpires: new Date(Date.now() + 3650 * 86400000).toISOString(),
    chainOfCustody: [
      { timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), action: "Recording created", actor: "System" },
      { timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), action: "Encrypted and stored", actor: "System" },
      { timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), action: "Accessed for review", actor: "Ryan Mitchell" },
    ],
    accessLog: [
      { timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), accessedBy: "Ryan Mitchell", purpose: "Supervisor review" },
    ],
    fileSizeMB: 12.4,
    encryptionStatus: "encrypted",
  },
  {
    id: "CR-002",
    callId: "CL-0005-20260103",
    clientName: "Patricia Johnson",
    agentName: "Daniel Reyes",
    date: new Date(Date.now() - 2 * 86400000).toISOString(),
    durationSec: 1240,
    storageStatus: "stored",
    retentionExpires: new Date(Date.now() + 3650 * 86400000).toISOString(),
    chainOfCustody: [
      { timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), action: "Recording created", actor: "System" },
      { timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), action: "Encrypted and stored", actor: "System" },
    ],
    accessLog: [],
    fileSizeMB: 18.7,
    encryptionStatus: "encrypted",
  },
  {
    id: "CR-003",
    callId: "CL-0012-20260105",
    clientName: "Robert Williams",
    agentName: "Sophia Martinez",
    date: new Date().toISOString(),
    durationSec: 445,
    storageStatus: "processing",
    retentionExpires: new Date(Date.now() + 3650 * 86400000).toISOString(),
    chainOfCustody: [
      { timestamp: new Date().toISOString(), action: "Recording created", actor: "System" },
    ],
    accessLog: [],
    fileSizeMB: 6.8,
    encryptionStatus: "pending",
  },
];

// ── E-Signature / Enrollment Documents ──────────────────────────────
export interface EnrollmentDoc {
  id: string;
  clientId: string;
  clientName: string;
  agentName: string;
  carrier: string;
  planType: string;
  docType: "Enrollment Application" | "SOA" | "Authorization Form" | "HIPAA Release" | "Agent Authorization";
  status: "draft" | "sent" | "signed" | "submitted" | "carrier_approved" | "rejected";
  createdAt: string;
  signedAt?: string;
  submittedAt?: string;
  expiresAt: string;
  signatureCount: number;
  requiredSignatures: number;
}

export const mockEnrollmentDocs: EnrollmentDoc[] = [
  {
    id: "ED-001",
    clientId: "CL-0001",
    clientName: "James Smith",
    agentName: "Daniel Reyes",
    carrier: "UnitedHealthcare",
    planType: "MAPD",
    docType: "Enrollment Application",
    status: "signed",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    signedAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 4 * 86400000).toISOString(),
    signatureCount: 2,
    requiredSignatures: 2,
  },
  {
    id: "ED-002",
    clientId: "CL-0005",
    clientName: "Patricia Johnson",
    agentName: "Daniel Reyes",
    carrier: "Humana",
    planType: "MED SUPP",
    docType: "Enrollment Application",
    status: "sent",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    signatureCount: 0,
    requiredSignatures: 2,
  },
  {
    id: "ED-003",
    clientId: "CL-0012",
    clientName: "Robert Williams",
    agentName: "Sophia Martinez",
    carrier: "Aetna",
    planType: "MA",
    docType: "Enrollment Application",
    status: "submitted",
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    submittedAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 10 * 86400000).toISOString(),
    signatureCount: 2,
    requiredSignatures: 2,
  },
  {
    id: "ED-004",
    clientId: "CL-0018",
    clientName: "Jennifer Davis",
    agentName: "Sarah Chen",
    carrier: "Cigna",
    planType: "MAPD",
    docType: "SOA",
    status: "carrier_approved",
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    signedAt: new Date(Date.now() - 12 * 86400000).toISOString(),
    submittedAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 86400000).toISOString(),
    signatureCount: 2,
    requiredSignatures: 2,
  },
  {
    id: "ED-005",
    clientId: "CL-0022",
    clientName: "Michael Brown",
    agentName: "Marcus Johnson",
    carrier: "Anthem",
    planType: "PART D",
    docType: "Enrollment Application",
    status: "draft",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    expiresAt: new Date(Date.now() + 6 * 86400000).toISOString(),
    signatureCount: 0,
    requiredSignatures: 2,
  },
];
