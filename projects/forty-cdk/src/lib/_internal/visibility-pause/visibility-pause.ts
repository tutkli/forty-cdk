/**
 * Refcounted `document.visibilitychange` subscription. Multiple toasts
 * (or any other primitive that wants to pause work while the page is in
 * the background) call `subscribeVisibilityPause` independently — only
 * the first subscribe attaches the listener, only the last unsubscribe
 * removes it.
 *
 * Each subscriber receives `true` while `document.visibilityState !== 'visible'`
 * (the page is hidden / backgrounded) and `false` when it becomes visible
 * again. Subscribers are not invoked synchronously on subscribe — they
 * only fire on transitions, so register them in a context where the
 * primitive's "visible" state is the implicit starting point.
 */
type VisibilityListener = (hidden: boolean) => void;

const listeners = new Set<VisibilityListener>();
let domListener: (() => void) | null = null;

function isHidden(): boolean {
  return document.visibilityState !== 'visible';
}

export function subscribeVisibilityPause(listener: VisibilityListener): () => void {
  if (listeners.size === 0) {
    domListener = (): void => {
      const hidden = isHidden();
      for (const fn of listeners) {
        fn(hidden);
      }
    };
    document.addEventListener('visibilitychange', domListener);
  }
  listeners.add(listener);

  return (): void => {
    if (!listeners.delete(listener)) {
      return;
    }
    if (listeners.size === 0 && domListener) {
      document.removeEventListener('visibilitychange', domListener);
      domListener = null;
    }
  };
}

/** @internal — for tests only. Resets the subscriber set. */
export function _resetVisibilityPauseForTesting(): void {
  listeners.clear();
  if (domListener) {
    document.removeEventListener('visibilitychange', domListener);
    domListener = null;
  }
}
