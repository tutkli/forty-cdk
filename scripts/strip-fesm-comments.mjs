import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

/**
 * Strips the source JSDoc out of the FESM bundles ng-packagr emits into
 * `dist/forty-cdk/fesm2022/` ([#1733]). Library source is ~38% comments by
 * non-blank line and the emit carries every one of them into the `.mjs`
 * verbatim, where nothing reads them: a consumer's bundler parses them, a
 * consumer's `ng serve` ships them unminified to the browser, and every
 * install and CI cache holds them. The `.d.ts` are deliberately untouched —
 * their JSDoc *is* the consumer-facing documentation, and `stripInternal`
 * already removes the part that should not ship.
 *
 * This runs as a post-build step rather than as `removeComments` on
 * `tsconfig.lib.prod.json`, because that option cannot reach the emit.
 * ng-packagr pins `removeComments: false` in the mandatory `extraOptions` it
 * hands `readConfiguration` (`ng-packagr/src/lib/ts/tsconfig.js`), and
 * TypeScript's `extend(existingOptions, parsedConfig.options)` copies the
 * *existing* options last — so the injected value wins over the project's
 * tsconfig and the flag is inert wherever it is written.
 *
 * ng-packagr pins it for a reason worth keeping: TypeScript's own comment
 * removal is indiscriminate and takes the annotations a bundler reads with it.
 * So this strips by splicing the original text rather than by re-printing it,
 * and two properties fall out of that choice:
 *
 * - **Annotations survive.** A comment carrying `@__PURE__`,
 *   `@__NO_SIDE_EFFECTS__`, a legal notice, or the `sourceMappingURL` pointer
 *   is left in place. The library emits none of the first kind today; the
 *   check exists so that the day one appears it is not silently dropped.
 * - **The emitted `.mjs.map` stay valid.** Each stripped comment is replaced by
 *   the newlines it contained, so every line of code keeps its line number, and
 *   a comment with code after it on the same line is skipped so no column moves
 *   either. Sourcemap segments address generated code by line and column and
 *   comments generate no segments, so nothing they point at has moved.
 *
 * The splice is verified rather than trusted: each file is re-parsed before and
 * after and printed through a comment-free printer, and the two prints must be
 * identical. That compares the code the strip left behind against the code it
 * started from, which is the one thing a text splice can get wrong. A bundle
 * whose walk found no comment at all fails too, because the step is idempotent
 * — a second run legitimately removes nothing — and "removed nothing" would
 * otherwise be indistinguishable from "stopped finding anything". Every bundle
 * ends with a `sourceMappingURL` pointer, so one kept comment is the floor.
 */

const FESM_DIR = join(repoRoot, 'dist', 'forty-cdk', 'fesm2022');

/** Comments a bundler, a minifier or a debugger reads. Never stripped. */
const LOAD_BEARING =
  /@__PURE__|#__PURE__|@__NO_SIDE_EFFECTS__|#__NO_SIDE_EFFECTS__|@license|@preserve|sourceMappingURL/;

const PRINTER = ts.createPrinter({ removeComments: true });

/** Parses one FESM as a script, with no program and no type resolution. */
function parse(text, setParentNodes) {
  return ts.createSourceFile(
    'fesm.mjs',
    text,
    ts.ScriptTarget.ESNext,
    setParentNodes,
    ts.ScriptKind.JS,
  );
}

/**
 * Every comment in the file, in source order. Comments are trivia in front of
 * some token — the end-of-file one included — so walking the parsed token tree
 * and asking for each token's leading trivia reaches all of them, without the
 * regex-versus-division ambiguity a raw scan over the text would hit.
 */
function collectComments(text) {
  const source = parse(text, true);
  const byPosition = new Map();

  const visit = (node) => {
    for (const range of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
      byPosition.set(range.pos, range);
    }
    for (const child of node.getChildren(source)) visit(child);
  };

  visit(source);
  return [...byPosition.values()].sort((a, b) => a.pos - b.pos);
}

/** The offset of the start of the line `position` sits on. */
function lineStartOf(text, position) {
  let start = position;
  while (start > 0 && text[start - 1] !== '\n') start--;
  return start;
}

/** Whether everything between the comment's end and the line break is blank. */
function endsItsLine(text, end) {
  let cursor = end;
  while (cursor < text.length && (text[cursor] === ' ' || text[cursor] === '\t')) cursor++;
  if (cursor < text.length && text[cursor] === '\r') cursor++;
  return cursor >= text.length || text[cursor] === '\n';
}

function strip(text) {
  let out = '';
  let cursor = 0;
  let stripped = 0;
  let kept = 0;

  for (const range of collectComments(text)) {
    const body = text.slice(range.pos, range.end);

    if (LOAD_BEARING.test(body)) {
      kept++;
      continue;
    }
    if (!endsItsLine(text, range.end)) {
      kept++;
      continue;
    }

    const lineStart = lineStartOf(text, range.pos);
    const indentOnly = text.slice(lineStart, range.pos).trim() === '';
    const start = Math.max(indentOnly ? lineStart : range.pos, cursor);

    out += text.slice(cursor, start) + '\n'.repeat(body.split('\n').length - 1);
    cursor = range.end;
    stripped++;
  }

  return { text: out + text.slice(cursor), stripped, kept };
}

if (!existsSync(FESM_DIR)) {
  console.error(`[strip-fesm-comments] ${FESM_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const bundles = readdirSync(FESM_DIR)
  .filter((file) => file.endsWith('.mjs'))
  .sort();

if (!bundles.length) {
  console.error(
    `[strip-fesm-comments] FAIL — no FESM bundles in ${FESM_DIR}. The step cannot pass vacuously; re-run \`pnpm build\`.`,
  );
  process.exit(1);
}

const failures = [];
let before = 0;
let after = 0;
let stripped = 0;
let kept = 0;

for (const file of bundles) {
  const path = join(FESM_DIR, file);
  const original = readFileSync(path, 'utf8');
  const result = strip(original);

  before += Buffer.byteLength(original);
  after += Buffer.byteLength(result.text);
  stripped += result.stripped;
  kept += result.kept;

  if (!result.kept) {
    failures.push(
      `${file}: the walk found no comment at all, not even the \`sourceMappingURL\` pointer every bundle ends with — so this run proves nothing about ${file}.`,
    );
    continue;
  }

  const originalLines = original.split('\n').length;
  const strippedLines = result.text.split('\n').length;
  if (originalLines !== strippedLines) {
    failures.push(
      `${file}: line count moved ${originalLines} → ${strippedLines}, so ${file}.map no longer addresses this bundle.`,
    );
    continue;
  }

  if (PRINTER.printFile(parse(original, false)) !== PRINTER.printFile(parse(result.text, false))) {
    failures.push(`${file}: the stripped bundle no longer prints as the same code.`);
    continue;
  }

  writeFileSync(path, result.text, 'utf8');
}

if (failures.length) {
  console.error(`[strip-fesm-comments] FAIL — ${failures.length} bundle(s) left unwritten:`);
  for (const failure of failures) console.error(`  ${failure}`);
  console.error(
    `\nThe splice must remove comments and nothing else. Every bundle is compared against its own pre-strip parse, so a report here means a comment range was mis-identified — resolve it rather than narrowing the comparison; \`dist/\` is unchanged for the bundles listed.`,
  );
  process.exit(1);
}

const percent = ((after / before) * 100).toFixed(1);
console.log(
  `[strip-fesm-comments] OK — ${bundles.length} bundles, ${stripped} comments removed and ${kept} load-bearing ones kept; ${(before / 1024 / 1024).toFixed(2)} MB → ${(after / 1024 / 1024).toFixed(2)} MB (${percent}%), every bundle re-parsed to the same code and the same line count.`,
);
