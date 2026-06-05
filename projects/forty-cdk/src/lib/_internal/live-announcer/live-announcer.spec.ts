import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
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
    // The service detaches its own regions on injector destroy, but specs
    // that never tear the injector down (or that override PLATFORM_ID) still
    // need a defensive sweep so the next spec file does not inherit them.
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

  it('clear() cancels a pending announce so it never paints', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('pending');
    // Region created synchronously by announce(); the write is still queued.
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('');

    announcer.clear();
    await Promise.resolve();

    expect(region.textContent).toBe('');
  });

  it('a new announce supersedes the pending microtask of the prior one', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('stale');
    announcer.announce('fresh');
    await Promise.resolve();

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
    await Promise.resolve();
    expect(document.querySelectorAll('[aria-live]').length).toBe(2);

    // Tearing down the injector runs the service's DestroyRef hook, which
    // detaches both regions from document.body.
    TestBed.resetTestingModule();

    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });

  it('isolates regions across application bootstraps', async () => {
    const first = TestBed.inject(LiveAnnouncer);
    first.announce('first');
    await Promise.resolve();
    expect(document.querySelectorAll('[aria-live]').length).toBe(1);

    TestBed.resetTestingModule();
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const second = TestBed.inject(LiveAnnouncer);
    second.announce('second');
    await Promise.resolve();

    const regions = document.querySelectorAll<HTMLElement>('[aria-live]');
    expect(regions.length).toBe(1);
    expect(regions[0]!.textContent).toBe('second');
  });

  it('announce() is a no-op on a non-browser platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const announcer = TestBed.inject(LiveAnnouncer);

    announcer.announce('should not touch the DOM');
    announcer.announce('nor this one', 'assertive');
    await Promise.resolve();

    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
    expect(() => announcer.clear()).not.toThrow();
  });
});
