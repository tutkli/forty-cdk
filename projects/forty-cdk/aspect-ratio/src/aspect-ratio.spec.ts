import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../src/test-utils';
import { renderHost } from '../../src/test-utils/render';
import { ForAspectRatio } from './aspect-ratio';

@Component({
  imports: [ForAspectRatio],
  template: `<div forAspectRatio [ratio]="ratio()"></div>`,
})
class AspectRatioHost {
  readonly ratio = signal(16 / 9);
}

describe('ForAspectRatio', () => {
  it('applies the aspect-ratio style on the host', () => {
    const { query } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(el.style.aspectRatio).toBe(`${16 / 9} / 1`);
  });

  it('updates the aspect-ratio reactively when the input changes', async () => {
    const { fixture, query, flush } = renderHost(AspectRatioHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    fixture.componentInstance.ratio.set(2);
    await flush();
    expect(el.style.aspectRatio).toBe('2 / 1');

    fixture.componentInstance.ratio.set(4 / 3);
    await flush();
    expect(el.style.aspectRatio).toBe(`${4 / 3} / 1`);
  });

  it('defaults to 1 (square) when ratio is unset', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio></div>`,
    })
    class DefaultHost {}

    const { query } = renderHost(DefaultHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(el.style.aspectRatio).toBe('1 / 1');
  });

  it('coerces a string attribute via numberAttribute', () => {
    @Component({
      imports: [ForAspectRatio],
      template: `<div forAspectRatio ratio="1.5"></div>`,
    })
    class StringHost {}

    const { query } = renderHost(StringHost);
    const el = query<HTMLElement>('[forAspectRatio]')!;

    expect(el.style.aspectRatio).toBe('1.5 / 1');
  });

  describe('guards non-positive and non-finite ratios', () => {
    it('falls back to 1 when ratio is 0', async () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(0);
      await flush();

      expect(el.style.aspectRatio).toBe('1 / 1');
    });

    it('falls back to 1 when ratio is negative', async () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(-2);
      await flush();

      expect(el.style.aspectRatio).toBe('1 / 1');
    });

    it('falls back to 1 when ratio is NaN', async () => {
      const { fixture, query, flush } = renderHost(AspectRatioHost);
      const el = query<HTMLElement>('[forAspectRatio]')!;

      fixture.componentInstance.ratio.set(NaN);
      await flush();

      expect(el.style.aspectRatio).toBe('1 / 1');
    });
  });

  describe('reactive updates', () => {
    it('reflects a ratio change in the bound aspect-ratio', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(AspectRatioHost);
      await flush(fixture);

      const el = fixture.nativeElement.querySelector('[forAspectRatio]') as HTMLElement;
      expect(el.style.aspectRatio).toBe(`${16 / 9} / 1`);

      fixture.componentInstance.ratio.set(2);
      await flush(fixture);

      expect(el.style.aspectRatio).toBe('2 / 1');
    });
  });
});
