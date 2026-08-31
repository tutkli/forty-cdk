import {
  ARCHETYPES,
  checkContract,
  checkSections,
  readDocMeta,
  requiredSections,
  ringOf,
  SECTION_EXEMPTIONS,
} from '../../../../../scripts/lib/doc-contract.mjs';
import { splitFrontmatter } from '../../../../../scripts/lib/doc-frontmatter.mjs';
import { compile, FRONTMATTER, readmeProblemsOf } from './testing/compile';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The page-template contract as code
 * ([#1808](https://github.com/tutkli/forty-cdk/issues/1808)).
 *
 * `docs/documentation-site-page-template.md` had been the contract for a year
 * and nothing read it, so 31% of the corpus's sections had drifted outside it
 * and the document disagreed with the code in three places. What makes a
 * contract executable is that a document can fail it — so every case here is
 * stated as a refusal, and the corpus sweep at the end is what says the rules
 * are ones the library's own documentation actually meets.
 */
function readme(...lines: readonly string[]): string {
  return `${[...FRONTMATTER, '', ...lines].join('\n')}\n`;
}

function meta(...fields: readonly string[]) {
  return readDocMeta(`${['---', ...fields, '---', '', '# T', '', 'Lede.'].join('\n')}\n`, 'x.md');
}

describe('frontmatter a README declares', () => {
  it('reads the registry fields the site publishes a page from', () => {
    const { meta: read, problems } = meta(
      'title: Date Picker',
      'group: primitives',
      'archetype: [overlay, form-control]',
      'apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
    );

    expect(problems).toEqual([]);
    expect(read).toEqual({
      title: 'Date Picker',
      group: 'primitives',
      archetype: ['overlay', 'form-control'],
      apgUrl: 'https://www.w3.org/WAI/ARIA/apg/patterns/combobox/',
    });
  });

  it('leaves apgUrl null for a primitive that implements no APG pattern', () => {
    const { meta: read } = meta('title: Avatar', 'group: primitives', 'archetype: [composable-ui]');

    expect(read?.apgUrl).toBeNull();
  });

  it('names every missing required field rather than the first', () => {
    const { meta: read, problems } = meta('apgUrl: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/');

    expect(read).toBeNull();
    expect(problems.map((problem) => problem.message)).toEqual([
      'frontmatter is missing the required field title',
      'frontmatter is missing the required field group',
      'frontmatter is missing the required field archetype',
    ]);
  });

  it('refuses a group the navigation has no place for, naming its line', () => {
    const { meta: read, problems } = meta(
      'title: T',
      'group: widgets',
      'archetype: [composable-ui]',
    );

    expect(read).toBeNull();
    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(3);
    expect(problems[0]!.message).toContain('"widgets" is not one of primitives, utilities, none');
  });

  it('refuses an archetype the contract does not define', () => {
    const { problems } = meta('title: T', 'group: primitives', 'archetype: [composable-ui, popup]');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('"popup" is not one of');
  });

  it('refuses an empty archetype list, which would require nothing of the document', () => {
    const { problems } = meta('title: T', 'group: primitives', 'archetype: []');

    expect(problems[0]!.message).toContain('non-empty list');
  });

  it('refuses a field the schema does not know, so a typo is not silently dropped', () => {
    const { problems } = meta(
      'title: T',
      'group: primitives',
      'archetype: [composable-ui]',
      'apgUrls: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/',
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('apgUrls is not a frontmatter field');
  });

  it('refuses an apgUrl that points anywhere but the APG', () => {
    const { problems } = meta(
      'title: T',
      'group: primitives',
      'archetype: [composable-ui]',
      'apgUrl: https://example.com/pattern',
    );

    expect(problems[0]!.message).toContain('must be a https://www.w3.org/WAI/ARIA/apg/ URL');
  });

  it('refuses a block that never closes rather than reading the document as fields', () => {
    const { problems } = readDocMeta('---\ntitle: T\n\n# T\n\nLede.\n', 'x.md');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('never closes');
  });

  it('refuses a line that is not a field at all', () => {
    const { problems } = meta(
      'title: T',
      'group: primitives',
      'archetype: [composable-ui]',
      'oops',
    );

    expect(problems.some((problem) => problem.message.includes('is not a frontmatter field'))).toBe(
      true,
    );
  });

  it('refuses a field declared twice, which has no defensible reading', () => {
    const { problems } = meta(
      'title: T',
      'title: U',
      'group: primitives',
      'archetype: [composable-ui]',
    );

    expect(problems[0]!.message).toBe('title is declared twice');
  });

  it('blanks the block rather than removing it, so a body line keeps its number', () => {
    const { body } = splitFrontmatter('---\ntitle: T\n---\n\n# T\n');

    expect(body).toBe('\n\n\n\n# T\n');
  });
});

describe('what the compiler does with a README', () => {
  it('refuses one that declares no frontmatter at all', () => {
    const problems = readmeProblemsOf('# T\n\nLede.\n');

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('opens with no frontmatter block');
  });

  it('names the line a field was written on, counted through the block', () => {
    const problems = readmeProblemsOf(
      '---\ntitle: T\ngroup: nowhere\narchetype: [composable-ui]\n---\n\n# T\n\nLede.\n',
    );

    expect(problems[0]!.line).toBe(3);
  });

  it('reports a body problem at the line the file holds it on, block included', () => {
    const problems = readmeProblemsOf(
      readme('# T', '', 'Lede.', '', '## S', '', '```json', '{}', '```'),
    );

    expect(problems).toHaveLength(1);
    expect(problems[0]!.line).toBe(13);
    expect(problems[0]!.message).toContain('marked "json"');
  });

  it('lifts the lede out of the intro, so the page cannot render it twice', () => {
    const document = compile({
      path: 'projects/forty-cdk/thing/README.md',
      slug: 'thing',
      markdown: readme('# T', '', 'What it is.', '', 'More prose.', '', '## API'),
    });

    expect(document.lede).toBe('What it is.');
    expect(document.intro.map((block) => block.markdown)).toEqual(['More prose.']);
  });

  it('takes the first paragraph as the lede even when a blockquote opens the document', () => {
    const document = compile({
      path: 'projects/forty-cdk/thing/README.md',
      slug: 'thing',
      markdown: readme('# T', '', '> See the guide.', '', 'What it is.', '', '## API'),
    });

    expect(document.lede).toBe('What it is.');
    expect(document.intro[0]!.markdown).toBe('> See the guide.');
  });

  it('refuses a README with no lede, which the navigation would show blank', () => {
    const problems = readmeProblemsOf(readme('# T', '', '## API', '', 'Body.'));

    expect(problems).toHaveLength(1);
    expect(problems[0]!.message).toContain('no lede paragraph');
  });

  it('leaves a guide’s intro whole, lede and all', () => {
    const document = compile({
      path: 'docs/styling.md',
      slug: 'styling',
      markdown: '# Styling\n\nWhat it is.\n\n## Hooks\n',
    });

    expect(document.meta).toBeNull();
    expect(document.lede).toBeNull();
    expect(document.intro[0]!.markdown).toBe('What it is.');
  });
});

describe('the three rings a section falls in', () => {
  it('classifies a section every archetype owes as core', () => {
    expect(ringOf('Anatomy')).toBe('core');
    expect(ringOf('API')).toBe('core');
  });

  it('classifies a canonical heading required per archetype as canonical', () => {
    expect(ringOf('Keyboard')).toBe('canonical');
    expect(ringOf('Wrapping in a design system')).toBe('canonical');
  });

  it('classifies the long tail as specific rather than refusing it', () => {
    expect(ringOf('Snap points')).toBe('specific');
    expect(ringOf('Modal touch presentation')).toBe('specific');
  });

  it('reaches the page on every section, which is what the renderer groups by', () => {
    const document = compile({
      path: 'projects/forty-cdk/thing/README.md',
      slug: 'thing',
      markdown: readme('# T', '', 'Lede.', '', '## API', '', 'a', '', '## Snap points', '', 'b'),
    });

    expect(document.sections.map((section) => section.ring)).toEqual(['core', 'specific']);
  });
});

describe('holding a document to its archetypes', () => {
  function documentOf(archetype: string, ...titles: readonly string[]) {
    return compile({
      path: 'projects/forty-cdk/thing/README.md',
      slug: 'thing',
      markdown: `${[
        '---',
        'title: Thing',
        'group: primitives',
        `archetype: [${archetype}]`,
        '---',
        '',
        '# T',
        '',
        'Lede.',
        ...titles.flatMap((title) => ['', `## ${title}`, '', 'Body.']),
      ].join('\n')}\n`,
    });
  }

  it('fails a document missing a section its archetype requires, naming every one', () => {
    const problems = checkSections([
      documentOf('form-control', 'Anatomy', 'Examples', 'API', 'Accessibility'),
    ]);

    expect(problems.map((problem) => problem.message)).toEqual([
      expect.stringContaining('requires a "## Styling" section'),
      expect.stringContaining('requires a "## Wrapping in a design system" section'),
    ]);
    expect(problems[0]!.path).toBe('projects/forty-cdk/thing/README.md');
  });

  it('passes a document that carries every required section', () => {
    const problems = checkSections([
      documentOf('composable-ui', 'Anatomy', 'Examples', 'API', 'Accessibility', 'Styling'),
    ]);

    expect(problems).toEqual([]);
  });

  it('asks a headless utility for nothing it has no DOM to document', () => {
    expect(checkSections([documentOf('headless-utility', 'API')])).toEqual([]);
  });

  it('takes the union of both archetypes when a document declares two', () => {
    const overlay = requiredSections(
      { title: 'T', group: 'primitives', archetype: ['overlay'], apgUrl: null },
      'x',
    );
    const both = requiredSections(
      { title: 'T', group: 'primitives', archetype: ['overlay', 'form-control'], apgUrl: null },
      'x',
    );

    expect(overlay).toContain('Programmatic API');
    expect(overlay).not.toContain('Wrapping in a design system');
    expect(both).toContain('Programmatic API');
    expect(both).toContain('Wrapping in a design system');
  });

  it('drops a requirement the document carries a written exemption for', () => {
    const exempt = SECTION_EXEMPTIONS[0]!;
    const required = requiredSections(
      { title: 'T', group: 'primitives', archetype: [...ARCHETYPES.keys()], apgUrl: null },
      exempt.slug,
    );

    expect(required).not.toContain(exempt.section);
    expect(exempt.reason.length).toBeGreaterThan(0);
  });

  it('fails an exemption naming a document that compiles nothing', () => {
    const problems = checkContract([documentOf('headless-utility', 'API')]);

    expect(problems.some((problem) => problem.message.includes('compiles no document'))).toBe(true);
  });
});

describe('the corpus the library ships', () => {
  const documents = PRIMITIVE_DOCS.map((doc) => compile(doc));

  it('declares frontmatter on every entry point README', () => {
    const missing = documents.filter((document) => document.meta === null);

    expect(missing).toEqual([]);
    expect(documents.length).toBeGreaterThanOrEqual(57);
  });

  it('opens every one with a lede the registry can publish', () => {
    const blank = documents.filter((document) => (document.lede ?? '').trim() === '');

    expect(blank.map((document) => document.path)).toEqual([]);
  });

  it('meets every section its declared archetypes require of it', () => {
    expect(checkContract(documents)).toEqual([]);
  });

  it('spells the scoped-defaults section one way across the library', () => {
    const titles = documents.flatMap((document) =>
      document.sections.map((section) => section.title),
    );

    expect(titles).toContain('Scoped defaults');
    expect(titles).not.toContain('Scope defaults');
  });
});
