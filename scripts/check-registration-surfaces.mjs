import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { REGISTRATION_SURFACES } from './lib/registration-surfaces.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const PROJECT_DIR = join(repoRoot, 'projects', 'forty-cdk');

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-registration-surfaces] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function sourceFilesOf(entry) {
  const dir = join(PROJECT_DIR, entry, 'src');
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .map((f) => join(dir, f));
}

/** Whether `symbol` is declared with an `export` modifier in the entry's own source. */
function declaredInSource(entry, symbol) {
  const pattern = new RegExp(
    `^export (?:declare )?(?:interface|type|const|class|function|abstract class) ${symbol}\\b`,
    'm',
  );
  return sourceFilesOf(entry).some((file) => pattern.test(readFileSync(file, 'utf8')));
}

/**
 * Mirrors `check-entrypoint-public-types.mjs`: a `protected` / `private` member
 * is not a public signature — the repo treats narrowing a member's visibility as
 * a valid way to keep a type off the public surface.
 */
function isNonPublicMember(node) {
  return (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ProtectedKeyword || m.kind === ts.SyntaxKind.PrivateKeyword,
  );
}

function isExported(node) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function declarationName(stmt) {
  return stmt.name && ts.isIdentifier(stmt.name) ? stmt.name.text : null;
}

/**
 * Collects, for one built entry-point `.d.ts`, the names re-exported from it and
 * the names referenced from the type positions of its exported declarations.
 */
function analyze(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);

  const reExported = new Set();
  const exportedStatements = [];

  for (const stmt of sf.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.exportClause && ts.isNamedExports(stmt.exportClause)) {
      for (const el of stmt.exportClause.elements) {
        reExported.add((el.propertyName ?? el.name).text);
      }
      continue;
    }
    if (isExported(stmt)) {
      exportedStatements.push(stmt);
    }
  }

  // A declaration listed in an `export { … }` clause is public too, so its own
  // signature is a public signature.
  for (const stmt of sf.statements) {
    const name = declarationName(stmt);
    if (name && reExported.has(name) && !exportedStatements.includes(stmt)) {
      exportedStatements.push(stmt);
    }
  }

  const referenced = new Set();
  const collect = (node) => {
    if (ts.isTypeReferenceNode(node) && ts.isIdentifier(node.typeName)) {
      referenced.add(node.typeName.text);
    }
    if (ts.isExpressionWithTypeArguments(node) && ts.isIdentifier(node.expression)) {
      referenced.add(node.expression.text);
    }
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      node.typeParameters?.forEach(collect);
      for (const clause of node.heritageClauses ?? []) {
        for (const type of clause.types) collect(type);
      }
      for (const member of node.members) {
        if (!isNonPublicMember(member)) collect(member);
      }
      return;
    }
    ts.forEachChild(node, collect);
  };
  for (const stmt of exportedStatements) {
    collect(stmt);
  }

  return { reExported, referenced };
}

const failures = [];
let checkedSymbols = 0;

for (const [entry, symbols] of Object.entries(REGISTRATION_SURFACES)) {
  const typesFile = join(TYPES_DIR, `forty-cdk-${entry}.d.ts`);
  if (!existsSync(typesFile)) {
    failures.push(`forty-cdk/${entry}: ${typesFile} not emitted — is the entry point still there?`);
    continue;
  }
  const { reExported, referenced } = analyze(typesFile, readFileSync(typesFile, 'utf8'));

  for (const symbol of symbols) {
    checkedSymbols++;
    if (!declaredInSource(entry, symbol)) {
      failures.push(
        `forty-cdk/${entry}: ${symbol} is listed as a registration surface but no longer exported ` +
          `from any source file in ${entry}/src — the list has rotted (renamed or deleted?).`,
      );
      continue;
    }
    if (reExported.has(symbol)) {
      failures.push(
        `forty-cdk/${entry}: ${symbol} is re-exported from the entry point's public types — ` +
          `a registration surface must stay unexported.`,
      );
    }
    if (referenced.has(symbol)) {
      failures.push(
        `forty-cdk/${entry}: ${symbol} appears in the signature of an exported declaration — ` +
          `a registration surface must not reach a public signature.`,
      );
    }
  }
}

if (failures.length) {
  console.error(
    `[check-registration-surfaces] FAIL — ${failures.length} registration-surface violation(s):`,
  );
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  console.error(
    `\nKeep the protocol on the unexported registration interface, or move the leaking member ` +
      `to the public read surface deliberately (and drop it from ` +
      `scripts/lib/registration-surfaces.mjs).`,
  );
  process.exit(1);
}

console.log(
  `[check-registration-surfaces] OK — ${checkedSymbols} registration-surface symbols across ` +
    `${Object.keys(REGISTRATION_SURFACES).length} entry points stay out of the public types.`,
);
