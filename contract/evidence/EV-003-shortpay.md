# EV-003 — Short-Pay Detector defects, proof, and fix

**Claim:** REQ-004.
**Timestamp:** 2026-08-19T00:30:29Z
**Environment:** Node v22.22.2, npm 10.9.7, linux x64, Chromium 1194 headless
**Artifacts:** `src/lib/shortPayDetector.ts`, `src/test/shortPayDetector.test.ts`

The detector is the public free tool on the landing page and its output drives
"open N dispute(s)" guidance, so a wrong classification has direct downstream cost.
The logic was embedded in a 1,400-line page component and therefore untestable; it
was extracted before being corrected.

## Defects found by adversarial review

| ID | Severity | Defect |
|---|---|---|
| G1 | High | `replace(/[^0-9.]/g,"")` stripped the minus sign. `-450.00` parsed as `450.00`, so a **chargeback was scored as a full payment** — the single most common real-world case in Medicare commissions. |
| G2 | Medium | Unparseable text fell through `parseFloat(...) \|\| 0`, silently becoming $0.00 with no signal to the user. |
| G3 | High | Rows required all of carrier/expected/paid to be non-empty, so **"received nothing" — the most severe short pay — was silently dropped** from the analysis entirely. |
| G4 | Medium | Urgency keyed on `Math.abs(variancePct)`, so a large overpayment escalated as if it were a shortfall. |
| G5 | Medium | CSV export had the same formula-injection exposure as the audit export. |

## Proof after fix

`npx vitest run src/test/shortPayDetector.test.ts` → **18 passed / 18**, covering
signed and parenthesised negatives, blank-as-zero, invalid input reporting, zero
expectation (no divide-by-zero), urgency asymmetry, and CSV escaping.

## Browser verification of the real UI

Production build served locally; the detector driven through the actual form with
row 1 = a chargeback and row 2 = nothing received:

```
input : Humana expected 450.00 paid -450.00 | Aetna expected 300.00 paid <blank>
output: Expected total $750.00 · Paid total $-450.00 · Variance -$1200.00
        SHORT PAY tags: 2
        recommendation "chargeback or reversal": present
        recommendation "Open 2 dispute(s)": present
        JS errors: none
```

Before the fix the same input produced expected $450 / paid $450 and
"All commissions match expected amounts — no action needed."

Screenshot: `shots/detector-verified.png` (session scratchpad, not committed).
