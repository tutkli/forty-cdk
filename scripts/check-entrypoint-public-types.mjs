import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const CORE_SPECIFIER = 'forty-cdk/core';
const IGNORED_FILES = new Set(['forty-cdk.d.ts', 'forty-cdk-core.d.ts']);

const CONTRACT_TYPES = new Set([
  'VetoableEvent',
  'VetoableNativeEvent',
  'FloatingSide',
  'FloatingAlign',
  'DateRange',
  'WritingDirection',
  'DateAdapter',
  'TimeCapableDateAdapter',
  'SegmentType',
  'FieldGranularity',
]);

if (!existsSync(TYPES_DIR)) {
  console.error(
    `[check-entrypoint-public-types] ${TYPES_DIR} not found — run \`pnpm build\` first.`,
  );
  process.exit(1);
}

function sourceName(element) {
  return (element.propertyName ?? element.name).text;
}

function moduleSpecifierText(node) {
  return node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
    ? node.moduleSpecifier.text
    : null;
}

function isNonPublicMember(node) {
  return (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ProtectedKeyword || m.kind === ts.SyntaxKind.PrivateKeyword,
  );
}

function analyze(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);

  const namedLocalToSource = new Map();
  const namespaceLocals = new Set();
  const reexported = new Set();
  let reexportsAll = false;

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt) && moduleSpecifierText(stmt) === CORE_SPECIFIER) {
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        namespaceLocals.add(bindings.name.text);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) namedLocalToSource.set(el.name.text, sourceName(el));
      }
    } else if (ts.isExportDeclaration(stmt) && moduleSpecifierText(stmt) === CORE_SPECIFIER) {
      if (!stmt.exportClause) reexportsAll = true;
      else if (ts.isNamedExports(stmt.exportClause)) {
        for (const el of stmt.exportClause.elements) reexported.add(sourceName(el));
      }
    }
  }

  if (reexportsAll || (namedLocalToSource.size === 0 && namespaceLocals.size === 0)) return [];

  const used = new Set();

  function recordIdentifier(name) {
    const src = namedLocalToSource.get(name);
    if (src) used.add(src);
  }

  function recordEntity(entity) {
    if (ts.isQualifiedName(entity)) {
      if (ts.isIdentifier(entity.left) && namespaceLocals.has(entity.left.text)) {
        used.add(entity.right.text);
      }
    } else if (ts.isIdentifier(entity)) {
      recordIdentifier(entity.text);
    }
  }

  function recordHeritageExpression(expr) {
    if (ts.isPropertyAccessExpression(expr)) {
      if (ts.isIdentifier(expr.expression) && namespaceLocals.has(expr.expression.text)) {
        used.add(expr.name.text);
      }
    } else if (ts.isIdentifier(expr)) {
      recordIdentifier(expr.text);
    }
  }

  function visit(node) {
    if (ts.isTypeReferenceNode(node)) {
      recordEntity(node.typeName);
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isTypeQueryNode(node)) {
      recordEntity(node.exprName);
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      node.typeParameters?.forEach(visit);
      for (const clause of node.heritageClauses ?? []) {
        for (const type of clause.types) {
          if (clause.token === ts.SyntaxKind.ImplementsKeyword)
            recordHeritageExpression(type.expression);
          type.typeArguments?.forEach(visit);
        }
      }
      for (const member of node.members) {
        if (isNonPublicMember(member)) continue;
        visit(member);
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(sf);

  return [...used].filter((name) => CONTRACT_TYPES.has(name) && !reexported.has(name)).sort();
}

const failures = [];
let checked = 0;

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts') || IGNORED_FILES.has(file)) continue;
  checked++;
  const missing = analyze(file, readFileSync(join(TYPES_DIR, file), 'utf8'));
  if (missing.length) {
    const entry = file.replace(/^forty-cdk-/, '').replace(/\.d\.ts$/, '');
    failures.push({ entry, missing });
  }
}

if (failures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${failures.length} entry point(s) reference core-declared contract types in their public API without re-exporting them:`,
  );
  for (const { entry, missing } of failures.sort((a, b) => a.entry.localeCompare(b.entry))) {
    console.error(`  forty-cdk/${entry}: ${missing.join(', ')}`);
  }
  console.error(
    `\nRe-export each from the entry's barrel, e.g. \`export type { VetoableEvent } from 'forty-cdk/core';\`.`,
  );
  process.exit(1);
}

console.log(
  `[check-entrypoint-public-types] OK — ${checked} entry points; every core-declared contract type in a public signature is re-exported from its own barrel.`,
);
