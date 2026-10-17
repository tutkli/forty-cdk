import ts from 'typescript';

const CLASS_METADATA_CALL = 'ɵɵngDeclareClassMetadata';

const DECLARATIONS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.ExportDeclaration,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.ImportDeclaration,
  ts.SyntaxKind.VariableStatement,
]);

function calleeName(expression) {
  if (!ts.isCallExpression(expression)) return null;
  const callee = expression.expression;
  if (ts.isIdentifier(callee)) return callee.text;
  if (ts.isPropertyAccessExpression(callee)) return callee.name.text;
  return null;
}

function isAllowed(statement) {
  if (DECLARATIONS.has(statement.kind)) return true;
  return (
    ts.isExpressionStatement(statement) && calleeName(statement.expression) === CLASS_METADATA_CALL
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
    .filter((statement) => !isAllowed(statement))
    .map((statement) => ({
      line: file.getLineAndCharacterOfPosition(statement.getStart(file)).line + 1,
      text: statement.getText(file).split('\n')[0],
    }));
}
