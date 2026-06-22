import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LiveAnnouncer } from './live-announcer';

// LiveAnnouncer schedules every text write through `setTimeout(…, 0)` (a
// macrotask, not a microtask — see the service JSDoc for the screen-reader
// rationale). The drain pattern these specs need is therefore a real-timer
// macrotask hop, not `await Promise.resolve()`. Spell the hop inline so future
// readers see the WHY.
const drain = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

describe('LiveAnnouncer', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    // Clean any leaked regions from previous specs.
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  afterEach(() => {
    // The service detaches its own regions on injector destroy, but specs
    // that never tear the injector down (or that override PLATFORM_ID) still
    // need a defensive sweep so the next spec file does not inherit them.
    document.querySelectorAll('[aria-live]').forEach((n) => n.remove());
  });

  it('lazily creates a single polite region in document.body', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(0);

    announcer.announce('hello');
    await drain();

    const regions = document.querySelectorAll<HTMLElement>('[aria-live="polite"]');
    expect(regions.length).toBe(1);
    expect(regions[0]!.textContent).toBe('hello');
    expect(regions[0]!.getAttribute('aria-atomic')).toBe('true');
    expect(regions[0]!.getAttribute('role')).toBe('status');

    announcer.announce('there');
    await drain();

    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(1);
    expect(regions[0]!.textContent).toBe('there');
  });

  it('creates a separate assertive region with role="alert"', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('boom', 'assertive');
    await drain();

    const polite = document.querySelector('[aria-live="polite"]');
    const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]');

    expect(polite).toBeNull();
    expect(assertive!.textContent).toBe('boom');
    expect(assertive!.getAttribute('role')).toBe('alert');
  });

  it('flushes identical consecutive messages through an empty state', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('repeat');
    await drain();
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('repeat');

    // Second call: synchronously clears, then writes the same value via a
    // deferred macrotask.
    announcer.announce('repeat');
    expect(region.textContent).toBe('');
    await drain();
    expect(region.textContent).toBe('repeat');
  });

  it('defers the write to a macrotask, not a microtask (screen-reader timing)', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('deferred');
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;

    // A microtask drain must NOT flush the write — that is the bug this fix
    // closes: a microtask hop is too fast for many screen readers on repeats.
    await Promise.resolve();
    expect(region.textContent).toBe('');

    // The macrotask drain does flush it.
    await drain();
    expect(region.textContent).toBe('deferred');
  });

  it('clear() empties all live regions', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('p');
    announcer.announce('a', 'assertive');
    await drain();

    announcer.clear();

    expect(document.querySelector('[aria-live="polite"]')!.textContent).toBe('');
    expect(document.querySelector('[aria-live="assertive"]')!.textContent).toBe('');
  });

  it('clear() cancels a pending announce so it never paints', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('pending');
    // Region created synchronously by announce(); the write is still queued.
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('');

    announcer.clear();
    await drain();

    expect(region.textContent).toBe('');
  });

  it('a new announce supersedes the pending write of the prior one', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('stale');
    announcer.announce('fresh');
    await drain();

    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('fresh');
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

  it('removes its regions when the injector is destroyed (no leak across specs)', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('polite message');
    announcer.announce('assertive message', 'assertive');
    await drain();
    expect(document.querySelectorAll('[aria-live]').length).toBe(2);

    // Tearing down the injector runs the service's DestroyRef hook, which
    // detaches both regions from document.body.
    TestBed.resetTestingModule();

    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });

  it('isolates regions across application bootstraps', async () => {
    const first = TestBed.inject(LiveAnnouncer);
    first.announce('first');
    await drain();
    expect(document.querySelectorAll('[aria-live]').length).toBe(1);

    TestBed.resetTestingModule();
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const second = TestBed.inject(LiveAnnouncer);
    second.announce('second');
    await drain();

    const regions = document.querySelectorAll<HTMLElement>('[aria-live]');
    expect(regions.length).toBe(1);
    expect(regions[0]!.textContent).toBe('second');
  });

  it('announce() and clear() are no-ops on a non-browser platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const announcer = TestBed.inject(LiveAnnouncer);

    announcer.announce('should not touch the DOM');
    announcer.announce('nor this one', 'assertive');
    await drain();

    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
    // clear() is gated on isPlatformBrowser for SSR-safety symmetry with
    // announce() — it must not throw or touch the DOM on the server.
    expect(() => announcer.clear()).not.toThrow();
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });
});
