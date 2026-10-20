import ts from 'typescript';

const RAW_ROOT_INJECTABLE = /@Injectable\(\s*\{[^}]*?\bprovidedIn:\s*['"]root['"]/g;

const TOKEN_DEF =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\/\*[^*]*\*\/\s*)?new InjectionToken\b/g;

const RAW_TOKEN = /\bnew InjectionToken\b/g;

function isRootInjectable(decorator) {
  const call = decorator.expression;
  if (!ts.isCallExpression(call) || !ts.isIdentifier(call.expression)) return false;
  if (call.expression.text !== 'Injectable') return false;
  const [options] = call.arguments;
  if (!options || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some(
    (property) =>
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === 'providedIn' &&
      ts.isStringLiteral(property.initializer) &&
      property.initializer.text === 'root',
  );
}

export function rootSingletonClasses(source, fileName = 'source.ts') {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
  const names = [];
  (function visit(node) {
    if (
      ts.isClassDeclaration(node) &&
      node.name &&
      (ts.getDecorators(node) ?? []).some(isRootInjectable)
    ) {
      names.push(node.name.text);
    }
    ts.forEachChild(node, visit);
  })(sf);
  return names;
}

export function rawRootInjectableCount(source) {
  return [...source.matchAll(RAW_ROOT_INJECTABLE)].length;
}

export function tokenDefinitions(bundle) {
  return [...bundle.matchAll(TOKEN_DEF)].map((match) => match[1]);
}

export function rawTokenCount(bundle) {
  return [...bundle.matchAll(RAW_TOKEN)].length;
}
