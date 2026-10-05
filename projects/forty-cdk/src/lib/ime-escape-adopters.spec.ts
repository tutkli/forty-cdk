import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the IME composition rule
 * ([#2132](https://github.com/tutkli/forty-cdk/issues/2132)): an Escape that cancels an IME
 * composition belongs to the IME, so no library Escape handler closes, clears or cancels on it.
 *
 * The family is derived, not listed: every library source that compares a key to `'Escape'`. Each
 * one must call `isImeComposing` from `forty-cdk/core`, and that helper is the only place a
 * keyboard event's composition state is read. The rule is total on purpose — a handler whose host
 * can hold no editable content pays one call for it, and the next handler cannot be the one
 * nobody judged.
 */
const HELPER = 'core/src/keyboard-navigation/ime-composition.ts';

function escapeHandlers(): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== HELPER && code.includes("'Escape'"))
    .map(([path]) => path)
    .sort();
}

describe('IME composition guard on Escape handlers', () => {
  it('derives a live family', () => {
    expect(escapeHandlers()).toContain('core-overlay/src/dismissible-layer/dismissible-layer.ts');
    expect(escapeHandlers()).toContain('toast/src/toast.ts');
    expect(escapeHandlers().length).toBeGreaterThan(10);
  });

  it('guards every Escape handler with isImeComposing', () => {
    const unguarded = escapeHandlers().filter(
      (path) => !LIBRARY_CODE.get(path)!.includes('isImeComposing('),
    );

    expect(unguarded).toEqual([]);
  });

  it('reads a keyboard event composition state only through the helper', () => {
    const offenders: string[] = [];
    for (const [path, code] of LIBRARY_CODE) {
      if (path === HELPER) {
        continue;
      }
      if (/\bkeyCode\b/.test(code)) {
        offenders.push(`${path}: keyCode`);
      }
      for (const [, receiver] of code.matchAll(/(\w+)\.isComposing\b/g)) {
        if (!code.includes(`${receiver} = event as InputEvent`)) {
          offenders.push(`${path}: ${receiver}.isComposing`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});
