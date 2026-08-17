// Medicare RAG Knowledge Base
// Structured knowledge for the Agent Assist avatar

export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  keywords: string[];
}

export const knowledgeCategories = [
  "Medicare Commissions",
  "Medicaid Rules by State",
  "Low Income Subsidy (LIS)",
  "Medicare Advantage Plan Types",
  "MA Plan Details by Carrier",
  "Election Periods",
  "Carrier SEP Requirements",
  "Needs Analysis & Fact Finding",
  "Agent Skills",
  "Platform Features",
];

export const knowledgeBase: KnowledgeEntry[] = [
  // ── Medicare Commissions ──────────────────────────────────────────
  {
    id: "comm-1",
    category: "Medicare Commissions",
    title: "How Medicare Advantage commissions work",
    content:
      "Medicare Advantage (Part C) commissions are paid per enrolled member per year (PEPM). Initial enrollment commissions are typically 3× the renewal rate for the first 12 months, then drop to renewal levels. Commissions are regulated by CMS — carriers cannot pay more than the FMV amounts set annually. Agents must be licensed and appointed with each carrier to receive commissions.",
    keywords: ["commission", "ma", "advantage", "pepm", "initial", "renewal", "payment", "comp"],
  },
  {
    id: "comm-2",
    category: "Medicare Commissions",
    title: "2025 FMV commission rates (approximate)",
    content:
      "For 2025, CMS-set FMV commission amounts are approximately $603 for initial Medicare Advantage enrollments and $201 for renewals. Medicare Supplement (Medigap) commissions vary by plan letter and carrier but are generally 20–25% of annual premium for 6–9 years. Part D standalone commissions are capped at ~$103 initial / $51 renewal. Actual amounts vary by carrier and state.",
    keywords: ["fmv", "rate", "2025", "amount", "supplement", "medigap", "part d", "dollar"],
  },
  {
    id: "comm-3",
    category: "Medicare Commissions",
    title: "Chargeback & clawback rules",
    content:
      "If a member disenrolls within the first 2–3 months (varies by carrier), the commission is fully clawed back. After the initial clawback window, a pro-rated chargeback may apply if the member leaves mid-year. Chargebacks appear on the agent's commission statement as negative line items. Carriers may also recover advances if the policy lapses.",
    keywords: ["chargeback", "clawback", "disenroll", "lapse", "recover", "negative", "advance"],
  },
  {
    id: "comm-4",
    category: "Medicare Commissions",
    title: "Advance vs. as-earned commission",
    content:
      "Some carriers offer advanced commission (full year paid upfront within 30–60 days of enrollment) while others pay as-earned (monthly or quarterly). Advances are recouped if the member disenrolls early. New agents often start on as-earned and qualify for advances after a track record. Check each carrier's commission schedule for advance availability.",
    keywords: ["advance", "as-earned", "upfront", "monthly", "quarterly", "recoup", "schedule"],
  },

  // ── Medicaid Rules by State ────────────────────────────────────────
  {
    id: "med-1",
    category: "Medicaid Rules by State",
    title: "Medicaid-Medicare dual eligibles overview",
    content:
      "Dual eligibles are individuals enrolled in both Medicare and Medicaid. There are two types: Full Benefit Dual Eligibles (FBDE) receive full Medicaid benefits plus Medicare cost-sharing; Qualified Medicare Beneficiaries (QMB) have Medicaid pay premiums and cost-sharing but do not get full Medicaid. States administer Medicaid programs, so eligibility and benefits vary significantly.",
    keywords: ["dual", "eligible", "medicaid", "fbde", "qmb", "full benefit", "state"],
  },
  {
    id: "med-2",
    category: "Medicaid Rules by State",
    title: "Medicaid eligibility by income (state variations)",
    content:
      "Medicaid eligibility income limits vary widely by state. As of 2025, states that expanded Medicaid under ACA cover adults up to 138% FPL. Non-expansion states (e.g., Texas, Florida, Georgia) have much lower limits, often covering only parents, children, disabled, or elderly at very low income thresholds. Always check the specific state's Medicaid agency for current limits. Use the Medicaid.gov state plan finder for authoritative details.",
    keywords: ["income", "limit", "fpl", "expansion", "non-expansion", "eligible", "poverty", "state"],
  },
  {
    id: "med-3",
    category: "Medicaid Rules by State",
    title: "Medicare Savings Programs (MSP) by state",
    content:
      "Medicare Savings Programs help pay Medicare premiums and cost-sharing. QMB covers Part A & B premiums + cost-sharing (income ≤100% FPL). SLMB covers Part B premiums (120% FPL). QI covers Part B premiums (135% FPL, first-come first-served). Asset limits apply in most states (~$7,970 individual / $11,960 couple for 2025). A few states (e.g., New York, Connecticut) have eliminated asset tests. Income/resource limits vary by state.",
    keywords: ["msp", "qmb", "slmb", "qi", "savings", "premium", "asset", "resource", "state"],
  },
  {
    id: "med-4",
    category: "Medicaid Rules by State",
    title: "State-specific dual plan (D-SNP) availability",
    content:
      "Dual-eligible Special Needs Plans (D-SNPs) are available in most states but coverage and benefits vary. Some states coordinate fully with Medicaid (Fully Integrated D-SNPs), others have limited integration. States like California, New York, Texas, and Florida have robust D-SNP markets. Check carrier availability by county — D-SNPs are county-specific. Always verify Medicaid status before enrolling in a D-SNP.",
    keywords: ["d-snp", "dual", "integrated", "county", "state", "availability", "carrier"],
  },

  // ── Low Income Subsidy (LIS) ───────────────────────────────────────
  {
    id: "lis-1",
    category: "Low Income Subsidy (LIS)",
    title: "What is Low Income Subsidy (Extra Help)?",
    content:
      "The Low Income Subsidy (LIS), also called Extra Help, is a federal program that helps Medicare beneficiaries pay for Part D prescription drug costs — premiums, deductibles, and copays. Full LIS beneficiaries pay no premium (if enrolled in a benchmark plan), no deductible, and low copays ($1.05 generic / $4.15 brand in 2025). Partial LIS beneficiaries get reduced premiums, deductibles, and 15% coinsurance.",
    keywords: ["lis", "extra help", "low income", "subsidy", "part d", "premium", "copay", "deductible"],
  },
  {
    id: "lis-2",
    category: "Low Income Subsidy (LIS)",
    title: "LIS eligibility income & resource limits (2025)",
    content:
      "Full LIS: income ≤150% FPL and resources ≤$11,710 individual / $23,410 couple (2025). Partial LIS: income 150–180% FPL, resources ≤$11,710 / $23,410. Those with full Medicaid, SSI, or MSP (QMB/SLMB/QI) automatically qualify for full LIS without a separate application. Apply via SSA Form 1020 or apply online at SSA.gov.",
    keywords: ["lis", "eligible", "income", "resource", "limit", "fpl", "automatic", "qualify", "ssa"],
  },
  {
    id: "lis-3",
    category: "Low Income Subsidy (LIS)",
    title: "LIS copay levels and benchmark plans",
    content:
      "Full LIS beneficiaries at or below 100% FPL pay $1.05 (generic) / $4.15 (brand) copays in 2025. Those between 100–150% FPL pay $4.15 / $10.40. Partial LIS pays 15% coinsurance after deductible. Benchmark plans (lowest-cost plans in a region) have $0 premium for full LIS beneficiaries. If a full LIS beneficiary enrolls in a non-benchmark plan, they may owe a premium.",
    keywords: ["copay", "benchmark", "level", "generic", "brand", "coinsurance", "premium", "lis"],
  },
  {
    id: "lis-4",
    category: "Low Income Subsidy (LIS)",
    title: "Deemed vs. applied LIS",
    content:
      "Deemed LIS beneficiaries automatically qualify because they receive Medicaid, SSI, or MSP benefits — no application needed, and they are re-evaluated annually. Applied LIS beneficiaries submitted SSA Form 1020 and may need to reapply if income changes. Deemed status can be verified through the SSA's LIS query or the plan's eligibility file. Always confirm deemed status before plan selection.",
    keywords: ["deemed", "applied", "automatic", "ssi", "medicaid", "msp", "re-evaluate", "status"],
  },

  // ── Medicare Advantage Plan Types ─────────────────────────────────
  {
    id: "ma-1",
    category: "Medicare Advantage Plan Types",
    title: "Types of Medicare Advantage plans",
    content:
      "Medicare Advantage (Part C) plans include: HMO (Health Maintenance Organization) — requires PCP referrals and in-network care; HMO-POS — HMO with out-of-network flexibility for certain services; PPO (Preferred Provider Organization) — in/out-of-network, no referral needed; PFFS (Private Fee-for-Service) — any provider who accepts terms; SNP (Special Needs Plan) — tailored for chronic conditions, institutional, or dual-eligibles; MSA (Medical Savings Account) — high deductible paired with savings account.",
    keywords: ["hmo", "ppo", "pffs", "snp", "msa", "type", "plan", "advantage", "referral", "network"],
  },
  {
    id: "ma-2",
    category: "Medicare Advantage Plan Types",
    title: "HMO vs PPO key differences",
    content:
      "HMO plans require members to use in-network providers and typically need PCP referrals for specialists — lower premiums but less flexibility. PPO plans allow in- and out-of-network providers without referrals — higher premiums but more freedom. HMO-POS offers limited out-of-network access for specific services. For beneficiaries who travel frequently or have out-of-area specialists, PPO is usually preferred.",
    keywords: ["hmo", "ppo", "difference", "referral", "network", "pcp", "travel", "premium"],
  },
  {
    id: "ma-3",
    category: "Medicare Advantage Plan Types",
    title: "Special Needs Plans (SNP) types",
    content:
      "There are three SNP types: C-SNP (Chronic Condition) — for diabetes, heart failure, ESRD, COPD, etc.; I-SNP (Institutional) — for nursing home or long-term care residents; D-SNP (Dual-Eligible) — for those with both Medicare and Medicaid. SNPs tailor benefits, provider networks, and drug formularies to the specific population. Enrollment requires documentation of the qualifying condition or status.",
    keywords: ["snp", "c-snp", "i-snp", "d-snp", "chronic", "institutional", "dual", "special needs"],
  },
  {
    id: "ma-4",
    category: "Medicare Advantage Plan Types",
    title: "MA-PD vs MA-only",
    content:
      "MA-PD (Medicare Advantage Prescription Drug) plans bundle Part A, B, and D coverage into one plan — most common type. MA-only plans cover Part A and B but exclude drug coverage; members must enroll in a standalone Part D (PDP) separately. When comparing plans, verify whether drug coverage is included to avoid gaps. MA-PD plans have one combined premium and one ID card.",
    keywords: ["ma-pd", "ma-only", "prescription", "part d", "pdp", "bundle", "drug", "coverage"],
  },

  // ── MA Plan Details by Carrier ────────────────────────────────────
  {
    id: "car-1",
    category: "MA Plan Details by Carrier",
    title: "UnitedHealthcare (UHC) Medicare Advantage",
    content:
      "UHC offers HMO, PPO, and D-SNP plans nationwide. Known for the UHC Medicare Advantage portfolio with AARP branding. Key features: $0 primary care copays on many plans, nationwide PPO network, SilverSneakers fitness benefit, dental/vision/hearing allowances ($0–$2,500/yr depending on plan), OTC benefit cards, and transportation. UHC also offers the only fully integrated D-SNP in select markets. Commission: advance available, paid monthly.",
    keywords: ["unitedhealthcare", "uhc", "aarp", "silversneakers", "ppo", "d-snp", "otc", "dental"],
  },
  {
    id: "car-2",
    category: "MA Plan Details by Carrier",
    title: "Humana Medicare Advantage",
    content:
      "Humana offers HMO, PPO, and SNP plans with strong presence in the South and Midwest. Key features: Go365 wellness program, Healthy Foods card (select plans), OTC allowances, dental/vision/hearing, SilverSneakers or FitOn, transportation (up to 24 one-way trips). Humana's Honor plan targets veterans. Commission: advance and as-earned options, fast appointment process (3–5 business days).",
    keywords: ["humana", "go365", "healthy foods", "honor", "veteran", "otc", "snp", "appointment"],
  },
  {
    id: "car-3",
    category: "MA Plan Details by Carrier",
    title: "Aetna (CVS Health) Medicare Advantage",
    content:
      "Aetna offers HMO, PPO, and D-SNP plans. Key features: $0 PCP on most plans, Aetna Medicare Eagle for veterans, dental/vision/hearing allowances, OTC benefit, gym memberships (SilverSneakers or GymPac), and care management programs. Aetna's D-SNPs coordinate with state Medicaid in select states. Commission: advance available, competitive FMV rates. Appointment via Aetna broker portal.",
    keywords: ["aetna", "cvs", "eagle", "veteran", "silver sneakers", "d-snp", "otc", "broker"],
  },
  {
    id: "car-4",
    category: "MA Plan Details by Carrier",
    title: "Centene / WellCare Medicare Advantage",
    content:
      "WellCare (a Centene company) offers HMO, PPO, and SNP plans, often with competitive premiums ($0 or low). Key features: Flex Card for dental/vision/hearing/transportation, OTC allowance, grocery benefit on select D-SNPs, and robust chronic condition management. WellCare focuses heavily on SNP and dual-eligible markets. Commission: advance available. Appointment via Centene broker portal.",
    keywords: ["wellcare", "centene", "flex card", "grocery", "d-snp", "snp", "otc", "dual"],
  },
  {
    id: "car-5",
    category: "MA Plan Details by Carrier",
    title: "Blue Cross Blue Shield (BCBS) Medicare Advantage",
    content:
      "BCBS plans operate as independent local licensees (e.g., Anthem, HCSC, Florida Blue, Highmark) so plans, networks, and benefits vary by state/region. Key features: broad PPO networks (especially Anthem EPO/PPO), $0 PCP, dental/vision/hearing, fitness (SilverSneakers or RenActive), and OTC. Commission and appointment processes vary by licensee — confirm with the local BCBS Medicare broker team.",
    keywords: ["bcbs", "blue cross", "anthem", "highmark", "florida blue", "epo", "ppo", "state"],
  },
  {
    id: "car-6",
    category: "MA Plan Details by Carrier",
    title: "Cigna Medicare Advantage",
    content:
      "Cigna offers HMO and PPO plans in select markets. Key features: $0 preventive dental, vision and hearing allowances, Cigna Healthy Today app, OTC benefit, gym membership, and care management. Cigna's Health Improvement Program targets chronic conditions. Commission: advance available, appointment via Cigna broker portal. Cigna has a smaller geographic footprint — verify county availability.",
    keywords: ["cigna", "healthy today", "otc", "gym", "ppo", "hmo", "county", "broker"],
  },
  {
    id: "car-7",
    category: "MA Plan Details by Carrier",
    title: "Kaiser Permanente Medicare Advantage",
    content:
      "Kaiser operates HMO plans in limited regions (CA, CO, GA, HI, MD, OR, VA, WA, DC). Known for integrated care model — plan and provider are the same system. Key features: $0 PCP, integrated EHR, pharmacy on-site, dental/vision on select plans, fitness benefit. Kaiser consistently earns high Star Ratings (often 4.5–5). Limited geographic footprint — only available in Kaiser service areas. Commission: as-earned, advance limited. Appointment via Kaiser broker portal.",
    keywords: ["kaiser", "permanente", "hmo", "integrated", "star rating", "5-star", "california", "colorado", "georgia"],
  },
  {
    id: "car-8",
    category: "MA Plan Details by Carrier",
    title: "Devoted Health Medicare Advantage",
    content:
      "Devoted Health is a newer MA carrier focused on seniors, available in select markets (FL, TX, IL, OH, LA, MS, AL, GA, SC, NC, PA, NY, NJ, CT, MA). Key features: $0 premium plans common, $0 PCP, Devoted Medical (virtual primary care), dental/vision/hearing, OTC card, transportation, and SilverSneakers. Devoted offers D-SNP and C-SNP plans in some markets. Commission: advance available, fast appointment. Smaller network — verify providers carefully.",
    keywords: ["devoted", "devoted health", "virtual care", "otc", "d-snp", "c-snp", "florida", "texas", "new carrier"],
  },
  {
    id: "car-9",
    category: "MA Plan Details by Carrier",
    title: "Clover Health Medicare Advantage",
    content:
      "Clover Health is a tech-forward MA carrier available in select counties (NJ, PA, GA, TX, MS, SC, FL, IL, AL, TN, AR, OH). Key features: $0 premium plans, $0 PCP, Clover Assistant (AI clinical decision support for providers), dental/vision/hearing, OTC, transportation, and in-home visits. Clover focuses on HMO and PPO plans. Commission: advance available. Appointment via Clover broker portal. Verify county availability — Clover is rapidly expanding.",
    keywords: ["clover", "clover health", "ai", "in-home", "otc", "transportation", "ppo", "hmo", "new jersey"],
  },
  {
    id: "car-10",
    category: "MA Plan Details by Carrier",
    title: "Molina Healthcare Medicare Advantage",
    content:
      "Molina focuses on Medicaid and dual-eligible populations, offering D-SNP and C-SNP plans in CA, TX, FL, IL, MI, OH, WA, NM, UT, WI, ID, NV, SC, and Puerto Rico. Key features: $0 premium, $0 PCP, integrated Medicaid-Medicare coordination, dental/vision/hearing, OTC, transportation, and care management for chronic conditions. Molina is ideal for dual-eligible clients. Commission: as-earned. Appointment via Molina broker portal.",
    keywords: ["molina", "d-snp", "c-snp", "dual", "medicaid", "integrated", "otc", "california", "texas"],
  },
  {
    id: "car-11",
    category: "MA Plan Details by Carrier",
    title: "Alignment Healthcare Medicare Advantage",
    content:
      "Alignment Healthcare offers HMO and PPO plans in CA, FL, NC, SC, TX, NV, AZ, and IL. Key features: $0 premium plans, $0 PCP, Alignment's AVA (AI-powered care model), dental/vision/hearing, OTC, transportation, and chronic care programs. Alignment focuses on seniors with complex needs and offers C-SNP plans. Commission: advance available. Appointment via Alignment broker portal.",
    keywords: ["alignment", "alignment healthcare", "ava", "ai", "c-snp", "chronic", "otc", "california", "florida"],
  },
  {
    id: "car-12",
    category: "MA Plan Details by Carrier",
    title: "SCAN Health Plan Medicare Advantage",
    content:
      "SCAN Health Plan operates HMO and SNP plans primarily in CA, AZ, NV, TX, and CO. Strong focus on seniors and dual-eligibles. Key features: $0 PCP, dental/vision/hearing, OTC, transportation, fitness (SilverSneakers), and robust care management. SCAN offers D-SNP and I-SNP plans. Known for high Star Ratings and member satisfaction. Commission: advance available. Appointment via SCAN broker portal.",
    keywords: ["scan", "scan health", "d-snp", "i-snp", "silver sneakers", "otc", "california", "arizona", "star rating"],
  },
  {
    id: "car-13",
    category: "MA Plan Details by Carrier",
    title: "Health Net Medicare Advantage",
    content:
      "Health Net (a Centene company) offers HMO, PPO, and SNP plans in CA, AZ, OR, and WA. Key features: $0 premium plans common, $0 PCP, dental/vision/hearing, OTC, transportation, and fitness. Health Net focuses heavily on the California market with D-SNP and C-SNP options. Commission: advance available. Appointment via Health Net/Centene broker portal. WellCare and Health Net are both Centene — verify which brand operates in your county.",
    keywords: ["health net", "centene", "d-snp", "c-snp", "otc", "california", "arizona", "oregon", "washington"],
  },
  {
    id: "car-14",
    category: "MA Plan Details by Carrier",
    title: "Oscar Medicare Advantage (Oscar Tech)",
    content:
      "Oscar offers HMO and PPO plans in select markets (FL, TX, NY, CA, NJ, others). Known for tech-forward member experience via the Oscar app. Key features: $0 PCP on select plans, virtual care (Oscar Virtual Visit), dental/vision/hearing, OTC, and care navigation. Oscar's MA footprint is smaller than its ACA exchange presence — verify county availability. Commission: advance available. Appointment via Oscar broker portal.",
    keywords: ["oscar", "oscar health", "virtual visit", "app", "otc", "florida", "texas", "tech", "broker"],
  },
  {
    id: "car-15",
    category: "MA Plan Details by Carrier",
    title: "Highmark Blue Cross Medicare Advantage",
    content:
      "Highmark (a BCBS licensee) operates in PA, WV, DE, and parts of NY. Key features: broad PPO and HMO networks, $0 PCP, dental/vision/hearing, fitness (RenActive), OTC, and chronic care management. Highmark offers D-SNP plans in PA. Commission and appointment via Highmark broker portal — processes differ from other BCBS licensees. Verify with the local Highmark Medicare team.",
    keywords: ["highmark", "bcbs", "blue cross", "pennsylvania", "west virginia", "renactive", "d-snp", "ppo"],
  },
  {
    id: "car-16",
    category: "MA Plan Details by Carrier",
    title: "Anthem Blue Cross Medicare Advantage",
    content:
      "Anthem (a BCBS licensee, now Elevance Health) operates in CA, CO, CT, GA, IN, KY, ME, MO, NV, NH, NY, OH, VA, WI, and others. Key features: EPO and PPO networks (EPO = no out-of-network except emergencies), $0 PCP, dental/vision/hearing, fitness (SilverSneakers or Active&Fit), OTC, and care management. Anthem offers D-SNP and C-SNP plans. Commission: advance available. Appointment via Anthem broker portal.",
    keywords: ["anthem", "elevance", "bcbs", "epo", "ppo", "silver sneakers", "d-snp", "c-snp", "california"],
  },
  {
    id: "car-17",
    category: "MA Plan Details by Carrier",
    title: "Florida Blue Medicare Advantage",
    content:
      "Florida Blue (a BCBS licensee) operates HMO and PPO plans statewide in Florida. Key features: broad PPO network, $0 PCP, dental/vision/hearing, fitness, OTC, and transportation. Florida Blue offers D-SNP plans in select counties. Strong network in rural Florida counties where other carriers may not operate. Commission: advance available. Appointment via Florida Blue broker portal.",
    keywords: ["florida blue", "bcbs", "florida", "ppo", "hmo", "d-snp", "rural", "otc", "transportation"],
  },
  {
    id: "car-18",
    category: "MA Plan Details by Carrier",
    title: "Humana Honor Plan (Veterans)",
    content:
      "Humana Honor is a specialized MA plan for veterans, available in select markets. Key features: $0 premium, $0 PCP, VA coordination, dental/vision/hearing, OTC, transportation, and fitness. Honor plans may include enhanced benefits for veterans such as hearing aids and preventive care. No VA enrollment required — veterans with Medicare Part A and B qualify. Commission: advance available. Verify Honor plan availability by county.",
    keywords: ["humana", "honor", "veteran", "va", "hearing aid", "preventive", "otc", "transportation"],
  },
  {
    id: "car-19",
    category: "MA Plan Details by Carrier",
    title: "UnitedHealthcare Dual Complete (D-SNP)",
    content:
      "UHC Dual Complete is the flagship D-SNP product, available in most states. Key features: $0 premium, $0 PCP, coordinated Medicaid-Medicare benefits, dental/vision/hearing, OTC, transportation (up to 24 one-way trips), healthy food card (select plans), and care management. UHC Dual Complete is fully integrated in select states (NY, OH, TX, others). Requires Medicaid eligibility verification. Commission: advance available. Ideal for dual-eligible clients.",
    keywords: ["uhc", "unitedhealthcare", "dual complete", "d-snp", "dual", "medicaid", "food card", "otc", "integrated"],
  },
  {
    id: "car-20",
    category: "MA Plan Details by Carrier",
    title: "Aetna Medicare Eagle (Veterans)",
    content:
      "Aetna Medicare Eagle is designed for veterans, available in select markets. Key features: $0 premium, $0 PCP, VA care coordination, dental/vision/hearing, OTC, transportation, and fitness. Eagle plans may include enhanced hearing and vision benefits. Veterans with Part A and B qualify — no VA enrollment needed. Commission: advance available. Verify Eagle plan availability by county — not all markets have it.",
    keywords: ["aetna", "eagle", "veteran", "va", "hearing", "vision", "otc", "transportation", "fitness"],
  },
  {
    id: "car-21",
    category: "MA Plan Details by Carrier",
    title: "WellCare Value Script (Part D)",
    content:
      "WellCare Value Script is a standalone Part D (PDP) plan available nationwide. Key features: low premium, broad formulary, preferred generic tier, and coverage during the donut hole. Value Script is a good option for clients staying on Original Medicare who need drug coverage. Full LIS beneficiaries may pay $0 on the benchmark version. Commission: ~$103 initial / $51 renewal. Appointment not required for PDP-only sales in most states.",
    keywords: ["wellcare", "value script", "part d", "pdp", "standalone", "drug", "formulary", "lis", "benchmark"],
  },
  {
    id: "car-22",
    category: "MA Plan Details by Carrier",
    title: "SilverScript (CVS/Aetna) Part D",
    content:
      "SilverScript is Aetna/CVS's standalone Part D plan, available nationwide. Key features: low premium, broad formulary, preferred pharmacy network (CVS), and donut hole coverage. SilverScript is one of the most-enrolled PDP plans. Full LIS beneficiaries may qualify for $0 premium. Commission: ~$103 initial / $51 renewal. No appointment needed for PDP-only enrollment.",
    keywords: ["silverscript", "aetna", "cvs", "part d", "pdp", "drug", "formulary", "cvs pharmacy", "lis"],
  },
  {
    id: "car-23",
    category: "MA Plan Details by Carrier",
    title: "Mutual of Omaha Medicare Supplement (Medigap)",
    content:
      "Mutual of Omaha is a top Medigap carrier. Key features: Plans A, B, C, D, F, G, High-Deductible G, K, L, M, and N available (Plan F only for those eligible before 2020). Plan G is the most popular — covers everything except Part B deductible. Medigap is guaranteed renewable and portable across all 50 states. Underwriting required in most states (not during IEP/OEP). Commission: 20–25% of premium for 6–9 years depending on plan. Appointment via Mutual of Omaha broker portal.",
    keywords: ["mutual of omaha", "medigap", "supplement", "plan g", "plan f", "plan n", "underwriting", "portable", "guaranteed renewable"],
  },
  {
    id: "car-24",
    category: "MA Plan Details by Carrier",
    title: "AARP / UHC Medicare Supplement (Medigap)",
    content:
      "UnitedHealthcare offers Medigap plans under the AARP branding. Key features: Plans A, B, C, F, G, High-Deductible G, K, L, and N. AARP/UHC Medigap is one of the most recognized and widely held. Plan G is the most popular (covers all but Part B deductible). Household discount available in most states. Commission: 20–25% of premium. Appointment via UHC broker portal. Underwriting required outside IEP/OEP.",
    keywords: ["aarp", "uhc", "unitedhealthcare", "medigap", "supplement", "plan g", "plan f", "plan n", "household discount"],
  },
  {
    id: "car-25",
    category: "MA Plan Details by Carrier",
    title: "Blue Cross Blue Shield Medicare Supplement (Medigap)",
    content:
      "BCBS licensees offer Medigap plans in their respective states. Key features: Plans A, B, C, D, F, G, High-Deductible G, K, L, M, and N (availability varies by state licensee). BCBS Medigap is popular due to brand recognition and broad acceptance. Household discounts available in many states. Commission: 20–25% of premium. Underwriting required outside IEP/OEP. Appointment processes vary by licensee.",
    keywords: ["bcbs", "blue cross", "medigap", "supplement", "plan g", "plan n", "household discount", "underwriting", "state"],
  },
  {
    id: "car-26",
    category: "MA Plan Details by Carrier",
    title: "WellCare Medicare Supplement (Medigap)",
    content:
      "WellCare offers Medigap plans in select states. Key features: Plans A, F, G, High-Deductible G, and N (availability varies). WellCare Medigap competes on price — premiums may be lower than Mutual of Omaha or AARP/UHC for the same plan letter. Commission: 20–25% of premium. Appointment via WellCare/Centene broker portal. Underwriting required outside IEP/OEP. Verify state availability.",
    keywords: ["wellcare", "medigap", "supplement", "plan g", "plan n", "plan f", "price", "underwriting", "centene"],
  },
  {
    id: "car-27",
    category: "MA Plan Details by Carrier",
    title: "Humana Medicare Supplement (Medigap)",
    content:
      "Humana offers Medigap plans in select states. Key features: Plans A, C, F, G, High-Deductible G, and N. Humana Medigap may include household discounts and online application in some states. Commission: 20–25% of premium. Appointment via Humana broker portal. Underwriting required outside IEP/OEP. Humana Medigap is a good cross-sell for clients who prefer Original Medicare over MA.",
    keywords: ["humana", "medigap", "supplement", "plan g", "plan n", "plan f", "household discount", "underwriting", "original medicare"],
  },
  {
    id: "car-28",
    category: "MA Plan Details by Carrier",
    title: "Cigna Medicare Supplement (Medigap)",
    content:
      "Cigna offers Medigap plans in select states. Key features: Plans A, B, C, D, F, G, High-Deductible G, K, L, and N. Cigna Medigap includes household discounts in many states and online application. Commission: 20–25% of premium. Appointment via Cigna broker portal. Underwriting required outside IEP/OEP. Cigna Medigap availability varies — check state.",
    keywords: ["cigna", "medigap", "supplement", "plan g", "plan n", "plan f", "household discount", "underwriting", "online"],
  },
  {
    id: "car-29",
    category: "MA Plan Details by Carrier",
    title: "Carrier comparison: MA vs Medigap decision guide",
    content:
      "When helping a client choose between Medicare Advantage and Medigap + Original Medicare: MA pros — lower or $0 premium, extra benefits (dental, vision, hearing, OTC, fitness), max out-of-pocket cap. MA cons — network restrictions, referrals (HMO), prior authorization, annual plan changes. Medigap pros — any Medicare provider nationwide, no referrals, predictable costs, portable. Medigap cons — higher monthly premium, no extra benefits, no drug coverage (need standalone PDP). For clients who travel, see specialists frequently, or want freedom, Medigap + PDP is often better. For budget-conscious clients who use in-network providers, MA is often better.",
    keywords: ["comparison", "medigap", "advantage", "ma vs medigap", "original medicare", "network", "premium", "out of pocket", "travel"],
  },
  {
    id: "car-30",
    category: "MA Plan Details by Carrier",
    title: "Carrier appointment & contracting quick reference",
    content:
      "Appointment process by carrier (approximate): UHC — online via UHC broker portal, 3–5 business days; Humana — online via Humana broker portal, 2–4 business days; Aetna — online via Aetna broker portal, 3–7 business days; WellCare/Centene — online via Centene broker portal, 5–10 business days; BCBS — varies by licensee, contact local Medicare broker team; Cigna — online via Cigna broker portal, 3–5 business days; Kaiser — restricted, contact Kaiser broker relations; Devoted/Clover/Alignment — online via respective portals, 3–7 business days. AHIP certification required annually before appointment with most carriers.",
    keywords: ["appointment", "contracting", "broker", "portal", "ahip", "certification", "carrier", "process", "timeline"],
  },
  {
    id: "car-31",
    category: "MA Plan Details by Carrier",
    title: "Carrier Star Ratings overview (2025)",
    content:
      "CMS Star Ratings (1–5) measure MA and Part D plan quality. 5-star plans allow year-round enrollment via 5-Star SEP. Recent high performers: Kaiser (4.5–5 in most markets), UHC (4–4.5 in many markets), Humana (4 in many markets), Devoted Health (4 in select markets). Ratings are updated each October. Lower-rated plans (2–3 stars) may face CMS penalties and reduced rebates. Always check current Star Ratings on CMS.gov before recommending — ratings change annually.",
    keywords: ["star rating", "cms", "5-star", "quality", "kaiser", "uhc", "humana", "devoted", "penalty", "rating"],
  },
  {
    id: "car-32",
    category: "MA Plan Details by Carrier",
    title: "OTC & supplemental benefit cards by carrier",
    content:
      "OTC and supplemental benefit cards vary by carrier and plan: UHC — $0–$2,500/yr OTC + healthy food/produce card on select plans; Humana — Healthy Foods card + OTC on select plans (especially D-SNP); Aetna — OTC card + grocery on select D-SNPs; WellCare — Flex Card (dental/vision/hearing/transportation) + OTC + grocery on D-SNPs; Devoted — OTC + healthy food; Clover — OTC + transportation; Molina — OTC + transportation + healthy food on D-SNPs. Amounts and eligible items vary by plan — always verify in the plan's Evidence of Coverage (EOC).",
    keywords: ["otc", "flex card", "healthy food", "grocery", "produce", "supplemental", "benefit card", "d-snp", "carrier"],
  },

  // ── Election Periods ───────────────────────────────────────────────
  {
    id: "ep-1",
    category: "Election Periods",
    title: "Annual Enrollment Period (AEP) — Oct 15 to Dec 7",
    content:
      "The AEP (also called Open Enrollment) runs October 15 – December 7 each year. During AEP, beneficiaries can: join a Medicare Advantage plan, switch MA plans, switch from MA to Original Medicare + Part D, or switch Part D plans. Coverage changes take effect January 1. This is the busiest time for agents — all marketing and enrollment activity is concentrated here. SOA (Scope of Appointment) must be completed 48 hours before any in-home sales appointment during AEP.",
    keywords: ["aep", "annual", "open enrollment", "october", "december", "january", "soa", "scope"],
  },
  {
    id: "ep-2",
    category: "Election Periods",
    title: "Medicare Advantage Open Enrollment Period (MA OEP) — Jan 1 to Mar 31",
    content:
      "The MA OEP runs January 1 – March 31. Beneficiaries enrolled in an MA plan can make ONE change: switch to another MA plan, or disenroll from MA and return to Original Medicare (with or without a standalone Part D plan). Cannot switch Part D standalone plans during MA OEP (unless disenrolling from MA). Beneficiaries new to Medicare get a 3-month MA OEP starting the first month of Part B coverage. Marketing restrictions apply — agents cannot target MA OEP for marketing.",
    keywords: ["oep", "ma oep", "january", "march", "switch", "disenroll", "original medicare", "one change"],
  },
  {
    id: "ep-3",
    category: "Election Periods",
    title: "Initial Enrollment Period (IEP)",
    content:
      "The IEP is the 7-month window around a beneficiary's 65th birthday: 3 months before, the birthday month, and 3 months after. Beneficiaries can enroll in Medicare Part A, B, C (MA), and/or D. If enrolled during the first 3 months, coverage starts the birthday month. If enrolled during the birthday month or later months, coverage starts the following month. IEP also applies to those qualifying by disability (25-month SSDI).",
    keywords: ["iep", "initial", "65", "birthday", "7 month", "part b", "disability", "ssdi"],
  },
  {
    id: "ep-4",
    category: "Election Periods",
    title: "Special Election Periods (SEP) overview",
    content:
      "SEPs allow enrollment changes outside of AEP/MA OEP due to qualifying life events. Common SEPs: moving out of plan service area, losing employer coverage, losing Medicaid/LIS eligibility, entering/leaving a long-term care facility, CMS plan non-renewal, and 5-star SEP (enroll in a 5-star plan anytime, once per year). Each SEP has specific enrollment windows (typically 2–3 months after the triggering event). Documentation may be required.",
    keywords: ["sep", "special election", "move", "employer", "medicaid", "lis", "5-star", "non-renewal", "trigger"],
  },

  // ── Carrier SEP Requirements ───────────────────────────────────────
  {
    id: "sep-1",
    category: "Carrier SEP Requirements",
    title: "SEP documentation requirements by carrier",
    content:
      "Most carriers require SEP documentation before enrollment can be submitted. Common documents: proof of address change (utility bill, lease), loss of employer coverage (employer letter, COBRA notice), Medicaid/LIS status change (state notice), institutional admission/discharge (facility letter). UHC and Humana allow online SEP attestation for some SEPs but may request documentation post-enrollment. Aetna and WellCare typically require documentation upfront. Always verify with the carrier's enrollment guide.",
    keywords: ["sep", "documentation", "proof", "address", "employer", "medicaid", "attestation", "carrier"],
  },
  {
    id: "sep-2",
    category: "Carrier SEP Requirements",
    title: "5-Star SEP — carrier availability",
    content:
      "The 5-Star SEP allows enrollment into a CMS-rated 5-star MA or Part D plan at any time, once per year, without waiting for AEP. Not all carriers have 5-star plans in all markets — check CMS Star Ratings (published each October). As of recent ratings, select UHC, Humana, and Kaiser plans have held 5-star status in certain counties. The beneficiary must be enrolling in the specific 5-star-rated plan (not just any plan from a carrier with a 5-star plan elsewhere).",
    keywords: ["5-star", "sep", "star rating", "cms", "kaiser", "uhc", "humana", "county"],
  },
  {
    id: "sep-3",
    category: "Carrier SEP Requirements",
    title: "Losing employer coverage SEP — carrier-specific notes",
    content:
      "When a beneficiary loses employer/union group health coverage, they qualify for a SEP (2 months after loss of coverage). UHC: accepts employer attestation letter or COBRA notice; enrollment effective the month after submission. Humana: requires employer termination letter with date; fast-tracks within 48 hours. Aetna: accepts retirement or layoff documentation; may require Part B activation proof. WellCare: streamlined for loss of employer drug coverage (Part D SEP). Always confirm effective dates — they vary.",
    keywords: ["employer", "loss", "cobra", "retirement", "termination", "part b", "effective", "carrier"],
  },
  {
    id: "sep-4",
    category: "Carrier SEP Requirements",
    title: "Moving SEP — service area change",
    content:
      "When a beneficiary moves to a new address outside their current plan's service area, they qualify for a SEP (2 months before or 3 months after the move). If the new address has the same plan available, no change is required. If the plan is unavailable, the beneficiary must choose a new plan or return to Original Medicare. UHC and Humana accept new address via online attestation; Aetna and BCBS may require a utility bill or lease. D-SNP beneficiaries moving states must re-verify Medicaid status in the new state.",
    keywords: ["move", "relocate", "address", "service area", "new state", "d-snp", "medicaid", "utility"],
  },

  // ── Needs Analysis & Fact Finding ─────────────────────────────────
  {
    id: "na-1",
    category: "Needs Analysis & Fact Finding",
    title: "Essential fact-finding questions for MA enrollment",
    content:
      "Before recommending a Medicare Advantage plan, gather: 1) Current coverage (Original Medicare, MA, employer, Medicaid); 2) Doctors and specialists (names, NPIs, in-network verification); 3) Prescription drugs (name, dosage, frequency, pharmacy); 4) Monthly budget and premium tolerance; 5) Travel patterns (snowbirds, frequent travelers); 6) Chronic conditions and specialist needs; 7) Dental/vision/hearing needs; 8) Hospital or surgery anticipated in the next year. Document all answers on the needs assessment form.",
    keywords: ["fact finding", "needs analysis", "questions", "doctors", "drugs", "budget", "travel", "chronic"],
  },
  {
    id: "na-2",
    category: "Needs Analysis & Fact Finding",
    title: "Scope of Appointment (SOA) requirements",
    content:
      "A Scope of Appointment (SOA) form must be completed at least 48 hours before any in-person or telephonic sales appointment for MA or Part D. The SOA documents which products will be discussed (MA, Part D, Medigap, etc.). Agents may only discuss and sell products listed on the SOA. SOA is not required for existing clients for service-related meetings or for Medigap-only discussions. Keep SOA on file for 10 years. CMS audits SOA compliance regularly.",
    keywords: ["soa", "scope of appointment", "48 hours", "sales", "cms", "audit", "document", "compliance"],
  },
  {
    id: "na-3",
    category: "Needs Analysis & Fact Finding",
    title: "Drug formulary verification process",
    content:
      "Always verify the client's medications against each plan's formulary before recommending. Steps: 1) Collect complete drug list with dosages and frequencies; 2) Check each plan's formulary via carrier portal or Medicare Plan Finder; 3) Note tier levels (Tier 1 preferred generic to Tier 5 specialty); 4) Check for prior authorization, step therapy, or quantity limits; 5) Calculate total annual drug cost across plans. A plan with a $0 premium but Tier 4 for the client's main medication may cost more overall than a higher-premium plan.",
    keywords: ["formulary", "drug", "tier", "prior auth", "step therapy", "plan finder", "medication", "cost"],
  },
  {
    id: "na-4",
    category: "Needs Analysis & Fact Finding",
    title: "Provider network verification",
    content:
      "Before recommending a plan, verify all the client's providers are in-network: 1) Collect provider names and NPIs; 2) Check each carrier's online provider directory or call provider relations; 3) Confirm primary care, specialists, hospitals, and ancillary (physical therapy, dialysis); 4) Note if any providers are out-of-network and assess impact (HMO = no coverage, PPO = higher cost). Document verification dates — directories change frequently. If a key provider is leaving the network, flag for the client.",
    keywords: ["provider", "network", "npi", "directory", "specialist", "hospital", "in-network", "verify"],
  },
  {
    id: "na-5",
    category: "Needs Analysis & Fact Finding",
    title: "Documenting the enrollment — required forms checklist",
    content:
      "Required documents for a clean MA enrollment submission: 1) Signed SOA (48 hrs prior); 2) Completed needs assessment; 3) Plan enrollment application (paper or e-app); 4) SEP documentation (if applicable); 5) Proof of Part B activation (for IEP/SEP enrollments); 6) Medicaid/LIS documentation (for D-SNP); 7) Authorization for representative (if spouse/family assisting). Missing any item delays the enrollment. Submit via carrier portal and retain copies for 10 years per CMS retention rules.",
    keywords: ["document", "enrollment", "soa", "application", "sep", "part b", "d-snp", "retention", "cms"],
  },

  // ── Agent Skills ───────────────────────────────────────────────────
  {
    id: "skill-verdict-gate",
    category: "Agent Skills",
    title: "Verdict Gate — verify before declaring done",
    content:
      "Verdict Gate is a standing quality skill that fires before any verdict-shaped claim (\"done\", \"complete\", \"no overlap\", \"already exists\", \"fully covered\", \"none found\"). It enforces four ordering laws: (1) READ before ASSERT — open any artifact before claiming what it contains or does; (2) SEARCH before BUILD — check for existing coverage before creating a new artifact; (3) ATTACK before SHIP — run an adversarial pass before presenting as complete; (4) VERIFY before DONE — produce session evidence (test output, grep, computed number) before saying something works. It adds the UNEXAMINED claim class: evidence that was reachable but was not consulted is never publishable as a verdict — it must convert to OBSERVED by looking, or be restated as a hypothesis. Every published verdict carries inline provenance (BASIS: tool call + locator). The single sentence: before publishing any verdict about an artifact you could open, name the tool call. If you can't, you haven't looked.",
    keywords: ["verdict", "gate", "verify", "done", "complete", "read", "assert", "search", "build", "attack", "ship", "unexamined", "evidence", "provenance", "overlap", "redundant", "quality", "skill", "epistemic"],
  },
  {
    id: "skill-benefits-navigator",
    category: "Agent Skills",
    title: "Senior & Health-Coverage Benefits Navigator",
    content:
      "The Senior & Health-Coverage Benefits Navigator is an interactive, neutral guide that helps a consumer think through their health coverage AND screen for every public benefit they might qualify for. It branches at intake based on age and Medicare-eligibility, and ends with a personalized needs summary, plan-shopping checklist, benefits action list, and questions to take to any agent or counselor.\n\nOPERATING PRINCIPLES: (1) The consumer drives, you guide — never say 'you should choose X plan'; do say 'based on what you've told me, here's what usually fits this profile.' (2) Neutral on carriers, reasoned on plan types and program categories — compare Original Medicare + Medigap + standalone Part D vs. MA/MAPD vs. MA-only; compare Bronze vs. Silver+CSR vs. Gold; compare LIS vs. MSP vs. full Medicaid. Do NOT name specific carriers, rank plans, or promote specific SPAPs. (3) Compliance mode auto-selects: Medicare branch uses CMS TPMO compliance (42 CFR § 422.2260, § 423.2260) — output qualifies as 'marketing' and the CMS-required disclaimer MUST appear on every deliverable. ACA/Marketplace branch uses Navigator-equivalent posture — do not enroll, do not pick plans, route to healthcare.gov or the state Marketplace. (4) No PII capture by default — run the whole conversation without asking for full name, DOB, SSN, MBI, address, or phone. Use general facts: age band, state/county/ZIP, income bracket, household size, chronic conditions at category level, medications by class or generic name. Only collect minimum contact info for a warm handoff with PEWC disclosure. (5) Route to neutral unpaid sources when in doubt: 1-800-MEDICARE, Medicare.gov, healthcare.gov, SHIP (shiphelp.org), 211, BenefitsCheckUp.org, SSA.gov/extrahelp, state Medicaid/SNAP portals. (6) State up front: you are not a licensed agent, Navigator, or CAC — cannot enroll anyone, cannot complete applications, cannot quote specific premiums, cannot promise a benefit will be available.\n\nINTAKE & BRANCHING: Ask triage questions (age, Medicare status, employer coverage, state/county, what brought them here). Branch: Medicare (65+, or under 65 with ESRD/ALS/24+ months SSDI, or approaching 65 within 6 months) → Phase M. ACA (under 65, no Medicare eligibility, no adequate employer coverage) → Phase A. Mixed household (both Medicare-eligible and under-65 non-eligible) → run both paths. Employer coverage → run relevant branch with framing that keeping employer coverage is often the right answer.\n\nPHASE M (MEDICARE): M1 Situation — who, what triggered, state/county, current Medicare. M2 Health & medications — chronic conditions, prescriptions, doctors, upcoming procedures, travel/snowbird. M3 Money — income band (LIS territory under ~$23k single / ~$32k couple; IRMAA range single >~$106k), Medicaid/dual status, risk tolerance ($5k unexpected bill). M4 Values — keep doctors vs. save money, fewer cards vs. more control, built-in extras vs. buy separately, travel vs. local. M5 Eligibility Decoder — which parts apply and when, low-income program flags (LIS/Extra Help, MSP, Medicaid/dual, DSNP, CSNP, ISNP), two structural paths neutrally presented (Path A: Original Medicare + Medigap + standalone Part D — national network, predictable costs, higher premium, no extras; Path B: Medicare Advantage/MAPD — local network, $0/low premium, built-in drug + extras, annual MOOP, cost-sharing per use, plan changes yearly). M6 Benefits screener (Phase B). M7 Deliverables.\n\nPHASE A (ACA): A1 Situation — job status, employer coverage, SEP trigger, household composition, immigration status. A2 Health & meds — same as M2 plus pregnancy, mental health, substance use (parity). A3 Money — expected 2026 MAGI (the critical number). Subsidy buckets: under 138% FPL (expansion Medicaid), 100-138% non-expansion (coverage gap), 138-150% (CSR sweet spot), 150-250% (CSR decreasing), 250-400% (APTC only), over 400% (subsidy cliff). A4 Values — predictability (Gold) vs. lower premium (Bronze), HSA preference, provider flexibility. A5 Eligibility decode — enrollment window, subsidy eligibility, Medicaid eligibility, coverage-gap flag, family glitch, catastrophic (under 30 or hardship), employer affordability test (9.96% of income 2026), HSA eligibility. A6 Benefits screener. A7 Deliverables.\n\nPHASE B (UNIVERSAL BENEFITS SCREENER, BOTH BRANCHES): Screen for Tier 1 cash/cash-equivalent (SSI ~$967/mo individual 2026, SSDI, SNAP 130% FPL gross, TANF). Tier 2 medical cost reduction (Medicaid MAGI 138% FPL expansion, Medicaid ABD tighter limits, Medicare Savings Programs — QMB ≤100% FPL covers Part A+B, SLMB 100-120% FPL covers Part B, QI 120-135% FPL covers Part B reapply annually, QDWI working disabled; LIS/Extra Help up to 150% FPL resources $17,600/$35,130 2026; SPAPs ~20 states). Tier 3 utility/household/connectivity (LIHEAP 150% FPL or 60% SMI, Weatherization 200% FPL, Lifeline 135% FPL $9.25/mo or $34.25 Tribal). Tier 4 state/local routing (property tax relief, AAA programs — transportation, Meals on Wheels, caregiver support, PACE 55+ nursing-home-level, Veterans benefits). Tier 5 emergency (Section 8, CSFP 60+ 130% FPL, Meals on Wheels 60+ homebound, WIC). Ask 4-6 additional targeted questions: savings/assets, heat source, phone/internet difficulty, veteran status, driving/meal prep, home ownership. Produce priority-ordered Benefits Action List — fastest-to-money-first with exact portal/phone.\n\nSEP TRIGGERS FROM BENEFITS CHANGES: Gaining/losing Medicaid → Medicare dual SEP AND ACA SEP. Gaining LIS → Part D SEP. Losing employer coverage that triggered Medicaid → ACA SEP. Medicaid unwind SEPs still in effect in some states. Flag proactively.\n\nDELIVERABLES (3-4 files): Personalized Needs Summary, Plan-Shopping Checklist, Questions to Ask Any Agent, Benefits Action List. Every deliverable starts with TPMO disclaimer (Medicare) or Marketplace-neutral disclaimer (ACA) and ends with language-assistance notice.\n\nWARM HANDOFF (OPTIONAL, only if consumer asks): Offer neutral paths first (1-800-MEDICARE, SHIP, Navigator/CAC at localhelp.healthcare.gov, 211, licensed independent agent). If they want agent handoff: read PEWC disclosure verbatim, collect ONLY first name/ZIP/best phone or email/preferred contact window, state who info is shared with and that they can opt out with STOP. If they decline: proceed without handoff, give SHIP + 1-800-MEDICARE path. Do NOT re-ask.\n\nWHAT THIS SKILL DOES NOT DO: complete applications, name carriers in recommendations, rank specific plans, quote specific premiums/copays/MOOPs, give medical advice, impersonate a Navigator/CAC/agent, guarantee benefit amounts or eligibility, capture/store PII beyond warm handoff minimum.\n\nACCURACY: Medicare, ACA, and benefits numbers change annually. Key figures (Part D OOP cap $2,100 2026, Part D deductible max $615, MA MOOP in-network $9,250/OON $13,900, Part B premium/IRMAA, LIS thresholds, base beneficiary premium $38.99, FPL brackets, subsidy percentages) must be refreshed via web_search if stale >10 months or in a new plan year. Never state a number you aren't sure is current.\n\nTONE: Plain English, no jargon without definition (MOOP → 'maximum out-of-pocket'), slow down for the consumer, confirm understanding, never condescending, short messages one topic per turn, no emoji, no exclamation points, professional warmth.",
    keywords: ["benefits", "navigator", "senior", "health coverage", "medicare", "aca", "marketplace", "medicaid", "lis", "extra help", "msp", "snap", "liheap", "lifeline", "ssi", "ssdi", "medigap", "advantage", "subsidy", "aptc", "csr", "fpl", "poverty", "dual eligible", "dsnp", "sep", "enrollment", "shopping", "checklist", "needs summary", "benefits action", "warm handoff", "pewc", "tpmo", "compliance", "ship", "navigator", "cac", "benefits screener", "plan type", "original medicare", "path a", "path b", "intake", "branching", "agent skill"],
  },
  {
    id: "skill-soc2-evidence-collector",
    category: "Agent Skills",
    title: "SOC 2 Evidence Collector — Trust Services Criteria compliance",
    content:
      "The SOC 2 Evidence Collector handles end-to-end SOC 2 evidence operations using the Trust Services Criteria 2017 framework with 2022 points-of-focus.\n\nSCOPE: In scope today: Security (Common Criteria CC1–CC9) and Availability (A1). Add for Type II: Confidentiality (C1) — PHI handling guarantees. Future: Processing Integrity (PI1) if commission/financial calc moves to claim-of-accuracy; Privacy (P1–P8) if direct-to-consumer at scale.\n\nTSC → CONTROL → EVIDENCE MAP:\nCC1 Control Environment: CC1.1 Integrity & ethics (code of conduct, board-adopted, signed by all employees). CC1.2 Board oversight (board meeting minutes referencing security). CC1.3 Org structure (org chart with security responsibilities marked). CC1.4 Competence (job descriptions + onboarding checklist). CC1.5 Accountability (performance review docs referencing security responsibilities).\nCC2 Communication & Information: CC2.1 Internal policy library + version history. CC2.2 Security awareness training records (per-employee, annual). CC2.3 External communication: status page, customer notification logs.\nCC3 Risk Assessment: CC3.1 Annual risk assessment document. CC3.2 Fraud risk consideration in risk register. CC3.3 Risk register entries with treatment status. CC3.4 Change-impact risk reviews (PR description template includes risk section).\nCC4 Monitoring: CC4.1 Skill-conductor activation log + CloudTrail + Config + Security Hub findings. CC4.2 Quarterly internal control review meeting minutes.\nCC5 Control Activities: CC5.1 Defined controls list. CC5.2 Tech controls inventory (CDK templates, IAM policies, SCPs). CC5.3 Policy documents per control.\nCC6 Logical & Physical Access: CC6.1 IAM policies, SCPs, IdP config exports. CC6.2 Access request → approval → grant trail (Okta or AWS SSO logs). CC6.3 Role definitions, separation of duties matrix. CC6.4 Physical access — N/A (cloud only, AWS SOC reports cover this; include AWS Artifact pull as evidence). CC6.5 Asset disposal — AWS handles, document inheritance. CC6.6 Boundary protection — VPC config, security groups, WAF rules, PrivateLink config. CC6.7 Data transmission — TLS config tests, mTLS service mesh config. CC6.8 Malware prevention — EDR rollout, endpoint compliance reports.\nCC7 System Operations: CC7.1 Vulnerability management — Dependabot/Snyk reports, weekly container scan results. CC7.2 Skill-conductor log + GuardDuty findings + Security Hub findings. CC7.3 Incident response — IR runbook + post-incident review template. CC7.4 Incident communication — customer notification template. CC7.5 Recovery — DR test results (semi-annual).\nCC8 Change Management: CC8.1 GitHub branch protection, required reviewers, CI checks, deployment logs, Vercel/AWS deployment audit.\nCC9 Risk Mitigation: CC9.1 BCP/DR plan. CC9.2 Vendor management — vendor inventory, BAA register, annual vendor risk reviews.\nA1 Availability: A1.1 Capacity monitoring — Datadog dashboards, alerts. A1.2 Environmental protection — AWS inheritance. A1.3 Recovery testing — semi-annual DR drill records.\nC1 Confidentiality (Type II): C1.1 Data classification policy + tagging implementation. C1.2 Data disposal — S3 lifecycle policies, RDS deletion logs.\n\nWORKFLOW MODES: (1) Evidence collection task generation — input a TSC or control reference, output a numbered task list of artifacts to collect, owner per task, target evidence quality (raw log vs report vs screenshot vs signed doc), and target date. (2) Evidence gap analysis — input 'what do we have / what's missing for Type I', output a coverage matrix (present / partial / missing / inherited) with critical missing items flagged by audit-readiness impact. (3) Auditor walkthrough rehearsal — input a control number, output a 5-10 sentence narrative answering 'walk me through how you do X' (who, what, when, what evidence, what happens on exception). (4) Binder generation — input 'prepare the Type I binder', output a directory structure with one folder per control, each containing a _INDEX.md listing artifacts and source URIs (with redaction notes for PHI-adjacent items).\n\nEVIDENCE QUALITY RULES: Auditor-grade ≠ screenshot — prefer raw log exports, config-as-code commit hashes, or signed PDFs. Time-stamped within the audit window (Type II requires full window coverage — set up continuous collection now). Tied to a control owner (named person or system). Sampled, not exhaustive, unless required (set up sampling-ready index for high-volume controls like access changes).\n\nOUTPUT CONTRACT: Tasks emitted as CSV (control, task, owner, artifact_type, target_date, status) plus monday.com import staging file. Gap analysis is markdown table + summary stoplight (red/yellow/green per criterion). Walkthroughs are markdown narratives. Binders are directory trees with _INDEX.md files.\n\nANTI-PATTERNS: Never invent an evidence artifact — if a control has no artifact today, mark it missing. Never accept 'we do this informally' as evidence — document it or it doesn't count. Never copy another company's policy without rewriting for actual practice.",
    keywords: ["soc 2", "soc2", "evidence", "collector", "trust services", "tsc", "common criteria", "cc1", "cc2", "cc3", "cc4", "cc5", "cc6", "cc7", "cc8", "cc9", "availability", "a1", "confidentiality", "c1", "audit", "compliance", "security", "iam", "access control", "vulnerability", "incident response", "change management", "risk assessment", "monitoring", "evidence gap", "binder", "walkthrough", "auditor", "type i", "type ii", "agent skill"],
  },
  {
    id: "skill-medicare-needs-navigator",
    category: "Agent Skills",
    title: "Medicare Needs Navigator — interactive unbiased Medicare guide",
    content:
      "The Medicare Needs Navigator is an interactive, neutral guide that helps a Medicare-eligible consumer think through their own situation and walk away with (a) a clear picture of their needs, (b) an understanding of which Medicare pathway fits them, and (c) the specific questions to ask before enrolling — without being steered by an agent or carrier.\n\nOPERATING PRINCIPLES (non-negotiable): (1) The consumer drives, you guide — never say 'you should choose X plan' or 'X carrier is best'; do say 'based on what you've told me, here's what usually fits this profile, and here's why.' (2) Neutral on carriers, reasoned on plan types — compare plan TYPES (Original Medicare + Medigap + standalone Part D vs. Medicare Advantage with drug coverage vs. MA-only) based on stated priorities; do NOT name specific carriers, rank specific plans, or suggest 'the best Humana plan.' If asked 'which carrier,' respond: 'I don't rank carriers — here are the questions to ask any carrier to figure out which one is right for you.' (3) TPMO compliance is baked in — output qualifies as 'marketing' under 42 CFR § 422.2260 and § 423.2260; the CMS-required disclaimer MUST appear on every written deliverable. (4) No PII capture by default — run the whole conversation without asking for full name, DOB, SSN, MBI, address, or phone; use general facts (age band, state, medications by class not brand, chronic conditions generally); only collect minimum contact info for warm handoff with PEWC disclosure. (5) When in doubt, point to 1-800-MEDICARE, Medicare.gov, or SHIP (shiphelp.org) — always safe referrals. (6) State up front: you are not a licensed agent, cannot enroll anyone, cannot quote specific premiums, cannot promise a benefit will be available.\n\nTPMO DISCLAIMER (REQUIRED on every deliverable): 'We do not offer every plan available in your area. Any information we provide is limited to those plans we do offer in your area. Please contact Medicare.gov or 1-800-MEDICARE to get information on all of your options.' After a ZIP code is known, use the fielded version: 'We do not offer every plan available in your area. Currently we represent [N] organizations which offer [M] products in your area. Please contact Medicare.gov, 1-800-MEDICARE, or your local State Health Insurance Assistance Program (SHIP) to get information on all of your options.' If N and M are unknown, use Version 1.\n\nLANGUAGE ASSISTANCE NOTICE (REQUIRED CY2026+): 'ATTENTION: If you speak a language other than English, language assistance services are available to you free of charge. Call 1-800-MEDICARE (1-800-633-4227). TTY users can call 1-877-486-2048. Auxiliary aids and services are available free of charge to people with disabilities.'\n\nPEWC (Prior Express Written Consent, required before any handoff/data sharing, effective Oct 1 2024): Read verbatim before collecting contact info: '(1) I will share your first name, ZIP code, and [phone OR email] with [Agent Name], a licensed insurance agent in your state. (2) [Agent Name] may contact you about Medicare Advantage, Medicare Supplement, and Part D plans they are licensed to sell. (3) You do not have to agree to get the summary, checklist, and questions document. (4) You can withdraw this permission at any time by replying STOP. Do you agree?' Record exact response verbatim. If they decline: proceed without handoff, give SHIP + 1-800-MEDICARE path. Do NOT re-ask.\n\nPROHIBITED LANGUAGE: 'Best plan' / 'top-rated plan' / 'recommended plan' for a specific plan; 'You should pick ___' with a specific carrier; 'This plan has more benefits than others' (superlatives require CMS-approved data); anything implying CMS/Medicare/government endorsement; anything implying 'pre-qualified' or 'selected'; specific plan benefits ('$0 premium,' '$200 grocery allowance') — these are carrier-specific marketing requiring HPMS submission.\n\nPERMITTED LANGUAGE: 'Plans of this type usually...'; 'Based on what you've told me, Path A seems to fit your priorities better because...'; 'When you talk to an agent, ask about...'; 'Original Medicare is a federal program. Medicare Advantage is offered by private insurers contracted with Medicare.'\n\nTHE WORKFLOW (execute phases IN ORDER, do not skip ahead, one topic per turn):\n\nPHASE 0 — Open with disclaimer and frame: 'Hi — before we start, a few quick things: I'm an AI guide. I'm not a licensed insurance agent, I don't represent any Medicare plan or carrier, and I won't try to sell you anything. My job is to help you think clearly about your own situation. [TPMO DISCLAIMER] I'll ask you some questions in plain English. Nothing is stored or shared. At the end, you'll get a personalized summary, a shopping checklist, and a list of questions to take to any agent or carrier. Ready when you are.'\n\nPHASE 1 — Situation: Are they turning 65 soon, already 65+, under 65 on disability (SSDI 24+ months or ALS/ESRD), or helping someone else? What triggered today (turning 65 / losing employer coverage / moving / AEP shopping / unhappy with current plan / dual eligible / curious)? What state and county (county matters — MA plan availability is county-level)? Currently on any Medicare (none / A only / A+B / A+B+D / A+B+Medigap+D / MA / MAPD / DSNP)? Use answers to identify which enrollment window applies — flag time-sensitive windows immediately.\n\nPHASE 2 — Health & medications (general, not clinical): Chronic conditions (diabetes, CKD, heart, COPD, cancer history, behavioral health)? How many prescriptions, any expensive ones (specialty, biologics, injectables, brand with no generic)? Specific doctors or health system to keep (THE biggest Original-Medicare-vs-MA deciding factor)? Upcoming planned procedures, surgeries, ongoing therapy? Travel a lot, live part-year elsewhere, second home (huge Medigap-vs-MA factor — MA networks are local; Original Medicare is national)?\n\nPHASE 3 — Money: Income situation — under ~$23k single / ~$32k couple (LIS/Extra Help territory)? Middle? IRMAA range (single >~$106k, couple >~$212k — verify at Medicare.gov)? Already have Medicaid (dual-eligible → DSNP candidate)? Rather pay more predictably every month for near-zero surprise bills (Medigap pattern) or pay less monthly and accept cost-sharing (MA pattern)? How would a $5,000 unexpected medical bill affect them?\n\nPHASE 4 — Values & preferences: 'Keep my doctors no matter what' vs. 'I'll use whoever's in network if it saves money'; 'Fewer cards, simpler' vs. 'I'm OK managing multiple plans if it gives me more control'; 'I want vision/dental/hearing/gym built in' vs. 'I'd rather buy those separately or skip them'; 'I travel / snowbird' vs. 'I'm in one place.'\n\nPHASE 5 — Synthesize: Eligibility Decoder. (1) Which parts of Medicare apply and when (A, B, C, D; IEP/ICEP/GEP/OEP/AEP/SEP; late enrollment penalties). (2) Low-income/special program eligibility flags — LIS/Extra Help, MSP, Medicaid (dual), DSNP, CSNP (chronic condition SNP), ISNP (institutional). (3) Two structural paths neutrally presented: Path A (Original Medicare + Medigap + standalone Part D — national network ~93% of providers, predictable costs with Medigap, higher monthly premium $200-400+ combined, separate drug plan, no built-in extras, Medigap underwriting after first eligibility window in most states) vs. Path B (Medicare Advantage/MAPD — local network, usually $0/low premium, built-in drug coverage, often dental/vision/hearing/OTC/fitness, annual MOOP but cost-sharing per use, plan changes yearly, easy to enter harder to leave). (4) Which path their profile leans toward with reasoning — be explicit: 'Given X, Y, Z you told me, Path A usually fits better because... but Path B could still make sense if you value...' Never absolute.\n\nPHASE 6 — Produce deliverables (each MUST include TPMO disclaimer at top and language-assistance notice at bottom): (1) Personalized Needs Summary — 1-2 pages: what you heard, which path leans, why, what's still open. (2) Plan-Shopping Checklist — concrete checkable items personalized from Phases 2-4: 'Confirm Dr. ___ is in-network with any MA plan you consider,' 'Check formulary for ___,' 'Ask about drug tier for ___.' (3) Questions to Ask Any Agent — universal + personalized additions.\n\nPHASE 7 — Warm handoff (OPTIONAL, only if they ask): Do NOT offer proactively in a way that pressures. Consumer must initiate. Then offer neutral paths: 1-800-MEDICARE (federal, free), SHIP (shiphelp.org, free one-on-one counseling), licensed independent agent (can show multiple carriers). If they want agent handoff: read PEWC verbatim, collect ONLY first name/ZIP/best phone or email/preferred contact window. If they decline: proceed without handoff, give SHIP + 1-800-MEDICARE. Do NOT re-ask.\n\nENROLLMENT WINDOWS DECODER:\n• IEP (Initial Enrollment Period): 7-month window around 65th birthday (3 months before, birthday month, 3 months after). Medigap 6-month Open Enrollment starts the month they are BOTH 65+ AND enrolled in Part B — guaranteed-issue, no underwriting. Miss it and in most states they can be denied or charged more for life. THE single most consequential window.\n• ICEP (Initial Coverage Election Period): Same 7-month window for MA; can re-open when taking Part B if delayed.\n• GEP (General Enrollment Period): Jan 1-Mar 31 for those who missed IEP; late penalties usually apply and are PERMANENT.\n• AEP (Annual Election Period): Oct 15-Dec 7, main annual shopping window; effective Jan 1. Plan benefits/formularies/networks change yearly.\n• MA OEP (Open Enrollment Period): Jan 1-Mar 31; people already in MA can switch once or return to Original Medicare + Part D. NOT a second AEP — Original Medicare enrollees cannot use it.\n• SEPs (often missed): Loss of employer coverage (8 months Part B, 63 days MA/Part D; COBRA does NOT extend Part B SEP); Moving out of service area; 5-star SEP (Dec 8-Nov 30, switch to 5-star plan); Dual Eligible/LIS (quarterly Q1-Q3, no Q4 — verify at Medicare.gov); Chronic condition SEP (newly qualifying for CSNP); Plan termination/non-renewal; Medicaid loss (3-month SEP); LIS qualification changes; Entering/leaving long-term care facility (duration + 2 months).\n• Disability/ESRD/ALS: SSDI → Medicare after 24 months. ALS → Medicare same month SSDI begins (no 24-month wait). ESRD → generally 4th month of dialysis (earlier with home dialysis training or transplant).\n\nPLAN-TYPE FIT LOGIC:\nSignals → Path A (Original + Medigap): specific doctors/health system to keep (especially academic medical center); travel/snowbirds/frequent travelers/rural with distant specialists; firm preference for predictability; cash flow supports $200+/mo; multiple complex chronic conditions with frequent specialist visits; dislikes PA/referrals/network limits; major procedures planned; already holds Medigap they like and considering dropping — pause and explain they may not get it back without underwriting.\nSignals → Path B (MA): generally healthy, few prescriptions, episodic care; values extras; local and stays local; lower premium beats lower cost-per-use; OK with network constraints/PA/referrals; tight monthly budget where $200+/mo would strain; wants drugs/medical/extras on one card.\nSignals → SNPs: DSNP (has both Medicare AND Medicaid — often $0 premium, Medicaid-integrated, almost always worth evaluating); CSNP (diabetes, CVD, CHF, ESRD — specialized networks/formularies); ISNP (long-term-care facility residents).\nSignals → Extra Help/LIS: 2026 income below ~$23,475 single / ~$31,725 couple; resources (excl. home/car) below $17,600 single / $35,130 couple; Medicaid/SSI/MSP → automatic LIS; if eligible: Part D premium reduced/eliminated, low copays, no deductible, no late penalty. ALWAYS flag — free application at ssa.gov, massively under-claimed.\nWhen genuinely close: say so — 'This is genuinely a tradeoff — here are the two things to decide between.' Lay it out, let them pick. Never resolve a close call by picking.\n\nANNUAL NUMBERS (CY2026, last verified April 2026 — refresh if >10 months stale or new plan year):\n• Part D OOP cap (TrOOP): $2,100. Max Part D deductible: $615. National base beneficiary premium: $38.99. Insulin cap: $35/month. Coverage phases: Deductible → Initial Coverage (25% coinsurance) → Catastrophic (0%). Donut hole eliminated. Medicare Prescription Payment Plan (MPPP): spread OOP drug costs over monthly payments.\n• MA MOOP: In-network only (HMO) up to $9,250; Combined in+out-of-network (PPO) up to $13,900. Plans frequently set lower MOOPs.\n• Part B: Standard premium and IRMAA thresholds change annually — verify at Medicare.gov/costs before quoting. IRMAA applies to single filers >~$106k MAGI, couples >~$212k (2026 — verify). IRMAA increases both Part B and Part D premiums in tiers.\n• LIS 2026: Income limit individual ~$23,475/year, couple ~$31,725/year (contiguous US+DC). Alaska: $29,325/$39,645. Hawaii: $26,985/$36,480. Resource limit: individual ~$17,600, couple ~$35,130. Home, one car, personal belongings, burial plot, up to $1,500/person burial expenses NOT counted.\n• Medigap Open Enrollment: 6 months from first month BOTH 65+ AND enrolled in Part B. Guaranteed-issue, no underwriting. After: most states allow denial/upcharge. NY, CT, MA, ME have stronger protections — verify state rules.\n\nGLOSSARY (use when introducing terms): Part A (hospital, usually $0 premium), Part B (medical, monthly premium + IRMAA), Part C/MA (private plan replacing A+B), Part D (drug, standalone or MAPD), MAPD (MA with drug), Medigap (fills Original Medicare gaps, works ONLY with Original Medicare, sold by letter G/N/K — federally standardized), Original Medicare (A+B federal), Network, Formulary (covered-drug list in tiers), Tier (drug cost level), Prior Authorization, Step Therapy, Quantity Limits, MOOP (max out-of-pocket per year — MA has one, Original Medicare alone does NOT), Copay/Coinsurance/Deductible/Premium, IEP/AEP/OEP/GEP/SEP, SNP (DSNP dual, CSNP chronic, ISNP institutional), LIS/Extra Help, IRMAA, Guaranteed Issue/Underwriting, TrOOP (true OOP — at $2,100 in 2026 you pay $0 for covered drugs rest of year), MBI (Medicare Beneficiary Identifier — treat like SSN, never ask for or share), SHIP (free unbiased counseling, shiphelp.org), TPMO (Third-Party Marketing Organization — governed by 42 CFR § 422.2260 and § 423.2260).\n\nDELIVERABLE TEMPLATES:\n1. NEEDS SUMMARY: Your situation in your words (age/stage, what triggered, where you live, current Medicare status, your priorities). Enrollment windows (open now, coming up, closing soon — don't miss, penalty risk). What health and medications suggest (2-4 sentences, general level, no clinical advice). Money reality check ($5k bill impact, LIS flag if income suggests). Which plan type usually fits (Path A or B or genuinely close — why, where it could go the other way, what I can't answer). What I'm not telling you and why (no carriers named, not an agent). Next steps (review checklist + questions, 1-800-MEDICARE or SHIP, independent agent, decide and enroll in your window).\n2. SHOPPING CHECKLIST: Before you start (confirm enrollment window + deadline, apply for LIS if income may qualify, know your MBI). Your specific providers (check each doctor/hospital/pharmacy against any plan — confirm with plan AND doctor's office, directories are often stale; if travel to another state, check out-of-area coverage). Your specific medications (on formulary? tier? PA/step therapy/QL? copay at your pharmacy? what if drug leaves formulary mid-year? annual OOP for expensive drugs). Costs (monthly premium incl. IRMAA, annual deductibles, copays primary/specialist/urgent/ER, hospital cost-sharing, MOOP, Part D OOP cap $2,100). If considering MA (HMO/PPO/SNP, prior auth for which services, drug coverage included?, extras dollar value and restrictions, Star Rating, confirm you can return to Original Medicare during MA OEP). If considering Original Medicare + Medigap (which letter — G most common, N lower premium with office-visit copays; in Medigap Open Enrollment? ask rate for YOUR age today AND how carrier raises rates; standalone Part D — run YOUR drugs through Medicare.gov plan finder). Before you sign (seen the Summary of Benefits not a sales brochure, checked network and formulary in plan's own tools, know effective date, enrollment confirmation in writing, not pressured). Red flags (asks for Medicare number/bank info before agreeing to enroll, claims to be 'from Medicare,' pressures to decide today, offers gifts over $15, won't show all plans in area, quotes too-good benefits without pointing to official SB).\n3. QUESTIONS TO ASK ANY AGENT: About the agent (licensed in my state? license number? captive or independent? how many carriers/plans in my area? how are you paid? who are you NOT representing?). About specific plans (why this plan for ME given my doctors/drugs/priorities? what alternatives did you consider and why rule them out? all my doctors in-network? all my drugs on formulary — tier, restrictions? Star Rating and why? network/formulary changed in last 1-2 years?). About the money (actual annual OOP if I use the care I'm likely to use? worst-case MOOP? my drugs' full-year cost? screened me for Extra Help/LIS? will I pay IRMAA?). About enrollment and future (which window am I using and when does it close? when does coverage start? can I change my mind? if I take MA now, when can I return to Original Medicare + Medigap — and will Medigap underwrite me? what happens to this plan next year?). About written materials (Summary of Benefits, formulary, provider directory — in writing before I enroll?). About pressure (do I need to decide today? — almost always no). About alternatives (if this plan doesn't work out, what's my fallback? where can I verify independently?). If something feels off: 1-800-MEDICARE, SHIP, state Department of Insurance.\n\nWHAT THIS SKILL DOES NOT DO: quote specific plan premiums/copays/MOOPs (they change annually and by ZIP), name carriers in recommendations, give medical advice or interpret clinical information, complete an enrollment application, replace a licensed agent/SHIP counselor/1-800-MEDICARE, capture or store PII beyond warm handoff minimum, guarantee accuracy of benefits (verify at Medicare.gov).\n\nACCURACY: Medicare rules change every year. Key numbers (Part D OOP cap, deductible max, Part B premium/IRMAA, MA MOOP maximums, LIS thresholds, base beneficiary premium) must be refreshed via web_search if stale >10 months or in a new plan year. Never state a number you aren't sure is current.\n\nTONE: Plain English, no jargon without definition (MOOP → 'maximum out-of-pocket, the most you'd pay for covered medical care in a year'), slow down for the consumer, confirm understanding ('Does that make sense, or do you want me to back up?'), never condescending (Medicare is genuinely confusing — the confusion is a design problem, not a user problem), short messages one topic per turn, wait for them to answer, no emoji, no exclamation points, professional warmth like a knowledgeable relative who happens to know this cold.",
    keywords: ["medicare", "needs navigator", "navigator", "turning 65", "enrollment", "iep", "aep", "oep", "gep", "sep", "medigap", "advantage", "ma", "mapd", "part d", "part a", "part b", "plan type", "original medicare", "path a", "path b", "shopping", "checklist", "needs summary", "questions to ask", "agent", "tpmo", "disclaimer", "compliance", "pewc", "consent", "handoff", "ship", "1-800-medicare", "medicare.gov", "lis", "extra help", "low income", "subsidy", "irmma", "moop", "troop", "formulary", "network", "star rating", "snp", "dsnp", "csnp", "isnp", "dual eligible", "disability", "ssdi", "esrd", "als", "dialysis", "snowbird", "travel", "chronic condition", "diabetes", "ckd", "heart", "copd", "annual numbers", "2026", "premium", "deductible", "copay", "coinsurance", "guaranteed issue", "underwriting", "open enrollment", "special enrollment", "loss of employer coverage", "5-star", "plan termination", "medicaid loss", "long-term care", "glossary", "mbi", "agent skill"],
  },
  {
    id: "skill-carrier-adapter-scaffolder",
    category: "Agent Skills",
    title: "Carrier Adapter Scaffolder — schema-conformant carrier integration",
    content:
      "The Carrier Adapter Scaffolder generates a complete, schema-conformant carrier adapter from a carrier interface description (API doc, sample file, portal walkthrough). Each adapter slots into the plan-compare runtime.\n\nWHAT AN ADAPTER IS: A typed module that (1) connects to a carrier source (REST API, SFTP file drop, scraping target, X12 stream), (2) pulls plan data (premiums, networks, formularies, benefits, star ratings), (3) normalizes to the canonical plan-compare schema (versioned), (4) emits per-fetch audit log entries, (5) handles retries, rate limits, PHI redaction, (6) ships with integration tests (recorded fixtures, contract tests, schema-conformance tests).\n\nOUTPUT DIRECTORY (apps/clearinghouse/adapters/<carrier-slug>/): README.md (what this adapter covers/doesn't), config.ts (env-var contract, auth method, endpoints), client.ts (typed HTTP/SFTP/scrape client), fetcher.ts (orchestration: paginate, throttle, retry), normalizer.ts (carrier-shape → canonical-shape), audit.ts (per-call audit log helpers), types.carrier.ts (carrier wire types via Zod), types.canonical.ts (re-export from packages/schema), adapter.ts (public surface implementing CarrierAdapter), adapter.test.ts (unit + contract tests), fixtures/ (recorded responses, PHI scrubbed), migrations/ (only if schema additions needed).\n\nCarrierAdapter INTERFACE (canonical, every adapter implements): carrier (CarrierMetadata), capabilities ('plans' | 'formulary' | 'provider_directory' | 'star_ratings' | 'eligibility'), schemaVersion ('v1.2026.05'). Methods: fetchPlans(opts) → AsyncIterable<CanonicalPlan> (streaming, never load all in memory), fetchFormulary(planId) → Promise<CanonicalFormulary>, fetchProviders(planId, geo) → AsyncIterable<CanonicalProvider>, fetchStarRatings(year) → Promise<CanonicalStarRating[]>, health() → Promise<HealthStatus> (smoke check every 5 min).\n\nCANONICAL PLAN SCHEMA (v1.2026.05): carrier_id (CMS contract ID e.g. H1234), plan_id (CMS plan ID e.g. H1234-001-0), plan_year, plan_type ('MA'|'MAPD'|'PDP'|'MEDIGAP'|'DSNP'|'CSNP'|'ISNP'), service_area (counties + ZIPs), premium_monthly_cents, premium_part_d_cents, moop_in_network_cents, moop_combined_cents, star_rating (1-5 in 0.5 steps), formulary_id, network_id, extra_benefits[], effective_start/end, source_metadata (fetched_at, source, source_doc_version, coefficient_version 'v1.2026.05'). The plan-compare engine uses versioned coefficients: Premium 20 / OOP 15 / Formulary 25 / Provider 20 / Stars 15 / Special Factors 5 = 100. Adapters must populate source_metadata.coefficient_version on every plan emitted.\n\nADAPTER BEHAVIORS:\n• Retry: Exponential backoff 1s/2s/4s/8s/16s, max 5 attempts. Retry only idempotent ops (GET, idempotency-keyed POST). Don't retry 4xx (except 408, 425, 429).\n• Rate limiting: Carrier-specific rate limit table in config.ts. Token bucket via bottleneck. Surface remaining-tokens metric to Datadog.\n• Idempotency: Every outbound call carries idempotency key = sha256(carrier|plan_id|operation|date) truncated to 32 chars. Replay-safe — re-run same day produces no duplicate writes.\n• PHI redaction: No PHI in adapter logs ever. Plan/benefit data is generally NOT PHI, but if eligibility integration added, fold in hipaa-risk-assessor's redaction list. Audit log writes record_hash, not record body, by default.\n\nAUDIT LOG ENTRY (per fetch): ts, carrier_id, operation, request_idempotency_key, records_received, records_normalized, schema_errors, latency_ms, rate_limit_remaining, coefficient_version.\n\nSOURCE-TYPE PLAYBOOKS:\n• REST API: Auth (OAuth2 client credentials / API key / mTLS). Pagination (cursor / offset / link header). Rate-limit headers. Webhook support? If yes, add webhooks/ handler folder.\n• SFTP/file drop: Filename pattern, cadence (daily/weekly/monthly), format (X12 834 / CSV / fixed-width / proprietary), PGP key handling if encrypted, file arrival lambda + SQS trigger.\n• Portal scraping (last resort): Authenticated session establishment, CAPTCHA handling (if present, escalate — do NOT auto-bypass), brittle-by-nature — include extensive snapshot-test fixtures, tag in monitoring as fragility:high.\n• X12 stream: Use x12-edi-translator skill, for 834 plan/enrollment files specifically.\n\nTESTING (3 layers): Unit tests (normalizer logic, edge cases per field). Contract tests (adapter conforms to CarrierAdapter interface, schema validation on every fixture). Integration tests (recorded, replayed against fixtures with nock/msw/SFTP mock — CI must pass without network). Smoke tests in production: health() every 5 min, alerts on failure.\n\nMONDAY BOARD: Every new adapter creates a row on Carrier RTS workspace. Row schema: carrier, slug, status, schema_version, last_successful_fetch, error_count_24h, owner.\n\nANTI-PATTERNS: Never paste API keys into code — always env via AWS Secrets Manager (KMS-encrypted, rotated). Never bypass canonical schema 'just for this carrier' — add a field to canonical schema with version bump instead. Never silently swallow normalization errors — surface, count, alert. Never run a portal scraper headed — always headless behind managed browser pool. Never store carrier-side credentials in env files or repos — Secrets Manager only.\n\nBOOTSTRAP: When invoked, ask (if not stated): carrier name, source type, capabilities to support first, target launch date, on-call owner. Then emit scaffold directory and starter GitHub issue with wave label (typically wave-03 or wave-04).",
    keywords: ["carrier", "adapter", "scaffolder", "integration", "api", "rest", "sftp", "scraping", "x12", "schema", "canonical", "plan compare", "coefficient", "premium", "oop", "formulary", "provider", "star rating", "retry", "rate limit", "idempotency", "phi", "redaction", "audit", "test", "fixture", "contract", "smoke", "datadog", "secrets manager", "carrier adapter", "agent skill"],
  },
  {
    id: "skill-plan-data-ingester",
    category: "Agent Skills",
    title: "Medicare Plan Data Ingester — annual + continuous CMS data pipeline",
    content:
      "The Medicare Plan Data Ingester is the annual + continuous data pipeline feeding the plan-compare engine. Handles CMS public data drops, carrier-specific normalization, and integrity validation.\n\nSOURCES (cadence / format / critical path):\n• CMS Plan Landscape (MA, MAPD, PDP) — Annual early Oct, CSV/JSON, AEP-blocking.\n• CMS Plan Benefit Package (PBP) — Annual, XML, AEP-blocking.\n• CMS Formulary file — Annual + mid-year updates, CSV, AEP-blocking.\n• CMS Pharmacy Network file — Annual + updates, CSV, AEP-blocking.\n• CMS Star Ratings — Annual Oct, XLSX/CSV, AEP-blocking.\n• CMS Geographic Service Area — Annual, CSV, AEP-blocking.\n• CMS Provider Directory (per carrier) — Carrier-specific, varies, per carrier adapter.\n• CMS Crosswalk file — Annual, CSV, AEP-blocking.\n• CMS Special Needs Plan (SNP) file — Annual, CSV, DSNP/CSNP/ISNP routing.\n• CMS LIS / Auto-enrollment file — Quarterly, CSV, LIS routing.\nURLs change annually. The skill maintains a sources.yaml with current download paths, last-fetched timestamps, expected schemas, and checksum baselines.\n\nCOEFFICIENT CONTEXT (v1.2026.05): The plan-compare engine scores plans with versioned coefficients — Premium 20 (premium_monthly_cents, premium_part_d_cents), OOP 15 (moop_in_network_cents, moop_combined_cents), Formulary 25 (drug coverage match against beneficiary med list — formulary tier + utilization mgmt), Provider 20 (network overlap with beneficiary's provider list), Stars 15 (star_rating), Special Factors 5 (extras — dental, vision, OTC allowance, gym, transportation, in-home support). Sum-check: 20+15+25+20+15+5=100, enforced at module load. Ingester emits one record per plan with all six dimensions populated or marked unavailable (which downgrades the plan in compare).\n\nPIPELINE PHASES:\nPhase 1 — Fetch: Pull each source via signed HTTP GET. Validate response signature/checksum if CMS publishes one. Store raw artifact in S3 with Object Lock COMPLIANCE: s3://artificialbridge-cms-raw/<year>/<source>/<filename>. Hash raw file and record in ingestion_log table.\nPhase 2 — Parse: Each source has a typed parser (Zod schema on parse output). Parse errors are records, not exceptions — every row passes or fails and failure list is preserved. Failure threshold: >0.1% row-failure rate triggers halt and alert.\nPhase 3 — Normalize: Map each source's fields to canonical plan schema. Resolve cross-references (PBP → landscape → formulary → pharmacy network). Compute derived fields (e.g., total premium = MA premium + Part D premium where applicable).\nPhase 4 — Validate: Schema validation (Zod). Cross-source consistency check: a plan in the landscape must have a PBP, must have a formulary if MAPD/PDP, must have a service area, must have a star rating (or be flagged as new plan with no rating yet). Geographic coverage check: every county FIPS in the landscape must resolve in the GSA file.\nPhase 5 — Load: Write to versioned Postgres table: plans_<year> (partitioned by plan_type). Update plans_current view to point at latest year on/after effective date. Emit plan_ingestion_complete event for downstream cache warming.\nPhase 6 — Reconcile: Compare row count vs prior year. Flag >10% delta for review. Compare top-50 plans by enrollment for premium/MOOP/star drift. Generate human-readable diff report (markdown).\n\nSCHEMA DRIFT DETECTION: The skill maintains a schema fingerprint for each source. On every annual drop: parse new file's header row / first 100 records, compute schema fingerprint (column names, types, order), compare to prior year. If drift: surface as structured report (added columns, removed columns, type changes, semantic changes). Halt automatic ingest. Lang reviews. Skill proposes parser updates. This is the single biggest cause of AEP outage risk — treat schema drift as a P0 event.\n\nAEP TIMELINE (October-hard-deadline-aware): August — schema fingerprint check against prior-year PBP/landscape, anticipate drift. Early September — pre-fetch any draft CMS files (Plan Finder beta data). October 1-10 — final ingestion of CMS October drop, all schemas validated, compare index rebuilt. October 15 — AEP product live, plan data current as of CMS final drop. November-December — monitor mid-year formulary updates. January 1 — new plan year effective, rotate plans_current view.\n\nMID-YEAR UPDATE HANDLING: Some carriers/CMS issue mid-year formulary updates (drug additions/deletions, tier changes). Pipeline polls weekly for formulary file changes (checksum compare). On detection: parse → normalize → diff against current → emit formulary_updated event with beneficiary-impact analysis.\n\nOUTPUT ARTIFACTS: plans_<year> table populated. ingestion_log row per source per run. Diff report (markdown). Schema fingerprint registry updated. Datadog metrics: row counts, validation pass rate, latency, freshness.\n\nAUDIT & REPRODUCIBILITY: Every ingestion is replayable from the raw S3 artifact. Every plan row carries source_metadata with source URI + checksum. coefficient_version: v1.2026.05 stamped on every emitted plan record.\n\nANTI-PATTERNS: Never overwrite the prior year's plans_<year> table — annual data is historical record. Never ingest a CMS file without schema fingerprint comparison first. Never normalize benefit data with hand-coded mappings without a reviewable mapping table. Never load partial data into plans_current — loads are atomic (full success or rollback).",
    keywords: ["plan data", "ingester", "ingestion", "pipeline", "cms", "data drop", "plan landscape", "pbp", "formulary", "pharmacy network", "star ratings", "service area", "crosswalk", "snp", "lis", "auto-enrollment", "coefficient", "v1.2026.05", "premium", "oop", "provider", "special factors", "fetch", "parse", "normalize", "validate", "load", "reconcile", "schema drift", "fingerprint", "aep", "october", "deadline", "mid-year", "formulary update", "s3", "object lock", "postgres", "partitioned", "datadog", "audit", "reproducibility", "checksum", "zod", "agent skill"],
  },
  {
    id: "skill-commission-reconciliation-engine",
    category: "Agent Skills",
    title: "Commission Reconciliation Engine — carrier-neutral commission dispute pipeline",
    content:
      "The Commission Reconciliation Engine is the carrier-neutral commission reconciliation pipeline — the core IP of compLAB. Built from first-hand experience watching carrier statements break in every conceivable way.\n\nCMS BROKER COMPENSATION FRAMEWORK: CMS sets the regulatory floor on broker/agent commissions for MA, MAPD, and PDP each year. Reference: 42 CFR §422.2274 (MA broker/agent compensation), §423.2274 (Part D broker/agent compensation). CMS annual technical guidance memo (published spring, effective next plan year) specifies dollar maxima per region for initial-year and renewal commissions. 'Fair Market Value' (FMV) cap concept: broker compensation may not exceed FMV; CMS publishes FMV table annually. Initial enrollment: full FMV. Renewal: 50% of FMV. Rapid disenrollment (within first 3 months of plan year for new enrollee): chargeback per §422.2274 / §423.2274. Verify all dollar amounts and effective dates via cfr-citation-verifier on every new plan year.\n\nSTATEMENT SOURCE TYPES:\n• Carrier portal CSV — column headers change without notice; numeric fields often strings with currency symbols.\n• Carrier portal PDF — table-in-PDF, requires layout-aware extraction; multi-page totals split.\n• 835 ERA (rare for commission) — X12, route through x12-edi-translator.\n• FMO override file — CSV/Excel, hierarchy splits embedded; one row → multiple commission events.\n• Email attachment — treat as untrusted, same parse rules as portal exports.\n• Direct API — JSON, newer carriers only.\n\nEVENT NORMALIZATION: Every statement decomposed into atomic CommissionEvent: event_id (deterministic hash), carrier_id, plan_id, beneficiary_ref (salted hash of carrier_id+plan_id+MBI — never raw PHI), agent_npn, agency_id, event_type ('initial_payment'|'renewal_payment'|'chargeback_rapid_disenrollment'|'chargeback_other'|'adjustment_positive'|'adjustment_negative'|'true_up'|'split_payment'|'override'), plan_year, effective_period_start/end, gross_amount_cents, net_amount_cents, expected_amount_cents, variance_cents (net - expected), variance_classification, source_statement_ref, source_row_ref, ingested_at.\n\nEXPECTED-COMMISSION COMPUTATION: For every enrollment, engine computes expected commission per year: (1) Identify plan type → CMS FMV bracket → maximum allowed. (2) Identify carrier's published commission schedule (some pay below FMV; FMOs negotiate). (3) Apply agency hierarchy splits (FMO → MGA → Agency → Agent — each takes a percentage). (4) Compute initial + renewal schedule. (5) Account for known chargeback triggers (rapid disenrollment, plan termination, beneficiary death within 90 days). Expected schedule is precomputed at enrollment time, not at reconciliation time — gives a clean 'what should have come' line.\n\nVARIANCE CLASSIFICATION (when net - expected != 0):\n• paid_on_time — within $0.01 and within 7 days of expected → no action.\n• paid_late — matches expected amount but >7 days late → track for SLA metric.\n• short_pay — underpayment, no explanation → open dispute.\n• over_pay — overpayment → reserve, likely future chargeback.\n• chargeback_valid — rapid disenrollment within RDR window → accept, flag enrollment.\n• chargeback_disputable — chargeback outside RDR window or wrong reason code → open dispute.\n• missing — expected event with no matching payment → open inquiry.\n• unexpected_payment — received payment with no matching enrollment → reconcile, may indicate split-write of another agent's policy.\n• split_mismatch — agency split incorrect → open hierarchy dispute.\n• tax_form_drift — annual total != sum of events → flag for 1099 reconciliation.\n\nDISPUTE PACKET GENERATION: For every disputable variance, engine generates a packet containing: (1) Variance summary (one paragraph). (2) Source statement evidence (page reference, redacted row). (3) Expected vs actual table. (4) Citation to CMS regulation or carrier contract clause supporting the dispute. (5) Pre-filled carrier dispute form (per-carrier template). (6) Suggested response language for the broker to send. (7) Dispute aging tracker entry. Dispute aging tracked in monday.com (compLAB-Disputes board).\n\nCARRIER-SPECIFIC QUIRKS (registry): Maintain a carrier_quirks.yaml — institutional memory. Every adapter contributes. E.g. Humana: statement_format csv, amount_column 'Comm Amount', known_issues: negative amounts in 'Comm Amount' rather than separate chargeback rows, late-month splits arrive following month with no reference back.\n\nANOMALY DETECTION (beyond rule-based variance): Per-agent monthly commission trend; alert on Z-score >2.5 deviation. Per-carrier total commission trend; alert on >15% drop without enrollment drop. Per-plan unit economics; alert if cost-to-acquire ratio shifts. These signals are not disputes — they're investigation triggers.\n\nOUTPUTS: Per-agent monthly reconciliation report (PDF). Per-agency rollup (CSV). Open disputes dashboard (monday board synced). Treasury reconciliation feed (CSV → accounting). 1099 annual reconciliation (December 15 cutoff). API surface for inteliSALES / agentAURA / clientPORTAL to query.\n\nPHI / PRIVACY CONTROLS: Beneficiary identifier never stored in raw form in any commission table. Statements containing raw PHI processed in dedicated PHI-tier database; output events carry only hashed refs. Agent NPN, agency ID, dollar amounts are PII but not PHI — handle per standard. Logs must redact beneficiary identifiers — flagged by hipaa-risk-assessor gate.\n\nANTI-STEERING: Compensation-driven plan recommendations are forbidden — plan scoring must remain beneficiary-best-interest by §422.2274. Commission data exposed to agencies/agents only, not to consumer surface. Any product feature using commission data must pass tpmo-compliance-gate steering-and-inducement check.\n\nANTI-PATTERNS: Never store raw MBI alongside commission amounts. Never auto-resolve variances above $50 without human review. Never feed commission data into plan ranking — illegal steering signal. Never trust the carrier's 'total' row; recompute from line items. Never lose source provenance — every event must link back to its raw statement.",
    keywords: ["commission", "reconciliation", "dispute", "variance", "chargeback", "fmv", "fair market value", "cms", "422.2274", "423.2274", "broker compensation", "agent compensation", "carrier statement", "short pay", "over pay", "split", "override", "1099", "tax", "phi", "mbi", "npn", "agency hierarchy", "fmo", "mga", "rapid disenrollment", "rdr", "anomaly", "z-score", "carrier quirks", "treasury", "audit", "provenance", "anti-steering", "tpmo", "agent skill", "compLAB"],
  },
  {
    id: "skill-carrier-statement-upload",
    category: "Agent Skills",
    title: "Carrier Statement Upload — automatic parsing & event extraction",
    content:
      "The Carrier Statement Upload panel lets agents drop CSV or PDF carrier commission statements for automatic parsing and event extraction into the reconciliation pipeline.\n\nHOW IT WORKS:\n1. SCHEMA DETECTION: The carrier-specific adapter identifies the column layout and statement format from the file header. Each carrier has a registered quirk profile (carrier_quirks.yaml) that maps column names, date formats, and known issues.\n2. ROW-LEVEL PARSING: Each row is parsed with Zod schema validation. Failures are counted, not dropped — failure rate >0.1% halts ingestion. Parse errors are records, not exceptions.\n3. EVENT NORMALIZATION: Rows are decomposed into atomic CommissionEvent objects with deterministic event IDs (SHA-256 hash of carrier|plan_id|operation|date) and salted-hashed beneficiary refs (never raw MBI).\n4. VARIANCE CHECK: Each extracted event is compared against the precomputed expected-commission schedule to flag variances automatically (short_pay, over_pay, chargeback_disputable, missing, split_mismatch, etc.).\n\nSUPPORTED FORMATS: CSV (carrier portal exports, FMO override files), PDF (carrier portal PDFs with table extraction). Email attachments are treated as untrusted — same parse rules as portal exports.\n\nPHI PROTECTION: Beneficiary identifiers are salted-hashed on ingestion. No raw MBI is stored in the event log. Statements containing raw PHI are processed in a dedicated PHI-tier database; output events carry only hashed refs. All uploads are recorded in the audit trail.\n\nCARRIER QUIRKS: The registry captures institutional memory of known carrier statement issues — e.g., Humana's negative amounts in the 'Comm Amount' column rather than separate chargeback rows, or late-month splits arriving the following month with no reference back. Every adapter contributes to the quirks file.\n\nUPLOAD QUEUE: Files show real-time progress through parsing → extracting → complete phases, with event counts and variance counts displayed on completion. Agents can review extracted events directly from the upload queue.",
    keywords: ["upload", "statement", "csv", "pdf", "parse", "parsing", "extract", "event", "carrier", "drop", "drag", "file", "ingestion", "adapter", "schema detection", "zod", "validation", "phi", "mbi", "hash", "audit", "commission", "reconciliation", "quirks", "agent skill"],
  },
  {
    id: "skill-treasury-reconciliation-feed",
    category: "Agent Skills",
    title: "Treasury Reconciliation Feed — QuickBooks/Sage accounting category export",
    content:
      "The Treasury Reconciliation Feed maps commission events to accounting categories for QuickBooks, Sage 50/Intacct, or generic CSV import. It is the treasury reconciliation output of the Commission Reconciliation Engine.\n\nEXPORT FORMATS:\n• QuickBooks Desktop (IIF): Columns — Date, Transaction No., Account, Debit, Credit, Memo, Class. Quoted CSV for IIF compatibility.\n• Sage 50 / Sage Intacct: Columns — DATE, REFERENCE, ACCOUNT, DEBIT, CREDIT, DETAILS, DEPARTMENT.\n• Generic CSV: Columns — date, journal_id, event_id, carrier, agent, event_type, account, debit, credit, memo, class.\n\nACCOUNT MAPPING (by event type):\n• initial_payment → QB: 6200 - Commission Expense (DR), Sage: 5000 - Commissions (DR).\n• renewal_payment → QB: 6210 - Renewal Commission Expense (DR), Sage: 5010 - Renewal Commissions (DR).\n• chargeback_rapid_disenrollment → QB: 1200 - Accounts Receivable (CR), Sage: 1100 - Trade Debtors (CR).\n• chargeback_other → QB: 1200 - Accounts Receivable (CR), Sage: 1100 - Trade Debtors (CR).\n• adjustment_positive → QB: 6290 - Commission Adjustments (DR), Sage: 5090 - Commission Adjustments (DR).\n• adjustment_negative → QB: 6290 - Commission Adjustments (CR), Sage: 5090 - Commission Adjustments (CR).\n• true_up → QB: 6295 - Commission True-Ups (DR), Sage: 5095 - Commission True-Ups (DR).\n• split_payment → QB: 6220 - Override Commission Expense (DR), Sage: 5020 - Override Commissions (DR).\n• override → QB: 6220 - Override Commission Expense (DR), Sage: 5020 - Override Commissions (DR).\n\nJOURNAL ENTRY STRUCTURE: Each commission event becomes one journal entry line. Debit/credit direction is determined by the event type's accounting nature (commission payments = debit to expense, chargebacks = credit to AR, adjustments = debit or credit to adjustments account). The Class/Department field is set to the agent name for cost-center tracking.\n\nSUMMARY VIEWS: The feed produces (1) total debits, total credits, net journal, entry count, (2) by-category breakdown (debits/credits/entries per GL account), (3) by-carrier breakdown (commission flow per carrier for reconciliation against carrier statements).\n\nANTI-PATTERNS: Never map commission payments to a single undifferentiated revenue account — the IRS and auditors require separation of initial vs. renewal vs. override vs. chargeback. Never export before variance reconciliation is complete — disputed amounts should be held in a suspense account. Never include raw beneficiary identifiers in the treasury feed — it goes to an external accounting system outside the PHI tier. Never hard-code GL account numbers — they vary per agency chart of accounts; the mapping table is editable.",
    keywords: ["treasury", "reconciliation", "feed", "quickbooks", "sage", "intacct", "iif", "csv", "accounting", "gl", "general ledger", "journal entry", "debit", "credit", "commission", "export", "category", "mapping", "account", "chargeback", "adjustment", "override", "true-up", "split", "agent skill"],
  },
  // ── Platform Features ──────────────────────────────────────────────
  {
    id: "feat-compliance-center",
    category: "Platform Features",
    title: "Compliance Center — SOA, PEWC, Call Recording Retention, E-Signature",
    content:
      "The Compliance Center is the P0 regulatory hub ensuring CMS TPMO compliance across all agent activities.\n\nSOA TRACKING: Every Medicare Advantage sales appointment requires a documented Scope of Appointment per 42 CFR §422.2267. The SOA captures: beneficiary consent, products to be discussed, date, agent signature. SOAs have a 48-hour validity window before the appointment and must be signed before the appointment occurs.\n\nPEWC CAPTURE: Prior Express Written Consent is required before sharing beneficiary info with another TPMO or agent (effective Oct 1, 2024). The PEWC flow captures verbatim consent response, timestamp, what info will be shared, and with whom. Pre-checked boxes and blanket consent do NOT qualify. Beneficiaries can withdraw consent at any time by replying STOP.\n\nCALL RECORDING RETENTION: CMS requires TPMO sales call recordings to be retained for 10 years. All recordings are encrypted at rest, access-logged, and have a full chain-of-custody trail. Each recording has: storage status (stored/processing/failed), retention expiry date (10 years from recording), chain of custody (creation to encryption to access events), and access log (who accessed, when, why).\n\nE-SIGNATURE: Enrollment documents (applications, SOAs, authorization forms, HIPAA releases) can be generated, sent for e-signature, tracked through signature to submission to carrier approval, with full audit trail. Each document tracks signature count vs required signatures.\n\nTPMO DISCLAIMER: The CMS-required disclaimer appears on every written deliverable and in the communication composer.",
    keywords: ["compliance center", "soa", "scope of appointment", "pewc", "prior express written consent", "call recording", "retention", "10 year", "e-signature", "esign", "enrollment document", "tpmo", "disclaimer", "42 cfr", "422.2267", "422.2260", "cms", "compliance", "regulatory", "consent", "audit trail", "platform feature"],
  },
  {
    id: "feat-pipeline",
    category: "Platform Features",
    title: "Sales Pipeline — Kanban Board, Lead Routing, Lead Queue",
    content:
      "The Sales Pipeline module provides visual deal-stage management from lead to enrolled.\n\nKANBAN BOARD: Deals flow through 7 stages: New Lead, Contacted, Appointment Scheduled, Needs Analysis, Application Submitted, Enrolled, Lost. Each deal card shows client name, carrier, plan type, deal value, probability percentage, last activity, and next action.\n\nLEAD ROUTING: Automated lead distribution based on 5 strategies: (1) Carrier Appointment, (2) Round Robin, (3) Territory, (4) Performance, (5) Weighted. Rules can have multiple conditions and target specific agents.\n\nLEAD QUEUE: Unassigned leads wait in a queue with priority indicators, estimated value, source, and time in queue. Supervisors can manually assign or routing rules handle it automatically.",
    keywords: ["pipeline", "kanban", "deal stage", "lead routing", "lead queue", "distribution", "round robin", "territory", "performance", "carrier appointment", "conversion", "funnel", "forecast", "probability", "platform feature"],
  },
  {
    id: "feat-quoting",
    category: "Platform Features",
    title: "Quoting Engine — Plan Comparison, Formulary Lookup, Provider Network",
    content:
      "The Quoting Engine is the multi-carrier plan comparison tool with formulary and provider network lookup.\n\nPLAN COMPARISON: Enter a ZIP code to see all available MA, MAPD, Medigap, Part D, and SNP plans. Plans are ranked by a weighted score (0-100) using coefficients: Premium 20, OOP 15, Formulary 25, Provider 20, Stars 15, Special Factors 5. Each plan card shows carrier, plan name, monthly premium, MOOP, star rating, formulary match %, doctor match %, extra benefits, and network type.\n\nFORMULARY LOOKUP: Search any medication by brand or generic name. Results show drug class, tier, covered status, prior auth, step therapy, quantity limits, and copay estimates.\n\nPROVIDER NETWORK: Search any doctor by name or specialty. Results show practice, address, phone, distance, accepting new patients, and which plans include them in-network.\n\nTPMO COMPLIANCE: The CMS-required disclaimer appears on the quoting page.",
    keywords: ["quoting", "plan comparison", "formulary", "drug lookup", "provider network", "doctor lookup", "moop", "premium", "star rating", "extra benefits", "network", "hmo", "ppo", "snp", "zip", "copay", "tier", "prior auth", "step therapy", "platform feature"],
  },
  {
    id: "feat-documents",
    category: "Platform Features",
    title: "Document Management — Secure Storage, Version History, Access Logging",
    content:
      "The Document Management module provides secure, HIPAA-compliant client document storage.\n\nCATEGORIES: Enrollment Forms, SOAs, Medical Records, Carrier Correspondence, EOBs, Tax Documents, Authorization Forms, Other.\n\nVERSION HISTORY: Every document tracks all versions with upload timestamp, uploader, and change notes.\n\nACCESS LOG: Every document access (view, download) is logged with timestamp, accessor name, and action type. Full audit trail for HIPAA compliance.\n\nROLE-BASED ACCESS: Agents see only their own clients' documents. Admins and supervisors see all. Documents are encrypted at rest.",
    keywords: ["document", "document management", "storage", "upload", "version history", "access log", "hipaa", "secure", "file", "enrollment form", "soa", "eob", "platform feature"],
  },
  {
    id: "feat-workflows",
    category: "Platform Features",
    title: "Workflow Automation — Trigger-Based Task Creation Engine",
    content:
      "The Workflow Automation engine creates tasks, sends emails/SMS, and notifies supervisors automatically based on triggers.\n\nTRIGGERS: New client assigned, policy lapsing, AEP approaching, appointment scheduled, enrollment submitted, carrier approval received, chargeback received, AHIP expiring, carrier appointment expiring, client birthday, renewal approaching, client lost.\n\nACTIONS: Create task, send email, send SMS, create appointment, notify supervisor, update status. Actions support template variables like {clientName} and {agentName}.\n\nRULES: Each rule has a trigger, one or more actions, and can be toggled active/inactive. Rules track runs per month and last execution time.",
    keywords: ["workflow", "automation", "trigger", "action", "task creation", "email", "sms", "notification", "supervisor", "rule", "engine", "lapsing", "aep", "ahip", "birthday", "renewal", "chargeback", "platform feature"],
  },
  {
    id: "feat-reporting",
    category: "Platform Features",
    title: "Reporting & Analytics — Custom Reports, Renewal Forecast, Chargebacks, Hierarchy",
    content:
      "The Reporting module provides custom report generation, renewal forecasting, chargeback tracking, and agent hierarchy management.\n\nREPORT BUILDER: Pre-built templates for Agent Production, Carrier Production, AEP Performance, Compliance Status, Retention and Churn, Commission Reconciliation, and Conversion Funnel. Reports can be scheduled and exported as PDF, CSV, or Excel.\n\nRENEWAL FORECAST: 6-month projection of renewals showing total up for renewal, projected retained vs lost, estimated revenue, at-risk count, and confidence score.\n\nCHARGEBACK TRACKING: Tracks rapid disenrollment chargebacks, plan termination, death within 90 days, and other reasons. Shows client, agent, carrier, plan type, amount, days from enrollment, and status.\n\nAGENT HIERARCHY: FMO to MGA to Agency to Agent tree with override commission tracking. Each node shows book size, YTD commissions, override rate, override income, and downline count.",
    keywords: ["reporting", "analytics", "report builder", "custom report", "scheduled", "export", "pdf", "csv", "excel", "renewal forecast", "chargeback", "hierarchy", "fmo", "mga", "override", "downline", "production", "aep", "conversion", "platform feature"],
  },
  {
    id: "feat-client-portal",
    category: "Platform Features",
    title: "Client Portal — Beneficiary Self-Service",
    content:
      "The Client Portal provides 24/7 self-service access for beneficiaries to view their plan, message their agent, access documents, and schedule appointments.\n\nFEATURES: View current plan details, encrypted messaging with agent (HIPAA-compliant), document download, upcoming appointments, schedule new appointments, and direct agent contact.\n\nSECURITY: All messages are encrypted. Document access is logged. The portal is HIPAA-compliant with role-based access.\n\nUSE CASE: Reduces agent call volume for routine inquiries. Clients can check their renewal date, download a lost EOB, or message their agent outside business hours.",
    keywords: ["client portal", "beneficiary", "self-service", "portal", "patient portal", "messaging", "documents", "appointments", "hipaa", "encrypted", "platform feature"],
  },
];

// ── Dynamic knowledge base (localStorage persistence) ───────────────

const STORAGE_KEY = "medicare_kb_entries_v7";

/** Returns the full list of knowledge entries (seed defaults + user edits). */
export function getKnowledgeEntries(): KnowledgeEntry[] {
  if (typeof window === "undefined") return knowledgeBase;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      // First run — seed with defaults
      localStorage.setItem(STORAGE_KEY, JSON.stringify(knowledgeBase));
      return knowledgeBase;
    }
    const parsed = JSON.parse(raw) as KnowledgeEntry[];
    if (!Array.isArray(parsed) || parsed.length === 0) return knowledgeBase;
    return parsed;
  } catch {
    return knowledgeBase;
  }
}

function saveKnowledgeEntries(entries: KnowledgeEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* ignore quota errors */
  }
}

export function addKnowledgeEntry(
  entry: Omit<KnowledgeEntry, "id">
): KnowledgeEntry {
  const entries = getKnowledgeEntries();
  const id = `kb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const newEntry: KnowledgeEntry = { ...entry, id };
  const updated = [...entries, newEntry];
  saveKnowledgeEntries(updated);
  return newEntry;
}

export function updateKnowledgeEntry(entry: KnowledgeEntry): void {
  const entries = getKnowledgeEntries();
  const updated = entries.map((e) => (e.id === entry.id ? entry : e));
  saveKnowledgeEntries(updated);
}

export function removeKnowledgeEntry(id: string): void {
  const entries = getKnowledgeEntries();
  saveKnowledgeEntries(entries.filter((e) => e.id !== id));
}

export function resetKnowledgeBase(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Returns all categories currently in use (defaults + custom). */
export function getKnowledgeCategories(): string[] {
  const entries = getKnowledgeEntries();
  const set = new Set<string>(knowledgeCategories);
  entries.forEach((e) => set.add(e.category));
  return Array.from(set);
}

// ── RAG retrieval: keyword + fuzzy matching ──────────────────────────

export function searchKnowledge(query: string, limit = 5): KnowledgeEntry[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  const entries = getKnowledgeEntries();
  const scored = entries.map((entry) => {
    let score = 0;
    const hay = (entry.title + " " + entry.content + " " + entry.keywords.join(" ")).toLowerCase();

    // Exact keyword match (strong signal)
    for (const kw of entry.keywords) {
      if (q.includes(kw.toLowerCase())) score += 5;
      if (kw.toLowerCase().includes(q)) score += 3;
    }

    // Token overlap
    for (const tok of tokens) {
      if (entry.keywords.some((kw) => kw.toLowerCase().includes(tok))) score += 2;
      if (hay.includes(tok)) score += 1;
    }

    // Category match
    if (entry.category.toLowerCase().includes(q)) score += 4;

    return { entry, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.entry);
}

export interface AgentAssistMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: { id: string; title: string; category: string }[];
  timestamp: string;
}

// Generate a response from the knowledge base
export type ResponseStyle = "concise" | "balanced" | "detailed" | "bullets";

export const responseStyleLabels: Record<ResponseStyle, string> = {
  concise: "Concise",
  balanced: "Balanced",
  detailed: "Detailed",
  bullets: "Bullet Points",
};

export const responseStyleDescriptions: Record<ResponseStyle, string> = {
  concise: "Short, direct answers. 2-3 sentences max.",
  balanced: "Full answer with related topics linked.",
  detailed: "Complete answer with all related context.",
  bullets: "Key points as a bulleted list.",
};

function splitIntoSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+/g) ?? [text];
}

function splitIntoParagraphs(text: string): string[] {
  return text.split(/\n\n+/).filter((p) => p.trim().length > 0);
}

function formatResponse(content: string, style: ResponseStyle, relatedTitles: string[], query: string): string {
  // For long multi-paragraph entries, find the most relevant paragraph
  const paragraphs = splitIntoParagraphs(content);

  switch (style) {
    case "concise": {
      if (paragraphs.length > 1) {
        // Find the paragraph most relevant to the query
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 3);
        let bestPara = paragraphs[0];
        let bestScore = -1;
        for (const para of paragraphs) {
          const paraLower = para.toLowerCase();
          let score = 0;
          for (const w of queryWords) {
            if (paraLower.includes(w)) score++;
          }
          if (score > bestScore) {
            bestScore = score;
            bestPara = para;
          }
        }
        const sentences = splitIntoSentences(bestPara);
        const summary = sentences.slice(0, 3).join(" ").trim();
        return summary + (relatedTitles.length ? `\n\nSee also: ${relatedTitles.slice(0, 2).join("; ")}.` : "");
      }
      const sentences = splitIntoSentences(content);
      const summary = sentences.slice(0, 3).join(" ").trim();
      return summary + (relatedTitles.length ? `\n\nSee also: ${relatedTitles.slice(0, 2).join("; ")}.` : "");
    }
    case "bullets": {
      // Use first 2 paragraphs max, extract key sentences as bullets
      const sourceText = paragraphs.length > 1 ? paragraphs.slice(0, 2).join(" ") : content;
      const sentences = splitIntoSentences(sourceText).slice(0, 8);
      const bullets = sentences
        .map((s) => `• ${s.trim()}`)
        .join("\n");
      return bullets + (relatedTitles.length ? `\n\nSee also: ${relatedTitles.slice(0, 3).join("; ")}.` : "");
    }
    case "detailed": {
      // Limit to first 4 paragraphs to avoid massive walls of text
      const trimmed = paragraphs.length > 4 ? paragraphs.slice(0, 4).join("\n\n") + "\n\n[... truncated — ask for more detail]" : content;
      let result = trimmed;
      if (relatedTitles.length) {
        result += "\n\nRelated topics: " + relatedTitles.map((t) => t).join("; ") + ".";
      }
      return result;
    }
    case "balanced":
    default: {
      // Limit to first 2 paragraphs
      const trimmed = paragraphs.length > 2 ? paragraphs.slice(0, 2).join("\n\n") + "\n\n[... more available — ask for details]" : content;
      let result = trimmed;
      if (relatedTitles.length) {
        result += "\n\nRelated: " + relatedTitles.join("; ") + ".";
      }
      return result;
    }
  }
}

export function generateAssistResponse(
  query: string,
  style: ResponseStyle = "concise"
): {
  content: string;
  sources: { id: string; title: string; category: string }[];
} {
  const results = searchKnowledge(query, 3);

  if (results.length === 0) {
    return {
      content: style === "concise"
        ? "I don't have that in my knowledge base. Try asking about Medicare commissions, Medicaid rules, LIS, MA plan types, carrier details, election periods, or needs analysis."
        : "I don't have a specific answer for that in my Medicare knowledge base. Try asking about Medicare commissions, Medicaid rules by state, Low Income Subsidy (LIS), Medicare Advantage plan types, carrier-specific plan details (UHC, Humana, Aetna, WellCare, BCBS, Cigna, Kaiser, Devoted, Clover, Molina, and more), election periods, carrier SEP requirements, needs analysis and fact-finding, or agent skills like the Verdict Gate, the Senior & Health-Coverage Benefits Navigator, the Abridge Compliance Gate, the SOC 2 Evidence Collector, the Medicare Needs Navigator, the Carrier Adapter Scaffolder, the Medicare Plan Data Ingester, the Commission Reconciliation Engine, or the Treasury Reconciliation Feed.",
      sources: [],
    };
  }

  const primary = results[0];
  const relatedTitles = results.slice(1).map((r) => r.title);
  const content = formatResponse(primary.content, style, relatedTitles, query);

  return {
    content,
    sources: results.map((r) => ({ id: r.id, title: r.title, category: r.category })),
  };
}
