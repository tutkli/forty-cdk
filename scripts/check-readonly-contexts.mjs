import { existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { BLESSED_CORE_SYMBOLS } from './lib/core-blessed-tier.mjs';
import {
  INTERNAL_TIER_FILES,
  ROOT_FILE,
  indexEmittedContexts,
  isExported,
  readEmittedFiles,
} from './lib/emitted-contexts.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const WRITABLE_SIGNALS = new Set(['ModelSignal', 'WritableSignal']);

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-readonly-contexts] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function referenceName(typeName) {
  if (ts.isIdentifier(typeName)) {
    return typeName.text;
  }
  return ts.isQualifiedName(typeName) ? typeName.right.text : null;
}

function writableInType(node, found) {
  if (!node) {
    return;
  }
  if (ts.isTypeReferenceNode(node)) {
    const name = referenceName(node.typeName);
    if (name && WRITABLE_SIGNALS.has(name)) {
      found.add(name);
    }
    node.typeArguments?.forEach((arg) => writableInType(arg, found));
    return;
  }
  if (ts.isFunctionTypeNode(node) || ts.isConstructorTypeNode(node)) {
    writableInType(node.type, found);
    return;
  }
  if (ts.isTypeLiteralNode(node)) {
    node.members.forEach((member) => writableInMember(member, found));
    return;
  }
  ts.forEachChild(node, (child) => writableInType(child, found));
}

function writableInMember(member, found) {
  if (
    ts.isPropertySignature(member) ||
    ts.isMethodSignature(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isIndexSignatureDeclaration(member) ||
    ts.isCallSignatureDeclaration(member)
  ) {
    writableInType(member.type, found);
  }
}

function inScope(file, name, blessed) {
  if (file === ROOT_FILE || !name.endsWith('Context')) {
    return false;
  }
  return !INTERNAL_TIER_FILES.has(file) || blessed.has(name);
}

function analyze(entries, blessed) {
  const { files, surfaceOf } = indexEmittedContexts(entries);
  const failures = [];
  let checked = 0;
  for (const { file, entry, sf, exportedNames } of files) {
    if (file === ROOT_FILE) {
      continue;
    }
    checked++;
    const violations = [];
    for (const stmt of sf.statements) {
      if (!ts.isInterfaceDeclaration(stmt)) {
        continue;
      }
      const name = stmt.name.text;
      if (!isExported(stmt) && !exportedNames.has(name)) {
        continue;
      }
      if (!inScope(file, name, blessed)) {
        continue;
      }
      for (const [key, { owner, member }] of surfaceOf(name, file)) {
        const found = new Set();
        writableInMember(member, found);
        for (const signal of found) {
          const inherited = owner === name ? '' : ` (inherited from ${owner})`;
          violations.push(`${name}.${key}: ${signal}${inherited}`);
        }
      }
    }
    if (violations.length) {
      failures.push({ entry, violations });
    }
  }
  return { checked, failures };
}

const PROBE_FILES = [
  {
    file: 'forty-cdk-core.d.ts',
    text: `interface ForProbeBlessedContext {
  readonly touched: WritableSignal<boolean>;
}
interface ProbeInternalContext {
  readonly hidden: WritableSignal<boolean>;
}
export { ForProbeBlessedContext, ProbeInternalContext };
`,
  },
  {
    file: 'forty-cdk-probe.d.ts',
    text: `import * as i0 from '@angular/core';
interface ProbeBase {
  readonly inherited: WritableSignal<boolean>;
}
interface ForProbeContext extends ProbeBase {
  readonly union: WritableSignal<boolean> | null;
  readonly qualified: i0.WritableSignal<boolean>;
  method(): ModelSignal<string>;
  readonly factory: () => WritableSignal<number>;
  readonly consumerHandsOne: (signal: WritableSignal<number>) => void;
}
export { ForProbeContext };
`,
  },
];
const PROBE_EXPECTED = [
  'ForProbeBlessedContext.touched: WritableSignal',
  'ForProbeContext.inherited: WritableSignal (inherited from ProbeBase)',
  'ForProbeContext.union: WritableSignal',
  'ForProbeContext.qualified: WritableSignal',
  'ForProbeContext.method: ModelSignal',
  'ForProbeContext.factory: WritableSignal',
];

const probeReported = analyze(PROBE_FILES, new Set(['ForProbeBlessedContext'])).failures.flatMap(
  ({ violations }) => violations,
);
const probeMissing = PROBE_EXPECTED.filter((line) => !probeReported.includes(line));
const probeUnexpected = probeReported.filter((line) => !PROBE_EXPECTED.includes(line));
if (probeMissing.length || probeUnexpected.length) {
  console.error(
    `[check-readonly-contexts] FAIL — the liveness probe no longer reports exactly the writable signals it declares, so this run proves nothing about the emit.`,
  );
  for (const line of probeMissing) {
    console.error(`  missed: ${line}`);
  }
  for (const line of probeUnexpected) {
    console.error(`  unexpected: ${line}`);
  }
  console.error(
    `\nThe probe declares a writable signal on a blessed core context, behind a union, a qualified name, a method return, a function type's return and an inherited base, plus two it must not report (an internal-tier context and a parameter). Restore the detection rather than the probe.`,
  );
  process.exit(1);
}

const { checked, failures } = analyze(readEmittedFiles(TYPES_DIR), BLESSED_CORE_SYMBOLS);

if (failures.length) {
  console.error(
    `[check-readonly-contexts] FAIL — ${failures.length} entry point(s) expose a writable signal through an exported *Context interface:`,
  );
  for (const { entry, violations } of failures.sort((a, b) => a.entry.localeCompare(b.entry))) {
    console.error(`  forty-cdk/${entry}: ${violations.join(', ')}`);
  }
  console.error(
    `\nRetype the member as \`Signal<...>\` and add an explicit mutator method so consumer pieces route through the root's guards.`,
  );
  process.exit(1);
}

console.log(
  `[check-readonly-contexts] OK — ${checked} entry points, the blessed core contexts included; no exported *Context interface exposes a writable signal on its flattened surface, and the liveness probe reported all ${PROBE_EXPECTED.length} of its shapes.`,
);
