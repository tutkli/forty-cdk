import { fencesOf } from '../docs/doc-model.mjs';
import { CORE_SYMBOL_PUBLISHER, INTERNAL_TIER_ENTRY_POINTS } from './core-blessed-tier.mjs';

/**
 * The exemptions a TypeScript fence may declare, as an HTML comment on the
 * line above it (blank lines between the two allowed, since Prettier inserts
 * one): `fragment` for a fence that is deliberately not a whole module and is
 * never compiled, `expect-error` for a fence that makes its point by failing
 * to compile, which the gate then requires to fail with exactly the
 * diagnostic codes the marker names (`<!-- snippet: expect-error TS2305 -->`).
 */
export const SNIPPET_MODES = ['fragment', 'expect-error'];

const MARKER = /^\s*<!--\s*snippet:\s*(\S+)((?:\s+\S+)*?)\s*-->\s*$/;

const DIAGNOSTIC_CODE = /^(?:TS|NG)\d+$/;

const COMPILED_LANGUAGE = 'angular-ts';

const IMPORT_STATEMENT =
  /\b(?:import|export)\b([^;'"]*?)\bfrom\s+['"]([^'"]+)['"]|\bimport\s*\(?\s*['"]([^'"]+)['"]/g;

function markerAbove(lines, fenceLine) {
  let index = fenceLine - 2;
  while (index >= 0 && lines[index].trim() === '') {
    index -= 1;
  }
  if (index < 0) {
    return null;
  }
  const match = MARKER.exec(lines[index]);
  if (match === null) {
    return null;
  }
  const args = match[2].trim();
  return { line: index + 1, value: match[1], args: args === '' ? [] : args.split(/\s+/) };
}

function argumentProblem(marker) {
  if (marker.value === 'fragment') {
    return marker.args.length === 0
      ? null
      : `a fragment marker takes no arguments, and this one carries ${marker.args.join(' ')}`;
  }
  if (marker.args.length === 0) {
    return (
      'an expect-error marker names the diagnostic codes the fence must fail with ' +
      '(<!-- snippet: expect-error TS2305 -->), or a fence that fails for an unrelated ' +
      'reason stays green'
    );
  }
  const invalid = marker.args.filter((code) => !DIAGNOSTIC_CODE.test(code));
  return invalid.length === 0
    ? null
    : `${invalid.map((code) => JSON.stringify(code)).join(', ')} is not a diagnostic code — ` +
        'an expect-error marker lists codes such as TS2305 or NG8001';
}

/**
 * Every TypeScript fence a document holds, each with the mode its marker
 * declares — `compile` when it declares none — and, for an `expect-error`
 * fence, the diagnostic codes it must fail with; plus every marker the
 * document misuses: one naming a mode the gate does not know, one whose
 * arguments the mode does not take, or one sitting above anything other than a
 * TypeScript fence, which would otherwise exempt nothing and say nothing about
 * it.
 *
 * The fence roster is the compiler's own ({@link fencesOf}), so an info string
 * the site highlights as TypeScript is one this gate compiles, with no second
 * list of aliases to keep in step.
 */
export function snippetsOf(source, path) {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const problems = [];
  const claimed = new Set();

  const snippets = fencesOf(source)
    .filter((fence) => fence.language === COMPILED_LANGUAGE)
    .map((fence) => {
      const marker = markerAbove(lines, fence.line);
      let mode = 'compile';
      let expectedCodes = [];
      if (marker !== null) {
        claimed.add(marker.line);
        if (!SNIPPET_MODES.includes(marker.value)) {
          problems.push({
            path,
            line: marker.line,
            message:
              `unknown snippet mode ${JSON.stringify(marker.value)} — ` +
              `a marker reads <!-- snippet: ${SNIPPET_MODES.join(' --> or <!-- snippet: ')} -->`,
          });
        } else {
          mode = marker.value;
          const problem = argumentProblem(marker);
          if (problem === null) {
            expectedCodes = mode === 'expect-error' ? marker.args : [];
          } else {
            problems.push({ path, line: marker.line, message: problem });
          }
        }
      }
      return { path, line: fence.line, code: fence.code, mode, expectedCodes };
    });

  lines.forEach((text, index) => {
    const line = index + 1;
    if (MARKER.test(text) && !claimed.has(line)) {
      problems.push({
        path,
        line,
        message:
          'a snippet marker exempts the TypeScript fence right below it, blank lines aside — ' +
          'nothing here is one, so the marker exempts nothing',
      });
    }
  });

  return { snippets, problems };
}

function namedBindingsOf(clause) {
  const braces = /\{([^}]*)\}/.exec(clause ?? '');
  return (braces?.[1] ?? '')
    .split(',')
    .map(
      (binding) =>
        binding
          .trim()
          .replace(/^type\s+/, '')
          .split(/\s+as\s+/)[0],
    )
    .filter((name) => name !== '');
}

function isInternalTier(specifier) {
  const [scope, entry] = specifier.split('/');
  return scope === 'forty-cdk' && INTERNAL_TIER_ENTRY_POINTS.has(entry ?? '');
}

/**
 * Every import a fence makes from the internal core tier, whatever its mode: a
 * fragment is never compiled, and the import line in it is still the one a
 * reader pastes. Each problem names the public entry point that publishes the
 * symbol, where one does.
 */
export function internalTierImportsOf(snippet) {
  const problems = [];
  for (const match of snippet.code.matchAll(IMPORT_STATEMENT)) {
    const specifier = match[2] ?? match[3];
    if (!isInternalTier(specifier)) {
      continue;
    }
    const line = snippet.line + snippet.code.slice(0, match.index).split('\n').length;
    const names = namedBindingsOf(match[1]);
    const publishers = names.map((name) => {
      const publisher = CORE_SYMBOL_PUBLISHER.get(name);
      return publisher === undefined
        ? `${name} is internal by design`
        : `import ${name} from 'forty-cdk/${publisher}'`;
    });
    problems.push({
      path: snippet.path,
      line,
      message:
        `imports from '${specifier}', the internal tier, which carries no semver guarantee` +
        (publishers.length === 0 ? '' : ` — ${publishers.join('; ')}`),
    });
  }
  return problems;
}
