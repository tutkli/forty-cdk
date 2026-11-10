import ts from 'typescript';

const CLASS_METADATA_CALL = 'ɵɵngDeclareClassMetadata';

const DECLARATIONS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ImportDeclaration,
]);

const LITERALS = new Set([
  ts.SyntaxKind.BigIntLiteral,
  ts.SyntaxKind.FalseKeyword,
  ts.SyntaxKind.NoSubstitutionTemplateLiteral,
  ts.SyntaxKind.NullKeyword,
  ts.SyntaxKind.NumericLiteral,
  ts.SyntaxKind.RegularExpressionLiteral,
  ts.SyntaxKind.StringLiteral,
  ts.SyntaxKind.TrueKeyword,
]);

const EMPTY_COLLECTIONS = new Set(['Map', 'Set', 'WeakMap', 'WeakSet']);

const PURE_PREFIX_OPERATORS = new Set([
  ts.SyntaxKind.ExclamationToken,
  ts.SyntaxKind.MinusToken,
  ts.SyntaxKind.PlusToken,
  ts.SyntaxKind.TildeToken,
]);

const PURE_ANNOTATION = /[@#]__PURE__/;

function calleeName(expression) {
  const callee = expression.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return null;
}

function isPureAnnotatedCall(expression, file) {
  return (
    PURE_ANNOTATION.test(file.text.slice(expression.pos, expression.getStart(file))) &&
    (expression.arguments ?? []).every((argument) => isPure(argument, file))
  );
}

function isSymbolCall(expression) {
  return (
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === 'Symbol' &&
    expression.arguments.every((argument) => LITERALS.has(argument.kind))
  );
}

function isPureMember(member, file) {
  if (ts.isPropertyAssignment(member)) {
    return (
      (!ts.isComputedPropertyName(member.name) || isPure(member.name.expression, file)) &&
      isPure(member.initializer, file)
    );
  }
  return (
    ts.isShorthandPropertyAssignment(member) ||
    ts.isMethodDeclaration(member) ||
    ts.isGetAccessorDeclaration(member) ||
    ts.isSetAccessorDeclaration(member)
  );
}

function isPure(expression, file) {
  if (LITERALS.has(expression.kind) || ts.isIdentifier(expression)) return true;
  if (ts.isParenthesizedExpression(expression)) return isPure(expression.expression, file);
  if (
    ts.isArrowFunction(expression) ||
    ts.isFunctionExpression(expression) ||
    ts.isClassExpression(expression)
  ) {
    return true;
  }
  if (ts.isPrefixUnaryExpression(expression)) {
    return PURE_PREFIX_OPERATORS.has(expression.operator) && isPure(expression.operand, file);
  }
  if (ts.isTemplateExpression(expression)) {
    return expression.templateSpans.every((span) => isPure(span.expression, file));
  }
  if (ts.isArrayLiteralExpression(expression)) {
    return expression.elements.every((element) => isPure(element, file));
  }
  if (ts.isObjectLiteralExpression(expression)) {
    return expression.properties.every((member) => isPureMember(member, file));
  }
  if (ts.isCallExpression(expression)) {
    return isSymbolCall(expression) || isPureAnnotatedCall(expression, file);
  }
  if (ts.isNewExpression(expression)) {
    const name = calleeName(expression);
    if (name === 'InjectionToken') return true;
    if (EMPTY_COLLECTIONS.has(name) && (expression.arguments?.length ?? 0) === 0) return true;
    return isPureAnnotatedCall(expression, file);
  }
  return false;
}

function isPureDeclarationList(statement, file) {
  return statement.declarationList.declarations.every(
    (declaration) => declaration.initializer === undefined || isPure(declaration.initializer, file),
  );
}

function isAllowed(statement, file) {
  if (DECLARATIONS.has(statement.kind)) return true;
  if (ts.isVariableStatement(statement)) return isPureDeclarationList(statement, file);
  return (
    ts.isExpressionStatement(statement) &&
    ts.isCallExpression(statement.expression) &&
    calleeName(statement.expression) === CLASS_METADATA_CALL
  );
}

export function topLevelSideEffects(source, fileName = 'bundle.mjs') {
  const file = ts.createSourceFile(
    fileName,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.JS,
  );
  return file.statements
    .filter((statement) => !isAllowed(statement, file))
    .map((statement) => ({
      line: file.getLineAndCharacterOfPosition(statement.getStart(file)).line + 1,
      text: statement.getText(file).split('\n')[0],
    }));
}
