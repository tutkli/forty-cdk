import { signal, type WritableSignal } from '@angular/core';

import {
  createHoverIntent,
  type HoverIntentCoordinator,
} from './hover-intent';

function createStubCoordinator(skip = false): HoverIntentCoordinator & {
  skipDelayValue: WritableSignal<boolean>;
  startSkipDelayCalls: number;
} {
  const skipDelayValue = signal(skip);
  let startSkipDelayCalls = 0;
  return {
    skipDelayValue,
    get startSkipDelayCalls() {
      return startSkipDelayCalls;
    },
    skipDelay: () => skipDelayValue(),
    startSkipDelay: () => {
      startSkipDelayCalls++;
    },
  };
}

describe('createHoverIntent', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('scheduleOpen', () => {
    it('opens after the resolved open delay', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      vi.advanceTimersByTime(699);
      expect(open()).toBe(false);

      vi.advanceTimersByTime(1);
      expect(open()).toBe(true);
    });

    it('opens instantly when the coordinator is in the skip-delay window', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(true),
      });

      scheduler.scheduleOpen();
      expect(open()).toBe(true);
    });

    it('opens instantly when the open delay is 0', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 0,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      expect(open()).toBe(true);
    });

    it('is a no-op while disabled', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => true,
        openDelay: () => 0,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(false);
    });

    it('is a no-op when already open', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator,
      });

      scheduler.scheduleOpen();
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(true);
      expect(coordinator.startSkipDelayCalls).toBe(0);
    });

    it('clamps a negative open delay to 0 (opens instantly)', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => -100,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      expect(open()).toBe(true);
    });
  });

  describe('scheduleClose', () => {
    it('closes after the resolved close delay', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator,
      });

      scheduler.scheduleClose(false);
      vi.advanceTimersByTime(299);
      expect(open()).toBe(true);

      vi.advanceTimersByTime(1);
      expect(open()).toBe(false);
      expect(coordinator.startSkipDelayCalls).toBe(1);
    });

    it('closes immediately when immediate is true', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 5_000,
        coordinator,
      });

      scheduler.scheduleClose(true);
      expect(open()).toBe(false);
      expect(coordinator.startSkipDelayCalls).toBe(1);
    });

    it('calls coordinator.startSkipDelay when it closes', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 0,
        coordinator,
      });

      scheduler.scheduleClose(false);
      expect(open()).toBe(false);
      expect(coordinator.startSkipDelayCalls).toBe(1);
    });

    it('is a no-op when already closed', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator,
      });

      scheduler.scheduleClose(false);
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(false);
      expect(coordinator.startSkipDelayCalls).toBe(0);
    });

    it('clamps a negative close delay to 0 (closes instantly)', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => -100,
        coordinator,
      });

      scheduler.scheduleClose(false);
      expect(open()).toBe(false);
      expect(coordinator.startSkipDelayCalls).toBe(1);
    });
  });

  describe('cancelPending', () => {
    it('cancels a pending open', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      scheduler.cancelPending();
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(false);
    });

    it('cancels a pending close', () => {
      vi.useFakeTimers();
      const open = signal(true);
      const coordinator = createStubCoordinator();
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator,
      });

      scheduler.scheduleClose(false);
      scheduler.cancelPending();
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(true);
      expect(coordinator.startSkipDelayCalls).toBe(0);
    });

    it('is safe to call with no pending timer', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => false,
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      expect(() => scheduler.cancelPending()).not.toThrow();
    });
  });
});
