import { fencesOf } from '../docs/doc-model.mjs';
import { demosOf } from './doc-demo-headings.mjs';
import { snippetsOf } from './doc-snippets.mjs';

/**
 * The section whose opening fence is published from the page's hero, and the
 * info string that fence is written with.
 */
const SECTION = /^## Examples\s*$/;
const FENCE_LANGUAGE = 'angular-ts';
const FENCE_INFO = 'ts';

/** The metadata a component declares its stylesheet under, and the option that delivers it. */
const STYLES = /^[ \t]*styles: $/;
const ENCAPSULATION = /^[ \t]*encapsulation: ViewEncapsulation\.\w+,?\n/gm;
const ENCAPSULATION_SYMBOL = 'ViewEncapsulation';
const CORE_IMPORT = /import \{([^}]*)\} from '@angular\/core';/;

const normalize = (source) => source.replace(/\r\n/g, '\n');

/** The end of the string literal opening at `start`, one index past its quote. */
function endOfString(source, start) {
  const quote = source[start];
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === quote || char === '\n') {
      return index + 1;
    }
    index += 1;
  }
  return source.length;
}

/**
 * The end of the template literal opening at `start`, one index past its
 * closing backtick.
 *
 * Interpolations are walked rather than skipped, so a template holding a
 * backtick inside `${...}` ends where it is written to end rather than at the
 * first loose backtick.
 */
function endOfTemplate(source, start) {
  let index = start + 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '\\') {
      index += 2;
      continue;
    }
    if (char === '`') {
      return index + 1;
    }
    if (char === '$' && source[index + 1] === '{') {
      index = endOfInterpolation(source, index + 2);
      continue;
    }
    index += 1;
  }
  return source.length;
}

/** The end of an interpolation body, one index past its closing brace. */
function endOfInterpolation(source, start) {
  let index = start;
  let depth = 1;
  while (index < source.length) {
    const char = source[index];
    if (char === '`') {
      index = endOfTemplate(source, index);
      continue;
    }
    if (char === "'" || char === '"') {
      index = endOfString(source, index);
      continue;
    }
    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return index + 1;
      }
    }
    index += 1;
  }
  return source.length;
}

/**
 * The hero example as a README publishes it: the module the site renders,
 * minus the `styles` each component in it declares and the
 * `encapsulation: ViewEncapsulation.None` that only exists to deliver them
 * ([#1934](https://github.com/tutkli/forty-cdk/issues/1934)).
 *
 * The stylesheet is most of what makes a hero four times the size of the fence
 * it replaces, and it is exercised on the page rather than read on npm — so
 * the README shows the composition a reader came for and the CSS stays beside
 * the demo it styles. Dropping the encapsulation option with it is lossless:
 * with no styles left to scope, the two modules behave identically, and a
 * reader copying the fence does not inherit a decision about global CSS that
 * belongs to the site.
 *
 * `styles` is found by scanning the module's own literals in order rather than
 * by matching the word wherever it appears: the property is the one written at
 * the head of a line with a template literal after it, which is what keeps the
 * same two words inside a component's template from being taken for one.
 */
export function projectHero(source) {
  const module = normalize(source);
  const removals = [];
  let index = 0;

  while (index < module.length) {
    const char = module[index];
    if (char === "'" || char === '"') {
      index = endOfString(module, index);
      continue;
    }
    if (char === '/' && module[index + 1] === '/') {
      const newline = module.indexOf('\n', index);
      index = newline === -1 ? module.length : newline;
      continue;
    }
    if (char === '/' && module[index + 1] === '*') {
      const close = module.indexOf('*/', index + 2);
      index = close === -1 ? module.length : close + 2;
      continue;
    }
    if (char !== '`') {
      index += 1;
      continue;
    }

    const opening = index;
    index = endOfTemplate(module, opening);
    const lineStart = module.lastIndexOf('\n', opening) + 1;
    if (!STYLES.test(module.slice(lineStart, opening))) {
      continue;
    }

    let end = index;
    while (end < module.length && (module[end] === ' ' || module[end] === '\t')) {
      end += 1;
    }
    if (module[end] === ',') {
      end += 1;
    }
    if (module[end] === '\n') {
      end += 1;
    }
    removals.push([lineStart, end]);
  }

  let projected = module;
  for (const [start, end] of removals.reverse()) {
    projected = projected.slice(0, start) + projected.slice(end);
  }
  return removals.length === 0 ? projected : withoutEncapsulation(projected);
}

/**
 * The module with the encapsulation option gone, and with the symbol dropped
 * from the `@angular/core` import it is the last use of.
 */
function withoutEncapsulation(module) {
  if (!module.includes(ENCAPSULATION_SYMBOL)) {
    return module;
  }
  const projected = module.replace(ENCAPSULATION, '');
  if (projected.replace(CORE_IMPORT, '').includes(ENCAPSULATION_SYMBOL)) {
    return projected;
  }
  return projected.replace(CORE_IMPORT, (statement, bindings) => {
    const kept = bindings
      .split(',')
      .map((binding) => binding.trim())
      .filter((binding) => binding !== '' && binding !== ENCAPSULATION_SYMBOL);
    return kept.length === 0 ? statement : `import { ${kept.join(', ')} } from '@angular/core';`;
  });
}

/**
 * The `sourcePath` of the demo a page projects above its intro, or `null` when
 * it projects none and when the one it projects names no source.
 */
export function heroSourceOf(pageSource) {
  return demosOf(pageSource).find((demo) => demo.hero)?.sourcePath ?? null;
}

/** The lines one fence occupies, from its opening line to its closing one. */
function spanOf(lines, fence) {
  const body = fence.code === '' ? 0 : fence.code.split('\n').length;
  const close = fence.line + body + 1;
  if (!/^\s*(?:`{3,}|~{3,})\s*$/.test(lines[close - 1] ?? '')) {
    throw new Error(
      `the \`\`\`${fence.lang} fence opening on line ${fence.line} does not close on line ` +
        `${close} — the fence roster and the source have stopped agreeing on where a block ends`,
    );
  }
  return { ...fence, open: fence.line, close };
}

/**
 * Where a README carries the fence this generator owns: the first fence of
 * `## Examples` when that fence is TypeScript, and the line one would be
 * written on when it is not.
 *
 * The first fence rather than the first TypeScript one, because a section
 * opening on a template-only `html` sample is a section whose opening example
 * was never the module the hero renders — inserting above it publishes the
 * hero where a reader meets it, while rewriting a TypeScript fence three
 * subsections down would publish it under someone else's heading.
 *
 * The section's bounds are read past its fences, so a `##` heading inside a
 * markdown sample does not end it early. "TypeScript fence" is the compiler's
 * own roster rather than a second match on info strings, so it means here what
 * it means to the snippet gate.
 */
export function heroFencePlacement(source) {
  const lines = normalize(source).split('\n');
  const fences = fencesOf(source).map((fence) => spanOf(lines, fence));
  const inFence = (line) => fences.some((fence) => line > fence.open && line <= fence.close);

  const heading = lines.findIndex((line, index) => SECTION.test(line) && !inFence(index + 1));
  if (heading === -1) {
    return null;
  }

  const section = heading + 1;
  let end = lines.length;
  for (let index = section; index < lines.length; index += 1) {
    if (/^## /.test(lines[index]) && !inFence(index + 1)) {
      end = index;
      break;
    }
  }

  const within = (line) => line > section && line <= end;
  const first = fences.find((entry) => within(entry.open));
  if (first !== undefined && first.language === FENCE_LANGUAGE) {
    return { section, fence: { open: first.open, close: first.close, code: first.code } };
  }

  const subheading = lines.findIndex(
    (line, index) => /^### /.test(line) && within(index + 1) && !inFence(index + 1),
  );
  const above = Math.min(subheading === -1 ? Infinity : subheading + 1, first?.open ?? Infinity);
  if (Number.isFinite(above)) {
    return { section, fence: null, insert: { line: above, blank: 'after' } };
  }

  let last = end;
  while (last > section && (lines[last - 1] ?? '').trim() === '') {
    last -= 1;
  }
  return { section, fence: null, insert: { line: last + 1, blank: 'before' } };
}

/**
 * The README with the fence this generator owns written from `code`.
 *
 * Replaces the section's opening TypeScript fence where there is one and
 * writes it below the caption where there is none, which is the one order a
 * reader meets the hero in: the sentence the page prints above the demo, the
 * demo's own composition, then whatever the document adds under its own
 * headings.
 */
export function withHeroFence(source, code) {
  const placement = heroFencePlacement(source);
  const lines = normalize(source).split('\n');
  if (placement === null) {
    return lines.join('\n');
  }

  const fence = [`\`\`\`${FENCE_INFO}`, ...code.replace(/\n+$/, '').split('\n'), '```'];
  if (placement.fence !== null) {
    const { open, close } = placement.fence;
    lines.splice(open - 1, close - open + 1, ...fence);
    return lines.join('\n');
  }

  const { line, blank } = placement.insert;
  lines.splice(line - 1, 0, ...(blank === 'after' ? [...fence, ''] : ['', ...fence]));
  return lines.join('\n');
}

/**
 * Every README whose opening `## Examples` fence is not the hero its page
 * projects, stated over documents the caller has already read.
 *
 * Each entry pairs a README — `path` and `source` — with its hero: the `path`
 * the page names and the `code` this generator publishes for it. A hero of
 * `null` is a page that projects none, which is a problem of its own: the
 * opening fence is published from something, or it is drift nobody checks.
 */
export function heroFenceProblems(documents) {
  const problems = [];

  for (const document of documents) {
    const placement = heroFencePlacement(document.source);
    if (placement === null) {
      continue;
    }
    if (document.hero === null) {
      problems.push({
        path: document.path,
        line: placement.section,
        message:
          '"## Examples" opens with the demo its page projects above the intro, and the page ' +
          'projects none — give one the `hero` attribute and a `sourcePath`, or drop the section',
      });
      continue;
    }
    if (withHeroFence(document.source, document.hero.code) !== normalize(document.source)) {
      problems.push({
        path: document.path,
        line: placement.fence?.open ?? placement.section,
        message:
          `the opening "## Examples" fence is generated from ${document.hero.path}, the hero its ` +
          'page projects, and no longer matches it — run `pnpm gen:hero-fences` rather than ' +
          'writing the fence by hand',
      });
      continue;
    }
    if (placement.fence !== null && modeOf(document, placement.fence) !== 'compile') {
      problems.push({
        path: document.path,
        line: placement.fence.open,
        message:
          'a snippet marker exempts the generated "## Examples" fence — the hero is a whole ' +
          'module the site compiles, so drop the marker rather than the one gate that reads it',
      });
    }
  }

  return problems;
}

/** How the snippet gate treats the fence this generator owns. */
function modeOf(document, fence) {
  const { snippets } = snippetsOf(document.source, document.path);
  return snippets.find((snippet) => snippet.line === fence.open)?.mode ?? 'compile';
}
