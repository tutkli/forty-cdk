import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

/**
 * Reports how much of the library's source is comment, partitioned into the
 * buckets the source-comment policy in `.claude/rules/conventions.md` treats
 * differently — which is where the reasoning for the partition, and for the
 * withdrawn flat target, lives ([#1737]).
 *
 * Three properties of the measurement are the script's own, and each one bounds
 * what a reported figure means:
 *
 * - **The classification is syntactic, and generous to "public".** A JSDoc
 *   block counts as public when it leads an exported declaration or a
 *   non-private member of one. It does not resolve the entry-point barrels, so
 *   a symbol exported from its file but not re-exported from `public-api.ts`
 *   counts as public too. Narrowing that would need the whole program.
 * - **A marker's run of line comments is one bucket.** The comments a
 *   `@sanctioned-*` marker opens are counted apart from plain ones, so a wave
 *   that drove the plain count down by deleting markers would report progress
 *   for removing the library's carve-out ledger rather than earn it. The whole
 *   adjacent run counts with the marker, since a wrapped `<why>` is one
 *   sentence.
 * - **A vacuous run is refused.** A walk that finds no source, no public JSDoc
 *   or no marker has stopped resolving rather than found an improvement, and
 *   nothing else would report that: this is a measurement, never a gate, so no
 *   CI job fails the day the classification silently stops matching.
 */

const LIBRARY_ROOT = join(repoRoot, 'projects', 'forty-cdk');

const SKIPPED_DIRECTORIES = new Set(['node_modules', 'dist']);

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

const MEMBER_OWNERS = new Set([
  ts.SyntaxKind.ClassDeclaration,
  ts.SyntaxKind.EnumDeclaration,
  ts.SyntaxKind.InterfaceDeclaration,
  ts.SyntaxKind.TypeLiteral,
]);

/** Every `.ts` file under the library that is not a spec, in walk order. */
function librarySources(directory, found = []) {
  for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
    a.name < b.name ? -1 : 1,
  )) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) librarySources(path, found);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      found.push(path);
    }
  }
  return found;
}

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
function classifiedComments(text) {
  const source = ts.createSourceFile('source.ts', text, ts.ScriptTarget.ESNext, true);
  const byPosition = new Map();

  const visit = (node) => {
    for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
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

function measure(text) {
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

const requestedTop = process.argv.indexOf('--top');
const topCount = requestedTop === -1 ? 15 : Number(process.argv[requestedTop + 1]);

if (!Number.isInteger(topCount) || topCount < 0) {
  console.error('[measure-comment-density] --top takes a non-negative integer.');
  process.exit(1);
}

const files = librarySources(LIBRARY_ROOT);
const totals = { publicJsdoc: 0, internalJsdoc: 0, marker: 0, plain: 0 };
const perFile = [];
let nonBlank = 0;
let markers = 0;

for (const file of files) {
  const measured = measure(readFileSync(file, 'utf8'));
  nonBlank += measured.nonBlank;
  markers += measured.markers;
  for (const bucket of Object.keys(totals)) totals[bucket] += measured.buckets[bucket];
  perFile.push({ file: relative(repoRoot, file).split(sep).join('/'), ...measured });
}

const governed = totals.internalJsdoc + totals.plain;
const comments = governed + totals.publicJsdoc + totals.marker;

if (!files.length || !nonBlank) {
  console.error(
    `[measure-comment-density] FAIL — no library source under ${LIBRARY_ROOT}. The walk found nothing to measure, which is not a density of zero.`,
  );
  process.exit(1);
}

if (!totals.publicJsdoc || !markers) {
  console.error(
    `[measure-comment-density] FAIL — ${files.length} files scanned, ${totals.publicJsdoc} public JSDoc lines and ${markers} sanctioned markers found. Both are non-zero in any state this library can be in, so a zero means the classification stopped resolving rather than the comments went away.`,
  );
  process.exit(1);
}

const count = (value) => value.toLocaleString('en-US').padStart(7);
const share = (value) => `${((value / nonBlank) * 100).toFixed(1)}%`.padStart(6);

console.log(
  `[measure-comment-density] projects/forty-cdk/**/*.ts, specs excluded — ${files.length} files, ${nonBlank.toLocaleString('en-US')} non-blank lines.\n`,
);
console.log(`  comment lines        ${count(comments)}  ${share(comments)}`);
console.log(
  `    public JSDoc       ${count(totals.publicJsdoc)}  ${share(totals.publicJsdoc)}   mandatory — the consumer's IntelliSense`,
);
console.log(
  `    internal JSDoc     ${count(totals.internalJsdoc)}  ${share(totals.internalJsdoc)}`,
);
console.log(`    plain comments     ${count(totals.plain)}  ${share(totals.plain)}`);
console.log(
  `    sanctioned markers ${count(totals.marker)}  ${share(totals.marker)}   ${markers} markers — the policy's exception`,
);
console.log(
  `  code lines           ${count(nonBlank - comments)}  ${share(nonBlank - comments)}\n`,
);
console.log(
  `  governed by the policy: ${governed.toLocaleString('en-US')} lines, ${share(governed).trim()} of non-blank.`,
);
console.log(
  `  floor with every governed line gone: ${(((comments - governed) / (nonBlank - governed)) * 100).toFixed(1)}%.`,
);

if (topCount) {
  console.log(`\n  Widest governed blocks — where a wave pays off first:`);
  for (const entry of perFile
    .filter((entry) => entry.buckets.internalJsdoc + entry.buckets.plain > 0)
    .sort(
      (a, b) =>
        b.buckets.internalJsdoc + b.buckets.plain - (a.buckets.internalJsdoc + a.buckets.plain) ||
        (a.file < b.file ? -1 : 1),
    )
    .slice(0, topCount)) {
    const governedLines = entry.buckets.internalJsdoc + entry.buckets.plain;
    console.log(
      `    ${String(governedLines).padStart(4)} of ${String(entry.nonBlank).padStart(4)}  ${entry.file}`,
    );
  }
}
