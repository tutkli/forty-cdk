/**
 * The `<demo-layout>` elements a page projects, in template order
 * ([#1940](https://github.com/tutkli/forty-cdk/issues/1940)).
 *
 * Scanned quote-aware rather than with one regular expression over the element,
 * for the reason `heroSourceOf` was: an attribute value is allowed to carry a
 * `>`, so the first one after `<demo-layout` is not reliably the end of the tag.
 */
export function demosOf(pageSource) {
  const page = pageSource.replace(/\r\n/g, '\n');
  const tag = '<demo-layout';
  const demos = [];
  let index = page.indexOf(tag);

  while (index !== -1) {
    let cursor = index + tag.length;
    let quote = null;
    while (cursor < page.length) {
      const char = page[cursor];
      if (quote !== null) {
        if (char === quote) {
          quote = null;
        }
      } else if (char === '"' || char === "'") {
        quote = char;
      } else if (char === '>') {
        break;
      }
      cursor += 1;
    }

    const attributes = page.slice(index + tag.length, cursor);
    const bare = attributes.replace(/"[^"]*"|'[^']*'/g, '');
    const valueOf = (name) => {
      const match = new RegExp(`\\b${name}=(?:"([^"]*)"|'([^']*)')`).exec(attributes);
      return match === null ? null : (match[1] ?? match[2]);
    };
    demos.push({
      hero: /(^|\s)hero(\s|$)/.test(bare),
      heading: valueOf('heading'),
      sourcePath: valueOf('sourcePath'),
      title: valueOf('title'),
      subtitle: valueOf('subtitle'),
    });
    index = page.indexOf(tag, cursor);
  }

  return demos;
}

/** The inline markup a subtitle was authored with, which no page file writes now. */
const PROSE_MARKUP = /<(code|kbd)>/;

/**
 * Every way a page and its README disagree about the demos below the hero.
 *
 * The two are one set written in two places: the README declares a `###` per
 * secondary demo, carrying its title and the sentence under it, and the page
 * names the heading each `<demo-layout>` belongs to. An unmatched pair either
 * way is the drift this replaces — a demo introduced by nothing, or prose
 * published about a demo that no longer exists — so both directions are
 * reported, each naming the page and the README.
 *
 * Order is held to as well. The rail lists the section's demos from the
 * document and the reader scrolls past them in the page's order, so the two
 * sequences agreeing is what keeps the table of contents honest
 * ([#1863](https://github.com/tutkli/forty-cdk/issues/1863)).
 *
 * @param pages Each `{ path, source, document }`: the page file, its text, and
 * the compiled README behind it.
 */
export function demoHeadingProblems(pages) {
  const problems = [];

  for (const { path, source, document } of pages) {
    const at = (message) => problems.push({ path, message });
    const demos = demosOf(source);

    if (PROSE_MARKUP.test(source)) {
      at(
        'the page writes inline markup, which is prose authored outside the documentation ' +
          `pipeline — write it under its "###" in ${document.path} instead`,
      );
    }

    const declared = document.examples.map((example) => example.slug);
    const claimed = [];

    for (const demo of demos) {
      const names = demo.sourcePath ?? '(no sourcePath)';
      if (demo.title !== null || demo.subtitle !== null) {
        at(
          `the demo for ${names} authors a title or subtitle — both are the "###" it names in ` +
            `${document.path}, so give it a \`heading\` instead`,
        );
        continue;
      }
      if (demo.hero) {
        if (demo.heading !== null) {
          at(
            `the hero names heading "${demo.heading}" — the hero is introduced by the paragraph ` +
              `"## Examples" opens with in ${document.path}, not by a "###"`,
          );
        }
        continue;
      }
      if (demo.heading === null) {
        at(
          `the demo for ${names} names no heading — every demo below the hero is introduced by a ` +
            `"###" under "## Examples" in ${document.path}`,
        );
        continue;
      }
      if (claimed.includes(demo.heading)) {
        at(
          `two demos name heading "${demo.heading}" — one "###" in ${document.path} introduces ` +
            'one demo, or the prose under it is written about both',
        );
        continue;
      }
      if (!declared.includes(demo.heading)) {
        at(
          `the demo for ${names} names heading "${demo.heading}", which ${document.path} does ` +
            'not declare — write it as a "###" under "## Examples", with the sentence the site ' +
            'prints beside the demo',
        );
        continue;
      }
      claimed.push(demo.heading);
    }

    for (const example of document.examples) {
      if (claimed.includes(example.slug)) {
        continue;
      }
      problems.push({
        path: document.path,
        line: example.line,
        message:
          `"### ${example.title}" introduces no demo — ${path} names no \`heading\` of ` +
          `"${example.slug}", so this prose is published about an example the site does not ` +
          'render. Project the demo, or move the subsection out of "## Examples"',
      });
    }

    const ordered = declared.filter((slug) => claimed.includes(slug));
    if (claimed.length === ordered.length && claimed.join('\n') !== ordered.join('\n')) {
      at(
        `the demos are projected in a different order than ${document.path} declares their ` +
          `headings (page: ${claimed.join(', ')}; README: ${ordered.join(', ')}) — the rail ` +
          'reads the document and the reader scrolls the page, so the two have to agree',
      );
    }
  }

  return problems;
}
