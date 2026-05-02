/**
 * Refcounted body scroll lock. Multiple modal surfaces (stacked dialogs,
 * dialog over drawer, etc.) can call `lockBodyScroll()` independently — only
 * the first acquires the lock, only the last release restores.
 *
 * Saves and restores the original `overflow` and `padding-right`. The
 * scrollbar-width compensation prevents content jumping when overflow goes
 * from `auto` (scrollbar shown) to `hidden` (scrollbar hidden).
 */
let lockCount = 0;
let savedOverflow: string | null = null;
let savedPaddingRight: string | null = null;

export function lockBodyScroll(): void {
  if (lockCount === 0) {
    const body = document.body;
    const docEl = document.documentElement;
    const scrollbarWidth = window.innerWidth - docEl.clientWidth;

    savedOverflow = body.style.overflow;
    savedPaddingRight = body.style.paddingRight;

    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      const computed = getComputedStyle(body).paddingRight;
      const currentPx = parseFloat(computed) || 0;
      body.style.paddingRight = `${currentPx + scrollbarWidth}px`;
    }
  }
  lockCount++;
}

export function unlockBodyScroll(): void {
  if (lockCount === 0) {
    return;
  }
  lockCount--;
  if (lockCount === 0) {
    const body = document.body;
    body.style.overflow = savedOverflow ?? '';
    body.style.paddingRight = savedPaddingRight ?? '';
    savedOverflow = null;
    savedPaddingRight = null;
  }
}

/** @internal — for tests only. Resets the global counter. */
export function _resetBodyScrollLockForTesting(): void {
  lockCount = 0;
  savedOverflow = null;
  savedPaddingRight = null;
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}
