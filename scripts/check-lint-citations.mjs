import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { slugify } from './lib/readme-slug.mjs';
import { repoRoot } from './lib/repo-path.mjs';

const TAG = '[check-lint-citations]';

const DOCS = {
  'CLAUDE.md': 'CLAUDE.md',
  '.claude/rules/testing.md': '.claude/rules/testing.md',
  '.claude/rules/conventions.md': '.claude/rules/conventions.md',
};

const DOC = String.raw`(?:https://github\.com/tutkli/forty-cdk/blob/main/)?\x60?(CLAUDE\.md|\.claude/rules/(?:testing|conventions)\.md)\x60?`;
const SECTION_CITATION = new RegExp(String.raw`${DOC}\s*§\s*"([^"]+)"`, 'g');
const ANCHOR_CITATION = new RegExp(String.raw`${DOC}#([A-Za-z0-9_-]+)`, 'g');
const PATH_CITATION = new RegExp(String.raw`${DOC}\s*(?:>|→)\s*\S`, 'g');

function corpus() {
  const files = ['eslint.config.js'];
  const fixtures = 'projects/forty-cdk/eslint-rules-fixtures';
  for (const file of readdirSync(join(repoRoot, fixtures)).sort()) {
    if (file.endsWith('.ts')) files.push(`${fixtures}/${file}`);
  }
  const stack = ['.github'];
  while (stack.length) {
    const dir = stack.pop();
    for (const entry of readdirSync(join(repoRoot, dir), { withFileTypes: true })) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) stack.push(path);
      else if (/\.(ya?ml|md)$/.test(entry.name)) files.push(path);
    }
  }
  return files;
}

function stripLinks(text) {
  return text.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
}

function normalize(text) {
  return stripLinks(text)
    .replace(/[`"\\*_]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.:]+$/, '')
    .toLowerCase();
}

function sectionsOf(markdown) {
  const names = [];
  const anchors = new Set();
  let fenced = false;
  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) continue;
    const heading = /^#{1,6}\s+(.*)$/.exec(line);
    if (heading) {
      names.push(normalize(heading[1]));
      anchors.add(slugify(stripLinks(heading[1])));
      continue;
    }
    const lead = /^\s*(?:[-*]\s+)?\*\*(.+?)\*\*/.exec(line);
    if (lead) names.push(normalize(lead[1]));
  }
  return { names, anchors };
}

function joined(text) {
  const lines = text.split(/\r?\n/);
  const starts = [];
  let flat = '';
  for (const line of lines) {
    starts.push(flat.length);
    flat += `${line.replace(/^\s*(?:\/\/|\*(?!\/)|#)?\s*/, '')} `;
  }
  const lineAt = (offset) => {
    let line = 0;
    while (line + 1 < starts.length && starts[line + 1] <= offset) line += 1;
    return line + 1;
  };
  return { flat, lineAt };
}

export function citationProblems(text, label, docs) {
  const problems = [];
  const { flat, lineAt } = joined(text);
  for (const match of flat.matchAll(SECTION_CITATION)) {
    const [, doc, section] = match;
    const wanted = normalize(section);
    if (!docs[doc].names.some((name) => name.startsWith(wanted))) {
      problems.push(
        `${label}:${lineAt(match.index)} cites ${doc} § "${section}", which is neither a heading nor a bold lead-in there`,
      );
    }
  }
  for (const match of flat.matchAll(ANCHOR_CITATION)) {
    const [, doc, anchor] = match;
    if (!docs[doc].anchors.has(anchor)) {
      problems.push(
        `${label}:${lineAt(match.index)} links ${doc}#${anchor}, which no heading there produces`,
      );
    }
  }
  for (const match of flat.matchAll(PATH_CITATION)) {
    problems.push(
      `${label}:${lineAt(match.index)} cites ${match[1]} as a path ("${match[0].trim()}…"); cite it as ${match[1]} § "<section>" so this check can resolve it`,
    );
  }
  return problems;
}

const docs = Object.fromEntries(
  Object.entries(DOCS).map(([key, path]) => [
    key,
    sectionsOf(readFileSync(join(repoRoot, path), 'utf8')),
  ]),
);

const PROBES = [
  { text: '// See: CLAUDE.md#not-a-heading-anywhere', label: 'a dead anchor' },
  {
    text: 'message: \'(.claude/rules/testing.md § "Not a section" rule 1.)\'',
    label: 'a dead section',
  },
  { text: '# Walk CLAUDE.md > Testing notes > rule 1', label: 'a path citation' },
];
const deadProbes = PROBES.filter(
  (probe) => citationProblems(probe.text, 'probe', docs).length === 0,
);
const liveControl = citationProblems(
  '// See: .claude/rules/testing.md § "Test isolation — non-negotiables" rule 1\n// .claude/rules/testing.md#test-isolation--non-negotiables',
  'control',
  docs,
);

if (deadProbes.length > 0 || liveControl.length > 0) {
  console.error(
    `${TAG} FAIL — the liveness probe ${deadProbes.length > 0 ? `passed ${deadProbes.map((probe) => probe.label).join(', ')}` : `rejected a valid citation: ${liveControl.join('; ')}`}, so this run proves nothing about the citations.`,
  );
  process.exit(1);
}

const files = corpus();
const problems = [];
let citations = 0;
for (const file of files) {
  const text = readFileSync(join(repoRoot, file), 'utf8');
  const { flat } = joined(text);
  citations += [...flat.matchAll(SECTION_CITATION), ...flat.matchAll(ANCHOR_CITATION)].length;
  problems.push(
    ...citationProblems(text, relative(repoRoot, join(repoRoot, file)).replaceAll('\\', '/'), docs),
  );
}

if (problems.length > 0) {
  console.error(`${TAG} FAIL — ${problems.length} citation(s) that land nowhere:`);
  for (const problem of problems) console.error(`  ${problem}`);
  console.error(
    '\nA lint message, rule comment, fixture header or workflow that sends a developer to a section must name one that exists. The test-isolation rules live in .claude/rules/testing.md, the authoring conventions in .claude/rules/conventions.md.',
  );
  process.exit(1);
}

console.log(
  `${TAG} OK — ${citations} citation(s) across ${files.length} files resolve to a heading or bold lead-in of ${Object.keys(DOCS).join(', ')}; the liveness probe rejected ${PROBES.map((probe) => probe.label).join(', ')}.`,
);
