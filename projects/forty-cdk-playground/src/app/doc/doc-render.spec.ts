import type { DocProseBlock } from '../../../../../scripts/docs/doc-model.mjs';
import {
  headingText,
  renderDocCell,
  renderDocProse,
  renderDocument,
  renderInlineMarkdown,
  type DocRenderContext,
} from '../../../../../scripts/docs/doc-render.mjs';
import { stripText } from '../../../../../scripts/lib/html.mjs';
import { compile, FRONTMATTER } from './testing/compile';

/**
 * The renderer's half of the split
 * [#1806](https://github.com/tutkli/forty-cdk/issues/1806) drew: the compiler
 * decides a page's structure and its anchors, and this module turns one block of
 * it into markup. Both halves run at build time as of
 * [#1807](https://github.com/tutkli/forty-cdk/issues/1807) — which is what these
 * cases are now stated over, since neither `marked` nor Shiki is on the page any
 * more and the markup a browser receives is decided here or nowhere.
 *
 * What is worth asserting is the seam rather than `marked`'s output. **The
 * renderer mints no anchor** — it reads them off the block, in the order the
 * headings render — and that is what makes an anchor a function of its document
 * rather than of what was rendered before it. The old renderer held a
 * module-level `Slugger` and depended on a `reset()` call one line away from
 * being lost; there is nothing left here to reset.
 */
function prose(markdown: string, headingSlugs: readonly string[] = []): DocProseBlock {
  return { kind: 'prose', markdown, headingSlugs };
}

function idsOf(html: string): readonly string[] {
  return [...html.matchAll(/<h[1-6] id="([^"]+)"/g)].map((match) => match[1]!);
}

describe('rendering a prose block', () => {
  it('takes each heading id from the block, in render order', () => {
    const html = renderDocProse(prose('### One\n\ntext\n\n#### Two', ['first', 'second']), null);

    expect(idsOf(html)).toEqual(['first', 'second']);
    expect(html).toContain('<h3 id="first">');
    expect(html).toContain('<h4 id="second">');
  });

  it('renders the heading’s own inline markdown inside the tag', () => {
    const html = renderDocProse(prose('### `ForButton`', ['forbutton']), null);

    expect(html).toContain('<h3 id="forbutton"><code>ForButton</code></h3>');
  });

  it('gives the same ids however many blocks were rendered before it', () => {
    const block = prose('### API', ['api']);

    const first = renderDocProse(block, null);
    renderDocProse(prose('### API', ['api-7']), null);
    const again = renderDocProse(block, null);

    expect(again).toBe(first);
    expect(idsOf(again)).toEqual(['api']);
  });

  it('refuses a block carrying fewer anchors than it renders headings', () => {
    expect(() => renderDocProse(prose('### One\n\n### Two', ['only-one']), null)).toThrow(
      /no anchor for "Two"/,
    );
  });

  it('refuses a block carrying more anchors than it renders headings', () => {
    expect(() => renderDocProse(prose('### One', ['one', 'two']), null)).toThrow(
      /2 heading anchor\(s\) for a block rendering 1/,
    );
  });

  it('resolves a link through the context it was handed', () => {
    const context: DocRenderContext = {
      sourcePath: 'projects/forty-cdk/accordion/README.md',
      resolveLink: (href) => (href === './other.md' ? { href: '/other', route: '/other' } : null),
    };

    const html = renderDocProse(prose('[go](./other.md)'), context);

    expect(html).toContain('href="/other"');
    expect(html).toContain('data-doc-route="/other"');
  });

  it('marks a link that resolves to no route as leaving the site', () => {
    const context: DocRenderContext = {
      sourcePath: 'docs/styling.md',
      resolveLink: () => ({ href: 'https://github.com/x', route: null }),
    };

    const html = renderDocProse(prose('[src](../thing.ts)'), context);

    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer noopener"');
  });

  it('leaves a link alone when no context resolves it', () => {
    const html = renderDocProse(prose('[out](https://example.com)'), null);

    expect(html).toContain('href="https://example.com"');
    expect(html).not.toContain('data-doc-route');
  });

  it('highlights a fence into both of the themes the site ships', () => {
    const html = renderDocProse(prose('```ts\nconst a = 1;\n```'), null);

    expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(html).toContain('--shiki-light:');
    expect(html).toContain('--shiki-dark:');
    expect(stripText(html)).toContain('const a = 1;');
  });

  it('highlights a bare fence as plain text, framed like its neighbours', () => {
    const html = renderDocProse(prose('```\njust words\n```'), null);

    expect(html).toContain('class="shiki shiki-themes github-light github-dark"');
    expect(stripText(html)).toContain('just words');
  });

  it('refuses a fence in a language no grammar is loaded for', () => {
    expect(() => renderDocProse(prose('```json\n{}\n```'), null)).toThrow(/"json" fence/);
  });

  it('leaves the renderer with no state once a block has rendered', () => {
    renderDocProse(prose('### One', ['one']), null);

    expect(() => renderDocProse(prose('### Two', ['two']), null)).not.toThrow();
  });
});

describe('rendering a table cell', () => {
  it('returns markup to bind and text for a label', () => {
    const cell = renderDocCell('`Side | undefined`');

    expect(cell.html).toBe('<code>Side | undefined</code>');
    expect(cell.text).toBe('Side | undefined');
  });

  it('renders a link inside a cell through the context', () => {
    const cell = renderDocCell('see [that](./that.md)', {
      sourcePath: 'docs/a.md',
      resolveLink: () => ({ href: '/that', route: '/that' }),
    });

    expect(cell.html).toContain('data-doc-route="/that"');
    expect(cell.text).toBe('see that');
  });
});

describe('reading a heading as plain text', () => {
  it('resolves inline code away, which is what the table of contents shows', () => {
    expect(headingText('`ForAccordionTrigger`')).toBe('ForAccordionTrigger');
    expect(headingText('Scope **defaults**')).toBe('Scope defaults');
  });

  it('drops a literal angle-bracket run, which stripText cannot tell from a tag', () => {
    expect(renderInlineMarkdown('a <b> c')).toContain('<b>');
    expect(stripText('a <b> c')).toBe('a  c');
  });
});

/**
 * What a page receives, and what it no longer has to work out for itself.
 *
 * The one thing the build cannot decide is the path the site is served from, so
 * the href of an in-app route is written with a token in front of it and the
 * page substitutes its base. That is the whole of the runtime link work: the
 * repository-relative link the author wrote, the route it maps to, and the
 * GitHub blob it falls back to are all resolved here.
 */
describe('rendering a whole document for its page', () => {
  const ROUTES = new Map([
    ['projects/forty-cdk/accordion', '/accordion'],
    ['projects/forty-cdk/accordion/README.md', '/accordion'],
    ['docs/styling.md', '/guides/styling'],
  ]);

  function render(...lines: readonly string[]) {
    const markdown = `${[...FRONTMATTER, '', ...lines].join('\n')}\n`;
    return renderDocument(
      compile({ path: 'projects/forty-cdk/thing/README.md', slug: 'thing', markdown }),
      { routes: ROUTES },
    );
  }

  it('writes the base-href token in front of an in-app route, and the route beside it', () => {
    const page = render('# T', '', 'Lede.', '', 'See [styling](../../../docs/styling.md).');

    expect(page.intro[0]!.html).toContain('href="%DOC_BASE%guides/styling"');
    expect(page.intro[0]!.html).toContain('data-doc-route="/guides/styling"');
  });

  it('sends a link the site publishes no route for to its source on GitHub', () => {
    const page = render('# T', '', 'Lede.', '', 'See [the source](../src/thing.ts).');

    expect(page.intro[0]!.html).toContain(
      'href="https://github.com/tutkli/forty-cdk/blob/main/projects/forty-cdk/src/thing.ts"',
    );
    expect(page.intro[0]!.html).toContain('target="_blank"');
    expect(page.intro[0]!.html).not.toContain('%DOC_BASE%');
  });

  it('renders every table cell once, as markup and as the text its labels read', () => {
    const page = render(
      '# T',
      '',
      'Lede.',
      '',
      '## API',
      '',
      '| Property | Type | Default | Description |',
      '| - | - | - | - |',
      '| `open` | `boolean` | `false` | Whether it is [open](../../../docs/styling.md). |',
    );
    const block = page.sections[0]!.blocks[0]!;
    const table = block.kind === 'table' && block.table.role === 'api' ? block.table : null;

    expect(table!.columns).toEqual({
      property: 'Property',
      type: 'Type',
      default: 'Default',
      description: 'Description',
    });
    expect(table!.rows[0]!.property).toEqual({ html: '<code>open</code>', text: 'open' });
    expect(table!.rows[0]!.description.html).toContain('data-doc-route="/guides/styling"');
    expect(table!.rows[0]!.description.text).toBe('Whether it is open.');
  });

  it('resolves inline markup out of the titles a page renders as text', () => {
    const page = render(
      '# T',
      '',
      'Lede.',
      '',
      '## Scoped `defaults`',
      '',
      '### The `open` model',
      '',
      'Body.',
    );

    expect(page.sections[0]!.title).toBe('Scoped defaults');
    expect(page.sections[0]!.headings[0]).toEqual({
      depth: 3,
      text: 'The open model',
      slug: 'the-open-model',
    });
  });

  it('carries nothing the page does not read, markdown included', () => {
    const page = render(
      '# T',
      '',
      'Lede.',
      '',
      'Intro prose.',
      '',
      '## S',
      '',
      '| Key | Action |',
      '| - | - |',
      '| Tab | Moves focus |',
    );
    const block = page.sections[0]!.blocks[0]!;
    const table = block.kind === 'table' && block.table.role === 'plain' ? block.table : null;

    expect(Object.keys(page)).toEqual(['intro', 'behaviorGroup', 'sections']);
    expect(Object.keys(page.intro[0]!)).toEqual(['kind', 'html']);
    expect(Object.keys(page.sections[0]!)).toEqual(['title', 'slug', 'ring', 'headings', 'blocks']);
    expect(Object.keys(table!.columns[0]!)).toEqual(['html', 'text']);
  });
});
