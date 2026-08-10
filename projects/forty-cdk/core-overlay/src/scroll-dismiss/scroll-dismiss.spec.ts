import { attachScrollDismiss, DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS } from './scroll-dismiss';

describe('attachScrollDismiss', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function dispatchScroll(): void {
    document.dispatchEvent(new Event('scroll'));
  }

  it('is not suppressed before any scroll', () => {
    const handle = attachScrollDismiss(document, { dismiss: () => undefined });
    try {
      expect(handle.isSuppressed()).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it('calls dismiss() and suppresses opens on every ancestor scroll', () => {
    let dismissed = 0;
    const handle = attachScrollDismiss(document, { dismiss: () => (dismissed += 1) });
    try {
      dispatchScroll();
      expect(dismissed).toBe(1);
      expect(handle.isSuppressed()).toBe(true);

      dispatchScroll();
      expect(dismissed).toBe(2);
    } finally {
      handle.destroy();
    }
  });

  it('catches a scroll on a descendant element via the capture phase', () => {
    const inner = document.createElement('div');
    document.body.appendChild(inner);
    let dismissed = 0;
    const handle = attachScrollDismiss(document, { dismiss: () => (dismissed += 1) });
    try {
      inner.dispatchEvent(new Event('scroll'));
      expect(dismissed).toBe(1);
      expect(handle.isSuppressed()).toBe(true);
    } finally {
      handle.destroy();
      inner.remove();
    }
  });

  it('keeps opens suppressed until the default window elapses', () => {
    const handle = attachScrollDismiss(document, { dismiss: () => undefined });
    try {
      dispatchScroll();
      expect(handle.isSuppressed()).toBe(true);

      vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 1);
      expect(handle.isSuppressed()).toBe(true);

      vi.advanceTimersByTime(1);
      expect(handle.isSuppressed()).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it('re-arms the window on each scroll so a continuous gesture stays suppressed', () => {
    const handle = attachScrollDismiss(document, { dismiss: () => undefined });
    try {
      dispatchScroll();
      vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 50);
      dispatchScroll();
      vi.advanceTimersByTime(DEFAULT_SCROLL_DISMISS_SUPPRESSION_MS - 50);
      expect(handle.isSuppressed()).toBe(true);

      vi.advanceTimersByTime(50);
      expect(handle.isSuppressed()).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it('honours a custom suppression window', () => {
    const handle = attachScrollDismiss(document, { dismiss: () => undefined, windowMs: 1000 });
    try {
      dispatchScroll();
      vi.advanceTimersByTime(999);
      expect(handle.isSuppressed()).toBe(true);
      vi.advanceTimersByTime(1);
      expect(handle.isSuppressed()).toBe(false);
    } finally {
      handle.destroy();
    }
  });

  it('stops dismissing after destroy()', () => {
    let dismissed = 0;
    const handle = attachScrollDismiss(document, { dismiss: () => (dismissed += 1) });
    handle.destroy();

    dispatchScroll();
    expect(dismissed).toBe(0);
    expect(handle.isSuppressed()).toBe(false);
  });
});
