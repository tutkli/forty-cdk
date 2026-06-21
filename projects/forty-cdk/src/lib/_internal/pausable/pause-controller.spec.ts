import { PLATFORM_ID, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { injectPauseController } from './pause-controller';

type Reason = 'hover' | 'focus' | 'visibility';

function setVisibility(state: 'visible' | 'hidden'): void {
  Object.defineProperty(document, 'visibilityState', {
    configurable: true,
    get: () => state,
  });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('injectPauseController', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    });
    TestBed.resetTestingModule();
  });

  it('is paused while any reason is held and resumes only when all are released', () => {
    const controller = TestBed.runInInjectionContext(() =>
      injectPauseController<Reason>({ trackPageVisibility: false }),
    );

    expect(controller.paused()).toBe(false);

    controller.apply('hover');
    expect(controller.paused()).toBe(true);

    controller.apply('focus');
    expect(controller.paused()).toBe(true);

    controller.release('hover');
    // 'focus' still held, so still paused.
    expect(controller.paused()).toBe(true);

    controller.release('focus');
    expect(controller.paused()).toBe(false);
  });

  it('apply / release are idempotent', () => {
    const controller = TestBed.runInInjectionContext(() =>
      injectPauseController<Reason>({ trackPageVisibility: false }),
    );

    controller.apply('hover');
    controller.apply('hover');
    expect(controller.paused()).toBe(true);

    controller.release('hover');
    expect(controller.paused()).toBe(false);
    // Releasing a not-held reason is a no-op.
    expect(() => controller.release('focus')).not.toThrow();
    expect(controller.paused()).toBe(false);
  });

  it('invokes onChange only on a genuine transition, after paused updates', () => {
    const seen: boolean[] = [];
    const controller = TestBed.runInInjectionContext(() =>
      injectPauseController<Reason>({
        trackPageVisibility: false,
        onChange: (paused) => seen.push(paused),
      }),
    );

    controller.apply('hover');
    // A second reason does not re-fire onChange (paused is already true).
    controller.apply('focus');
    controller.release('hover');
    // 'focus' still held: still paused, no transition, no onChange.
    controller.release('focus');

    expect(seen).toEqual([true, false]);
  });

  it('tracks the page-visibility source by default, seeding from the current state', () => {
    setVisibility('hidden');

    const controller = TestBed.runInInjectionContext(() => injectPauseController<Reason>());
    // Seeded paused because the page is already hidden at construction.
    expect(controller.paused()).toBe(true);

    setVisibility('visible');
    expect(controller.paused()).toBe(false);

    setVisibility('hidden');
    expect(controller.paused()).toBe(true);
  });

  describe('server platform (SSR)', () => {
    beforeEach(() => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
      });
    });

    it('never auto-pauses on the server even when the page reports hidden', () => {
      setVisibility('hidden');
      const controller = TestBed.runInInjectionContext(() => injectPauseController<Reason>());
      expect(controller.paused()).toBe(false);
    });
  });
});
