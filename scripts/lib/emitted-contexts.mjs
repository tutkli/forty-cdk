import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

export const INTERNAL_TIER_FILES = new Set([
  'forty-cdk-core.d.ts',
  'forty-cdk-core-overlay.d.ts',
  'forty-cdk-core-anchored.d.ts',
]);

export const ROOT_FILE = 'forty-cdk.d.ts';

export function isExported(node) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

export function entryOf(file) {
  return file === ROOT_FILE ? 'forty-cdk' : file.slice('forty-cdk-'.length, -'.d.ts'.length);
}

export function localExportNames(sf) {
  const names = new Set();
  for (const stmt of sf.statements) {
    if (
      ts.isExportDeclaration(stmt) &&
      !stmt.moduleSpecifier &&
      stmt.exportClause &&
      ts.isNamedExports(stmt.exportClause)
    ) {
      for (const el of stmt.exportClause.elements) {
        names.add(el.name.text);
      }
    }
  }
  return names;
}

export function readEmittedFiles(typesDir) {
  return readdirSync(typesDir)
    .filter((file) => file.endsWith('.d.ts'))
    .sort()
    .map((file) => ({ file, text: readFileSync(join(typesDir, file), 'utf8') }));
}

function heritageName(type) {
  const expression = type.expression;
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    return expression.name.text;
  }
  return null;
}

export function memberName(member) {
  return member.name && ts.isIdentifier(member.name) ? member.name.text : null;
}

export function indexEmittedContexts(entries) {
  const files = entries.map(({ file, text }) => {
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    return { file, entry: entryOf(file), sf, exportedNames: localExportNames(sf) };
  });

  const declarations = new Map();
  const published = new Map();
  for (const { file, entry, sf, exportedNames } of files) {
    for (const stmt of sf.statements) {
      if (!ts.isInterfaceDeclaration(stmt)) {
        continue;
      }
      const name = stmt.name.text;
      const declared = declarations.get(name) ?? [];
      declared.push({ file, stmt });
      declarations.set(name, declared);
      if ((isExported(stmt) || exportedNames.has(name)) && !published.has(name)) {
        published.set(name, { entry, file, stmt });
      }
    }
  }

  function declarationsOf(name, file) {
    const declared = declarations.get(name);
    if (!declared) {
      return [];
    }
    const home = declared.some((d) => d.file === file) ? file : declared[0].file;
    return declared.filter((d) => d.file === home);
  }

  function collect(name, file, seen, members) {
    if (seen.has(name)) {
      return;
    }
    seen.add(name);
    const declared = declarationsOf(name, file);
    for (const { file: home, stmt } of declared) {
      for (const clause of stmt.heritageClauses ?? []) {
        for (const type of clause.types) {
          const base = heritageName(type);
          if (base) {
            collect(base, home, seen, members);
          }
        }
      }
    }
    for (const { stmt } of declared) {
      for (const member of stmt.members) {
        const key = memberName(member);
        if (key !== null) {
          members.set(key, { owner: name, member });
        }
      }
    }
  }

  /**
   * The members a consumer sees on `name`: its own plus everything it inherits.
   * A base declared in another entry point's emit counts the same — the consumer
   * reads one flattened surface off the token either way.
   */
  function surfaceOf(name, file = published.get(name)?.file) {
    const members = new Map();
    collect(name, file, new Set(), members);
    return members;
  }

  return { files, published, surfaceOf };
}
