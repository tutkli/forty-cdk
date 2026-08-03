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

/**
 * A synthetic declaration file compiled alongside the emit, carrying one
 * instance of each shape this gate exists to catch. A green run must report
 * both of its errors, which is what keeps the gate from passing vacuously: the
 * options above are the whole of its detection power, and the one that matters
 * suppresses *every* `.d.ts` when flipped — `skipLibCheck: true` silences the
 * probe and the emit together, leaving a gate that compiles 350 files and can
 * no longer fail. The probe is a module (it exports), so its names stay out of
 * the global scope the emitted files share.
 */
const PROBE_PATH = join(repoRoot, '__emitted-types-liveness-probe.d.ts');
const PROBE_SOURCE = `declare const strippedTypeReference: DeletedByStripInternal;
interface ProbeContract {
    strippedMember(): void;
}
declare class ProbeImplementation implements ProbeContract {
}
export { ProbeImplementation, strippedTypeReference };
export type { ProbeContract };
`;

/** `TS2304` (dangling type reference) and `TS2420` (unsatisfied `implements`). */
const PROBE_EXPECTED_CODES = [2304, 2420];

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

/**
 * Forward-slashed absolute path, lower-cased where the filesystem is
 * case-insensitive, so a comparison holds on either platform however the
 * compiler spelled the name back.
 */
function canonical(fileName) {
  const forwardSlashed = fileName.replaceAll('\\', '/');
  return ts.sys.useCaseSensitiveFileNames ? forwardSlashed : forwardSlashed.toLowerCase();
}

/** Repo-relative, forward-slashed path of a diagnostic's file. */
function displayPath(fileName) {
  return relative(repoRoot, fileName).replaceAll('\\', '/');
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

/** The default host, serving the probe from memory instead of from disk. */
function createHost() {
  const host = ts.createCompilerHost(COMPILER_OPTIONS);
  const canonicalProbe = canonical(PROBE_PATH);
  const isProbe = (fileName) => canonical(fileName) === canonicalProbe;
  const { getSourceFile, fileExists, readFile } = host;

  host.getSourceFile = (fileName, languageVersionOrOptions, ...rest) =>
    isProbe(fileName)
      ? ts.createSourceFile(fileName, PROBE_SOURCE, languageVersionOrOptions, true)
      : getSourceFile.call(host, fileName, languageVersionOrOptions, ...rest);
  host.fileExists = (fileName) => isProbe(fileName) || fileExists.call(host, fileName);
  host.readFile = (fileName) => (isProbe(fileName) ? PROBE_SOURCE : readFile.call(host, fileName));

  return host;
}

const started = process.hrtime.bigint();
const diagnostics = ts.getPreEmitDiagnostics(
  ts.createProgram([...rootNames, PROBE_PATH], COMPILER_OPTIONS, createHost()),
);
const elapsedSeconds = Number(process.hrtime.bigint() - started) / 1e9;

const canonicalProbe = canonical(PROBE_PATH);
const emittedFiles = new Set(rootNames.map(canonical));
const probe = [];
const emitted = [];
const foreign = [];

for (const diagnostic of diagnostics) {
  const fileName = diagnostic.file?.fileName;
  const key = fileName ? canonical(fileName) : null;
  if (key === canonicalProbe) probe.push(diagnostic);
  else if (key && emittedFiles.has(key)) emitted.push(diagnostic);
  else foreign.push(diagnostic);
}

const missingProbeCodes = PROBE_EXPECTED_CODES.filter(
  (code) => !probe.some((diagnostic) => diagnostic.code === code),
);

if (missingProbeCodes.length) {
  console.error(
    `[check-emitted-types-compile] FAIL — the liveness probe reported no ${missingProbeCodes
      .map((code) => `TS${code}`)
      .join(' / ')}, so this run proves nothing about the emit.`,
  );
  console.error(
    `\nThe probe is a synthetic declaration file carrying one dangling type reference and one class that does not satisfy its \`implements\` clause. The compiler must report both, or the options above have stopped detecting the very shapes the gate is for — \`skipLibCheck: true\` is the one that silences every \`.d.ts\` at once, the emitted ones included. Restore the detection rather than the probe.`,
  );
  process.exit(1);
}

if (emitted.length) {
  console.error(
    `[check-emitted-types-compile] FAIL — ${emitted.length} diagnostic(s) in the emitted declarations:`,
  );
  for (const diagnostic of emitted) console.error(`  ${formatDiagnostic(diagnostic)}`);
  console.error(
    `\nThe shipped types must compile for a consumer who typechecks them (\`skipLibCheck: false\`). The usual cause is \`@internal\` on something a public signature reaches: \`stripInternal\` deletes the declaration and leaves the reference dangling (an unresolved name), or deletes a member and leaves the class no longer satisfying its \`implements\` clause. A type or member reachable from a public signature is never \`@internal\` — narrow the signature so it stops reaching it, or drop the tag and publish it. See "A type or member reachable from a public signature is never \`@internal\`" in .claude/rules/conventions.md.`,
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
  `[check-emitted-types-compile] OK — ${rootNames.length} emitted declaration files typecheck under strict + skipLibCheck:false, resolving each other through the published exports map; the liveness probe reported ${PROBE_EXPECTED_CODES.map((code) => `TS${code}`).join(' + ')} (${elapsedSeconds.toFixed(1)}s).`,
);
