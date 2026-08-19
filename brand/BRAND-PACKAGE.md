# Product Brand Package — agencyBRIDGE

Status: **Brand Gate NOT clear.** Identity, logo system, colour, type, voice, and
surfaces are complete; motion identity and owned share assets are outstanding.
Deviation from house palette is recorded as `contract/DECISIONS.md` D-007.

## Identity
- **Product name:** agencyBRIDGE
- **Naming rationale:** Follows the artificialBRIDGE lowercaseUPPERCASE convention — lowercase category (`agency`), uppercase family mark (`BRIDGE`). The bridge is the product thesis: agencies on one side, carriers and CMS on the other.
- **One-line positioning:** The system of record for a Medicare agency — CRM, commissions, and compliance in one place.
- **Tagline:** Replace 6+ tools with one.
- **Brand promise:** Nothing an auditor asks for is more than one screen away.

## Logo system
- **Primary logo:** `BrandLockup` — mark + wordmark, `agency` bold (700) / `BRIDGE` extrabold (800).
- **Secondary/compact lockup:** `BrandLockup compact` — mark only. The only approved compact form.
- **Icon / app mark:** `BrandMark` — suspension bridge in a rounded tile (radius 7.5 on a 32 grid).
- **Favicon:** `public/favicon.svg`, identical path data to the component.
- **Construction:** two towers crossing the deck, a draped cable between them, back-stays to the abutments. Drawn as geometry, never as type, so it renders without a webfont.
- **Monochrome:** `tone="mono"` — strokes inherit `currentColor`, tile knocked out to an outline.
- **Light-background:** `tone="brand"` (navy gradient tile, near-white span).
- **On the dark app sidebar use `tone="light"`:** the brand tile's gradient endpoint sits at 1.14:1 against the sidebar ground, so its edge disappears.
- **Dark-background:** `tone="light"` (light tile, navy span).
- **Minimum size:** 16px for the mark; 20px before the wordmark is dropped in favour of the compact form.
- **Clear space:** one quarter of the tile's width on all sides.
- **Prohibited uses:** re-typesetting the wordmark in another family; recolouring the span to a non-palette hue; stretching the tile off-square; placing the brand tone on a mid-navy ground where the tile edge disappears; reintroducing a letterform mark (`aB`, `M+`) anywhere.

## Motion identity
- **Status: NOT DELIVERED — Brand Gate blocker.**
- No animated logo, duration, easing, or entry behaviour is defined.
- Product-level motion currently comes from Framer Motion page transitions, which are not a brand motion system.
- A `prefers-reduced-motion` fallback must ship with any motion identity.

## Visual system
- **Primary:** navy `#0f1b3d` (navy-900) through `#28507f` (navy-600); tile gradient runs navy-600 → navy-900.
- **Secondary:** navy-50 `#f4f7fb` … navy-300 `#8fb0d4` for surfaces and muted type.
- **Span/ink:** `#e8edf3` (navy-100).
- **Semantic:** success, warning, destructive, accent — HSL tokens in `tailwind.config.ts`, themed light/dark via CSS variables in `src/index.css` / `src/styles.css`.
- **Light/dark tokens:** shadcn variable scheme; `darkMode: ["class"]`.
- **Accessibility:** inside a lockup the mark is `aria-hidden` — the adjacent wordmark already names the brand, so screen readers announce it once.
- **Contrast verification:** span `#e8edf3` on navy-900 `#0f1b3d` ≈ 14.6:1 — passes WCAG AA and AAA for both text and non-text. Mark legibility separately verified by render at 16/24/36/64px on white and navy (EV-004).
- **Typography:** Outfit (display), Figtree (body/sans).
- **Type scale:** Tailwind default ramp; wordmark uses `font-display` with `tracking-tight`.
- **Iconography:** lucide-react, 1.5–2px stroke, matching the mark's stroke weight.
- **Imagery direction:** product surfaces over stock photography.

## Voice
- **Brand voice:** operator-to-operator. Specific, unhedged, numerate. Names the real failure mode rather than the benefit.
- **Messaging pillars:** one system instead of six; money you are owed and can prove; compliance evidence that survives an audit.
- **Terminology:** short pay, chargeback, true-up, FMV, TPMO, SOA, AEP, MAPD/DSNP/CSNP.
- **Words to use:** reconcile, evidence, variance, dispute, audit trail.
- **Words to avoid:** revolutionary, seamless, leverage, solution, world-class, AI-powered as a bare claim.

## Product surfaces
- **Web (marketing):** landing nav lockup, brand tone. ✅
- **Web (app):** sidebar lockup, expands/collapses with the rail. ✅
- **Login:** light-tone mark on navy ground. ✅
- **Browser chrome:** favicon from shared geometry. ✅
- **Mobile:** responsive; no native app.
- **App/store listing:** not applicable — no store presence.
- **Social/avatar:** ⚠️ OG and Twitter images hot-link `vibe.filesafe.space` (R-006).
- **Email:** not defined.
- **Pitch/deck:** not defined.
- **Documentation:** README + this package.
- **Loading/empty/error states:** route-level skeleton (`RouteFallback`) mirrors page rhythm; `ErrorBoundary` covers the tree.

## Production assets
- **Source:** `src/components/shared/BrandMark.tsx` (single source of geometry). The tile gradient id is per-instance (`useId`), since SVG `url(#…)` resolves against the whole document and a fixed id would collide across marks.
- **SVG:** `public/favicon.svg`.
- **PNG / WebP:** ❌ not exported.
- **Favicon set:** SVG only; no `.ico` or maskable PNG set.
- **Social preview assets:** ❌ not owned (R-006).
- **Motion asset:** ❌ not produced.
- **Asset manifest:** this document.

## Provenance
- **Designer/agent:** Claude Code, 2026-08-19, under Build Contract OS.
- **Source assets:** all mark geometry hand-authored in this repository. No third-party or AI-generated raster assets were used for the mark.
- **Third-party assets/licences:** lucide-react (ISC) for UI icons; Outfit and Figtree (SIL OFL). Landing hero and share images remain third-party hosted with **no recorded licence** — R-006.
- **AI-generation disclosure:** the mark is vector geometry authored directly, not image-model output.
- **Review status:** rendered and inspected at four sizes on two grounds (EV-004). Not reviewed by a human designer.

## Brand Gate
- [x] Identity approved
- [x] Logo system complete
- [x] Light/dark states complete
- [ ] Motion identity complete or justified as unnecessary
- [x] Accessibility/contrast checked
- [ ] Production exports complete (SVG only; no raster/favicon set)
- [x] Usage guidance complete
- [ ] Product surfaces checked (social/share assets not owned — R-006)
- [x] Provenance recorded
- [x] Brand deviation ADR recorded (D-007)
