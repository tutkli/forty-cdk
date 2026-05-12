/**
 * Mirrors `src/examples/<primitive>/<name>.ts` to
 * `src/examples/<primitive>/<name>.ts.txt` as a plain-text companion so the
 * `<for-example>` component can render the original TypeScript source.
 *
 * Why a companion file rather than `?raw` on the `.ts` directly: Vite's
 * `?raw` import reads the on-disk file string, but Analog's Angular plugin
 * registers a pre-transform pass that lowers `@Component`s to `ɵɵdefineComponent`
 * calls before Vite hands the bytes to the `?raw` handler. The Code tab
 * therefore ended up showing compiled Ivy instructions instead of the
 * idiomatic source the user is meant to copy. A `.ts.txt` sibling sidesteps
 * that pipeline entirely — Vite resolves the extension as text/plain and no
 * Angular plugin matches it.
 *
 * Runs as part of `pnpm docs:prebuild` so contributors do not have to remember
 * to re-sync after editing an example. Output is committed (same rationale
 * as the API-metadata JSON: PR diffs surface user-visible changes).
 */

import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(SCRIPT_DIR, '..');
const EXAMPLES_ROOT = join(DOCS_ROOT, 'src', 'examples');

interface Entry {
  ts: string;
  txt: string;
}

function* walk(dir: string): Generator<Entry> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walk(full);
      continue;
    }
    if (name.endsWith('.ts') && !name.endsWith('.d.ts')) {
      yield { ts: full, txt: `${full}.txt` };
    }
  }
}

function pruneStaleTxt(): number {
  let removed = 0;
  for (const dir of [EXAMPLES_ROOT]) {
    if (!safeIsDir(dir)) continue;
    for (const entry of walkTxt(dir)) {
      if (!safeExists(entry.replace(/\.ts\.txt$/, '.ts'))) {
        unlinkSync(entry);
        removed++;
      }
    }
  }
  return removed;
}

function safeIsDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

function safeExists(path: string): boolean {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

function* walkTxt(dir: string): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of names) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      yield* walkTxt(full);
      continue;
    }
    if (name.endsWith('.ts.txt')) yield full;
  }
}

function main(): void {
  console.log('[forty-cdk-docs/sync-example-sources] starting…');
  if (!safeIsDir(EXAMPLES_ROOT)) {
    mkdirSync(EXAMPLES_ROOT, { recursive: true });
    console.log('[forty-cdk-docs/sync-example-sources] no examples yet — done');
    return;
  }
  let copied = 0;
  for (const entry of walk(EXAMPLES_ROOT)) {
    copyFileSync(entry.ts, entry.txt);
    copied++;
  }
  const removed = pruneStaleTxt();
  console.log(
    `[forty-cdk-docs/sync-example-sources] done — copied ${copied}, pruned ${removed} stale .ts.txt`,
  );
}

main();
