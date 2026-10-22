import ts from 'typescript';

import { BLESSED_CORE_SYMBOLS } from './core-blessed-tier.mjs';

export const CORE_SPECIFIERS = new Set([
  'forty-cdk/core',
  'forty-cdk/core-overlay',
  'forty-cdk/core-anchored',
]);

function sourceName(element) {
  return (element.propertyName ?? element.name).text;
}

function moduleSpecifierText(node) {
  return node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)
    ? node.moduleSpecifier.text
    : null;
}

function isExported(node) {
  return (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function isNonPublicMember(node) {
  return (ts.getModifiers(node) ?? []).some(
    (m) => m.kind === ts.SyntaxKind.ProtectedKeyword || m.kind === ts.SyntaxKind.PrivateKeyword,
  );
}

/**
 * The names a top-level declaration of a flattened `.d.ts` introduces, each
 * paired with the node carrying its signature.
 */
export function declaredNames(stmt) {
  if (
    ts.isInterfaceDeclaration(stmt) ||
    ts.isTypeAliasDeclaration(stmt) ||
    ts.isClassDeclaration(stmt) ||
    ts.isEnumDeclaration(stmt) ||
    ts.isFunctionDeclaration(stmt)
  ) {
    return stmt.name ? [{ name: stmt.name.text, node: stmt }] : [];
  }
  if (ts.isVariableStatement(stmt)) {
    return stmt.declarationList.declarations
      .filter((declaration) => ts.isIdentifier(declaration.name))
      .map((declaration) => ({ name: declaration.name.text, node: declaration }));
  }
  return [];
}

/**
 * The public-signature traversal both leak checks share: type references, type
 * queries, `implements` bases and every clause's type arguments, skipping
 * `extends`-only bases and `protected` / `private` members.
 */
function createVisitor(onTypeEntity, onHeritageExpression) {
  return function visit(node) {
    if (ts.isTypeReferenceNode(node)) {
      onTypeEntity(node.typeName);
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isTypeQueryNode(node)) {
      onTypeEntity(node.exprName);
      node.typeArguments?.forEach(visit);
      return;
    }
    if (ts.isClassDeclaration(node) || ts.isInterfaceDeclaration(node)) {
      node.typeParameters?.forEach(visit);
      for (const clause of node.heritageClauses ?? []) {
        for (const type of clause.types) {
          if (clause.token === ts.SyntaxKind.ImplementsKeyword)
            onHeritageExpression(type.expression);
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
  };
}

export function analyze(fileName, text) {
  const sf = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, true);

  const namedLocalToSource = new Map();
  const namespaceLocals = new Set();
  const reexported = new Set();
  const barrelExports = new Set();
  const localDeclarations = new Map();
  let reexportsAll = false;

  for (const stmt of sf.statements) {
    if (ts.isImportDeclaration(stmt)) {
      if (!CORE_SPECIFIERS.has(moduleSpecifierText(stmt))) continue;
      const bindings = stmt.importClause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        namespaceLocals.add(bindings.name.text);
      } else if (bindings && ts.isNamedImports(bindings)) {
        for (const el of bindings.elements) namedLocalToSource.set(el.name.text, sourceName(el));
      }
      continue;
    }
    if (ts.isExportDeclaration(stmt)) {
      if (CORE_SPECIFIERS.has(moduleSpecifierText(stmt))) {
        if (!stmt.exportClause) reexportsAll = true;
        else if (ts.isNamedExports(stmt.exportClause)) {
          for (const el of stmt.exportClause.elements) reexported.add(sourceName(el));
        }
      } else if (
        !stmt.moduleSpecifier &&
        stmt.exportClause &&
        ts.isNamedExports(stmt.exportClause)
      ) {
        for (const el of stmt.exportClause.elements) {
          const imported = namedLocalToSource.get(sourceName(el));
          if (imported) reexported.add(imported);
          else barrelExports.add(sourceName(el));
        }
      }
      continue;
    }
    for (const { name, node } of declaredNames(stmt)) {
      const declarations = localDeclarations.get(name) ?? [];
      declarations.push(node);
      localDeclarations.set(name, declarations);
      if (isExported(stmt)) barrelExports.add(name);
    }
  }

  const used = new Set();
  const leaked = new Set();
  const reached = new Set();
  const pending = [];

  function reach(name) {
    if (!localDeclarations.has(name) || reached.has(name)) return;
    reached.add(name);
    pending.push(name);
    if (!barrelExports.has(name)) leaked.add(name);
  }

  function recordIdentifier(name) {
    const src = namedLocalToSource.get(name);
    if (src) used.add(src);
    else reach(name);
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

  const visit = createVisitor(recordEntity, recordHeritageExpression);
  for (const name of barrelExports) {
    if (localDeclarations.has(name)) {
      reached.add(name);
      pending.push(name);
    }
  }
  while (pending.length) localDeclarations.get(pending.shift()).forEach(visit);

  const unblessedSignature = [...used].sort().filter((name) => !BLESSED_CORE_SYMBOLS.has(name));
  const unblessedReexport = [...reexported]
    .filter((name) => !BLESSED_CORE_SYMBOLS.has(name))
    .sort();

  return {
    unblessed: [...new Set([...unblessedSignature, ...unblessedReexport])].sort(),
    reexported,
    reexportsAll,
    leaked: [...leaked].sort(),
  };
}
