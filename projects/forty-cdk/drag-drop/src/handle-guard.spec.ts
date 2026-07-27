import {
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createPointerHandleGuard, type PointerHandleGuard } from './handle-guard';

function withInjector<T>(fn: () => T): T {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection()],
  });
  const injector = TestBed.inject(Injector);
  return runInInjectionContext(injector, fn);
}

function pointerEvent(init: {
  pointerType?: string;
  button?: number;
  target?: Node | null;
}): PointerEvent {
  return {
    pointerType: init.pointerType ?? 'mouse',
    button: init.button ?? 0,
    target: init.target ?? null,
  } as unknown as PointerEvent;
}

describe('createPointerHandleGuard', () => {
  describe('canStart', () => {
    it('returns false when disabled() is true', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(true)));
      expect(guard.canStart(pointerEvent({ pointerType: 'mouse', button: 0 }))).toBe(false);
    });

    it('returns false for a non-left mouse button and true for the left button', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      expect(guard.canStart(pointerEvent({ pointerType: 'mouse', button: 2 }))).toBe(false);
      expect(guard.canStart(pointerEvent({ pointerType: 'mouse', button: 0 }))).toBe(true);
    });

    it('ignores the button check for non-mouse pointers (touch / pen)', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      expect(guard.canStart(pointerEvent({ pointerType: 'touch', button: 2 }))).toBe(true);
    });

    it('returns true when no handles are registered', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      expect(guard.canStart(pointerEvent({ pointerType: 'mouse', button: 0 }))).toBe(true);
    });

    it('with a handle registered, returns true only when the event target is inside the handle', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      const handle = document.createElement('div');
      const inside = document.createElement('span');
      handle.appendChild(inside);
      const outside = document.createElement('span');
      guard.register(handle);

      expect(guard.canStart(pointerEvent({ button: 0, target: inside }))).toBe(true);
      expect(guard.canStart(pointerEvent({ button: 0, target: handle }))).toBe(true);
      expect(guard.canStart(pointerEvent({ button: 0, target: outside }))).toBe(false);
      expect(guard.canStart(pointerEvent({ button: 0, target: null }))).toBe(false);
    });

    it('unregister removes a handle so a handle-less press is allowed again', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      const handle = document.createElement('div');
      const outside = document.createElement('span');
      guard.register(handle);
      expect(guard.canStart(pointerEvent({ button: 0, target: outside }))).toBe(false);

      guard.unregister(handle);
      expect(guard.canStart(pointerEvent({ button: 0, target: outside }))).toBe(true);
    });
  });

  describe('touchAction', () => {
    it("is 'none' when not disabled and no handles are registered", () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      expect(guard.touchAction()).toBe('none');
    });

    it('is null when disabled even with no handles', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(true)));
      expect(guard.touchAction()).toBeNull();
    });

    it('is null once a handle is registered and the disabled signal changes (non-reactive count read)', () => {
      let guard!: PointerHandleGuard;
      const disabled = signal(false);
      withInjector(() => {
        guard = createPointerHandleGuard(disabled);
      });
      const handle = document.createElement('div');
      guard.register(handle);

      // The `handles.size` read is intentionally non-reactive — `touchAction`
      // only recomputes when the disabled signal changes, so toggle it to force
      // a recompute and observe the post-registration value.
      disabled.set(true);
      expect(guard.touchAction()).toBeNull();
      disabled.set(false);
      expect(guard.touchAction()).toBeNull();
    });
  });
});
