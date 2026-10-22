import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { indexEmittedContexts, isExported, readEmittedFiles } from './lib/emitted-contexts.mjs';
import { REGISTRATION_SURFACES } from './lib/registration-surfaces.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const PROJECT_DIR = join(repoRoot, 'projects', 'forty-cdk');
const INTERNAL_TIER_ENTRIES = new Set(['core', 'core-overlay', 'core-anchored']);

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

function declarationNames(stmt) {
  if (ts.isVariableStatement(stmt)) {
    return stmt.declarationList.declarations
      .map((declaration) => declaration.name)
      .filter((name) => ts.isIdentifier(name))
      .map((name) => name.text);
  }
  return stmt.name && ts.isIdentifier(stmt.name) ? [stmt.name.text] : [];
}

/**
 * Collects, for one built entry-point `.d.ts`, the names re-exported from it and
 * the names referenced from the type positions of its exported declarations.
 */
function analyze(sf) {
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
    if (
      !exportedStatements.includes(stmt) &&
      declarationNames(stmt).some((name) => reExported.has(name))
    ) {
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

function isRegistrationSurface(stmt) {
  const name = stmt.name.text;
  if (name.endsWith('PieceContext') || name.endsWith('RegistrationContext')) {
    return true;
  }
  if (!name.endsWith('Context') || name.startsWith('For')) {
    return false;
  }
  return (stmt.heritageClauses ?? []).some((clause) =>
    clause.types.some(
      (type) => ts.isIdentifier(type.expression) && /^For\w*Context$/.test(type.expression.text),
    ),
  );
}

function deriveSurfaces(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);
  return sf.statements
    .filter((stmt) => ts.isInterfaceDeclaration(stmt) && isRegistrationSurface(stmt))
    .map((stmt) => stmt.name.text);
}

const PROBE_EMIT = `interface ProbeContext {
  registerProbe(el: HTMLElement): void;
}
interface ProbeHandle {
}
declare const FOR_PROBE_CONTEXT: InjectionToken<ProbeContext>, PROBE_SEAM: ProbeHandle;
export { FOR_PROBE_CONTEXT, ProbeHandle };
`;
const PROBE_SOURCE = `export interface ForProbeContext {}
export interface ProbeContext extends ForProbeContext {}
interface ProbePieceContext {}
export interface ProbeRegistrationContext<T = unknown> {}
export interface ProbeHandle {}
`;
const PROBE_DERIVED = ['ProbeContext', 'ProbePieceContext', 'ProbeRegistrationContext'];

const probeEmit = analyze(
  ts.createSourceFile('forty-cdk-probe.d.ts', PROBE_EMIT, ts.ScriptTarget.Latest, true),
);
const probeDerived = deriveSurfaces('probe-context.ts', PROBE_SOURCE);
const probeMisses = [
  ...(probeEmit.referenced.has('ProbeContext')
    ? []
    : ['an exported `declare const` typed at the protocol is not walked']),
  ...(probeEmit.referenced.has('ProbeHandle')
    ? []
    : ['the second declarator of an exported `declare const` is not walked']),
  ...(probeEmit.reExported.has('ProbeHandle')
    ? []
    : ['a name in the `export { … }` clause is not seen as re-exported']),
  ...(probeDerived.join() === PROBE_DERIVED.join()
    ? []
    : [
        `the source scan derived [${probeDerived.join(', ')}] instead of [${PROBE_DERIVED.join(', ')}]`,
      ]),
];
if (probeMisses.length) {
  console.error(
    `[check-registration-surfaces] FAIL — the liveness probe was not rejected the way it must be, so this run proves nothing about the emit:`,
  );
  for (const miss of probeMisses) {
    console.error(`  ${miss}`);
  }
  console.error(
    `\nThe probe is a synthetic emit exporting a token typed at an internal interface, and a synthetic source declaring one surface of each derived shape. Restore the detection rather than the probe.`,
  );
  process.exit(1);
}

const emitted = new Map(
  indexEmittedContexts(readEmittedFiles(TYPES_DIR)).files.map((f) => [f.entry, f]),
);
const failures = [];
let checkedSymbols = 0;

for (const [entry, symbols] of Object.entries(REGISTRATION_SURFACES)) {
  const emittedFile = emitted.get(entry);
  if (!emittedFile) {
    failures.push(
      `forty-cdk/${entry}: forty-cdk-${entry}.d.ts not emitted — is the entry point still there?`,
    );
    continue;
  }
  const { reExported, referenced } = analyze(emittedFile.sf);

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

let derivedSurfaces = 0;
for (const entry of readdirSync(PROJECT_DIR).sort()) {
  if (
    INTERNAL_TIER_ENTRIES.has(entry) ||
    !existsSync(join(PROJECT_DIR, entry, 'ng-package.json'))
  ) {
    continue;
  }
  const listed = new Set(REGISTRATION_SURFACES[entry] ?? []);
  for (const file of sourceFilesOf(entry)) {
    for (const name of deriveSurfaces(file, readFileSync(file, 'utf8'))) {
      derivedSurfaces++;
      if (!listed.has(name)) {
        failures.push(
          `forty-cdk/${entry}: ${name} is a piece-coordination interface declared in ` +
            `${entry}/src but missing from scripts/lib/registration-surfaces.mjs — list it so the ` +
            `gate keeps it out of the public types.`,
        );
      }
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
    `${Object.keys(REGISTRATION_SURFACES).length} entry points stay out of the public types, ` +
    `and all ${derivedSurfaces} piece-coordination interfaces declared in source are listed.`,
);
