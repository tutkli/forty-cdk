import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { CONTEXT_SURFACE_CEILING, CONTEXT_SURFACE_EXCEPTIONS } from './lib/context-surfaces.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-context-surfaces] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

function isExported(node) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

/** Every interface declared anywhere in the emit, so a heritage clause resolves across files. */
const declarations = new Map();
/** The interfaces a consumer can actually name, mapped to the entry point publishing them. */
const published = new Map();

for (const file of readdirSync(TYPES_DIR)) {
  if (!file.endsWith('.d.ts')) {
    continue;
  }
  const sf = ts.createSourceFile(
    file,
    readFileSync(join(TYPES_DIR, file), 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );

  const reExported = new Set();
  for (const stmt of sf.statements) {
    if (
      ts.isExportDeclaration(stmt) &&
      !stmt.moduleSpecifier &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const el of stmt.exportClause.elements) {
        reExported.add(el.name.text);
      }
    }
  }

  const entry =
    file === 'forty-cdk.d.ts' ? 'forty-cdk' : file.slice('forty-cdk-'.length, -'.d.ts'.length);
  for (const stmt of sf.statements) {
    if (!ts.isInterfaceDeclaration(stmt)) {
      continue;
    }
    const name = stmt.name.text;
    if (!declarations.has(name)) {
      declarations.set(name, stmt);
    }
    if ((isExported(stmt) || reExported.has(name)) && !published.has(name)) {
      published.set(name, entry);
    }
  }
}

/**
 * The members a consumer sees on `name`: its own plus everything it inherits.
 * A base declared in another entry point's emit counts the same — the consumer
 * reads one flattened surface off the token either way.
 */
function surfaceOf(name, seen = new Set()) {
  if (seen.has(name)) {
    return new Set();
  }
  seen.add(name);
  const stmt = declarations.get(name);
  if (!stmt) {
    return new Set();
  }
  const members = new Set();
  for (const clause of stmt.heritageClauses ?? []) {
    for (const type of clause.types) {
      if (ts.isIdentifier(type.expression)) {
        for (const inherited of surfaceOf(type.expression.text, seen)) {
          members.add(inherited);
        }
      }
    }
  }
  for (const member of stmt.members) {
    if (member.name && ts.isIdentifier(member.name)) {
      members.add(member.name.text);
    }
  }
  return members;
}

const measured = [];
for (const [name, entry] of published) {
  if (!/^For.*Context$/.test(name)) {
    continue;
  }
  measured.push({ name, entry, size: surfaceOf(name).size });
}
measured.sort((a, b) => b.size - a.size || a.name.localeCompare(b.name));

const failures = [];

for (const { name, entry, size } of measured) {
  const exception = CONTEXT_SURFACE_EXCEPTIONS[name];
  if (size <= CONTEXT_SURFACE_CEILING) {
    if (exception) {
      failures.push(
        `forty-cdk/${entry}: ${name} is listed in CONTEXT_SURFACE_EXCEPTIONS at ${exception.ceiling} ` +
          `but now carries ${size} members, at or under the ${CONTEXT_SURFACE_CEILING}-member ceiling — ` +
          `drop the entry, the exception has rotted.`,
      );
    }
    continue;
  }
  if (!exception) {
    failures.push(
      `forty-cdk/${entry}: ${name} publishes ${size} members, above the ${CONTEXT_SURFACE_CEILING}-member ceiling. ` +
        `Move every member whose only caller is a piece of this primitive to the unexported ` +
        `<Primitive>Context interface (TS-private on the root), or add a justified entry to ` +
        `scripts/lib/context-surfaces.mjs.`,
    );
    continue;
  }
  if (size > exception.ceiling) {
    failures.push(
      `forty-cdk/${entry}: ${name} publishes ${size} members, above its own documented ceiling of ` +
        `${exception.ceiling} — the exception covers a surface that has since grown.`,
    );
  }
}

for (const name of Object.keys(CONTEXT_SURFACE_EXCEPTIONS)) {
  if (!published.has(name)) {
    failures.push(
      `${name} is listed in CONTEXT_SURFACE_EXCEPTIONS but no entry point publishes it — ` +
        `the list has rotted (renamed or unexported?).`,
    );
  }
}

if (failures.length) {
  console.error(`[check-context-surfaces] FAIL — ${failures.length} context-surface violation(s):`);
  for (const failure of failures) {
    console.error(`  ${failure}`);
  }
  console.error(
    `\nA For<X>Context lists only what a consumer reads or invokes. Everything a piece of the same ` +
      `primitive calls belongs on the unexported <X>Context interface, TS-private on the root.`,
  );
  process.exit(1);
}

const listed = Object.keys(CONTEXT_SURFACE_EXCEPTIONS).length;
const widest = measured.find(({ name }) => !CONTEXT_SURFACE_EXCEPTIONS[name]);
const widestNote = widest ? `(widest: ${widest.name} at ${widest.size}), ` : '';
console.log(
  `[check-context-surfaces] OK — ${measured.length - listed} published For*Context interfaces at or ` +
    `under ${CONTEXT_SURFACE_CEILING} members ${widestNote}plus the ` +
    `${listed} pinned at their current size in scripts/lib/context-surfaces.mjs.`,
);
