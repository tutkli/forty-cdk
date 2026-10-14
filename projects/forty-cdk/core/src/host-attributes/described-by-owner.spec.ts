import { signal } from '@angular/core';

import { composeIds, contributeDescribedBy } from './described-by-owner';

function element(describedBy?: string): HTMLElement {
  const el = document.createElement('div');
  if (describedBy !== undefined) {
    el.setAttribute('aria-describedby', describedBy);
  }
  return el;
}

describe('contributeDescribedBy', () => {
  it('composes every contribution after the consumer value, in registration order', () => {
    const el = element('hint');
    const first = contributeDescribedBy(el, () => 'tip');
    const second = contributeDescribedBy(el, () => 'desc error');

    second.write();

    expect(el.getAttribute('aria-describedby')).toBe('hint tip desc error');
    el.removeAttribute('aria-describedby');
    first.write();
    expect(el.getAttribute('aria-describedby')).toBe('hint tip desc error');
  });

  it('writes the same value from whichever contribution writes', () => {
    const el = element();
    const tip = signal<string | null>(null);
    const first = contributeDescribedBy(el, () => tip());
    const second = contributeDescribedBy(el, () => 'desc');
    second.write();

    tip.set('tip');
    first.write();

    expect(el.getAttribute('aria-describedby')).toBe('tip desc');
  });

  it('captures the consumer value once, before any contribution writes', () => {
    const el = element('hint');
    const first = contributeDescribedBy(el, () => 'tip');
    first.write();
    const second = contributeDescribedBy(el, () => 'desc');

    expect(second.consumer).toBe('hint');
    second.write();
    expect(el.getAttribute('aria-describedby')).toBe('hint tip desc');
  });

  it('keeps the other contributions when one is released', () => {
    const el = element('hint');
    const first = contributeDescribedBy(el, () => 'tip');
    const second = contributeDescribedBy(el, () => 'desc');
    second.write();

    first.release();

    expect(el.getAttribute('aria-describedby')).toBe('hint desc');
  });

  it('restores the consumer value once the last contribution is released', () => {
    const el = element('hint');
    const only = contributeDescribedBy(el, () => 'desc');
    only.write();

    only.release();

    expect(el.getAttribute('aria-describedby')).toBe('hint');
  });

  it('removes the attribute on release when the consumer set none', () => {
    const el = element();
    const only = contributeDescribedBy(el, () => 'desc');
    only.write();

    only.release();

    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });

  it('ignores a second release of the same contribution', () => {
    const el = element();
    const first = contributeDescribedBy(el, () => 'tip');
    first.release();
    const second = contributeDescribedBy(el, () => 'desc');
    second.write();

    first.release();

    expect(el.getAttribute('aria-describedby')).toBe('desc');
  });

  it('removes the attribute while no contribution has ids and no consumer value exists', () => {
    const el = element();
    const only = contributeDescribedBy(el, () => null);

    only.write();

    expect(el.hasAttribute('aria-describedby')).toBe(false);
  });
});

describe('composeIds', () => {
  it('returns the library ids when the consumer has none', () => {
    expect(composeIds(null, 'a b')).toBe('a b');
  });

  it('returns the consumer ids when the library has none', () => {
    expect(composeIds('hint', null)).toBe('hint');
  });

  it('returns null when neither side has ids', () => {
    expect(composeIds(null, null)).toBeNull();
  });

  it('puts the consumer ids first and appends the library ids', () => {
    expect(composeIds('hint', 'desc error')).toBe('hint desc error');
  });

  it('does not duplicate an id the consumer already references', () => {
    expect(composeIds('hint desc', 'desc error')).toBe('hint desc error');
  });
});
