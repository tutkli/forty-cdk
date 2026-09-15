import {
  heroFencePlacement,
  heroFenceProblems,
  heroSourceOf,
  projectHero,
  withHeroFence,
} from '../../../../../scripts/lib/doc-hero-fence.mjs';
import { PRIMITIVE_DOCS } from './testing/doc-corpus';

/**
 * The rules `check-hero-fences.mjs` publishes the opening `## Examples` fence
 * by ([#1934](https://github.com/tutkli/forty-cdk/issues/1934)).
 *
 * The site replaces the body of that section with the live demos, so a fence
 * written there reaches the package page and nobody working on the site reads
 * it again. Generating it from the hero is what keeps the two in step, and what
 * this states is the three readings that generation rests on: which demo a page
 * calls its hero, what of it a README publishes, and where in the section the
 * fence goes. The gate itself needs a filesystem and a formatter, so it runs as
 * a script; every judgement it makes is here.
 *
 * The fixtures compose the decorator and the framework package name at runtime.
 * The builder's Angular plugin claims any file whose raw text holds either
 * token and is not in its TypeScript program, and a spec in this target is
 * never in it — the same reason `doc-caption.spec.ts` reads pages through a raw
 * glob rather than inlining one.
 */
const PAGE_FILES = import.meta.glob('/projects/forty-cdk-docs/src/app/demos/*/*.page.ts', {
  query: '?raw',
  import: 'default',
  eager: true,
});

interface DemoPage {
  readonly slug: string;
  readonly path: string;
  readonly source: string;
}

const PAGES: readonly DemoPage[] = Object.entries(PAGE_FILES)
  .map(([key, source]) => {
    const path = key.slice(1);
    return { slug: path.split('/')[5]!, path, source };
  })
  .sort((a, b) => a.slug.localeCompare(b.slug));

/** Floors rather than counts: a new page is not a test failure, an empty sweep is. */
const PAGE_FLOOR = 50;
const SECTION_FLOOR = 50;

const CORE = ['@angular', 'core'].join('/');
const DECORATOR = `@${'Component'}`;

function md(...lines: readonly string[]): string {
  return `${lines.join('\n')}\n`;
}

function moduleSource(imported: string, ...body: readonly string[]): string {
  return md(`import { ${imported} } from '${CORE}';`, '', ...body);
}

function component(imported: string, ...properties: readonly string[]): string {
  return moduleSource(imported, `${DECORATOR}({`, ...properties, '})', 'export class Demo {}');
}

const DOCUMENTED = PRIMITIVE_DOCS.filter((doc) => heroFencePlacement(doc.markdown) !== null);

describe('the demo a page calls its hero', () => {
  it('is the one carrying the attribute, read by its source path', () => {
    const page = md(
      '<demo-layout hero sourcePath="switch/examples/default.example.ts"></demo-layout>',
      '<demo-layout title="States" sourcePath="switch/examples/states.example.ts"></demo-layout>',
    );

    expect(heroSourceOf(page)).toBe('switch/examples/default.example.ts');
  });

  it('is found past a subtitle holding the markup that would close the tag', () => {
    const page = md(
      '<demo-layout',
      '  title="Signal Forms"',
      '  subtitle="Bind <code>[formField]</code> and press <kbd>Tab</kbd>."',
      '  sourcePath="switch/examples/form-field.example.ts"',
      '></demo-layout>',
      '<demo-layout',
      '  hero',
      '  subtitle="Press <kbd>Space</kbd> and watch <code>data-state</code>."',
      '  sourcePath="switch/examples/default.example.ts"',
      '></demo-layout>',
    );

    expect(heroSourceOf(page)).toBe('switch/examples/default.example.ts');
  });

  it('is not a demo whose own attribute value merely says the word', () => {
    const page = '<demo-layout title="hero image" sourcePath="avatar/examples/x.example.ts" />';

    expect(heroSourceOf(page)).toBeNull();
  });

  it('is absent from a page that projects none', () => {
    expect(heroSourceOf('<demo-layout title="States" sourcePath="a.ts"></demo-layout>')).toBeNull();
  });

  it('reads every page the site publishes, not a fraction of them', () => {
    expect(PAGES.length).toBeGreaterThanOrEqual(PAGE_FLOOR);
  });
});

describe('what a README publishes of the hero', () => {
  it('drops the stylesheet the page exercises and keeps the composition', () => {
    const source = component(
      'Component',
      "  selector: 'demo',",
      '  template: `<p></p>`,',
      '  styles: `',
      '    p {',
      '      color: red;',
      '    }',
      '  `,',
    );

    expect(projectHero(source)).toBe(
      component('Component', "  selector: 'demo',", '  template: `<p></p>`,'),
    );
  });

  it('drops the encapsulation option that only existed to deliver those styles', () => {
    const source = component(
      'Component, ViewEncapsulation',
      "  selector: 'demo',",
      '  encapsulation: ViewEncapsulation.None,',
      '  template: `<p></p>`,',
      '  styles: `p {}`,',
    );

    expect(projectHero(source)).toBe(
      component('Component', "  selector: 'demo',", '  template: `<p></p>`,'),
    );
  });

  it('keeps the import when something else in the module still names the symbol', () => {
    const source = moduleSource(
      'Component, ViewEncapsulation',
      'export const SHADOW = ViewEncapsulation.ShadowDom;',
      '',
      `${DECORATOR}({`,
      "  selector: 'demo',",
      '  encapsulation: ViewEncapsulation.None,',
      '  styles: `p {}`,',
      '})',
      'export class Demo {}',
    );

    expect(projectHero(source)).toContain(
      `import { Component, ViewEncapsulation } from '${CORE}';`,
    );
  });

  it('drops the stylesheet of every component a file declares, not only the first', () => {
    const source = moduleSource(
      'Component',
      `${DECORATOR}({`,
      "  selector: 'row',",
      '  styles: `li {}`,',
      '})',
      'export class Row {}',
      '',
      `${DECORATOR}({`,
      "  selector: 'demo',",
      '  styles: `p {}`,',
      '})',
      'export class Demo {}',
    );

    expect(projectHero(source)).not.toContain('styles:');
  });

  it('leaves the two words alone where a string literal holds them', () => {
    const source = moduleSource(
      'Component',
      "export const HINT = 'styles: `p {}`';",
      '',
      `${DECORATOR}({ selector: 'demo' })`,
      'export class Demo {}',
    );

    expect(projectHero(source)).toBe(source);
  });

  it('reads a template to its own end, past the backticks it escapes', () => {
    const source = component(
      'Component',
      "  selector: 'demo',",
      '  template: `<pre>styles: \\`p {}\\`</pre>`,',
      '  styles: `p {}`,',
    );

    expect(projectHero(source)).toBe(
      component('Component', "  selector: 'demo',", '  template: `<pre>styles: \\`p {}\\`</pre>`,'),
    );
  });

  it('leaves a module that declares no stylesheet exactly as it stands', () => {
    const source = component('Component', "  selector: 'demo',", '  template: `<p></p>`,');

    expect(projectHero(source)).toBe(source);
  });
});

describe('where in "## Examples" the generated fence goes', () => {
  const API = ['## API', '', 'Reference.'];

  it('is the section’s first fence when that fence is TypeScript', () => {
    const readme = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      ...API,
    );

    expect(heroFencePlacement(readme)?.fence).toEqual({ open: 5, close: 7, code: 'const a = 1;' });
  });

  it('is the TypeScript fence under the section’s first subheading', () => {
    const readme = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '### Stand-alone',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      ...API,
    );

    expect(heroFencePlacement(readme)?.fence?.open).toBe(7);
  });

  it('is no existing fence when the section opens on a template-only sample', () => {
    const readme = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '### Basic usage',
      '',
      '```html',
      '<p></p>',
      '```',
      '',
      '```ts',
      'const later = 1;',
      '```',
      '',
      ...API,
    );

    expect(heroFencePlacement(readme)?.fence).toBeNull();
  });

  it('writes one above the first subheading of a section holding no fence of its own', () => {
    const readme = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '### Basic usage',
      '',
      'Prose.',
      '',
      ...API,
    );

    expect(withHeroFence(readme, 'const hero = 1;\n')).toBe(
      md(
        '## Examples',
        '',
        'Caption.',
        '',
        '```ts',
        'const hero = 1;',
        '```',
        '',
        '### Basic usage',
        '',
        'Prose.',
        '',
        ...API,
      ),
    );
  });

  it('writes one below the caption of a section holding nothing else', () => {
    const readme = md('## Examples', '', 'Caption.', '', ...API);

    expect(withHeroFence(readme, 'const hero = 1;\n')).toBe(
      md('## Examples', '', 'Caption.', '', '```ts', 'const hero = 1;', '```', '', ...API),
    );
  });

  it('replaces the fence it owns and leaves the later ones hand-written', () => {
    const readme = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '```ts',
      'const stale = 1;',
      '```',
      '',
      '### Signal Forms',
      '',
      '```ts',
      'const kept = 2;',
      '```',
      '',
      ...API,
    );

    expect(withHeroFence(readme, 'const hero = 1;\n')).toBe(
      md(
        '## Examples',
        '',
        'Caption.',
        '',
        '```ts',
        'const hero = 1;',
        '```',
        '',
        '### Signal Forms',
        '',
        '```ts',
        'const kept = 2;',
        '```',
        '',
        ...API,
      ),
    );
  });

  it('is the section a document declares, not one a markdown sample writes', () => {
    const readme = md(
      '# Title',
      '',
      '```md',
      '## Examples',
      '```',
      '',
      '## Examples',
      '',
      'Caption.',
      '',
      '```ts',
      'const a = 1;',
      '```',
      '',
      ...API,
    );

    expect(heroFencePlacement(readme)?.fence?.open).toBe(11);
  });

  it('is nowhere in a document that declares no such section', () => {
    expect(heroFencePlacement(md('# Title', '', '## API', '', 'Reference.'))).toBeNull();
  });
});

describe('the drift the gate reports', () => {
  const readme = (code: string) =>
    md('## Examples', '', 'Caption.', '', '```ts', code, '```', '', '## API');
  const hero = { path: 'demos/switch/examples/default.example.ts', code: 'const hero = 1;\n' };
  const path = 'projects/forty-cdk/switch/README.md';

  it('names the README and the hero file the fence was published from', () => {
    const problems = heroFenceProblems([{ path, source: readme('const stale = 1;'), hero }]);

    expect(problems).toEqual([{ path, line: 5, message: expect.stringContaining(hero.path) }]);
  });

  it('says nothing about a fence that is already the hero', () => {
    expect(heroFenceProblems([{ path, source: readme('const hero = 1;'), hero }])).toEqual([]);
  });

  it('reports a section whose page projects no hero to publish it from', () => {
    const problems = heroFenceProblems([{ path, source: readme('const a = 1;'), hero: null }]);

    expect(problems.map((problem) => problem.line)).toEqual([1]);
    expect(problems[0]?.message).toContain('the page projects none');
  });

  it('refuses a snippet marker that would exempt the generated fence from compiling', () => {
    const source = md(
      '## Examples',
      '',
      'Caption.',
      '',
      '<!-- snippet: fragment -->',
      '',
      '```ts',
      'const hero = 1;',
      '```',
      '',
      '## API',
    );

    const problems = heroFenceProblems([{ path, source, hero }]);

    expect(problems.map((problem) => problem.message)).toEqual([
      expect.stringContaining('exempts the generated'),
    ]);
  });

  it('says nothing about a document that declares no "## Examples"', () => {
    const source = md('## API', '', 'Reference.');

    expect(heroFenceProblems([{ path, source, hero: null }])).toEqual([]);
  });
});

describe('the corpus the generator owns', () => {
  it('reads every README declaring the section, not a fraction of them', () => {
    expect(DOCUMENTED.length).toBeGreaterThanOrEqual(SECTION_FLOOR);
  });

  it('carries the generated fence in each of them, with none left to write by hand', () => {
    const fenceless = DOCUMENTED.filter((doc) => heroFencePlacement(doc.markdown)?.fence === null);

    expect(fenceless.map((doc) => doc.slug)).toEqual([]);
  });

  it('pairs each of them with a page naming the hero it is published from', () => {
    const pages = new Map(PAGES.map((page) => [page.slug, page.source]));
    const unpaired = DOCUMENTED.filter((doc) => {
      const page = pages.get(doc.slug);
      return page === undefined || heroSourceOf(page) === null;
    });

    expect(unpaired.map((doc) => doc.slug)).toEqual([]);
  });
});
