import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { repoRoot } from './lib/repo-path.mjs';

const LIB_DIR = join(repoRoot, 'projects', 'forty-cdk');
const PREFIX = 'forty-cdk/';

function readJsonc(path) {
  const { config, error } = ts.parseConfigFileTextToJson(path, readFileSync(path, 'utf8'));
  if (error) {
    console.error(`[check-entrypoint-registration] could not parse ${path}.`);
    process.exit(1);
  }
  return config;
}

function pathKeys(config) {
  const paths = config.compilerOptions?.paths ?? {};
  return new Set(
    Object.keys(paths)
      .filter((key) => key.startsWith(PREFIX) && key.length > PREFIX.length)
      .map((key) => key.slice(PREFIX.length)),
  );
}

function includeFolders(include) {
  const folders = new Set();
  for (const glob of include ?? []) {
    const match = glob.match(/^(?:\.\.\/)?([^/]+)\/src\//);
    if (match) folders.add(match[1]);
  }
  return folders;
}

const secondaryEntryPoints = readdirSync(LIB_DIR, { withFileTypes: true })
  .filter((e) => e.isDirectory() && existsSync(join(LIB_DIR, e.name, 'ng-package.json')))
  .map((e) => e.name)
  .sort();

const expected = new Set(secondaryEntryPoints);

const rootTsconfig = readJsonc(join(repoRoot, 'tsconfig.json'));
const libTsconfig = readJsonc(join(LIB_DIR, 'tsconfig.lib.json'));
const specTsconfig = readJsonc(join(LIB_DIR, 'tsconfig.spec.json'));
const harnessTsconfig = readJsonc(
  join(repoRoot, 'projects', 'forty-cdk-harness', 'tsconfig.app.json'),
);
const playgroundTsconfig = readJsonc(
  join(repoRoot, 'projects', 'forty-cdk-playground', 'tsconfig.app.json'),
);
const angularJson = JSON.parse(readFileSync(join(repoRoot, 'angular.json'), 'utf8'));
const angularTestInclude =
  angularJson.projects?.['forty-cdk']?.architect?.test?.options?.include ?? [];

const lists = [
  { name: 'tsconfig.json → compilerOptions.paths', found: pathKeys(rootTsconfig) },
  {
    name: 'projects/forty-cdk/tsconfig.lib.json → compilerOptions.paths',
    found: pathKeys(libTsconfig),
  },
  {
    name: 'projects/forty-cdk/tsconfig.lib.json → include',
    found: includeFolders(libTsconfig.include),
  },
  {
    name: 'projects/forty-cdk/tsconfig.spec.json → compilerOptions.paths',
    found: pathKeys(specTsconfig),
  },
  {
    name: 'projects/forty-cdk/tsconfig.spec.json → include',
    found: includeFolders(specTsconfig.include),
  },
  {
    name: 'angular.json → forty-cdk test.options.include',
    found: includeFolders(angularTestInclude),
  },
  {
    name: 'projects/forty-cdk-harness/tsconfig.app.json → compilerOptions.paths',
    found: pathKeys(harnessTsconfig),
  },
  {
    name: 'projects/forty-cdk-playground/tsconfig.app.json → compilerOptions.paths',
    found: pathKeys(playgroundTsconfig),
  },
];

const problems = [];
for (const list of lists) {
  const missing = secondaryEntryPoints.filter((name) => !list.found.has(name));
  const stale = [...list.found].filter((name) => !expected.has(name)).sort();
  if (missing.length || stale.length) problems.push({ name: list.name, missing, stale });
}

if (problems.length) {
  console.error(
    `[check-entrypoint-registration] FAIL — ${problems.length} registration list(s) out of sync with the ${secondaryEntryPoints.length} folders that have an ng-package.json:`,
  );
  for (const { name, missing, stale } of problems) {
    console.error(`  ${name}`);
    if (missing.length) console.error(`    missing: ${missing.join(', ')}`);
    if (stale.length) console.error(`    unknown entry point(s): ${stale.join(', ')}`);
  }
  console.error(
    `\nEvery secondary entry point (a folder with an ng-package.json) must be registered in each list above. Add the missing entries, or drop the stale ones if the entry point was removed.`,
  );
  process.exit(1);
}

console.log(
  `[check-entrypoint-registration] OK — all ${secondaryEntryPoints.length} secondary entry points registered across ${lists.length} lists.`,
);
