import {
  Component,
  Directive,
  ElementRef,
  inject,
  provideZonelessChangeDetection,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush } from '../../../src/test-utils/flush';
import { injectAmbientDirection, stampAmbientDirection } from './text-direction';

const PROBES = 50;

let walks = 0;

@Directive({
  selector: '[countingProbe]',
  host: { '[attr.data-resolved]': 'resolved()' },
})
class CountingProbe {
  readonly #host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  readonly resolved = injectAmbientDirection(() => {
    walks++;
    return this.#host.parentElement;
  });
}

@Component({
  imports: [CountingProbe],
  template: `
    <section>
      @for (i of probes; track i) {
        <span countingProbe></span>
      }
    </section>
  `,
})
class ManyRoots {
  readonly probes = Array.from({ length: PROBES }, (_, i) => i);
}

async function mountUnderHtmlLtr() {
  document.documentElement.setAttribute('dir', 'ltr');
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  const fixture = TestBed.createComponent(ManyRoots);
  await flush(fixture);
  await flush(fixture);

  const host = fixture.nativeElement as HTMLElement;
  const resolvedCount = (dir: string): number =>
    host.querySelectorAll(`[data-resolved="${dir}"]`).length;
  expect(resolvedCount('ltr')).toBe(PROBES);
  return { fixture, section: host.querySelector('section')!, resolvedCount };
}

describe('ambient direction revision (#2725)', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('dir');
  });

  it('a portal-style dir stamp on an unrelated element does not re-resolve unrelated roots', async () => {
    const { fixture, resolvedCount } = await mountUnderHtmlLtr();

    const before = walks;
    const overlay = document.createElement('div');
    document.body.appendChild(overlay);
    try {
      stampAmbientDirection(overlay, document.body);
      expect(overlay.getAttribute('dir')).toBe('ltr');
      await flush(fixture);
      await flush(fixture);

      const extra = walks - before;
      expect(resolvedCount('ltr')).toBe(PROBES);
      expect(
        extra,
        `stamping dir on one unrelated overlay re-ran the ancestor walk of ${extra} of the ${PROBES} mounted roots`,
      ).toBe(0);
    } finally {
      overlay.remove();
    }
  });

  it('a dir repeating what an ancestor already declares does not re-resolve the roots below it', async () => {
    const { fixture, section, resolvedCount } = await mountUnderHtmlLtr();

    const before = walks;
    section.setAttribute('dir', 'ltr');
    await flush(fixture);
    await flush(fixture);
    expect(walks - before).toBe(0);

    section.removeAttribute('dir');
    await flush(fixture);
    await flush(fixture);
    expect(walks - before).toBe(0);
    expect(resolvedCount('ltr')).toBe(PROBES);
  });

  it('a dir flip on an ancestor still re-resolves every root beneath it', async () => {
    const { fixture, section, resolvedCount } = await mountUnderHtmlLtr();

    const before = walks;
    section.setAttribute('dir', 'rtl');
    await flush(fixture);
    await flush(fixture);

    expect(walks - before).toBe(PROBES);
    expect(resolvedCount('rtl')).toBe(PROBES);

    section.removeAttribute('dir');
    await flush(fixture);
    await flush(fixture);
    expect(resolvedCount('ltr')).toBe(PROBES);
  });

  it('a <html dir> flip still re-resolves every root', async () => {
    const { fixture, resolvedCount } = await mountUnderHtmlLtr();

    document.documentElement.setAttribute('dir', 'rtl');
    await flush(fixture);
    await flush(fixture);
    expect(resolvedCount('rtl')).toBe(PROBES);
  });
});
