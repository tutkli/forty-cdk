import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  MATRIX_END,
  MATRIX_START,
  conventionMatrices,
  renderMatrices,
} from './lib/convention-matrices.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const DOC = join(repoRoot, '.claude', 'rules', 'conventions.md');
const WRITE = process.argv.includes('--write');

const doc = readFileSync(DOC, 'utf8');
const start = doc.indexOf(MATRIX_START);
const end = doc.indexOf(MATRIX_END);

if (start === -1 || end === -1 || end < start) {
  console.error(
    `[check-convention-matrices] FAIL — .claude/rules/conventions.md is missing the generated ` +
      `section markers.\n  Expected ${MATRIX_START} … ${MATRIX_END}. Restore them (the generated ` +
      `matrices are the anti-drift mechanism, not optional formatting) and re-run with --write.`,
  );
  process.exit(1);
}

const rows = conventionMatrices();
const expected = renderMatrices(rows);
const actual = doc.slice(start, end + MATRIX_END.length);

if (actual === expected) {
  const members = rows.reduce((total, row) => total + row.count, 0);
  console.log(
    `[check-convention-matrices] OK — ${rows.length} matrices / ${members} members in ` +
      `.claude/rules/conventions.md match library source.`,
  );
  process.exit(0);
}

if (WRITE) {
  writeFileSync(DOC, doc.slice(0, start) + expected + doc.slice(end + MATRIX_END.length), 'utf8');
  console.log(
    `[check-convention-matrices] WROTE — regenerated ${rows.length} matrices in ` +
      `.claude/rules/conventions.md from library source.`,
  );
  process.exit(0);
}

const expectedLines = expected.split('\n');
const actualLines = actual.split('\n');
const diff = [];
for (let i = 0; i < Math.max(expectedLines.length, actualLines.length); i++) {
  if (expectedLines[i] !== actualLines[i]) {
    if (actualLines[i] !== undefined) diff.push(`  - ${actualLines[i]}`);
    if (expectedLines[i] !== undefined) diff.push(`  + ${expectedLines[i]}`);
  }
}

console.error(
  `[check-convention-matrices] FAIL — the generated matrices in .claude/rules/conventions.md have ` +
    `drifted from library source (${diff.length} differing line(s)):`,
);
for (const line of diff.slice(0, 40)) {
  console.error(line);
}
if (diff.length > 40) {
  console.error(`  … ${diff.length - 40} more`);
}
console.error(
  `\nRun \`pnpm check:matrices --write\` to regenerate, then read the diff: a roster that grew ` +
    `unexpectedly usually means a new adopter needs a prose rule, not just a bigger table.`,
);
process.exit(1);
