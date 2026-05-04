/**
 * Shared deny / allow lists for the Repull SDK-only moat.
 *
 * This list intentionally mirrors the layer-2 eval check
 * (`tests/kimi-eval/checks/sdk-fidelity.ts` in the repull-studio repo).
 * Keep them in sync — when one changes, the other should follow.
 *
 * Why duplicate? The eval runs once per generation; the lint plugin
 * runs every save in the template developer's editor. They are
 * independent enforcement layers.
 */

export interface BanSpec {
  /** Regex matched against the imported package's bare specifier. */
  pattern: RegExp;
  /** Display name surfaced in the lint message. */
  name: string;
  /** Suggested @repull/* alternative. */
  remediation: string;
}

export const IMPORT_DENYLIST: readonly BanSpec[] = [
  // ── Channel managers / PMS vendors ───────────────────────────────
  { pattern: /\bhostaway\b/i, name: "Hostaway", remediation: "use @repull/sdk" },
  { pattern: /\bguesty\b/i, name: "Guesty", remediation: "use @repull/sdk" },
  { pattern: /\blodgify\b/i, name: "Lodgify", remediation: "use @repull/sdk" },
  { pattern: /\bsmoobu\b/i, name: "Smoobu", remediation: "use @repull/sdk" },
  { pattern: /\bbeds24\b/i, name: "Beds24", remediation: "use @repull/sdk" },
  { pattern: /\bbookingsync\b/i, name: "BookingSync", remediation: "use @repull/sdk" },
  { pattern: /\bownerrez\b/i, name: "OwnerRez", remediation: "use @repull/sdk" },
  { pattern: /\bigms\b/i, name: "iGMS", remediation: "use @repull/sdk" },
  { pattern: /\bhospitable\b/i, name: "Hospitable", remediation: "use @repull/sdk" },
  // ── Pricing tools ────────────────────────────────────────────────
  { pattern: /\bpricelabs\b/i, name: "PriceLabs", remediation: "use @repull/sdk pricing" },
  { pattern: /\bwheelhouse\b/i, name: "Wheelhouse", remediation: "use @repull/sdk pricing" },
  { pattern: /\bbeyondpricing\b/i, name: "BeyondPricing", remediation: "use @repull/sdk pricing" },
  // ── Raw payments + AI providers — must use @repull wrappers ──────
  { pattern: /^stripe$/, name: "stripe", remediation: "use @repull/sdk Stripe Connect wrappers" },
  { pattern: /^openai$/, name: "openai", remediation: "use @repull/ai-sdk <RepullAgent />" },
  { pattern: /^@anthropic-ai\/sdk$/, name: "@anthropic-ai/sdk", remediation: "use @repull/ai-sdk <RepullAgent />" },
  // ── HTTP shortcuts that route around our network layer ───────────
  { pattern: /^axios$/, name: "axios", remediation: "use fetch (works in edge + node)" },
  { pattern: /^request$/, name: "request", remediation: "use fetch (works in edge + node)" },
  { pattern: /^node-fetch$/, name: "node-fetch", remediation: "use the platform fetch" },
];

/**
 * Pull the bare package name out of an import specifier. Subpath
 * imports (`pkg/sub`) collapse to `pkg`; scoped subpaths
 * (`@scope/pkg/sub`) collapse to `@scope/pkg`. Relative + absolute
 * paths are returned as-is so the caller can ignore them.
 */
export function packageFromSpecifier(spec: string): string {
  if (spec.startsWith(".") || spec.startsWith("/")) return spec;
  const parts = spec.split("/");
  if (spec.startsWith("@")) return parts.slice(0, 2).join("/");
  return parts[0] ?? spec;
}

export function findBan(pkg: string): BanSpec | null {
  for (const ban of IMPORT_DENYLIST) {
    if (ban.pattern.test(pkg)) return ban;
  }
  return null;
}
