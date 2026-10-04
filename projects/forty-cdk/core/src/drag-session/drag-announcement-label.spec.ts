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
