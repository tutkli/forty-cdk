import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { repoRoot } from './repo-path.mjs';

const LIB_DIR = join(repoRoot, 'projects', 'forty-cdk');
const CORE_ENTRY_POINT = 'core';

/**
 * Every secondary entry point (a folder carrying its own `ng-package.json`),
 * excluding `core` — the internal tier is not part of the consumer-facing
 * conventions these matrices govern. The matrices that track an *internal*
 * authoring convention read `coreSourceFiles()` on top of this set.
 */
export function entryPoints() {
  return readdirSync(LIB_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory() && existsSync(join(LIB_DIR, e.name, 'ng-package.json')))
    .map((e) => e.name)
    .filter((name) => name !== CORE_ENTRY_POINT)
    .sort();
}

/**
 * Non-spec `.ts` files under one directory, as `{ entry, file, id, text }`.
 * Recurses only when asked: every consumer-facing entry point is flat, and
 * widening their walk would silently change the file set every matrix sees.
 */
function collect(entry, dir, prefix, recursive) {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))
    .flatMap((e) => {
      if (e.isDirectory()) {
        return recursive ? collect(entry, join(dir, e.name), `${prefix}${e.name}/`, true) : [];
      }
      if (!e.name.endsWith('.ts') || e.name.endsWith('.spec.ts')) {
        return [];
      }
      return [
        {
          entry,
          file: `${prefix}${e.name}`,
          id: `${entry}/${prefix}${e.name.replace(/\.ts$/, '')}`,
          text: readFileSync(join(dir, e.name), 'utf8'),
        },
      ];
    });
}

/** Non-spec `.ts` files of one entry point's `src/`, as `{ entry, file, id, text }`. */
function sourceFiles(entry) {
  return collect(entry, join(LIB_DIR, entry, 'src'), '', false);
}

/** Every non-spec source file across every consumer-facing entry point, in a stable order. */
export function allSourceFiles() {
  return entryPoints().flatMap(sourceFiles);
}

/**
 * The same, for `forty-cdk/core`. Walked **recursively** because core's `src/`
 * is one directory per concern rather than flat, so ids carry it
 * (`core/<concern>/<file>`) and stay greppable like every other row.
 */
export function coreSourceFiles() {
  return collect(CORE_ENTRY_POINT, join(LIB_DIR, CORE_ENTRY_POINT, 'src'), '', true);
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

/**
 * Surfaces adopting the dev-mode mounted-while-closed warning — the pieces whose
 * mount *is* their open state, so a consumer's missing `@if` is a wiring bug
 * rather than a shape the library supports.
 *
 * Generated because it is the exact complement of `closedInertPanels` above and
 * the split between them is a judgement per piece: a roster spelled out in prose
 * would let a new overlay ship silent, or let an always-mounted family adopt a
 * warning that fires on markup its own README recommends.
 *
 * The row is *presence of the call*, not unconditional adoption: `menu-content`
 * gates its own on `ForMenuContext.allowsUnconditionalMount`, so the surface is
 * silent under `[forMenubar]` and reports under every other menu root. A row
 * cannot carry that condition and should not try to — the conventions prose the
 * matrices sit under is where the per-root carve-out is stated.
 */
function mountedWhileClosedAdopters(files) {
  const members = files
    .filter(({ text }) => text.includes('warnIfMountedWhileClosed('))
    .map(({ id }) => id);
  return [{ key: 'dev-mode mounted-while-closed warning', count: members.length, members }];
}

/**
 * The `@sanctioned-pull` ledger, grouped by the store each marked effect primes.
 * A pull is an `effect()` that exists to force a lazy fold over a transient
 * source to run; deleting one fails silently and downstream, so the roster is
 * generated rather than trusted to prose. A file carrying several markers for
 * one store appears once — the store is the unit a reviewer verifies.
 *
 * Anchored to a line comment: the marker's own phrase appears in prose too (a
 * JSDoc block explaining the convention), and counting that as a pull would
 * inflate the ledger the roster exists to keep honest.
 *
 * **This is the one extractor that sees `forty-cdk/core`, deliberately.** The
 * other matrices govern consumer-facing contracts, and core has no consumers —
 * hence the entry-point filter. A pull is the opposite: an internal authoring
 * convention, lint-enforced in core with no carve-out, and the shared runner
 * every position-map pull calls lives there. Excluding core would leave the
 * "complete ledger" blind to the file the convention is about, so do not
 * "fix" the inconsistency by putting core back behind the filter.
 */
function sanctionedPulls(files) {
  const byStore = new Map();
  for (const { id, text } of files) {
    for (const match of text.matchAll(/^[ \t]*\/\/[ \t]*@sanctioned-pull\(([a-z][a-z0-9-]*)\)/gm)) {
      const store = match[1];
      if (!byStore.has(store)) {
        byStore.set(store, new Set());
      }
      byStore.get(store).add(id);
    }
  }
  return [...byStore.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([store, members]) => ({
      key: `\`@sanctioned-pull(${store})\``,
      count: members.size,
      members: [...members].sort(),
    }));
}

/**
 * The brace-matched body opening at the first `{` at or after `from`, or `null`.
 * Naive by design: no assertion helper in the library takes an object-literal
 * default parameter, and if one ever does the mis-read lands it in the visible
 * "no dev gate" row rather than hiding it.
 */
function braceBody(text, from) {
  const start = text.indexOf('{', from);
  if (start === -1) {
    return null;
  }
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

/**
 * The assertion-helper ledger: every module-level `assert*` / `throw*` function
 * in library source, split by whether it carries its own `isDevMode()` gate.
 *
 * The policy is that the gate lives **inside the helper**, so it travels with
 * the check and no call site can forget it — which makes "does this helper gate
 * itself" a property of the source rather than of a reviewer's memory. The list
 * was prose until it went stale in the same PR that wrote it (#1583 added two
 * gated helpers and named neither) and, worse, had only ever recorded one of the
 * two ungated ones.
 *
 * The second row is the load-bearing one. An ungated helper is legal only when
 * it **narrows a type** — the assert returns the narrow type, so a production
 * build that skipped it would carry on into a member that does not exist. Any
 * other name appearing there is a policy violation, and it cannot appear
 * silently: the row is regenerated by `pnpm check:matrices --write` and the diff
 * puts the new name in front of a reviewer.
 *
 * Module-level functions only. A directive's own `#assert*` method is a grouped
 * call site that delegates to one of these, not a helper — counting those would
 * fill the ungated row with false positives and drown the signal.
 *
 * Reads core for the same reason `sanctionedPulls` does: this is an internal
 * authoring convention, and four of the eight helpers live there.
 */
function assertionHelpers(files) {
  const gated = [];
  const narrowing = [];
  for (const { id, text } of files) {
    for (const match of text.matchAll(
      /^(?:export )?function ((?:assert|throw)[A-Z]\w*)\s*[(<]/gm,
    )) {
      const body = braceBody(text, match.index + match[0].length - 1);
      (body?.includes('isDevMode()') ? gated : narrowing).push(`${match[1]} (\`${id}\`)`);
    }
  }
  return [
    {
      key: 'assertion helpers, dev-gated inside the helper',
      count: gated.length,
      members: gated.sort(),
    },
    {
      key: 'assertion helpers with no dev gate — they narrow a type',
      count: narrowing.length,
      members: narrowing.sort(),
    },
  ];
}

/**
 * Which file set each extractor reads. `includeCore` is a per-extractor
 * decision rather than a global one: the internal tier stays out of the
 * consumer-facing matrices and inside the internal ones (see `sanctionedPulls`
 * and `assertionHelpers`).
 */
const EXTRACTORS = [
  { extract: writingDirection },
  { extract: ariaLabelDefaults },
  { extract: defaultsProviders },
  { extract: autoFocusHooks },
  { extract: dataStateVocabularies },
  { extract: closedInertPanels },
  { extract: mountedWhileClosedAdopters },
  { extract: sanctionedPulls, includeCore: true },
  { extract: assertionHelpers, includeCore: true },
];

/** Every matrix row, derived from library source. */
export function conventionMatrices() {
  const consumerFacing = allSourceFiles();
  const withCore = [...consumerFacing, ...coreSourceFiles()].sort((a, b) =>
    a.id.localeCompare(b.id),
  );
  return EXTRACTORS.flatMap(({ extract, includeCore }) =>
    extract(includeCore ? withCore : consumerFacing),
  );
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
    'found seven stale enumerations at once. Ids are `<entry-point>/<source-file>`; the two',
    'internal-convention ledgers (sanctioned pulls, assertion helpers) additionally cover',
    '`forty-cdk/core`, whose ids carry the concern directory (`core/<concern>/<file>`).',
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
