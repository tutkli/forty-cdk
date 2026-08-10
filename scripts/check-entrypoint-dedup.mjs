import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';

const LIB_DIR = join(repoRoot, 'projects', 'forty-cdk');
const FESM = join(repoRoot, 'dist', 'forty-cdk', 'fesm2022');

if (!existsSync(FESM)) {
  console.error(`[check-entrypoint-dedup] ${FESM} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

/**
 * Fewer than this many `providedIn: 'root'` classes means the scan below found
 * the wrong tree rather than a library that shrank — the same vacuum guard the
 * derived-roster specs carry. It is a floor, not a target.
 */
const SINGLETON_FLOOR = 12;

const PROVIDED_IN_ROOT = /providedIn:\s*'root'[\s\S]{0,120}?\bexport class ([A-Za-z_$][\w$]*)/g;

/**
 * Every exported `providedIn: 'root'` class in library source.
 *
 * **Derived rather than declared**, because the hand-written list this replaced
 * had drifted: it named eight and the library had ten, missing
 * `ScrollDismissDispatcher` — which [#1723](https://github.com/tutkli/forty-cdk/issues/1723)
 * then moved across an entry-point boundary, exactly the move this check
 * exists to police. A singleton compiled into two FESMs is two DI tokens and
 * therefore two instances, so cross-primitive coordination (layer stacking,
 * scroll locking, id minting) silently splits in half.
 */
function rootSingletons() {
  const names = new Set();
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules') walk(path);
      } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
        for (const m of readFileSync(path, 'utf8').matchAll(PROVIDED_IN_ROOT)) names.add(m[1]);
      }
    }
  })(LIB_DIR);
  return [...names].sort();
}

const CORE_SINGLETONS = rootSingletons();

if (CORE_SINGLETONS.length < SINGLETON_FLOOR) {
  console.error(
    `[check-entrypoint-dedup] FAIL — only ${CORE_SINGLETONS.length} \`providedIn: 'root'\` classes found in ${LIB_DIR} (floor ${SINGLETON_FLOOR}). The scan proves nothing about the emit; fix it rather than lowering the floor.`,
  );
  process.exit(1);
}

const TOKEN_DEF =
  /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\/\*[^*]*\*\/\s*)?new InjectionToken/g;

const tokenHomes = new Map();
const classHomes = new Map();

for (const file of readdirSync(FESM)) {
  if (!file.endsWith('.mjs')) continue;
  const txt = readFileSync(join(FESM, file), 'utf8');
  let m;
  while ((m = TOKEN_DEF.exec(txt))) {
    if (!tokenHomes.has(m[1])) tokenHomes.set(m[1], new Set());
    tokenHomes.get(m[1]).add(file);
  }
  for (const name of CORE_SINGLETONS) {
    if (new RegExp(`class ${name}\\b`).test(txt)) {
      if (!classHomes.has(name)) classHomes.set(name, new Set());
      classHomes.get(name).add(file);
    }
  }
}

const dupes = [];
for (const [name, homes] of [...tokenHomes, ...classHomes]) {
  if (homes.size > 1) dupes.push(`${name}: ${[...homes].sort().join(', ')}`);
}

if (dupes.length) {
  console.error(`[check-entrypoint-dedup] FAIL — ${dupes.length} symbol(s) defined in >1 FESM:`);
  for (const d of dupes) console.error(`  ${d}`);
  process.exit(1);
}
console.log(
  `[check-entrypoint-dedup] OK — ${tokenHomes.size} InjectionTokens + ${CORE_SINGLETONS.length} root-provided singletons (derived from source) each defined in exactly one FESM.`,
);
