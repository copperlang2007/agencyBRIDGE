# EV-004 — Brand identity consolidation

**Claim:** REQ-008.
**Timestamp:** 2026-08-19T00:30:46Z
**Artifacts:** `src/components/shared/BrandMark.tsx`, `public/favicon.svg`, `brand/BRAND-PACKAGE.md`

## Defect found

The product shipped **three different identities** for one brand:

| Surface | Mark before |
|---|---|
| App sidebar (`Sidebar.tsx`) | `M+` in a navy tile — a leftover from another product |
| Landing nav (`LandingPage.tsx`) | `aB` in a primary tile |
| Login (`LoginPage.tsx`) | a generic `ShieldCheck` icon in a blue gradient tile |
| Favicon | `aB` as SVG `<text>`, font-dependent |

`M+` is on the surface authenticated users see on every page.

## Fix

A single `BrandMark` / `BrandLockup` component is now the only source of the mark;
all four surfaces render through it, so the identity cannot silently diverge again.
The mark is drawn as geometry rather than type, so it needs no webfont, reduces to
monochrome, and survives favicon scale. The favicon is generated from identical path
data.

The first geometry attempt read as an arch/tunnel and merged into a solid dome at
16px; it was redrawn as a suspension silhouette (two towers crossing the deck, draped
cable, back-stays) whose verticals hold up at small sizes. Recorded because the
first attempt was rejected on rendered evidence, not on intent.

## Verification

Rendered and inspected, not assumed:

- scale ladder at 16 / 24 / 36 / 64 px on white **and** on navy — `shots/brand-scale.png`
- sidebar, dark surface — `shots/brand-sidebar.png` (`M+` gone)
- login, light-tone mark on dark ground — `shots/brand-login.png`
- landing nav, brand tone on light ground — `shots/brand-landing-nav.png`

## Outstanding (Brand Gate not clear)

- No motion identity; no reduced-motion treatment defined.
- OG/Twitter share images still hot-link `vibe.filesafe.space` — third-party, no
  provenance or licence record (R-006).
- No app-store / marketplace identity assets.
- No PNG/WebP raster exports of the mark.
