import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHighlighter } from 'shiki';

const REPO = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const DEMOS = join(REPO, 'projects', 'forty-cdk-playground', 'src', 'app', 'demos');

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
    const key = relative(REPO, file).split(sep).join('/');
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

console.log(
  `[gen-example-sources] wrote ${byPrimitive.size} manifests covering ${total} example sources`,
);
