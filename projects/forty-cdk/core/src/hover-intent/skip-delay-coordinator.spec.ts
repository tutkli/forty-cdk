import { Injectable, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { HoverCardCoordinator } from '../../../hover-card/src/hover-card-defaults';
import { TooltipCoordinator } from '../../../tooltip/src/tooltip-defaults';
import { SkipDelayCoordinator } from './skip-delay-coordinator';

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
