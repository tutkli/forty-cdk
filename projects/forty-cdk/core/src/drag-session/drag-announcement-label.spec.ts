import { dragAnnouncementLabel } from './drag-announcement-label';

function row(html: string): HTMLElement {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('dragAnnouncementLabel', () => {
  it('leaves an aria-hidden drag handle glyph out of the name', () => {
    expect(dragAnnouncementLabel(row('<span aria-hidden="true">⠿</span>Row 12'))).toBe('Row 12');
  });

  it('keeps visually-hidden but announced content', () => {
    expect(dragAnnouncementLabel(row('Row 12 <span class="sr-only">(draft)</span>'))).toBe(
      'Row 12 (draft)',
    );
  });

  it('trims the surrounding whitespace of the template', () => {
    expect(dragAnnouncementLabel(row('\n    Row 12\n  '))).toBe('Row 12');
  });
});

describe('dragAnnouncementLabel name resolution', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('separates the text of adjacent element children', () => {
    expect(dragAnnouncementLabel(row('<strong>Write report</strong><span>Friday</span>'))).toBe(
      'Write report Friday',
    );
  });

  it('prefers the aria-label of the node over its content', () => {
    const el = row('<svg aria-hidden="true"></svg>');
    el.setAttribute('aria-label', 'Invoice 42');
    expect(dragAnnouncementLabel(el)).toBe('Invoice 42');
  });

  it('reads a descendant aria-label in place of its content', () => {
    expect(dragAnnouncementLabel(row('Row 3 <button aria-label="Remove">×</button>'))).toBe(
      'Row 3 Remove',
    );
  });

  it('prefers the text aria-labelledby references, joined with spaces, over aria-label', () => {
    document.body.innerHTML = '<span id="a">Quarterly</span><span id="b">plan</span>';
    const el = row('body');
    el.setAttribute('aria-labelledby', 'a missing b');
    el.setAttribute('aria-label', 'ignored');
    document.body.append(el);
    expect(dragAnnouncementLabel(el)).toBe('Quarterly plan');
  });

  it('falls back to aria-label when aria-labelledby resolves no text', () => {
    const el = row('body');
    el.setAttribute('aria-labelledby', 'nowhere');
    el.setAttribute('aria-label', 'Named');
    document.body.append(el);
    expect(dragAnnouncementLabel(el)).toBe('Named');
  });

  it('prefers a non-empty override over every attribute', () => {
    const el = row('body');
    el.setAttribute('aria-label', 'ignored');
    expect(dragAnnouncementLabel(el, '  Custom  ')).toBe('Custom');
    expect(dragAnnouncementLabel(el, '   ')).toBe('ignored');
    expect(dragAnnouncementLabel(el, null)).toBe('ignored');
  });
});
