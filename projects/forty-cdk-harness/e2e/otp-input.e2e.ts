import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  el,
  gotoFixture,
  imeEnd,
  imeStart,
  imeUpdate,
  inputValue,
  selectionRange,
} from './_helpers';

/**
 * IME-composition coverage for `[forOtpInput]` (#437). The directive injects a
 * single real `<input>` and short-circuits its `input` handler while composing
 * (`#composing`, set on `compositionstart` / cleared on `compositionend`) so a
 * composed character is not dropped and the caret is not corrupted. jsdom emits
 * no real composition events, so this contract is only observable in a real
 * browser — the Vitest suite asserts the jsdom-level flag wiring, this asserts
 * the actual `compositionstart → insertCompositionText → compositionend` cycle.
 *
 * The interactive input is injected after render and overlaid on the slots, so
 * it is targeted via `[data-testid="otp"] input`.
 */

function otpInput(page: Page): Locator {
  return el(page, 'otp').locator('input');
}

async function focusOtp(page: Page): Promise<Locator> {
  const input = otpInput(page);
  // Created in afterNextRender; wait for it before driving events. Focus so the
  // directive's unfocused value-sync effect doesn't clobber the composing text.
  await expect(input).toBeAttached();
  await input.evaluate((node) => (node as HTMLInputElement).focus());
  return input;
}

test.describe('OTP input — IME composition', () => {
  test('does not commit or rewrite the value while composing; commits once on compositionend', async ({
    page,
  }) => {
    await gotoFixture(page, 'otp-input');
    const input = await focusOtp(page);

    await imeStart(input);
    await imeUpdate(input, '123456');

    // Mid-composition: the composing text is visible in the input, but the
    // directive has NOT rewritten it or committed anything to the model.
    expect(await inputValue(input)).toBe('123456');
    expect(await el(page, 'value').textContent()).toBe('');
    await expect(el(page, 'complete-count')).toHaveText('0');

    await imeEnd(input, '123456');

    // compositionend commits exactly once — full code, no character dropped,
    // caret intact at the end.
    await expect(el(page, 'value')).toHaveText('123456');
    await expect(el(page, 'complete-count')).toHaveText('1');
    expect(await inputValue(input)).toBe('123456');
    expect(await selectionRange(input)).toEqual([6, 6]);
  });

  test('filters disallowed composed characters on compositionend (numeric drops non-digits)', async ({
    page,
  }) => {
    await gotoFixture(page, 'otp-input');
    const input = await focusOtp(page);

    await imeStart(input);
    await imeUpdate(input, '1あ2'); // CJK character composed between two digits

    // Untouched while composing — the filter only runs on commit.
    expect(await inputValue(input)).toBe('1あ2');
    expect(await el(page, 'value').textContent()).toBe('');

    await imeEnd(input, '1あ2');

    // The numeric filter keeps only the digits; the input is normalised to
    // match and the caret lands after the committed characters.
    await expect(el(page, 'value')).toHaveText('12');
    expect(await inputValue(input)).toBe('12');
    expect(await selectionRange(input)).toEqual([2, 2]);
  });
});
