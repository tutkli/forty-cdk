import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalOwnedRegions } from './modal-owned-regions';

describe('ModalOwnedRegions', () => {
  const appended: HTMLElement[] = [];

  function element(id = ''): HTMLElement {
    const el = document.createElement('div');
    el.id = id;
    document.body.appendChild(el);
    appended.push(el);
    return el;
  }

  function owns(el: HTMLElement): string | null {
    return el.getAttribute('aria-owns');
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    for (const el of appended.splice(0)) {
      el.remove();
    }
  });

  it('lists every registered region in the claiming surface aria-owns', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('polite'));
    regions.register(element('assertive'));
    const surface = element();

    regions.claim(surface);

    expect(owns(surface)).toBe('polite assertive');
  });

  it('adds a region registered while a surface holds the claim', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    const surface = element();
    regions.claim(surface);

    regions.register(element('late'));

    expect(owns(surface)).toBe('late');
  });

  it('drops a region from aria-owns once it unregisters', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    const unregister = regions.register(element('gone'));
    regions.register(element('kept'));
    const surface = element();
    regions.claim(surface);

    unregister();

    expect(owns(surface)).toBe('kept');
  });

  it('gives a region with no id a generated one', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    const region = element();
    regions.register(region);
    const surface = element();

    regions.claim(surface);

    expect(region.id).not.toBe('');
    expect(owns(surface)).toBe(region.id);
  });

  it('merges with the surface own aria-owns and restores it on release', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const surface = element();
    surface.setAttribute('aria-owns', 'consumer');

    const release = regions.claim(surface);
    expect(owns(surface)).toBe('consumer region');

    release();
    expect(owns(surface)).toBe('consumer');
  });

  it('keeps an id the surface already listed when it releases', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const surface = element();
    surface.setAttribute('aria-owns', 'region');

    regions.claim(surface)();

    expect(owns(surface)).toBe('region');
  });

  it('removes aria-owns from a surface that had none once it releases', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const surface = element();

    regions.claim(surface)();

    expect(surface.hasAttribute('aria-owns')).toBe(false);
  });

  it('hands the regions to a stacked surface and back when it releases', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const lower = element();
    const upper = element();
    regions.claim(lower);

    const releaseUpper = regions.claim(upper);
    expect(owns(lower)).toBeNull();
    expect(owns(upper)).toBe('region');

    releaseUpper();
    expect(owns(lower)).toBe('region');
    expect(owns(upper)).toBeNull();
  });

  it('leaves the topmost surface owning the regions when a lower one releases first', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const lower = element();
    const upper = element();
    const releaseLower = regions.claim(lower);
    regions.claim(upper);

    releaseLower();

    expect(owns(lower)).toBeNull();
    expect(owns(upper)).toBe('region');
  });

  it('ignores a second call of the same release', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    regions.register(element('region'));
    const lower = element();
    const upper = element();
    regions.claim(lower);
    const releaseUpper = regions.claim(upper);
    releaseUpper();

    releaseUpper();

    expect(owns(lower)).toBe('region');
  });

  it('leaves out a region inside the owning surface', () => {
    const regions = TestBed.inject(ModalOwnedRegions);
    const surface = element();
    const inner = document.createElement('div');
    inner.id = 'inner';
    surface.appendChild(inner);
    regions.register(inner);
    regions.register(element('outer'));

    regions.claim(surface);

    expect(owns(surface)).toBe('outer');
  });
});
