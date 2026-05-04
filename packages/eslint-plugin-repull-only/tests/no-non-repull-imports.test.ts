/**
 * Layer 3 of the Repull SDK-only moat.
 *
 * These tests use ESLint's RuleTester against the actual rule source.
 * Each `valid` case is a snippet that MUST lint clean; each `invalid`
 * case is a snippet that MUST report exactly one banned import with
 * the right remediation hint.
 */
import { RuleTester } from "eslint";
import { describe, it, expect } from "vitest";
import { noNonRepullImports } from "../src/no-non-repull-imports.js";
import { findBan, packageFromSpecifier } from "../src/bans.js";

const tester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
});

describe("no-non-repull-imports", () => {
  it("permits @repull/sdk + @repull/components + react", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [
          {
            code: [
              `import React from "react";`,
              `import { repull } from "@repull/sdk";`,
              `import { RepullDataTable } from "@repull/components";`,
              `void React; void repull; void RepullDataTable;`,
            ].join("\n"),
          },
        ],
        invalid: [],
      }),
    ).not.toThrow();
  });

  it("permits common allowed deps (lucide-react, recharts, date-fns)", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [
          {
            code: [
              `import { format } from "date-fns";`,
              `import { Calendar } from "lucide-react";`,
              `import { LineChart } from "recharts";`,
              `void format; void Calendar; void LineChart;`,
            ].join("\n"),
          },
        ],
        invalid: [],
      }),
    ).not.toThrow();
  });

  it("flags banned PMS vendor (Hostaway) on import", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [],
        invalid: [
          {
            code: `import { HostawayClient } from "@hostaway/sdk";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "@hostaway/sdk",
                  name: "Hostaway",
                  remediation: "use @repull/sdk",
                },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("flags raw stripe import (must use @repull Stripe Connect wrappers)", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [],
        invalid: [
          {
            code: `import Stripe from "stripe";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "stripe",
                  name: "stripe",
                  remediation: "use @repull/sdk Stripe Connect wrappers",
                },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("flags raw openai + @anthropic-ai/sdk (must use @repull/ai-sdk)", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [],
        invalid: [
          {
            code: `import OpenAI from "openai";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "openai",
                  name: "openai",
                  remediation: "use @repull/ai-sdk <RepullAgent />",
                },
              },
            ],
          },
          {
            code: `import Anthropic from "@anthropic-ai/sdk";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "@anthropic-ai/sdk",
                  name: "@anthropic-ai/sdk",
                  remediation: "use @repull/ai-sdk <RepullAgent />",
                },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("flags axios / node-fetch (must use platform fetch)", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [],
        invalid: [
          {
            code: `import axios from "axios";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "axios",
                  name: "axios",
                  remediation: "use fetch (works in edge + node)",
                },
              },
            ],
          },
          {
            code: `import fetch from "node-fetch";`,
            errors: [
              {
                messageId: "banned",
                data: {
                  pkg: "node-fetch",
                  name: "node-fetch",
                  remediation: "use the platform fetch",
                },
              },
            ],
          },
        ],
      }),
    ).not.toThrow();
  });

  it("flags banned dynamic import() AND require()", () => {
    expect(() =>
      tester.run("no-non-repull-imports", noNonRepullImports, {
        valid: [
          {
            // Allowed dynamic import goes through clean.
            code: `const m = import("@repull/sdk");`,
          },
        ],
        invalid: [
          {
            code: `const m = import("guesty");`,
            errors: [{ messageId: "banned", data: { pkg: "guesty", name: "Guesty", remediation: "use @repull/sdk" } }],
          },
          {
            code: `const m = require("pricelabs");`,
            errors: [{ messageId: "banned", data: { pkg: "pricelabs", name: "PriceLabs", remediation: "use @repull/sdk pricing" } }],
          },
        ],
      }),
    ).not.toThrow();
  });
});

/**
 * Coverage of the helper functions exported alongside the rule. Cheap
 * unit tests; the RuleTester suite above is the contract test.
 */
describe("bans helpers", () => {
  it("packageFromSpecifier collapses subpaths to the bare package", () => {
    expect(packageFromSpecifier("@repull/sdk/some/sub")).toBe("@repull/sdk");
    expect(packageFromSpecifier("recharts/types")).toBe("recharts");
    expect(packageFromSpecifier("./local")).toBe("./local");
  });

  it("findBan returns null for allowed packages, BanSpec for banned", () => {
    expect(findBan("@repull/sdk")).toBeNull();
    expect(findBan("react")).toBeNull();
    expect(findBan("stripe")?.name).toBe("stripe");
    expect(findBan("@hostaway/sdk")?.name).toBe("Hostaway");
  });
});
