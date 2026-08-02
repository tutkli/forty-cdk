import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  type InertSiblingsHandle,
  InertSiblingsStack,
  MODAL_EXEMPT_ATTRIBUTE,
} from '../inert-siblings/inert-siblings';
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

  it('creates both live regions in document.body at construction, before any announce', () => {
    TestBed.inject(LiveAnnouncer);

    const regions = Array.from(
      document.querySelectorAll<HTMLElement>(`body > [${MODAL_EXEMPT_ATTRIBUTE}]`),
    );
    expect(regions.map((r) => r.getAttribute('aria-live'))).toEqual(['polite', 'assertive']);
    expect(regions.map((r) => r.getAttribute('aria-atomic'))).toEqual(['true', 'true']);
    expect(regions.map((r) => r.hasAttribute('role'))).toEqual([false, false]);
    expect(regions.map((r) => r.textContent)).toEqual(['', '']);
  });

  it('writes the first announcement into the pre-existing polite region', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('');

    announcer.announce('hello');
    await drain();
    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(1);
    expect(region.textContent).toBe('hello');

    announcer.announce('there');
    await drain();
    expect(document.querySelectorAll('[aria-live="polite"]').length).toBe(1);
    expect(region.textContent).toBe('there');
  });

  it('keeps assertive announcements out of the polite region', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('boom', 'assertive');
    await drain();

    const polite = document.querySelector<HTMLElement>('[aria-live="polite"]');
    const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]');

    expect(polite!.textContent).toBe('');
    expect(assertive!.textContent).toBe('boom');
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
    // Region exists from construction; the write is still queued.
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('');

    announcer.clear();
    await drain();

    expect(region.textContent).toBe('');
  });

  it('coalesces same-region announces raised in one tick to the latest', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    announcer.announce('first toast');
    announcer.announce('second toast');
    await drain();

    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    expect(region.textContent).toBe('second toast');
  });

  it('writes an assertive and a polite announcement raised in one handler to both regions', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    const polite = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]')!;

    announcer.announce('Item dropped in position 3', 'assertive');
    announcer.announce('Changes saved', 'polite');
    await drain();

    expect(assertive.textContent).toBe('Item dropped in position 3');
    expect(polite.textContent).toBe('Changes saved');
  });

  it('a same-region announce does not cancel the other region pending write', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    const polite = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]')!;

    announcer.announce('drop lifted', 'assertive');
    announcer.announce('toast one', 'polite');
    announcer.announce('toast two', 'polite');
    await drain();

    expect(assertive.textContent).toBe('drop lifted');
    expect(polite.textContent).toBe('toast two');
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

  it('cancels a pending announce on injector destroy so no write outlives it', async () => {
    const announcer = TestBed.inject(LiveAnnouncer);
    const region = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
    announcer.announce('should never paint');
    expect(region.textContent).toBe('');

    TestBed.resetTestingModule();
    await drain();

    expect(region.textContent).toBe('');
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });

  it('isolates regions across application bootstraps', async () => {
    const first = TestBed.inject(LiveAnnouncer);
    first.announce('first');
    await drain();
    expect(document.querySelectorAll('[aria-live]').length).toBe(2);

    TestBed.resetTestingModule();
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const second = TestBed.inject(LiveAnnouncer);
    second.announce('second');
    await drain();

    expect(document.querySelectorAll('[aria-live]').length).toBe(2);
    expect(document.querySelector<HTMLElement>('[aria-live="polite"]')!.textContent).toBe('second');
  });

  it('construction, announce(), and clear() are no-ops on a non-browser platform', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
    });
    const announcer = TestBed.inject(LiveAnnouncer);
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);

    announcer.announce('should not touch the DOM');
    announcer.announce('nor this one', 'assertive');
    await drain();

    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
    // clear() is gated on isPlatformBrowser for SSR-safety symmetry with
    // announce() — it must not throw or touch the DOM on the server.
    expect(() => announcer.clear()).not.toThrow();
    expect(document.querySelectorAll('[aria-live]').length).toBe(0);
  });

  describe('modal-exempt (toast-over-modal announcement contract)', () => {
    let owner: HTMLElement | null = null;
    let handle: InertSiblingsHandle | null = null;

    afterEach(() => {
      handle?.deactivate();
      handle = null;
      owner?.remove();
      owner = null;
    });

    it('stamps the modal-exempt marker on every region at construction', () => {
      TestBed.inject(LiveAnnouncer);

      const polite = document.querySelector<HTMLElement>('[aria-live="polite"]')!;
      const assertive = document.querySelector<HTMLElement>('[aria-live="assertive"]')!;
      expect(polite.hasAttribute(MODAL_EXEMPT_ATTRIBUTE)).toBe(true);
      expect(assertive.hasAttribute(MODAL_EXEMPT_ATTRIBUTE)).toBe(true);
    });

    it('leaves existing regions non-inerted when a modal opens', () => {
      TestBed.inject(LiveAnnouncer);
      owner = document.createElement('div');
      document.body.appendChild(owner);

      handle = TestBed.inject(InertSiblingsStack).activate(owner);

      const regions = document.querySelectorAll<HTMLElement>('[aria-live]');
      expect(regions.length).toBe(2);
      for (const region of regions) {
        expect(region.hasAttribute('inert')).toBe(false);
        expect(region.getAttribute('aria-hidden')).not.toBe('true');
      }
    });

    it('leaves a region created while a modal is already open non-inerted', async () => {
      owner = document.createElement('div');
      document.body.appendChild(owner);
      handle = TestBed.inject(InertSiblingsStack).activate(owner);

      const announcer = TestBed.inject(LiveAnnouncer);
      announcer.announce('shown over an open modal');
      await Promise.resolve();

      const regions = document.querySelectorAll<HTMLElement>('[aria-live]');
      expect(regions.length).toBe(2);
      for (const region of regions) {
        expect(region.hasAttribute('inert')).toBe(false);
        expect(region.getAttribute('aria-hidden')).not.toBe('true');
      }
    });
  });
});
