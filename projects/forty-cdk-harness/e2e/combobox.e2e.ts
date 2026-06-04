import { expect, test } from '@playwright/test';
import {
  el,
  gotoFixture,
  imeEnd,
  imeStart,
  imeUpdate,
  inputValue,
  selectionRange,
} from './_helpers';

test.describe('Combobox', () => {
  test('opens on typing and shows filtered options', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('ap');
    await expect(el(page, 'content')).toBeVisible();
    await expect(el(page, 'opt-apple')).toBeVisible();
    await expect(el(page, 'opt-apricot')).toBeVisible();
    await expect(el(page, 'opt-banana')).toHaveCount(0);
  });

  test('ArrowDown skips a disabled option', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.press('ArrowDown');
    // Options: apple, apricot, banana, blueberry, cherry (disabled), date.
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');
    await input.press('ArrowDown'); // → apricot
    await input.press('ArrowDown'); // → banana
    await input.press('ArrowDown'); // → blueberry
    await input.press('ArrowDown'); // skip cherry → date
    await expect(el(page, 'opt-date')).toHaveAttribute('data-highlighted', '');
    await expect(el(page, 'opt-cherry')).not.toHaveAttribute('data-highlighted', '');
  });

  test('Escape closes the listbox', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('a');
    await expect(el(page, 'content')).toBeVisible();

    await input.press('Escape');
    await expect(el(page, 'content')).toHaveCount(0);
    await expect(input).toBeFocused();
  });

  test('pointerdown outside closes', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.pressSequentially('a');
    await expect(el(page, 'content')).toBeVisible();

    await el(page, 'after').click();
    await expect(el(page, 'content')).toHaveCount(0);
  });

  // #437 — inline autocomplete must stay suppressed while an IME composition is
  // in flight (`isComposing` / `#composing`), or a CJK / Android-soft-keyboard
  // user's composing text would be overwritten by the appended suggestion.
  // jsdom emits no composition events, so this is only observable in a real
  // browser. `?inline=1` enables inline completion (`both`); `?open=1` renders
  // the options up-front so the completion snapshot is populated before typing.
  test.describe('IME composition (inline autocomplete)', () => {
    test('does not inline-complete while composing; completes on compositionend', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { inline: '1', open: '1' });
      const input = el(page, 'combo-input');
      await expect(el(page, 'opt-apple')).toBeVisible();

      await input.click(); // focus so the value-sync effect doesn't clobber the input

      await imeStart(input);
      await imeUpdate(input, 'ap', 2);

      // While composing, the input shows only the user's composed prefix with a
      // collapsed caret — no "apple" suggestion appended or selected.
      expect(await inputValue(input)).toBe('ap');
      expect(await selectionRange(input)).toEqual([2, 2]);

      await imeEnd(input, 'ap');

      // Once composition ends, inline autocomplete runs: the first match's tail
      // is appended and selected ([prefixLen, end]).
      expect(await inputValue(input)).toBe('apple');
      expect(await selectionRange(input)).toEqual([2, 5]);
    });
  });
});
