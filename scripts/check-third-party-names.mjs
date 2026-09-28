import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';
import { jsdocLines, thirdPartyProblems } from './lib/third-party-names.mjs';

const TYPES_DIR = join(repoRoot, 'dist', 'forty-cdk', 'types');
const LIBRARY_DIR = join(repoRoot, 'projects', 'forty-cdk');
const ROOT_DECLARATIONS = 'forty-cdk.d.ts';

function toPosix(path) {
  return relative(repoRoot, path).split(sep).join('/');
}

function entryPointOf(file) {
  return file === ROOT_DECLARATIONS ? null : file.slice('forty-cdk-'.length, -'.d.ts'.length);
}

function sourceLines(entryPoint) {
  const dir = entryPoint === null ? join(LIBRARY_DIR, 'src') : join(LIBRARY_DIR, entryPoint, 'src');
  const byText = new Map();
  if (!existsSync(dir)) {
    return byText;
  }
  const files = readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter(
      (entry) => entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts'),
    )
    .map((entry) => join(entry.parentPath, entry.name))
    .sort();
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((text, index) => {
        const key = text.trim();
        if (key !== '' && !byText.has(key)) {
          byText.set(key, { path: toPosix(file), line: index + 1 });
        }
      });
  }
  return byText;
}

if (!existsSync(TYPES_DIR)) {
  console.error(
    `[check-third-party-names] ${toPosix(TYPES_DIR)} not found — run \`pnpm build\` first.`,
  );
  process.exit(1);
}

const declarationFiles = readdirSync(TYPES_DIR)
  .filter((file) => file.endsWith('.d.ts'))
  .sort();

const lines = declarationFiles.flatMap((file) => {
  const entryPoint = entryPointOf(file);
  const origins = sourceLines(entryPoint);
  return jsdocLines(readFileSync(join(TYPES_DIR, file), 'utf8'), {
    path: toPosix(join(TYPES_DIR, file)),
    entryPoint,
  }).map((scanned) => ({ ...scanned, ...origins.get(scanned.text.trim()) }));
});

const { problems, exempted } = thirdPartyProblems(lines);

if (problems.length > 0) {
  console.error(
    `[check-third-party-names] FAIL — ${problems.length} problem(s) in the public JSDoc emitted to ${toPosix(TYPES_DIR)}:`,
  );
  for (const problem of problems) {
    console.error(`  ${problem}`);
  }
  process.exit(1);
}

console.log(
  `[check-third-party-names] ok — ${lines.length} lines of public JSDoc across ` +
    `${declarationFiles.length} declaration files name no other UI library ` +
    `(${exempted} exempted mention(s)).`,
);
