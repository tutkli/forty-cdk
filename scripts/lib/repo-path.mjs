import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

if (!existsSync(join(repoRoot, 'package.json'))) {
  throw new Error(
    `scripts/lib/repo-path.mjs resolved the repository root to ${repoRoot}, which holds no package.json — ` +
      'every gate and generator reads the repository through this root, so none of them can run',
  );
}
