import type { DocProseBlock } from './doc-model';
import {
  headingText,
  renderDocCell,
  renderDocProse,
  renderInlineMarkdown,
  stripText,
  type DocRenderContext,
} from './markdown';

/**
 * The renderer's half of the split
 * [#1806](https://github.com/tutkli/forty-cdk/issues/1806) drew: the compiler
 * decides a page's structure and its anchors at build time, and this module
 * turns one block of it into markup.
 *
 * What is worth asserting here is the seam rather than `marked`'s output. **The
 * renderer mints no anchor** — it reads them off the block, in the order the
 * headings render — and that is what makes an anchor a function of its document
 * rather than of what the browser rendered before it. The old renderer held a
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

  it('renders a fence, highlighted or not, as a preformatted block', () => {
    const html = renderDocProse(prose('```ts\nconst a = 1;\n```'), null);

    expect(html).toContain('<pre');
    expect(stripText(html)).toContain('const a = 1;');
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
