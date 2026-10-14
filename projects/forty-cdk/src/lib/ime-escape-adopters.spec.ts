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

const ESCAPE_KEY_EVENT = /\bkey(?:down|up)(?:\.\w+)*\.esc(?:ape)?\b/i;

function escapeHandlers(sources: ReadonlyMap<string, string> = LIBRARY_CODE): string[] {
  return [...sources]
    .filter(
      ([path, code]) =>
        path !== HELPER && (code.includes("'Escape'") || ESCAPE_KEY_EVENT.test(code)),
    )
    .map(([path]) => path)
    .sort();
}

describe('IME composition guard on Escape handlers', () => {
  it('derives a live family', () => {
    expect(escapeHandlers()).toContain('core-overlay/src/dismissible-layer/dismissible-layer.ts');
    expect(escapeHandlers()).toContain('toast/src/toast.ts');
    expect(escapeHandlers()).toContain('navigation-menu/src/navigation-menu-content.ts');
    expect(escapeHandlers().length).toBeGreaterThan(10);
  });

  it('counts an Angular Escape key pseudo-event as an Escape handler', () => {
    const sources = new Map([
      ['a/src/a.ts', "host: { '(keydown.escape)': 'onEscape($event)' }"],
      ['b/src/b.ts', "host: { '(keyup.Escape)': 'onEscape($event)' }"],
      ['c/src/c.ts', "host: { '(keydown.shift.esc)': 'onEscape($event)' }"],
      ['d/src/d.ts', "host: { '(keydown.enter)': 'onEnter($event)' }"],
      ['e/src/e.ts', "host: { '(keydown.escapeHatch)': 'onKey($event)' }"],
    ]);

    expect(escapeHandlers(sources)).toEqual(['a/src/a.ts', 'b/src/b.ts', 'c/src/c.ts']);
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
