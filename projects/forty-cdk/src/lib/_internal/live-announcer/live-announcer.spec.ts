import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LiveAnnouncer } from './live-announcer';

// LiveAnnouncer schedules every text write through `queueMicrotask`, so a
// single microtask hop is exactly the drain pattern these specs need —
// `flush(fixture)` would be wrong (there is no fixture / render pipeline
// involved). Spell the hop inline so future readers see the WHY.

describe('LiveAnnouncer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    // Clean any leaked regions from previous specs.
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  afterEach(() => {
    // LiveAnnouncer keeps its regions for the application's lifetime by
    // design; in tests we must detach them so the next spec file does not
    // inherit them. Pairs with the defensive cleanup in beforeEach.
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('lazily creates a single polite region in document.body', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(0);

    announcer.announce('hello');
    await Promise.resolve();

    const regions = document.querySelectorAll<HTMLElement>('[aria-live="polite"]');
    expect(regions.length).toBe(1);
    expect(regions[0]!.textContent).toBe('hello');
    expect(regions[0]!.getAttribute('aria-atomic')).toBe('true');
    expect(regions[0]!.getAttribute('role')).toBe('status');

    announcer.announce('there');
    await Promise.resolve();

    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(1);
    expect(regions[0]!.textContent).toBe('there');
  });

  it('creates a separate assertive region with role="alert"', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('boom', 'assertive');
    await Promise.resolve();

    const polite = document.querySelector('[aria-live="polite"]');
    const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]');

    expect(polite).toBeNull();
    expect(assertive!.textContent).toBe('boom');
    expect(assertive!.getAttribute('role')).toBe('alert');
  });

  it('flushes identical consecutive messages through an empty state', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('repeat');
    await Promise.resolve();
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('repeat');

    // Second call: synchronously clears, then writes the same value via microtask.
    announcer.announce('repeat');
    expect(region.textContent).toBe('');
    await Promise.resolve();
    expect(region.textContent).toBe('repeat');
  });

  it('clear() empties all live regions', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('p');
    announcer.announce('a', 'assertive');
    await Promise.resolve();

    announcer.clear();

    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe('');
    expect(document.querySelector('[aria-live="assertive"]')!.textContent).toBe('');
  });

  it('keeps live regions visually hidden (accessible but not visible)', () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('x');

    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.style.position).toBe('absolute');
    expect(region.style.width).toBe('1px');
    expect(region.style.height).toBe('1px');
    expect(region.style.overflow).toBe('hidden');
  });
});
