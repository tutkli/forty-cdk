/** The `hidden` attribute value that keeps a panel searchable by find-in-page. */
export const HIDDEN_UNTIL_FOUND = 'until-found';

/**
 * Puts `hidden="until-found"` back on `host` after the browser strips it to reveal a
 * find-in-page match the owning piece declined to open, so the panel never shows while
 * its state says closed.
 *
 * Call it from the `beforematch` listener. The browser removes the attribute only after
 * the listener returns, so the restore waits for that removal. `stillHidden` is read at
 * that point and must answer whether the panel should still be hidden, which keeps a
 * restore that lands after a later legitimate open from hiding an open panel.
 */
export function keepHiddenUntilFound(host: HTMLElement, stillHidden: () => boolean): void {
  if (typeof MutationObserver === 'undefined') {
    return;
  }
  const observer = new MutationObserver((records) => {
    if (!records.some((record) => record.attributeName === 'hidden')) {
      return;
    }
    observer.disconnect();
    if (stillHidden() && host.getAttribute('hidden') !== HIDDEN_UNTIL_FOUND) {
      host.setAttribute('hidden', HIDDEN_UNTIL_FOUND);
    }
  });
  observer.observe(host, { attributes: true });
}
