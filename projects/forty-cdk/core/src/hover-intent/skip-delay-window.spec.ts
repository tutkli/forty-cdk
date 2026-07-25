import { signal } from '@angular/core';

import { createSkipDelayWindow } from './skip-delay-window';

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
