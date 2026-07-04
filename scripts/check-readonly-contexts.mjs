import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const IGNORED_FILES = new Set(['forty-cdk.d.ts', 'forty-cdk-core.d.ts']);
const WRITABLE_SIGNALS = new Set(['ModelSignal', 'WritableSignal']);

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-readonly-contexts] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function isExported(node) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function typeReferenceName(typeNode) {
  return typeNode && ts.isTypeReferenceNode(typeNode) && ts.isIdentifier(typeNode.typeName)
    ? typeNode.typeName.text
    : null;
}

function memberName(member) {
  return member.name && ts.isIdentifier(member.name) ? member.name.text : '<computed>';
}

function analyze(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);

  const exportedNames = new Set();
  for (const stmt of sf.statements) {
    if (
      ts.isExportDeclaration(stmt) &&
      !stmt.moduleSpecifier &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const el of stmt.exportClause.elements) exportedNames.add(el.name.text);
    }
  }

  const violations = [];
  for (const stmt of sf.statements) {
    if (!ts.isInterfaceDeclaration(stmt)) continue;
    const name = stmt.name.text;
    if (!name.endsWith('Context')) continue;
    if (!isExported(stmt) && !exportedNames.has(name)) continue;
    for (const member of stmt.members) {
      if (!ts.isPropertySignature(member) || !member.type) continue;
      const refName = typeReferenceName(member.type);
      if (refName && WRITABLE_SIGNALS.has(refName)) {
        violations.push(`${name}.${memberName(member)}: ${refName}`);
      }
    }
  }
  return violations;
}

const failures = [];
let checked = 0;

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts') || IGNORED_FILES.has(file)) continue;
  checked++;
  const violations = analyze(file, readFileSync(join(TYPES_DIR, file), 'utf8'));
  if (violations.length) {
    const entry = file.replace(/^forty-cdk-/, '').replace(/\.d\.ts$/, '');
    failures.push({ entry, violations });
  }
}

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
  `[check-readonly-contexts] OK — ${checked} entry points; no exported *Context interface exposes a writable signal.`,
);
