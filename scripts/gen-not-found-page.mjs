import { copyFileSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import { repoRoot } from './lib/repo-path.mjs';

const BROWSER = join(repoRoot, 'dist', 'forty-cdk-docs', 'browser');
const SHELL = join(BROWSER, 'index.csr.html');

if (!existsSync(SHELL)) {
  console.error(
    `[gen-not-found-page] no client-rendered shell at ${relative(repoRoot, SHELL).split(sep).join('/')} — run the static build first`,
  );
  process.exit(1);
}

copyFileSync(SHELL, join(BROWSER, '404.html'));
console.log('[gen-not-found-page] wrote 404.html from the client-rendered shell');
