import {
  Injector,
  provideZonelessChangeDetection,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { createPointerHandleGuard } from './handle-guard';

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

    it('follows a handle registered and unregistered after creation', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      const handle = document.createElement('div');

      guard.register(handle);
      expect(guard.touchAction()).toBeNull();

      guard.unregister(handle);
      expect(guard.touchAction()).toBe('none');
    });

    it("handleTouchAction is 'none' while enabled and null while disabled", () => {
      const disabled = signal(false);
      const guard = withInjector(() => createPointerHandleGuard(disabled));
      expect(guard.handleTouchAction()).toBe('none');

      disabled.set(true);
      expect(guard.handleTouchAction()).toBeNull();
    });
  });

  describe('nested draggables', () => {
    it('rejects a press inside a registered nested host and accepts one outside it', () => {
      const guard = withInjector(() => createPointerHandleGuard(signal(false)));
      const nested = document.createElement('li');
      const inside = document.createElement('span');
      nested.appendChild(inside);
      const outside = document.createElement('span');
      guard.registerNested(nested);

      expect(guard.canStart(pointerEvent({ target: inside }))).toBe(false);
      expect(guard.canStart(pointerEvent({ target: nested }))).toBe(false);
      expect(guard.canStart(pointerEvent({ target: outside }))).toBe(true);
      expect(guard.owns(inside)).toBe(false);
      expect(guard.owns(outside)).toBe(true);

      guard.unregisterNested(nested);
      expect(guard.canStart(pointerEvent({ target: inside }))).toBe(true);
    });
  });

  describe('suppressNativeDrag', () => {
    function dragStart(target: Node): Event {
      const event = new Event('dragstart', { cancelable: true });
      Object.defineProperty(event, 'target', { value: target });
      return event;
    }

    it('cancels a dragstart the guard would accept and leaves the others alone', () => {
      const disabled = signal(false);
      const guard = withInjector(() => createPointerHandleGuard(disabled));
      const handle = document.createElement('div');
      const inHandle = document.createElement('img');
      handle.appendChild(inHandle);
      const outside = document.createElement('img');

      const accepted = dragStart(outside);
      guard.suppressNativeDrag(accepted);
      expect(accepted.defaultPrevented).toBe(true);

      guard.register(handle);
      const offHandle = dragStart(outside);
      guard.suppressNativeDrag(offHandle);
      expect(offHandle.defaultPrevented).toBe(false);

      const onHandle = dragStart(inHandle);
      guard.suppressNativeDrag(onHandle);
      expect(onHandle.defaultPrevented).toBe(true);

      disabled.set(true);
      const whileDisabled = dragStart(inHandle);
      guard.suppressNativeDrag(whileDisabled);
      expect(whileDisabled.defaultPrevented).toBe(false);
    });
  });
});
