import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import ts from 'typescript';

import { snippetsOf } from './lib/doc-snippets.mjs';
import {
  DOCS_DIR,
  readEntryPointDocs,
  readGuides,
  readSitePages,
  SITE_DIR,
} from './lib/doc-site.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const OUT_DIR = join(repoRoot, 'out-tsc', 'doc-snippets');
const APP_TSCONFIG = join(repoRoot, 'projects', 'forty-cdk-docs', 'tsconfig.app.json');

/**
 * Below this many compiled fences the extraction has stopped matching the
 * corpus, and a green run would prove nothing about it.
 */
const COMPILED_FLOOR = 40;

const posix = (file) => file.split(sep).join('/');
const rel = (file) => posix(relative(repoRoot, file));
const keyOf = (file) => posix(file).toLowerCase();

const documents = [
  ...readEntryPointDocs().map((doc) => ({ path: doc.path, file: doc.file })),
  ...readGuides().map((guide) => ({
    path: `docs/${guide.file}`,
    file: join(DOCS_DIR, guide.file),
  })),
  ...readSitePages().map((page) => ({
    path: `docs/site/${page.file}`,
    file: join(SITE_DIR, page.file),
  })),
];

const snippets = [];
const problems = [];
for (const document of documents) {
  const result = snippetsOf(readFileSync(document.file, 'utf8'), document.path);
  snippets.push(...result.snippets);
  problems.push(...result.problems);
}

function fail(failures) {
  console.error(`[check-doc-snippets] ${failures.length} problem(s):`);
  for (const failure of failures) {
    console.error(`  ${failure.path}:${failure.line} — ${failure.message}`);
  }
  process.exit(1);
}

if (problems.length > 0) {
  fail(problems);
}

const compiled = snippets.filter((snippet) => snippet.mode !== 'fragment');
const byFile = new Map();

rmSync(OUT_DIR, { recursive: true, force: true });
for (const snippet of compiled) {
  const file = join(OUT_DIR, snippet.path, `L${snippet.line}.ts`);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${snippet.code}\n\nexport {};\n`, 'utf8');
  byFile.set(keyOf(file), { snippet, diagnostics: [] });
}

const tsconfig = join(OUT_DIR, 'tsconfig.json');
writeFileSync(
  tsconfig,
  JSON.stringify(
    {
      extends: posix(relative(OUT_DIR, APP_TSCONFIG)),
      compilerOptions: { rootDir: posix(relative(OUT_DIR, repoRoot)), noEmit: true, types: [] },
      include: ['**/*.ts'],
    },
    null,
    2,
  ),
  'utf8',
);

const messageOf = (diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ');

const config = ts.getParsedCommandLineOfConfigFile(tsconfig, undefined, {
  ...ts.sys,
  onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
    throw new Error(`[check-doc-snippets] ${messageOf(diagnostic)}`);
  },
});
const program = ts.createProgram({ rootNames: config.fileNames, options: config.options });

const failures = [];
for (const diagnostic of ts.getPreEmitDiagnostics(program)) {
  const message = messageOf(diagnostic);
  if (diagnostic.file === undefined) {
    failures.push({ path: rel(tsconfig), line: 1, message });
    continue;
  }
  const { line } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start ?? 0);
  const entry = byFile.get(keyOf(diagnostic.file.fileName));
  if (entry === undefined) {
    failures.push({ path: rel(diagnostic.file.fileName), line: line + 1, message });
    continue;
  }
  entry.diagnostics.push({ line: entry.snippet.line + 1 + line, message });
}

for (const { snippet, diagnostics } of byFile.values()) {
  if (snippet.mode === 'compile') {
    for (const diagnostic of diagnostics) {
      failures.push({ path: snippet.path, line: diagnostic.line, message: diagnostic.message });
    }
  } else if (diagnostics.length === 0) {
    failures.push({
      path: snippet.path,
      line: snippet.line,
      message:
        'this fence is marked expect-error and compiles — drop the marker, or restore the ' +
        'mistake the fence exists to show',
    });
  }
}

if (failures.length > 0) {
  fail(failures);
}

const fragments = snippets.filter((snippet) => snippet.mode === 'fragment');
const expected = snippets.filter((snippet) => snippet.mode === 'expect-error');
const compiledClean = compiled.length - expected.length;

if (compiledClean < COMPILED_FLOOR) {
  console.error(
    `[check-doc-snippets] compiled only ${compiledClean} fence(s) (floor ${COMPILED_FLOOR}) — ` +
      'the fence extraction has stopped matching, so a green run proves nothing',
  );
  process.exit(1);
}

console.log(
  `[check-doc-snippets] ok — ${snippets.length} TypeScript fences across ${documents.length} documents: ` +
    `${compiledClean} compile, ${expected.length} marked expect-error and fail as required, ` +
    `${fragments.length} marked fragment`,
);
for (const snippet of expected) {
  console.log(`  expect-error  ${snippet.path}:${snippet.line}`);
}
const fragmentsByPath = new Map();
for (const snippet of fragments) {
  fragmentsByPath.set(snippet.path, (fragmentsByPath.get(snippet.path) ?? 0) + 1);
}
for (const [path, count] of fragmentsByPath) {
  console.log(`  fragment      ${path} × ${count}`);
}
