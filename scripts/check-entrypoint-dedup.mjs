import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';

const FESM = join(repoRoot, 'dist', 'forty-cdk', 'fesm2022');

if (!existsSync(FESM)) {
  console.error(`[check-entrypoint-dedup] ${FESM} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const CORE_SINGLETONS = [
  'LiveAnnouncer',
  'IdGenerator',
  'DismissableLayerStack',
  'FocusTrapStack',
  'BodyScrollLock',
  'InertSiblingsStack',
  'ForDrawerStack',
  'ForDrawerScaleCoordinator',
];

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
  `[check-entrypoint-dedup] OK — ${tokenHomes.size} InjectionTokens + ${CORE_SINGLETONS.length} core singletons each defined in exactly one FESM.`,
);
