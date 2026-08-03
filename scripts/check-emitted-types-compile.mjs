import { existsSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

/**
 * Typechecks the flattened declaration files ng-packagr emits into
 * `dist/forty-cdk/types/`, as a consumer who verifies their dependencies' types
 * does ([#1630]).
 *
 * `check-entrypoint-public-types.mjs` audits *which* names a public signature
 * hands the consumer; both of its leak branches need the referenced name to
 * resolve to something in the emitted file. A name that resolves to **nothing**
 * falls through both, and `stripInternal` produces exactly that: an
 * `@internal`-tagged declaration is deleted from the `.d.ts` while every
 * signature that referenced it keeps the reference. The compiler's own name
 * resolution is the check for that — no allowlist of built-ins and globals to
 * hand-maintain, and no second implementation to keep in step with the emit.
 *
 * Resolution is the consumer's too: the emitted files import each other by the
 * published specifier (`forty-cdk/core`), which resolves through the package's
 * own `exports` map by Node's self-name rule, so a missing or misrouted export
 * condition fails here as well.
 */

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');

/**
 * The consumer's settings, minus their config file. `skipLibCheck: false` is the
 * whole point — it defaults to `true` in every Angular CLI application, which is
 * why a `.d.ts` that does not compile can ship unnoticed — and `strict` matches
 * what the library builds itself under.
 */
const COMPILER_OPTIONS = {
  noEmit: true,
  skipLibCheck: false,
  strict: true,
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
};

if (!existsSync(TYPES_DIR)) {
  console.error(`[check-emitted-types-compile] ${TYPES_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const rootNames = readdirSync(TYPES_DIR)
  .filter((file) => file.endsWith('.d.ts'))
  .sort()
  .map((file) => join(TYPES_DIR, file));

if (!rootNames.length) {
  console.error(
    `[check-emitted-types-compile] FAIL — no declaration files in ${TYPES_DIR}. The gate cannot pass vacuously; re-run \`pnpm build\`.`,
  );
  process.exit(1);
}

/** Forward-slashed absolute path, so a comparison holds on either platform. */
function normalize(fileName) {
  return fileName.replaceAll('\\', '/');
}

/** Repo-relative, forward-slashed path of a diagnostic's file. */
function displayPath(fileName) {
  return normalize(relative(repoRoot, fileName));
}

/** One diagnostic as `<path>:<line>:<column> TS<code>: <message>`. */
function formatDiagnostic(diagnostic) {
  const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n  ');
  if (!diagnostic.file || diagnostic.start === undefined) {
    return `<compiler> TS${diagnostic.code}: ${message}`;
  }
  const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
  return `${displayPath(diagnostic.file.fileName)}:${line + 1}:${character + 1} TS${diagnostic.code}: ${message}`;
}

const started = process.hrtime.bigint();
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram(rootNames, COMPILER_OPTIONS));
const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;

const emittedFiles = new Set(rootNames.map(normalize));
const emitted = [];
const foreign = [];

for (const diagnostic of diagnostics) {
  const fileName = diagnostic.file?.fileName;
  if (fileName && emittedFiles.has(normalize(fileName))) emitted.push(diagnostic);
  else foreign.push(diagnostic);
}

if (emitted.length) {
  console.error(
    `[check-emitted-types-compile] FAIL — ${emitted.length} diagnostic(s) in the emitted declarations:`,
  );
  for (const diagnostic of emitted) console.error(`  ${formatDiagnostic(diagnostic)}`);
  console.error(
    `\nThe shipped types must compile for a consumer who typechecks them (\`skipLibCheck: false\`). The usual cause is \`@internal\` on something a public signature reaches: \`stripInternal\` deletes the declaration and leaves the reference dangling (an unresolved name), or deletes a member and leaves the class no longer satisfying its \`implements\` clause. A type or member reachable from a public signature is never \`@internal\` — narrow the signature so it stops reaching it, or drop the tag and publish it. See the core tier section in .claude/rules/conventions.md.`,
  );
}

if (foreign.length) {
  console.error(
    `[check-emitted-types-compile] FAIL — ${foreign.length} diagnostic(s) outside the emitted declarations:`,
  );
  for (const diagnostic of foreign) console.error(`  ${formatDiagnostic(diagnostic)}`);
  console.error(
    `\nThese come from a dependency's own declarations or from the compiler options, not from the library's emit — a consumer compiling against forty-cdk with \`skipLibCheck: false\` sees them too. Resolve the peer / dependency version that produces them rather than narrowing this gate.`,
  );
}

if (emitted.length || foreign.length) process.exit(1);

console.log(
  `[check-emitted-types-compile] OK — ${rootNames.length} emitted declaration files typecheck under strict + skipLibCheck:false, resolving each other through the published exports map (${elapsedSeconds.toFixed(1)}s).`,
);
