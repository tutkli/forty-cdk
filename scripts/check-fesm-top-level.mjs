import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { topLevelSideEffects } from './lib/fesm-top-level.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const FESM_DIR = join(repoRoot, 'dist', 'forty-cdk', 'fesm2022');

if (!existsSync(FESM_DIR)) {
  console.error(`[check-fesm-top-level] ${FESM_DIR} not found — run \`pnpm build\` first.`);
  process.exit(1);
}

const bundles = readdirSync(FESM_DIR)
  .filter((file) => file.endsWith('.mjs'))
  .sort();

const problems = bundles.flatMap((file) =>
  topLevelSideEffects(readFileSync(join(FESM_DIR, file), 'utf8'), file).map(
    ({ line, text }) => `${file}:${line}  ${text}`,
  ),
);

if (problems.length > 0) {
  console.error(
    `[check-fesm-top-level] FAIL — ${problems.length} top-level statement(s) a bundler cannot drop:`,
  );
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    'Each one keeps its FESM, and every class it names, in any bundle importing that entry point. A self-referencing `instanceof` inside a class emits a class alias; use a `#field in value` brand check instead.',
  );
  process.exit(1);
}

console.log(
  `[check-fesm-top-level] OK — ${bundles.length} FESMs carry only declarations, imports / exports and class metadata at the top level.`,
);
