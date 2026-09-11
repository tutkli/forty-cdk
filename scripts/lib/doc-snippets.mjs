import { fencesOf } from '../docs/doc-model.mjs';

/**
 * The exemptions a TypeScript fence may declare, as an HTML comment on the
 * line above it (blank lines between the two allowed, since Prettier inserts
 * one): `fragment` for a fence that is deliberately not a whole module and is
 * never compiled, `expect-error` for a fence that makes its point by failing
 * to compile, which the gate then requires to fail.
 */
export const SNIPPET_MODES = ['fragment', 'expect-error'];

const MARKER = /^\s*<!--\s*snippet:\s*(\S+)\s*-->\s*$/;

const COMPILED_LANGUAGE = 'angular-ts';

function markerAbove(lines, fenceLine) {
  let index = fenceLine - 2;
  while (index >= 0 && lines[index].trim() === '') {
    index -= 1;
  }
  if (index < 0) {
    return null;
  }
  const match = MARKER.exec(lines[index]);
  return match === null ? null : { line: index + 1, value: match[1] };
}

/**
 * Every TypeScript fence a document holds, each with the mode its marker
 * declares — `compile` when it declares none — plus every marker the document
 * misuses: one naming a mode the gate does not know, or one sitting above
 * anything other than a TypeScript fence, which would otherwise exempt nothing
 * and say nothing about it.
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
      if (marker !== null) {
        claimed.add(marker.line);
        if (SNIPPET_MODES.includes(marker.value)) {
          mode = marker.value;
        } else {
          problems.push({
            path,
            line: marker.line,
            message:
              `unknown snippet mode ${JSON.stringify(marker.value)} — ` +
              `a marker reads <!-- snippet: ${SNIPPET_MODES.join(' --> or <!-- snippet: ')} -->`,
          });
        }
      }
      return { path, line: fence.line, code: fence.code, mode };
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
