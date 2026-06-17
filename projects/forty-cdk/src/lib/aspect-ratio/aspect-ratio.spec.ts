import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../test-utils';
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
 * jsdom does not support the `aspect-ratio` CSS property, so it silently drops
 * the value written by Angular's `[style.aspect-ratio]` host binding — both
 * `el.style.aspectRatio` and the inline-`style` attribute stay empty. To read
 * the value Angular actually bound, capture the `setProperty` call at the
 * `CSSStyleDeclaration` boundary (the DOM API the host binding drives) and
 * track the latest `aspect-ratio` write per element.
 */
const originalSetProperty = CSSStyleDeclaration.prototype.setProperty;
const aspectRatioWrites = new WeakMap<CSSStyleDeclaration, string>();

beforeAll(() => {
  CSSStyleDeclaration.prototype.setProperty = function (
    this: CSSStyleDeclaration,
    property: string,
    value: string | null,
    priority?: string,
  ): void {
    if (property === 'aspect-ratio') {
      if (value == null || value === '') {
        aspectRatioWrites.delete(this);
      } else {
        aspectRatioWrites.set(this, value);
      }
    }
    originalSetProperty.call(this, property, value, priority);
  };
});

afterAll(() => {
  CSSStyleDeclaration.prototype.setProperty = originalSetProperty;
});

function boundAspectRatio(el: HTMLElement): string {
  return aspectRatioWrites.get(el.style) ?? '';
}

describe('ForAspectRatio', () => {
  it('applies the aspect-ratio style on the host', () => {
    const { query } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(boundAspectRatio(el)).toBe(String(16 / 9));
  });

  it('updates the aspect-ratio reactively when the input changes', () => {
    const { fixture, query, flush } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    fixture.componentInstance.ratio.set(2);
    flush();
    expect(boundAspectRatio(el)).toBe('2');

    fixture.componentInstance.ratio.set(4 / 3);
    flush();
    expect(boundAspectRatio(el)).toBe(String(4 / 3));
  });

  it('defaults to 1 (square) when ratio is unset', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio></div>`,
    })
    class DefaultHost {}

    const { query } = renderHost(DefaultHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(boundAspectRatio(el)).toBe('1');
  });

  it('coerces a string attribute via numberAttribute', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio ratio="1.5"></div>`,
    })
    class StringHost {}

    const { query } = renderHost(StringHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(boundAspectRatio(el)).toBe('1.5');
  });

  describe('guards non-positive and non-finite ratios', () => {
    it('falls back to 1 when ratio is 0', () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(0);
      flush();

      expect(boundAspectRatio(el)).toBe('1');
    });

    it('falls back to 1 when ratio is negative', () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(-2);
      flush();

      expect(boundAspectRatio(el)).toBe('1');
    });

    it('falls back to 1 when ratio is NaN', () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(NaN);
      flush();

      expect(boundAspectRatio(el)).toBe('1');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects ratio changes after detectChanges without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(AspectRatioHost);
      await flush(fixture);

      const el = fixture.nativeElement.querySelector('[forAspectRatio]') as HTMLElement;
      expect(boundAspectRatio(el)).toBe(String(16 / 9));

      fixture.componentInstance.ratio.set(2);
      await flush(fixture);

      expect(boundAspectRatio(el)).toBe('2');
    });
  });
});
