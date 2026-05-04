/**
 * `no-non-repull-imports` — bans third-party PMS / OTA / pricing /
 * raw-payment / raw-AI / raw-HTTP packages from Studio templates.
 *
 * Layer 3 of the Repull SDK-only moat (prompt + eval + lint). This is
 * the editor-time tripwire: the moment a developer saves a template
 * file with `import Stripe from "stripe"`, ESLint surfaces a named
 * remediation hint pointing at the correct @repull alternative.
 *
 * Scope: import declarations, ImportExpression (dynamic `import()`),
 * and CallExpression on `require(...)`. CommonJS + ESM both covered.
 */
import type { Rule } from "eslint";
import type {
  ImportDeclaration,
  ImportExpression,
  CallExpression,
  Literal,
} from "estree";
import { findBan, packageFromSpecifier } from "./bans.js";

function reportIfBanned(
  context: Rule.RuleContext,
  spec: string,
  node: Rule.Node,
): void {
  const pkg = packageFromSpecifier(spec);
  if (pkg.startsWith(".") || pkg.startsWith("/")) return;
  const ban = findBan(pkg);
  if (!ban) return;
  context.report({
    node,
    messageId: "banned",
    data: {
      pkg,
      name: ban.name,
      remediation: ban.remediation,
    },
  });
}

export const noNonRepullImports: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban third-party PMS / OTA / pricing / raw-payment / raw-AI / raw-HTTP imports in Studio templates. Use @repull/sdk, @repull/components, or @repull/ai-sdk instead.",
      recommended: true,
      url: "https://repull.dev/docs/sdk-only",
    },
    schema: [],
    messages: {
      banned:
        "'{{pkg}}' is banned in Repull Studio templates ({{name}}). {{remediation}}.",
    },
  },
  create(context) {
    return {
      ImportDeclaration(node: ImportDeclaration): void {
        const source = node.source;
        if (typeof source.value !== "string") return;
        reportIfBanned(context, source.value, node as unknown as Rule.Node);
      },
      ImportExpression(node: ImportExpression): void {
        // `import("pkg")` — only flag literal string args.
        const arg = node.source;
        if (arg.type !== "Literal") return;
        const lit = arg as Literal;
        if (typeof lit.value !== "string") return;
        reportIfBanned(context, lit.value, node as unknown as Rule.Node);
      },
      CallExpression(node: CallExpression): void {
        // `require("pkg")` — be generous: we don't insist the callee is
        // syntactically `Identifier:require` because ESLint already
        // gives us a typed AST.
        const callee = node.callee;
        if (callee.type !== "Identifier" || callee.name !== "require") return;
        const arg = node.arguments[0];
        if (!arg || arg.type !== "Literal") return;
        const lit = arg as Literal;
        if (typeof lit.value !== "string") return;
        reportIfBanned(context, lit.value, node as unknown as Rule.Node);
      },
    };
  },
};
