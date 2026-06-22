import { createPointerSuppression, DEFAULT_POINTER_SUPPRESSION_MS } from './pointer-suppression';

describe('createPointerSuppression', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('is not suppressed before any suppress() call', () => {
    const suppression = createPointerSuppression();
    expect(suppression.isSuppressed()).toBe(false);
  });

  it('is suppressed right after suppress() and until the default window elapses', () => {
    const suppression = createPointerSuppression();
    suppression.suppress();

    expect(suppression.isSuppressed()).toBe(true);
    vi.advanceTimersByTime(DEFAULT_POINTER_SUPPRESSION_MS - 1);
    expect(suppression.isSuppressed()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(suppression.isSuppressed()).toBe(false);
  });

  it('extends the window when suppress() is called again before it elapses', () => {
    const suppression = createPointerSuppression();
    suppression.suppress();
    vi.advanceTimersByTime(DEFAULT_POINTER_SUPPRESSION_MS - 50);

    suppression.suppress();
    vi.advanceTimersByTime(DEFAULT_POINTER_SUPPRESSION_MS - 50);
    expect(suppression.isSuppressed()).toBe(true);

    vi.advanceTimersByTime(50);
    expect(suppression.isSuppressed()).toBe(false);
  });

  it('honours a custom window length', () => {
    const suppression = createPointerSuppression(1000);
    suppression.suppress();

    vi.advanceTimersByTime(999);
    expect(suppression.isSuppressed()).toBe(true);
    vi.advanceTimersByTime(1);
    expect(suppression.isSuppressed()).toBe(false);
  });
});
