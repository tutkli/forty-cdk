import { provideZonelessChangeDetection, signal, type WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  createDebouncedAction,
  createHoverIntent,
  forceCloseWhenDisabled,
  type HoverIntentCoordinator,
} from './hover-intent';

describe('createDebouncedAction', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs the action after the scheduled delay', () => {
    vi.useFakeTimers();
    let runs = 0;
    const action = createDebouncedAction(() => runs++);

    action.schedule(200);
    expect(runs).toBe(0);
    expect(action.isPending()).toBe(true);

    vi.advanceTimersByTime(199);
    expect(runs).toBe(0);

    vi.advanceTimersByTime(1);
    expect(runs).toBe(1);
    expect(action.isPending()).toBe(false);
  });

  it('runs synchronously when the delay is 0', () => {
    vi.useFakeTimers();
    let runs = 0;
    const action = createDebouncedAction(() => runs++);

    action.schedule(0);
    expect(runs).toBe(1);
    expect(action.isPending()).toBe(false);
  });

  it('clamps a negative delay to 0 (runs synchronously)', () => {
    vi.useFakeTimers();
    let runs = 0;
    const action = createDebouncedAction(() => runs++);

    action.schedule(-100);
    expect(runs).toBe(1);
  });

  it('a later schedule supersedes the pending one (single timer)', () => {
    vi.useFakeTimers();
    let runs = 0;
    const action = createDebouncedAction(() => runs++);

    action.schedule(200);
    action.schedule(100);
    vi.advanceTimersByTime(100);
    expect(runs).toBe(1);

    // The first (superseded) timer must not fire afterwards.
    vi.advanceTimersByTime(200);
    expect(runs).toBe(1);
  });

  it('cancel stops a pending action', () => {
    vi.useFakeTimers();
    let runs = 0;
    const action = createDebouncedAction(() => runs++);

    action.schedule(200);
    action.cancel();
    expect(action.isPending()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(runs).toBe(0);
  });

  it('cancel is safe with no pending timer', () => {
    const action = createDebouncedAction(() => {});
    expect(() => action.cancel()).not.toThrow();
    expect(action.isPending()).toBe(false);
  });
});

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

    it('does not open when isDisabled flips true before the armed timer fires', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const disabled = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => disabled(),
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      disabled.set(true);
      vi.advanceTimersByTime(700);
      expect(open()).toBe(false);
    });

    it('clears a pending open timer when a later scheduleOpen runs while disabled', () => {
      vi.useFakeTimers();
      const open = signal(false);
      const disabled = signal(false);
      const scheduler = createHoverIntent({
        open,
        isDisabled: () => disabled(),
        openDelay: () => 700,
        closeDelay: () => 300,
        coordinator: createStubCoordinator(),
      });

      scheduler.scheduleOpen();
      disabled.set(true);
      scheduler.scheduleOpen();
      disabled.set(false);
      vi.advanceTimersByTime(5_000);
      expect(open()).toBe(false);
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

describe('forceCloseWhenDisabled', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
  });

  it('force-closes an open overlay and runs onForceClose when disabled flips to true', () => {
    const open = signal(true);
    const disabled = signal(false);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    disabled.set(true);
    TestBed.tick();

    expect(open()).toBe(false);
    expect(forceCloseCalls).toBe(1);
  });

  it('does nothing when disabled flips to true while already closed', () => {
    const open = signal(false);
    const disabled = signal(false);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    disabled.set(true);
    TestBed.tick();

    expect(open()).toBe(false);
    expect(forceCloseCalls).toBe(0);
  });

  it('does not re-run as a function of open alone (no read+write cycle)', () => {
    const open = signal(false);
    const disabled = signal(true);
    let forceCloseCalls = 0;

    TestBed.runInInjectionContext(() => {
      forceCloseWhenDisabled({
        open,
        disabled,
        onForceClose: () => forceCloseCalls++,
      });
    });
    TestBed.tick();

    // Opening while disabled does not re-trigger the effect (open is untracked):
    // the carve-out reacts to `disabled` only, so a programmatic open stays open.
    open.set(true);
    TestBed.tick();

    expect(open()).toBe(true);
    expect(forceCloseCalls).toBe(0);
  });
});
