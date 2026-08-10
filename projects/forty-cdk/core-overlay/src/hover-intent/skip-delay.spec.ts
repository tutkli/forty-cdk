import { Injectable, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoverCardCoordinator } from '../../../hover-card/src/hover-card-defaults';
import { TooltipCoordinator } from '../../../tooltip/src/tooltip-defaults';
import { createSkipDelayWindow, SkipDelayCoordinator } from './skip-delay';

describe('createSkipDelayWindow', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('is inactive until started', () => {
    const window = createSkipDelayWindow(() => 200);
    expect(window.active()).toBe(false);
  });

  it('opens the window and closes it after the resolved duration', () => {
    vi.useFakeTimers();
    const duration = signal(200);
    const window = createSkipDelayWindow(duration);

    window.start();
    expect(window.active()).toBe(true);

    vi.advanceTimersByTime(199);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(window.active()).toBe(false);
  });

  it('cancel closes a pending window immediately', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => 200);

    window.start();
    window.cancel();
    expect(window.active()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(window.active()).toBe(false);
  });

  it('restarting supersedes the pending window', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => 200);

    window.start();
    vi.advanceTimersByTime(100);
    window.start();

    vi.advanceTimersByTime(199);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(window.active()).toBe(false);
  });

  it('reads the duration accessor at arm time', () => {
    vi.useFakeTimers();
    const duration = signal(200);
    const window = createSkipDelayWindow(duration);

    window.start();
    window.cancel();

    duration.set(500);
    window.start();
    vi.advanceTimersByTime(200);
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(300);
    expect(window.active()).toBe(false);
  });

  it('clamps a negative duration to 0', () => {
    vi.useFakeTimers();
    const window = createSkipDelayWindow(() => -100);

    window.start();
    expect(window.active()).toBe(true);
    vi.advanceTimersByTime(0);
    expect(window.active()).toBe(false);
  });
});

@Injectable()
class TestCoordinator extends SkipDelayCoordinator {
  constructor() {
    super({ openDelay: 700, closeDelay: 300, skipDelayDuration: 200 });
  }
}

describe('SkipDelayCoordinator', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  function makeCoordinator(): TestCoordinator {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), TestCoordinator],
    });
    return TestBed.inject(TestCoordinator);
  }

  it('exposes the resolved cadence handed in by the subclass', () => {
    const coordinator = makeCoordinator();
    expect(coordinator.openDelay).toBe(700);
    expect(coordinator.closeDelay).toBe(300);
    expect(coordinator.skipDelayDuration).toBe(200);
  });

  it('opens the skip-delay window and closes it after the duration', () => {
    vi.useFakeTimers();
    const coordinator = makeCoordinator();
    expect(coordinator.skipDelay()).toBe(false);

    coordinator.startSkipDelay();
    expect(coordinator.skipDelay()).toBe(true);

    vi.advanceTimersByTime(199);
    expect(coordinator.skipDelay()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(coordinator.skipDelay()).toBe(false);
  });

  it('cancelSkipDelay clears a pending window immediately', () => {
    vi.useFakeTimers();
    const coordinator = makeCoordinator();

    coordinator.startSkipDelay();
    coordinator.cancelSkipDelay();
    expect(coordinator.skipDelay()).toBe(false);

    vi.advanceTimersByTime(1_000);
    expect(coordinator.skipDelay()).toBe(false);
  });

  it('backs both Tooltip and Hover-card with the single shared class', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const tooltipCoordinator = TestBed.inject(TooltipCoordinator);
    const hoverCardCoordinator = TestBed.inject(HoverCardCoordinator);

    expect(tooltipCoordinator).toBeInstanceOf(SkipDelayCoordinator);
    expect(hoverCardCoordinator).toBeInstanceOf(SkipDelayCoordinator);
    // Two distinct tokens / scopes, one shared implementation.
    expect(tooltipCoordinator).not.toBe(hoverCardCoordinator);
  });
});
