/**
 * @repull/eslint-plugin-repull-only — Layer 3 of the Repull SDK-only
 * moat (prompt + eval + lint).
 *
 * Bans third-party PMS / OTA / pricing / raw-payment / raw-AI /
 * raw-HTTP imports from Studio templates. Pair with @repull/sdk,
 * @repull/components, and @repull/ai-sdk for the full SDK-only
 * developer experience.
 *
 * Setup (flat config, ESLint 9):
 *
 *     import repullOnly from "@repull/eslint-plugin-repull-only";
 *     export default [
 *       repullOnly.configs.recommended,
 *     ];
 *
 * Setup (legacy `.eslintrc`):
 *
 *     {
 *       "extends": ["plugin:@repull/repull-only/recommended"]
 *     }
 *
 * The recommended preset enables `no-non-repull-imports` as `error`.
 */
import type { ESLint, Linter } from "eslint";
import { noNonRepullImports } from "./no-non-repull-imports.js";

const meta = {
  name: "@repull/eslint-plugin-repull-only",
  version: "0.1.0",
} as const;

const rules = {
  "no-non-repull-imports": noNonRepullImports,
} as const;

const recommendedRules: Linter.RulesRecord = {
  "@repull/repull-only/no-non-repull-imports": "error",
};

const plugin = {
  meta,
  rules,
  configs: {} as Record<string, Linter.Config | Linter.LegacyConfig>,
} satisfies ESLint.Plugin;

// Flat config (ESLint 9+) — `plugins` is an object map, rule prefix
// is the key the consumer chose.
plugin.configs.recommended = {
  plugins: {
    "@repull/repull-only": plugin as unknown as ESLint.Plugin,
  },
  rules: recommendedRules,
};

// Legacy config (eslintrc) — exposed under `plugin.configs`. The
// `extends: ["plugin:@repull/repull-only/recommended"]` machinery
// picks this up.
plugin.configs["recommended-legacy"] = {
  plugins: ["@repull/repull-only"],
  rules: recommendedRules,
} as Linter.LegacyConfig;

export { noNonRepullImports };
export { IMPORT_DENYLIST, findBan, packageFromSpecifier } from "./bans.js";
export type { BanSpec } from "./bans.js";
export default plugin;
