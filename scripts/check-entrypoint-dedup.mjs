import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import {
  rawRootInjectableCount,
  rawTokenCount,
  rootSingletonClasses,
  tokenDefinitions,
} from './lib/entrypoint-dedup.mjs';
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

/**
 * Every `providedIn: 'root'` class in library source, exported or not.
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
  const declared = [];
  let raw = 0;
  (function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) {
        if (entry !== 'node_modules') walk(path);
      } else if (path.endsWith('.ts') && !path.endsWith('.spec.ts')) {
        const source = readFileSync(path, 'utf8');
        declared.push(...rootSingletonClasses(source, path));
        raw += rawRootInjectableCount(source);
      }
    }
  })(LIB_DIR);
  return { names: [...new Set(declared)].sort(), declared: declared.length, raw };
}

const singletons = rootSingletons();
const CORE_SINGLETONS = singletons.names;

if (singletons.declared !== singletons.raw) {
  console.error(
    `[check-entrypoint-dedup] FAIL — the AST scan found ${singletons.declared} \`@Injectable({ providedIn: 'root' })\` classes in ${LIB_DIR}, but the text holds ${singletons.raw} such decorators. The extractor has stopped seeing part of the universe; fix it rather than the count.`,
  );
  process.exit(1);
}

if (CORE_SINGLETONS.length < SINGLETON_FLOOR) {
  console.error(
    `[check-entrypoint-dedup] FAIL — only ${CORE_SINGLETONS.length} \`providedIn: 'root'\` classes found in ${LIB_DIR} (floor ${SINGLETON_FLOOR}). The scan proves nothing about the emit; fix it rather than lowering the floor.`,
  );
  process.exit(1);
}

const tokenHomes = new Map();
const classHomes = new Map();
const unmatchedTokens = [];

for (const file of readdirSync(FESM)) {
  if (!file.endsWith('.mjs')) continue;
  const txt = readFileSync(join(FESM, file), 'utf8');
  const defined = tokenDefinitions(txt);
  const raw = rawTokenCount(txt);
  if (defined.length !== raw) unmatchedTokens.push(`${file}: ${defined.length} of ${raw}`);
  for (const name of defined) {
    if (!tokenHomes.has(name)) tokenHomes.set(name, new Set());
    tokenHomes.get(name).add(file);
  }
  for (const name of CORE_SINGLETONS) {
    if (new RegExp(`class ${name}\\b`).test(txt)) {
      if (!classHomes.has(name)) classHomes.set(name, new Set());
      classHomes.get(name).add(file);
    }
  }
}

if (unmatchedTokens.length) {
  console.error(
    `[check-entrypoint-dedup] FAIL — ${unmatchedTokens.length} FESM(s) hold a \`new InjectionToken\` the token scan does not capture as a named definition:`,
  );
  for (const u of unmatchedTokens) console.error(`  ${u}`);
  console.error(
    `\nEvery token is a top-level \`const NAME = new InjectionToken(…)\`; a token built any other way is invisible to the duplicate check below.`,
  );
  process.exit(1);
}

const dupes = [];
for (const [name, homes] of [...tokenHomes, ...classHomes]) {
  if (homes.size > 1) dupes.push(`${name}: ${[...homes].sort().join(', ')}`);
}

if (dupes.length) {
  console.error(`[check-entrypoint-dedup] FAIL — ${dupes.length} symbol(s) defined in >1 FESM:`);
  for (const d of dupes) console.error(`  ${d}`);
  console.error(
    `\nEach FESM that defines one of these creates its own instance at runtime. Keep a single declaration in the entry point that owns it, and import it from the other through that entry point's specifier (forty-cdk/core, forty-cdk/core-overlay, …) rather than through a copy of the module.`,
  );
  process.exit(1);
}
console.log(
  `[check-entrypoint-dedup] OK — ${tokenHomes.size} InjectionTokens + ${CORE_SINGLETONS.length} root-provided singletons (derived from source, matching every \`new InjectionToken\` and \`@Injectable({ providedIn: 'root' })\` in the text) each defined in exactly one FESM.`,
);
