import { cn } from "@/lib/utils";

/**
 * Canonical agencyBRIDGE identity.
 *
 * Single source of the mark. Before this existed the product shipped three
 * different identities — "M+" in the app sidebar, "aB" on the landing nav, and
 * "aB" in the favicon — so every surface must render the mark through this
 * component rather than hand-rolling a tile.
 *
 * The mark is drawn as geometry, not type, so it stays identical without a
 * webfont, survives 16px favicons, and reduces cleanly to monochrome.
 * See brand/BRAND-PACKAGE.md for usage, clear space, and prohibited uses.
 */

export type BrandMarkTone = "brand" | "light" | "dark" | "mono";

const TONES: Record<BrandMarkTone, { tile: string; ink: string }> = {
  // Navy tile, near-white span — the default, for neutral and light surfaces.
  brand: { tile: "url(#ab-tile)", ink: "#e8edf3" },
  // For dark surfaces: light tile, navy span.
  light: { tile: "#e8edf3", ink: "#0f1b3d" },
  // For light surfaces where the gradient is too heavy (print, favicons).
  dark: { tile: "#0f1b3d", ink: "#e8edf3" },
  // Single-colour: inherits currentColor, tile knocked out.
  mono: { tile: "none", ink: "currentColor" },
};

export function BrandMark({
  size = 36,
  tone = "brand",
  className,
  title = "agencyBRIDGE",
}: {
  size?: number;
  tone?: BrandMarkTone;
  className?: string;
  title?: string;
}) {
  const { tile, ink } = TONES[tone];
  const stroked = tone === "mono";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={title}
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="ab-tile" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#28507f" />
          <stop offset="100%" stopColor="#0f1b3d" />
        </linearGradient>
      </defs>

      <rect
        width="32"
        height="32"
        rx="7.5"
        fill={tile}
        stroke={stroked ? ink : "none"}
        strokeWidth={stroked ? 1.5 : 0}
      />

      {/* Suspension silhouette: two towers rising through the deck, a cable
          draped between them, and back-stays to the abutments. The verticals are
          what keep it legible at favicon scale. */}
      <g
        stroke={ink}
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      >
        <path d="M11 8.4 Q16 17.4 21 8.4" />
        <path d="M5.5 18.4 L11 8.4" />
        <path d="M21 8.4 L26.5 18.4" />
        <path d="M4.5 20.6 H27.5" />
        <path d="M11 23.4 V7.2" />
        <path d="M21 23.4 V7.2" />
      </g>
    </svg>
  );
}

/**
 * Mark + wordmark lockup. `compact` drops the wordmark for collapsed rails and
 * small surfaces; the mark alone is the only approved compact form.
 */
export function BrandLockup({
  size = 36,
  tone = "brand",
  compact = false,
  subtitle,
  className,
  wordmarkClassName,
}: {
  size?: number;
  tone?: BrandMarkTone;
  compact?: boolean;
  subtitle?: string;
  className?: string;
  wordmarkClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark size={size} tone={tone} />
      {!compact && (
        <div className="flex flex-col leading-tight overflow-hidden">
          <span className={cn("font-display font-bold tracking-tight", wordmarkClassName)}>
            agency<span className="font-extrabold">BRIDGE</span>
          </span>
          {subtitle && <span className="text-[11px] opacity-60">{subtitle}</span>}
        </div>
      )}
    </div>
  );
}
