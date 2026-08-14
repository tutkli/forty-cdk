import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  rmdirSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHighlighter } from 'shiki';

import { repoRoot } from './lib/repo-path.mjs';

const DEMOS = join(repoRoot, 'projects', 'forty-cdk-playground', 'src', 'app', 'demos');

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (entry.endsWith('.example.ts')) {
      out.push(full);
    }
  }
  return out;
}

const demoDirs = readdirSync(DEMOS, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const files = walk(DEMOS, []).sort();
const byPrimitive = new Map();

for (const file of files) {
  const rel = relative(DEMOS, file).split(sep);
  const primitive = rel[0];
  if (!byPrimitive.has(primitive)) {
    byPrimitive.set(primitive, []);
  }
  byPrimitive.get(primitive).push(file);
}

const highlighter = await createHighlighter({
  themes: ['github-light', 'github-dark'],
  langs: ['angular-ts'],
});

let total = 0;

for (const [primitive, primitiveFiles] of [...byPrimitive].sort()) {
  const entries = primitiveFiles.map((file) => {
    const code = readFileSync(file, 'utf8');
    const key = relative(repoRoot, file).split(sep).join('/');
    const highlighted = highlighter.codeToHtml(code, {
      lang: 'angular-ts',
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    });
    return { key, code, highlighted };
  });

  const body = entries
    .map(
      (entry) =>
        `  ${JSON.stringify(entry.key)}: {\n` +
        `    code: ${JSON.stringify(entry.code)},\n` +
        `    highlighted: ${JSON.stringify(entry.highlighted)},\n` +
        `  },`,
    )
    .join('\n');

  const out =
    `import type { ExampleSources } from '../../doc/example-source';\n\n` +
    `export const SOURCES: ExampleSources = {\n${body}\n};\n`;

  writeFileSync(join(DEMOS, primitive, 'sources.generated.ts'), out, 'utf8');
  total += entries.length;
}

highlighter.dispose();

const skipped = demoDirs.filter((dir) => !byPrimitive.has(dir));

for (const dir of skipped) {
  const full = join(DEMOS, dir);
  const stale = join(full, 'sources.generated.ts');
  const removals = [];

  if (existsSync(stale)) {
    rmSync(stale);
    removals.push('removed its stale manifest');
  }
  if (readdirSync(full).length === 0) {
    rmdirSync(full);
    removals.push('removed the empty directory');
  }

  const suffix = removals.length > 0 ? ` — ${removals.join(', ')}` : '';
  console.warn(`[gen-example-sources] skipped demos/${dir}: no *.example.ts files${suffix}`);
}

console.log(
  `[gen-example-sources] wrote ${byPrimitive.size} manifests covering ${total} example sources` +
    (skipped.length > 0
      ? `, skipped ${skipped.length} ${skipped.length === 1 ? 'directory' : 'directories'} with no examples`
      : ''),
);
