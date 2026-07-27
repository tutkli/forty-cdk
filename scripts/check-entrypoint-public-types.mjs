import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { BLESSED_CORE_SYMBOLS } from './lib/core-blessed-tier.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const CORE_BARREL = join(repoRoot, 'projects', 'forty-cdk', 'core', 'src', 'public-api.ts');
const CORE_SPECIFIER = 'forty-cdk/core';
const IGNORED_FILES = new Set(['forty-cdk.d.ts', 'forty-cdk-core.d.ts']);

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

function coreBarrelExportNames() {
  const sf = ts.createSourceFile(
    CORE_BARREL,
    readFileSync(CORE_BARREL, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const names = new Set();
  for (const stmt of sf.statements) {
    if (!ts.isExportDeclaration(stmt) || !stmt.exportClause) continue;
    if (!ts.isNamedExports(stmt.exportClause)) continue;
    for (const el of stmt.exportClause.elements) names.add(el.name.text);
  }
  return names;
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

  const unblessedReexport = [...reexported]
    .filter((name) => !BLESSED_CORE_SYMBOLS.has(name))
    .sort();

  if (namedLocalToSource.size === 0 && namespaceLocals.size === 0) {
    return { unblessed: unblessedReexport, missingReexport: [] };
  }

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

  const names = [...used].sort();
  const unblessedSignature = names.filter((name) => !BLESSED_CORE_SYMBOLS.has(name));
  return {
    unblessed: [...new Set([...unblessedSignature, ...unblessedReexport])].sort(),
    missingReexport: reexportsAll ? [] : names.filter((name) => !reexported.has(name)),
  };
}

const coreExports = coreBarrelExportNames();
const staleBlessed = [...BLESSED_CORE_SYMBOLS].filter((name) => !coreExports.has(name)).sort();

if (staleBlessed.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${staleBlessed.length} blessed symbol(s) in scripts/lib/core-blessed-tier.mjs are no longer exported from forty-cdk/core:`,
  );
  for (const name of staleBlessed) console.error(`  ${name}`);
  console.error(
    `\nA blessed symbol carries the library's semver guarantee. Restore the export, or remove it from the blessed tier deliberately (see the core tier section in .claude/rules/conventions.md).`,
  );
  process.exit(1);
}

const failures = [];
let checked = 0;

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts') || IGNORED_FILES.has(file)) continue;
  checked++;
  const { unblessed, missingReexport } = analyze(file, readFileSync(join(TYPES_DIR, file), 'utf8'));
  if (unblessed.length || missingReexport.length) {
    const entry = file.replace(/^forty-cdk-/, '').replace(/\.d\.ts$/, '');
    failures.push({ entry, unblessed, missingReexport });
  }
}

const unblessedFailures = failures.filter((f) => f.unblessed.length);
const reexportFailures = failures.filter((f) => f.missingReexport.length);

if (unblessedFailures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${unblessedFailures.length} entry point(s) publish an internal-tier core symbol (in a public signature, or as a barrel re-export):`,
  );
  for (const { entry, unblessed } of unblessedFailures.sort((a, b) =>
    a.entry.localeCompare(b.entry),
  )) {
    console.error(`  forty-cdk/${entry}: ${unblessed.join(', ')}`);
  }
  console.error(
    `\nEither narrow the leak (drop the re-export or the member, make it protected, or retype it to a local shape), or bless the symbol deliberately by adding it to scripts/lib/core-blessed-tier.mjs — which commits the library to its semver stability. See the core tier section in .claude/rules/conventions.md.`,
  );
}

if (reexportFailures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${reexportFailures.length} entry point(s) reference blessed core types in their public API without re-exporting them:`,
  );
  for (const { entry, missingReexport } of reexportFailures.sort((a, b) =>
    a.entry.localeCompare(b.entry),
  )) {
    console.error(`  forty-cdk/${entry}: ${missingReexport.join(', ')}`);
  }
  console.error(
    `\nRe-export each from the entry's barrel, e.g. \`export type { VetoableEvent } from 'forty-cdk/core';\`.`,
  );
}

if (failures.length) process.exit(1);

console.log(
  `[check-entrypoint-public-types] OK — ${checked} entry points; ${BLESSED_CORE_SYMBOLS.size} blessed core symbols, every one exported from forty-cdk/core; no internal-tier symbol in a public signature or barrel re-export; every blessed type in a public signature re-exported from its own barrel.`,
);
