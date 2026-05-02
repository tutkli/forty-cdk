import { Component, signal } from '@angular/core';

import { renderHost } from '../../test-utils/render';
import { ForAspectRatio } from './aspect-ratio';

@Component({
  imports: [ForAspectRatio],
  template: `<div forAspectRatio [ratio]="ratio()"></div>`,
})
class AspectRatioHost {
  readonly ratio = signal(16 / 9);
}

/**
 * jsdom does not parse the `aspect-ratio` CSS property, so reading
 * `el.style.aspectRatio` returns `''`. The inline-style attribute, however,
 * is whatever Angular wrote — read it instead and assert against the
 * substring we expect.
 */
function aspectRatioFromStyleAttr(el: HTMLElement): string {
  const style = el.getAttribute('style') ?? '';
  const match = style.match(/aspect-ratio:\s*([^;]+)/i);
  return match ? match[1]!.trim() : '';
}

describe('ForAspectRatio', () => {
  it('applies the aspect-ratio style on the host', () => {
    const { query } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(aspectRatioFromStyleAttr(el)).toBe(String(16 / 9));
  });

  it('updates the aspect-ratio reactively when the input changes', () => {
    const { fixture, query, flush } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    fixture.componentInstance.ratio.set(1);
    flush();
    expect(aspectRatioFromStyleAttr(el)).toBe('1');

    fixture.componentInstance.ratio.set(4 / 3);
    flush();
    expect(aspectRatioFromStyleAttr(el)).toBe(String(4 / 3));
  });

  it('defaults to 1 (square) when ratio is unset', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio></div>`,
    })
    class DefaultHost {}

    const { query } = renderHost(DefaultHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(aspectRatioFromStyleAttr(el)).toBe('1');
  });

  it('coerces a string attribute via numberAttribute', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio ratio="1.5"></div>`,
    })
    class StringHost {}

    const { query } = renderHost(StringHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(aspectRatioFromStyleAttr(el)).toBe('1.5');
  });

  describe('zoneless reactivity', () => {
    it('reflects ratio changes after detectChanges without Zone.js', () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      expect(aspectRatioFromStyleAttr(el)).toBe(String(16 / 9));

      fixture.componentInstance.ratio.set(2);
      flush();

      expect(aspectRatioFromStyleAttr(el)).toBe('2');
    });
  });
});
