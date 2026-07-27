import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import {
  BLESSED_CORE_SYMBOLS,
  CORE_PUBLISHERS,
  CORE_SYMBOL_PUBLISHER,
  SHARED_ENTRY_POINT,
} from './lib/core-blessed-tier.mjs';
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
    return { unblessed: unblessedReexport, reexported, reexportsAll };
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
    reexported,
    reexportsAll,
  };
}

const assigned = Object.values(CORE_PUBLISHERS).flat();
const duplicatePublishers = [
  ...new Set(assigned.filter((name, index) => assigned.indexOf(name) !== index)),
].sort();

if (duplicatePublishers.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${duplicatePublishers.length} blessed symbol(s) are assigned to more than one publisher in scripts/lib/core-blessed-tier.mjs:`,
  );
  for (const name of duplicatePublishers) console.error(`  ${name}`);
  console.error(
    `\nA blessed symbol has exactly one canonical import path. Keep it under a single entry point.`,
  );
  process.exit(1);
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
const published = new Map();
const starReexports = [];
let checked = 0;

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts') || IGNORED_FILES.has(file)) continue;
  checked++;
  const entry = file.replace(/^forty-cdk-/, '').replace(/\.d\.ts$/, '');
  const { unblessed, reexported, reexportsAll } = analyze(
    file,
    readFileSync(join(TYPES_DIR, file), 'utf8'),
  );
  const owned = CORE_PUBLISHERS[entry] ?? [];
  published.set(entry, reexportsAll ? new Set(owned) : reexported);
  if (reexportsAll) starReexports.push(entry);
  const foreign = [...reexported]
    .filter((name) => BLESSED_CORE_SYMBOLS.has(name) && !owned.includes(name))
    .sort();
  if (unblessed.length || foreign.length) failures.push({ entry, unblessed, foreign });
}

const missingPublishers = Object.entries(CORE_PUBLISHERS)
  .map(([entry, symbols]) => ({
    entry,
    missing: symbols.filter((name) => !published.get(entry)?.has(name)).sort(),
  }))
  .filter(({ missing }) => missing.length);

const unblessedFailures = failures.filter((f) => f.unblessed.length);
const foreignFailures = failures.filter((f) => f.foreign.length);

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

if (foreignFailures.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${foreignFailures.length} entry point(s) re-export a blessed core symbol they do not publish:`,
  );
  for (const { entry, foreign } of foreignFailures.sort((a, b) => a.entry.localeCompare(b.entry))) {
    console.error(
      `  forty-cdk/${entry}: ${foreign.map((name) => `${name} (published by forty-cdk/${CORE_SYMBOL_PUBLISHER.get(name)})`).join(', ')}`,
    );
  }
  console.error(
    `\nA blessed symbol has exactly one canonical import path. Drop the re-export — consumers import it from forty-cdk/${SHARED_ENTRY_POINT} (or the entry point that owns it). See the core tier section in .claude/rules/conventions.md.`,
  );
}

if (starReexports.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${starReexports.length} entry point(s) star-re-export forty-cdk/core:`,
  );
  for (const entry of starReexports.sort()) console.error(`  forty-cdk/${entry}`);
  console.error(
    `\n\`export * from 'forty-cdk/core'\` publishes the whole internal tier and cannot be audited per symbol. Re-export the blessed symbols this entry point publishes by name.`,
  );
}

if (missingPublishers.length) {
  console.error(
    `[check-entrypoint-public-types] FAIL — ${missingPublishers.length} entry point(s) do not re-export every blessed core symbol they publish:`,
  );
  for (const { entry, missing } of missingPublishers) {
    console.error(`  forty-cdk/${entry}: ${missing.join(', ')}`);
  }
  console.error(
    `\nEach blessed symbol must stay reachable from its canonical entry point. Restore the re-export, or move the symbol to another publisher in scripts/lib/core-blessed-tier.mjs.`,
  );
}

if (failures.length || missingPublishers.length || starReexports.length) process.exit(1);

console.log(
  `[check-entrypoint-public-types] OK — ${checked} entry points; ${BLESSED_CORE_SYMBOLS.size} blessed core symbols, every one exported from forty-cdk/core and published by exactly one entry point (${Object.entries(
    CORE_PUBLISHERS,
  )
    .map(([entry, symbols]) => `${entry}: ${symbols.length}`)
    .join(
      ', ',
    )}); no internal-tier symbol in a public signature or barrel re-export, and no duplicate re-export path.`,
);
