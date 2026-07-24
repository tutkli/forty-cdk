import { accessibleTextContent } from './accessible-text';

function host(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('accessibleTextContent', () => {
  it('returns the plain text of a node with no nested elements', () => {
    expect(accessibleTextContent(host('Apple'))).toBe('Apple');
  });

  it('concatenates text across nested elements', () => {
    expect(accessibleTextContent(host('<span>Ap</span><b>ple</b>'))).toBe('Apple');
  });

  it('excludes subtrees marked aria-hidden="true"', () => {
    const el = host('<span aria-hidden="true">✓</span>Apple');
    expect(accessibleTextContent(el)).toBe('Apple');
  });

  it('excludes the glyph nested inside an aria-hidden indicator, then trims', () => {
    const el = host('<span aria-hidden="true">✓</span>\n  Apple');
    expect(accessibleTextContent(el).trim()).toBe('Apple');
  });

  it('keeps text of elements with aria-hidden="false"', () => {
    const el = host('<span aria-hidden="false">Kept</span>Apple');
    expect(accessibleTextContent(el)).toBe('KeptApple');
  });

  it('keeps text of visually-hidden but not aria-hidden content', () => {
    const el = host('<span hidden>Announced</span><span style="display:none">Also</span>Apple');
    expect(accessibleTextContent(el)).toBe('AnnouncedAlsoApple');
  });

  it('excludes deeply nested aria-hidden subtrees only', () => {
    const el = host('<span>Ba<i aria-hidden="true"><b>NO</b></i>na</span>na');
    expect(accessibleTextContent(el)).toBe('Banana');
  });

  it('returns raw untrimmed text', () => {
    expect(accessibleTextContent(host('  spaced  '))).toBe('  spaced  ');
  });

  it('returns an empty string for an element with no text', () => {
    expect(accessibleTextContent(host('<span aria-hidden="true">only</span>'))).toBe('');
  });
});
