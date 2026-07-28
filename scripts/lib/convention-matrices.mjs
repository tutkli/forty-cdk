import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './repo-path.mjs';

const LIB_DIR = join(repoRoot, 'projects', 'forty-cdk');

/**
 * Every secondary entry point (a folder carrying its own `ng-package.json`),
 * excluding `core` — the internal tier is not part of the consumer-facing
 * conventions these matrices govern.
 */
export function entryPoints() {
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(LIB_DIR, e.name, 'ng-package.json')))
    .map((e) => e.name)
    .filter((name) => name !== 'core')
    .sort();
}

/** Non-spec `.ts` files of one entry point's `src/`, as `{ entry, file, id, text }`. */
function sourceFiles(entry) {
  const dir = join(LIB_DIR, entry, 'src');
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir)
    .filter((f) => f.endsWith('.ts') && !f.endsWith('.spec.ts'))
    .sort()
    .map((f) => ({
      entry,
      file: f,
      id: `${entry}/${f.replace(/\.ts$/, '')}`,
      text: readFileSync(join(dir, f), 'utf8'),
    }));
}

/** Every non-spec source file across every entry point, in a stable order. */
export function allSourceFiles() {
  return entryPoints().flatMap(sourceFiles);
}

/**
 * Extracts the `host: { … }` metadata block of a decorator, or `null` when the
 * file declares none. Brace-matched rather than regexed so a nested object
 * literal (`'[style.--for-x]'` maps, `imports: [...]`) can't truncate it.
 */
function hostBlock(text) {
  const start = text.indexOf('host: {');
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start + 'host: '.length; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}') {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Value expression bound to one host attribute, or `null` when unbound. */
function hostBinding(text, attr) {
  const block = hostBlock(text);
  if (!block) {
    return null;
  }
  const match = block.match(
    new RegExp(`'\\[${attr.replace(/[.[\]]/g, '\\$&')}\\]':\\s*(?:'([^']*)'|"([^"]*)")`),
  );
  if (!match) {
    return null;
  }
  return match[1] ?? match[2] ?? null;
}

const MATRIX_START = '<!-- BEGIN GENERATED: convention-matrices -->';
const MATRIX_END = '<!-- END GENERATED: convention-matrices -->';

export { MATRIX_START, MATRIX_END };

/**
 * Writing-direction adopters: every piece exposing the `dir`-aliased input,
 * split by whether it resolves the ambient direction through the shared
 * `injectTextDirection` helper or inherits an already-resolved value.
 */
function writingDirection(files) {
  const resolvers = [];
  const inherited = [];
  for (const { id, text } of files) {
    if (!text.includes("alias: 'dir'")) {
      continue;
    }
    (text.includes('injectTextDirection(') ? resolvers : inherited).push(id);
  }
  return [
    {
      key: '`dir` input → `injectTextDirection`',
      count: resolvers.length,
      members: resolvers,
    },
    {
      key: '`dir` input → inherits a resolved parent value',
      count: inherited.length,
      members: inherited,
    },
  ];
}

/**
 * `ariaLabel` inputs whose default is not `null` — the pieces whose accessible
 * name is mandatory, so the English fallback lives in the scope defaults.
 * Reports the defaults key each one reads, because the key naming is itself a
 * convention (`*AriaLabel`).
 */
function ariaLabelDefaults(files) {
  const members = [];
  for (const { id, text } of files) {
    const match = text.match(/readonly ariaLabel = input<[^>]*>\(\s*([^)]*?)\s*\)/);
    if (!match) {
      continue;
    }
    const argument = match[1];
    if (argument === 'null' || argument === '') {
      continue;
    }
    const key = argument.match(/#defaults\.([A-Za-z]+)/);
    members.push(`${id} → \`${key ? key[1] : argument}\``);
  }
  return [{ key: 'non-`null` `ariaLabel` defaults', count: members.length, members }];
}

/** Entry points shipping a `provideFor<Primitive>Defaults` helper. */
function defaultsProviders(files) {
  const members = [];
  for (const { entry, text } of files) {
    const match = text.match(/^export function (provideFor[A-Za-z]+Defaults)/m);
    if (match) {
      members.push(`${entry} → \`${match[1]}\``);
    }
  }
  return [{ key: 'defaults providers', count: members.length, members }];
}

/**
 * Auto-focus hook adopters, split by binding shape: the free-floating overlays
 * take a function `input` (inherited from the core `ModalSurfaceBase`, so the
 * declaration lives outside any entry point), the trigger-anchored ones an
 * `output`. The imperative managers re-expose the same callback on their config.
 */
function autoFocusHooks(files) {
  const asOutput = [];
  const asInput = [];
  const onConfig = [];
  for (const { id, text } of files) {
    const declared = text.match(/readonly autoFocusOnOpen = (output|input)/);
    if (declared) {
      (declared[1] === 'output' ? asOutput : asInput).push(id);
      continue;
    }
    if (/extends ModalSurfaceBase\b/.test(text)) {
      asInput.push(id);
      continue;
    }
    if (/^\s*autoFocusOnOpen\?:/m.test(text)) {
      onConfig.push(id);
    }
  }
  return [
    {
      key: '`autoFocusOnOpen` as `output<VetoableEvent>()`',
      count: asOutput.length,
      members: asOutput,
    },
    { key: '`autoFocusOnOpen` as a function `input`', count: asInput.length, members: asInput },
    { key: '`autoFocusOnOpen` on a manager config', count: onConfig.length, members: onConfig },
  ];
}

/**
 * `data-state` value sets in use. A binding whose expression carries string
 * literals is grouped by its literal set; one that delegates to a signal or
 * method is grouped as indirect (the prose table above owns those vocabularies,
 * since the value set lives in the delegate's own type).
 */
function dataStateVocabularies(files) {
  const byValueSet = new Map();
  const indirect = [];
  for (const { id, text } of files) {
    const expression = hostBinding(text, 'attr.data-state');
    if (expression === null) {
      continue;
    }
    const literals = [...expression.matchAll(/["']([a-z-]+)["']/g)].map((m) => m[1]);
    if (literals.length === 0) {
      indirect.push(id);
      continue;
    }
    const valueSet = [...new Set(literals)]
      .sort()
      .map((literal) => `"${literal}"`)
      .join(' \\| ');
    if (!byValueSet.has(valueSet)) {
      byValueSet.set(valueSet, []);
    }
    byValueSet.get(valueSet).push(id);
  }
  const rows = [...byValueSet.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([valueSet, members]) => ({
      key: `\`data-state\` = ${valueSet}`,
      count: members.length,
      members,
    }));
  rows.push({
    key: '`data-state` computed by a signal / method',
    count: indirect.length,
    members: indirect,
  });
  return rows;
}

/**
 * Pieces reflecting `aria-hidden` + `inert` while closed — the opt-out from
 * `@if`-driven presence that keeps a mounted-but-closed panel a11y-correct.
 */
function closedInertPanels(files) {
  const members = [];
  for (const { id, text } of files) {
    if (
      hostBinding(text, 'attr.aria-hidden') !== null &&
      hostBinding(text, 'attr.inert') !== null
    ) {
      members.push(id);
    }
  }
  return [{ key: '`aria-hidden` + `inert` while closed', count: members.length, members }];
}

const EXTRACTORS = [
  writingDirection,
  ariaLabelDefaults,
  defaultsProviders,
  autoFocusHooks,
  dataStateVocabularies,
  closedInertPanels,
];

/** Every matrix row, derived from library source. */
export function conventionMatrices() {
  const files = allSourceFiles();
  return EXTRACTORS.flatMap((extract) => extract(files));
}

/**
 * Renders the matrices as the markdown block the conventions doc holds between
 * the generated-section markers. Members are comma-joined inside one cell so a
 * 30-adopter roster stays one row instead of thirty.
 */
export function renderMatrices(rows = conventionMatrices()) {
  const lines = [
    MATRIX_START,
    '',
    '### Generated convention matrices',
    '',
    '**Do not hand-edit the table below** — `scripts/check-convention-matrices.mjs` derives it from',
    'library source and `pnpm postbuild` fails when the two disagree. Regenerate with',
    '`pnpm check:matrices --write`. Every roster the prose above used to spell out by hand lives here,',
    'because a hand-maintained roster is how [#1401](https://github.com/tutkli/forty-cdk/issues/1401)',
    'found seven stale enumerations at once. Ids are `<entry-point>/<source-file>`.',
    '',
    '<!-- prettier-ignore -->',
    '| Matrix | # | Members |',
    '| ------ | - | ------- |',
  ];
  for (const { key, count, members } of rows) {
    const cell = members.length
      ? members.map((m) => (m.includes('`') ? m : `\`${m}\``)).join(', ')
      : '_none_';
    lines.push(`| ${key} | ${count} | ${cell} |`);
  }
  lines.push('', MATRIX_END);
  return lines.join('\n');
}
