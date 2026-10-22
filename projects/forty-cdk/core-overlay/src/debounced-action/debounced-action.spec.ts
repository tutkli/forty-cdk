import { createDebouncedAction } from './debounced-action';

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
