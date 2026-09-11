import { fencesOf } from '../../../../../scripts/docs/doc-model.mjs';
import { snippetsOf } from '../../../../../scripts/lib/doc-snippets.mjs';
import { PAGE_DOCS, SITE_DOCS } from './testing/doc-corpus';

/**
 * The fence roster `check-doc-snippets.mjs` compiles from
 * ([#1918](https://github.com/tutkli/forty-cdk/issues/1918)): which fences
 * count as TypeScript, the line each is addressed by, and how a marker exempts
 * one. The gate itself runs `tsc` and needs a filesystem, so what is stated
 * here is the extraction it trusts — a fence the roster misses is a fence no
 * gate compiles, and a marker read one line off exempts the wrong one.
 */
function md(...lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}

describe('fencesOf', () => {
  it('resolves the info string through the same grammar map the site highlights with', () => {
    const fences = fencesOf(
      md(
        '```ts',
        'a',
        '```',
        '',
        '```typescript',
        'b',
        '```',
        '',
        '```html',
        'c',
        '```',
        '',
        '```foo',
        'd',
        '```',
      ),
    );
    expect(fences.map((fence) => [fence.lang, fence.language])).toEqual([
      ['ts', 'angular-ts'],
      ['typescript', 'angular-ts'],
      ['html', 'html'],
      ['foo', null],
    ]);
  });

  it('addresses a top-level fence by the line its opening fence is written on', () => {
    const fences = fencesOf(md('# T', '', 'Prose.', '', '```ts', 'const x = 1;', '```'));
    expect(fences).toEqual([{ line: 5, lang: 'ts', language: 'angular-ts', code: 'const x = 1;' }]);
  });

  it('addresses a fence nested in a list item by its own line, not the item’s first', () => {
    const fences = fencesOf(
      md(
        '- First item, which wraps onto',
        '  a second line before the fence.',
        '',
        '  ```ts',
        '  const nested = true;',
        '  ```',
        '',
        '- Second item.',
        '',
        '  ```ts',
        '  const later = true;',
        '  ```',
      ),
    );
    expect(fences.map((fence) => [fence.line, fence.code])).toEqual([
      [4, 'const nested = true;'],
      [10, 'const later = true;'],
    ]);
  });

  it('tells a bare fence opening from the closing fence of the block before it', () => {
    const fences = fencesOf(md('```ts', 'a', '```', '', '```', 'plain', '```'));
    expect(fences.map((fence) => [fence.line, fence.lang])).toEqual([
      [1, 'ts'],
      [5, ''],
    ]);
  });
});

describe('snippetsOf', () => {
  it('compiles a TypeScript fence that declares no marker', () => {
    const { snippets, problems } = snippetsOf(md('```ts', 'const x = 1;', '```'), 'doc.md');
    expect(problems).toEqual([]);
    expect(snippets).toEqual([{ path: 'doc.md', line: 1, code: 'const x = 1;', mode: 'compile' }]);
  });

  it('leaves fences in every other language to their own gates', () => {
    const { snippets } = snippetsOf(
      md('```html', '<p></p>', '```', '', '```css', 'p {}', '```'),
      'doc.md',
    );
    expect(snippets).toEqual([]);
  });

  it('reads a marker across the blank line Prettier puts under it', () => {
    const { snippets, problems } = snippetsOf(
      md('<!-- snippet: fragment -->', '', '```ts', 'readonly x = 1;', '```'),
      'doc.md',
    );
    expect(problems).toEqual([]);
    expect(snippets.map((snippet) => snippet.mode)).toEqual(['fragment']);
  });

  it('reads an expect-error marker written directly above its fence', () => {
    const { snippets } = snippetsOf(
      md('<!-- snippet: expect-error -->', '```ts', "import { X } from 'forty-cdk';", '```'),
      'doc.md',
    );
    expect(snippets.map((snippet) => snippet.mode)).toEqual(['expect-error']);
  });

  it('exempts only the fence right below the marker', () => {
    const { snippets } = snippetsOf(
      md('<!-- snippet: fragment -->', '', '```ts', 'a', '```', '', '```ts', 'b', '```'),
      'doc.md',
    );
    expect(snippets.map((snippet) => [snippet.line, snippet.mode])).toEqual([
      [3, 'fragment'],
      [7, 'compile'],
    ]);
  });

  it('reads an indented marker above a fence nested in a list item', () => {
    const { snippets, problems } = snippetsOf(
      md('- Item.', '', '  <!-- snippet: fragment -->', '', '  ```ts', '  a', '  ```'),
      'doc.md',
    );
    expect(problems).toEqual([]);
    expect(snippets.map((snippet) => [snippet.line, snippet.mode])).toEqual([[5, 'fragment']]);
  });

  it('refuses a marker that names a mode the gate does not know, at its own line', () => {
    const { snippets, problems } = snippetsOf(
      md('Prose.', '', '<!-- snippet: skip -->', '', '```ts', 'a', '```'),
      'doc.md',
    );
    expect(problems.map((problem) => [problem.line, problem.message])).toEqual([
      [3, expect.stringContaining('unknown snippet mode "skip"')],
    ]);
    expect(snippets.map((snippet) => snippet.mode)).toEqual(['compile']);
  });

  it('refuses a marker above anything but a TypeScript fence', () => {
    const { problems } = snippetsOf(
      md(
        '<!-- snippet: fragment -->',
        '',
        '```html',
        '<p></p>',
        '```',
        '',
        '<!-- snippet: fragment -->',
        '',
        'Prose.',
      ),
      'doc.md',
    );
    expect(problems.map((problem) => problem.line)).toEqual([1, 7]);
    expect(problems[0]?.message).toContain('exempts nothing');
  });
});

describe('the corpus the gate compiles', () => {
  it('holds no marker that exempts nothing', () => {
    const problems = SITE_DOCS.flatMap((doc) => snippetsOf(doc.markdown, doc.path).problems);
    expect(problems).toEqual([]);
  });

  it('marks the bare-package import on the installation page expect-error', () => {
    const installation = PAGE_DOCS.find((doc) => doc.path === 'docs/site/installation.md');
    expect(installation).toBeDefined();
    const { snippets } = snippetsOf(installation!.markdown, installation!.path);
    const expected = snippets.filter((snippet) => snippet.mode === 'expect-error');
    expect(expected.map((snippet) => snippet.code)).toEqual([
      "import { ForDialog } from 'forty-cdk';",
    ]);
  });

  it('compiles more fences than it exempts', () => {
    const snippets = SITE_DOCS.flatMap((doc) => snippetsOf(doc.markdown, doc.path).snippets);
    const compiled = snippets.filter((snippet) => snippet.mode === 'compile').length;
    expect(compiled).toBeGreaterThan(snippets.length - compiled);
  });
});
