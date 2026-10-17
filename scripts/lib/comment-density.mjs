import ts from 'typescript';

const MARKER = /^@sanctioned-/;

const DECLARATIONS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.Constructor,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.EnumMember,
  ts.SyntaxKind.FunctionDeclaration,
  ts.SyntaxKind.GetAccessor,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.MethodDeclaration,
  ts.SyntaxKind.MethodSignature,
  ts.SyntaxKind.PropertyDeclaration,
  ts.SyntaxKind.PropertySignature,
  ts.SyntaxKind.SetAccessor,
  ts.SyntaxKind.TypeAliasDeclaration,
  ts.SyntaxKind.VariableStatement,
]);

const CONTAINERS = new Set([ts.SyntaxKind.SourceFile, ts.SyntaxKind.SyntaxList]);

const MEMBER_OWNERS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeLiteral,
]);

function isExported(node) {
  return !!node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);
}

function isHidden(node) {
  if (node.name?.kind === ts.SyntaxKind.PrivateIdentifier) return true;
  return !!node.modifiers?.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

/** Whether the declaration this JSDoc block leads reaches a consumer's editor. */
function documentsPublicSurface(node) {
  if (!DECLARATIONS.has(node.kind)) return false;
  if (isExported(node)) return true;

  const owner = node.parent;
  if (!owner || !MEMBER_OWNERS.has(owner.kind)) return false;
  if (isHidden(node)) return false;
  if (owner.kind === ts.SyntaxKind.TypeLiteral) return true;

  return isExported(owner);
}

/**
 * Every comment in one file, in source order, each tagged with the bucket its
 * first line puts it in. Comments are trivia in front of a token, so walking
 * the parsed tree and asking each token for its leading and trailing trivia
 * reaches all of them without the regex-versus-division ambiguity a raw text
 * scan hits.
 */
export function classifiedComments(text) {
  const source = ts.createSourceFile('source.ts', text, ts.ScriptTarget.ESNext, true);
  const byPosition = new Map();

  const visit = (node) => {
    const leading = CONTAINERS.has(node.kind) ? [] : ts.getLeadingCommentRanges(text, node.pos);
    for (const range of leading ?? []) {
      const body = text.slice(range.pos, range.end);
      const bucket = body.startsWith('/**')
        ? documentsPublicSurface(node)
          ? 'publicJsdoc'
          : 'internalJsdoc'
        : 'plain';
      if (!byPosition.has(range.pos)) byPosition.set(range.pos, { ...range, bucket });
    }
    for (const range of ts.getTrailingCommentRanges(text, node.end) ?? []) {
      if (!byPosition.has(range.pos)) byPosition.set(range.pos, { ...range, bucket: 'plain' });
    }
    for (const child of node.getChildren(source)) visit(child);
  };
  visit(source);

  return [...byPosition.values()].sort((a, b) => a.pos - b.pos);
}

/**
 * Re-buckets the line comments a marker opens. The lint anchors a marker on the
 * comment lines immediately above an `effect(` / `detectChanges()`, so a run of
 * adjacent line comments whose first one starts with the phrase is one marker,
 * however many lines its `<why>` wraps onto.
 */
function absorbMarkerRuns(comments, text) {
  let run = null;

  for (const comment of comments) {
    const isLine = comment.kind === ts.SyntaxKind.SingleLineCommentTrivia;
    const body = text.slice(comment.pos, comment.end);
    const gap = run ? text.slice(run.end, comment.pos) : '';
    const adjacent = run && gap.trim() === '' && gap.split('\n').length === 2;

    if (isLine && adjacent) {
      comment.bucket = 'marker';
      run = comment;
      continue;
    }
    run = isLine && MARKER.test(body.replace(/^\/\/\s*/, '')) ? comment : null;
    if (run) comment.bucket = 'marker';
  }

  return comments;
}

export function measure(text) {
  const lines = text.split('\n');
  const lineStarts = [0];
  for (let index = 0; index < text.length; index++) {
    if (text[index] === '\n') lineStarts.push(index + 1);
  }

  const inComment = new Uint8Array(text.length);
  const bucketOfLine = new Array(lines.length).fill(null);
  let markers = 0;

  for (const comment of absorbMarkerRuns(classifiedComments(text), text)) {
    for (let index = comment.pos; index < comment.end; index++) inComment[index] = 1;

    let line = 0;
    while (line + 1 < lineStarts.length && lineStarts[line + 1] <= comment.pos) line++;
    let last = line;
    while (last + 1 < lineStarts.length && lineStarts[last + 1] < comment.end) last++;
    for (let index = line; index <= last; index++) {
      bucketOfLine[index] ??= comment.bucket;
    }
    if (
      comment.bucket === 'marker' &&
      MARKER.test(text.slice(comment.pos + 2, comment.end).trim())
    ) {
      markers++;
    }
  }

  const buckets = { publicJsdoc: 0, internalJsdoc: 0, marker: 0, plain: 0 };
  let nonBlank = 0;

  for (let line = 0; line < lines.length; line++) {
    if (lines[line].trim() === '') continue;
    nonBlank++;

    const start = lineStarts[line];
    const end = Math.min(start + lines[line].length, text.length);
    let carriesCode = false;
    for (let index = start; index < end; index++) {
      const character = text[index];
      if (character === ' ' || character === '\t' || character === '\r') continue;
      if (!inComment[index]) {
        carriesCode = true;
        break;
      }
    }
    if (!carriesCode) buckets[bucketOfLine[line] ?? 'plain']++;
  }

  return { nonBlank, markers, buckets };
}
