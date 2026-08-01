import { expect, type Page, test } from '@playwright/test';
import {
  clickOutside,
  el,
  expectFocused,
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

  test('PageDown / PageUp jump to last / first enabled option', async ({ page }) => {
    await gotoFixture(page, 'combobox');
    const input = el(page, 'combo-input');
    await input.click();
    await input.press('ArrowDown');
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');

    await input.press('PageDown');
    await expect(el(page, 'opt-date')).toHaveAttribute('data-highlighted', '');

    await input.press('PageUp');
    await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');
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

  // #673 — `[forComboboxAnchor]` swaps the floating-ui reference to a decorated
  // field box wider than the inner `<input>`. The size middleware reads the
  // reference's `getBoundingClientRect()`, which jsdom returns as 0 — so the
  // "panel sizes to the anchor, not the input" contract is only observable in a
  // real browser. Vitest covers the wiring (registration, fallback, throws).
  test.describe('anchor (field box positioning)', () => {
    const anchorWidth = (page: Page) =>
      el(page, 'content').evaluate((c) =>
        Number.parseFloat((c as HTMLElement).style.getPropertyValue('--for-anchor-width') || '0'),
      );

    test('sizes the listbox against the [forComboboxAnchor] box, not the inner input', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { anchor: '1', open: '1' });
      const boxRect = await el(page, 'anchor').boundingBox();
      expect(boxRect).not.toBeNull();
      await expect(el(page, 'content')).toBeVisible();

      await expect.poll(() => anchorWidth(page)).toBeGreaterThan(0);
      // The field box is 320px; the bare input is far narrower. The positioner
      // must size to the box (1px slack for cross-browser sub-pixel rounding).
      expect(Math.abs((await anchorWidth(page)) - boxRect!.width)).toBeLessThanOrEqual(1);
      expect(await anchorWidth(page)).toBeGreaterThan(200);
    });

    test('falls back to the input width when no anchor is registered', async ({ page }) => {
      await gotoFixture(page, 'combobox', { open: '1' });
      const inputRect = await el(page, 'combo-input').boundingBox();
      expect(inputRect).not.toBeNull();
      await expect(el(page, 'content')).toBeVisible();

      await expect.poll(() => anchorWidth(page)).toBeGreaterThan(0);
      expect(Math.abs((await anchorWidth(page)) - inputRect!.width)).toBeLessThanOrEqual(1);
    });
  });

  // #675 — the picker anatomy (`?picker=1`): a `[forComboboxTrigger]` button
  // outside the panel, with `[forComboboxInput]` + `[forComboboxList]` inside
  // `[forComboboxContent]`. jsdom mis-models `document.activeElement`, so the
  // focus hand-off (input on open, trigger on close) is asserted here.
  test.describe('picker anatomy (trigger + inner list)', () => {
    test('opening from the trigger moves focus into the inner input', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      const trigger = el(page, 'trigger');
      await trigger.click();

      await expect(el(page, 'content')).toBeVisible();
      await expectFocused(el(page, 'combo-input'));
    });

    test('the inner list owns the listbox role; the input controls the list', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'content')).toBeVisible();

      const list = el(page, 'list');
      await expect(list).toHaveAttribute('role', 'listbox');
      // The popup surface is role-less so it can hold the input next to the list.
      await expect(el(page, 'content')).not.toHaveAttribute('role', /.+/);
      const listId = await list.getAttribute('id');
      await expect(el(page, 'combo-input')).toHaveAttribute('aria-controls', listId!);
    });

    test('Escape returns focus to the trigger', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      await el(page, 'trigger').click();
      await expectFocused(el(page, 'combo-input'));

      await el(page, 'combo-input').press('Escape');
      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'trigger'));
    });

    test('selecting an option commits it and returns focus to the trigger', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      await el(page, 'trigger').click();
      await el(page, 'opt-banana').click();

      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'trigger'));
      await expect(el(page, 'trigger')).toHaveText('banana');
    });

    test('ArrowDown on the trigger opens with the first option highlighted', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      const trigger = el(page, 'trigger');
      await trigger.focus();
      await trigger.press('ArrowDown');

      await expect(el(page, 'content')).toBeVisible();
      await expectFocused(el(page, 'combo-input'));
      await expect(el(page, 'opt-apple')).toHaveAttribute('data-highlighted', '');
    });

    test('a vetoed (autoFocusOnOpen) keeps focus on the trigger', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1', vetoOpen: '1' });
      const trigger = el(page, 'trigger');
      // Focus + Enter so the trigger holds focus deterministically across
      // browsers (WebKit doesn't focus a <button> on plain click).
      await trigger.focus();
      await trigger.press('Enter');

      await expect(el(page, 'content')).toBeVisible();
      // The panel opened but focus stayed on the trigger (the move was vetoed).
      await expectFocused(trigger);
    });

    test('Tab from the inner input lands on the focusable after the trigger', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      await el(page, 'trigger').click();
      await expectFocused(el(page, 'combo-input'));

      await el(page, 'combo-input').press('Tab');

      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'after'));
    });

    test('clicking an outside input does not steal focus back to the trigger', async ({ page }) => {
      await gotoFixture(page, 'combobox', { picker: '1' });
      await el(page, 'trigger').click();
      await expectFocused(el(page, 'combo-input'));

      await el(page, 'after').click();
      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'after'));
    });
  });

  // #1581 — the anatomy is a `computed` over the registered trigger rather than
  // a construction-time snapshot, so a trigger that registers after
  // `[forComboboxContent]` still owns the focus hand-off. `?lateTrigger=1`
  // declares the trigger's embedded view after the content's; `?deferTrigger=1`
  // pushes it into a `@defer` block so it arrives with the surface already open.
  test.describe('late [forComboboxTrigger] (picker anatomy)', () => {
    test('focus still moves into the inner input when the content mounts first', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { lateTrigger: '1', open: '1' });
      await expect(el(page, 'content')).toBeVisible();
      await expect(el(page, 'trigger')).toBeVisible();

      await expectFocused(el(page, 'combo-input'));
    });

    test('a trigger deferred past the open surface still receives return focus', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { lateTrigger: '1', deferTrigger: '1', open: '1' });
      await expect(el(page, 'content')).toBeVisible();
      // The @defer block resolves on its timer, after the surface mounted.
      const trigger = el(page, 'trigger');
      await expect(trigger).toBeVisible();

      await el(page, 'opt-banana').click();

      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(trigger);
      await expect(trigger).toHaveText('banana');
    });
  });

  // #1325 — a pinned, non-selecting `[forComboboxAction]` reachable by Tab
  // (model A). Focus moves are real DOM moves inside the body-portaled panel,
  // which jsdom mis-models, so the ring / dismissal contract lives here.
  // `?action=1` pins the action; `?open=1` renders the panel up-front;
  // `?long=1` renders a 60-item list to prove list-length-independent reach.
  test.describe('action items (Tab into an action zone)', () => {
    test('Tab from the input moves focus to the action and keeps the popup open', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });
      await el(page, 'combo-input').click();

      await el(page, 'combo-input').press('Tab');

      await expect(el(page, 'content')).toBeVisible();
      await expectFocused(el(page, 'action'));
    });

    test('reaches the action in one Tab from a deep scroll position', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1', long: '1' });
      const input = el(page, 'combo-input');
      await input.click();

      for (let i = 0; i < 20; i++) {
        await input.press('ArrowDown');
      }

      await input.press('Tab');
      await expect(el(page, 'content')).toBeVisible();
      await expectFocused(el(page, 'action'));
    });

    test('Tab cycles between the input and the action without dismissing', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });
      await el(page, 'combo-input').click();

      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      // With a single action the ring is [input, action]; Tab wraps back to the
      // input, Shift+Tab too — focus never escapes the open popup.
      await el(page, 'action').press('Tab');
      await expect(el(page, 'content')).toBeVisible();
      await expectFocused(el(page, 'combo-input'));

      await el(page, 'combo-input').press('Shift+Tab');
      await expectFocused(el(page, 'action'));
    });

    test('Enter on the action fires (activate) and never mutates value', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });
      await el(page, 'combo-input').click();
      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      await el(page, 'action').press('Enter');

      await expect(el(page, 'action-count')).toHaveText('1');
      await expect(el(page, 'value')).toHaveText('');
      await expect(el(page, 'content')).toBeVisible();
    });

    test('clicking the action fires (activate) and keeps value empty', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });

      await el(page, 'action').click();

      await expect(el(page, 'action-count')).toHaveText('1');
      await expect(el(page, 'value')).toHaveText('');
    });

    test('Escape from the action closes the popup and returns focus to the input', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });
      await el(page, 'combo-input').click();
      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      await el(page, 'action').press('Escape');

      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'combo-input'));
    });

    test('outside pointer still dismisses while focus is on the action', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', open: '1' });
      await el(page, 'combo-input').click();
      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      await el(page, 'after').click();
      await expect(el(page, 'content')).toHaveCount(0);
    });

    // #1389 item 9, CLAIM 1: an action kept mounted while the popup is closed
    // must let native Tab move focus out — the Tab handler is gated on open().
    test('Tab from a mounted-but-closed action lets focus leave the popup', async ({ page }) => {
      await gotoFixture(page, 'combobox', { actionMounted: '1', open: '1' });
      await el(page, 'combo-input').click();
      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      await clickOutside(page);

      await el(page, 'action').press('Tab');
      await expect(el(page, 'content').locator('*:focus')).toHaveCount(0);
    });

    // #1389 item 9, CLAIM 2: a disabled action still traps Tab (its handler runs
    // despite its own disabled state) and the ring steps to the nearest enabled
    // neighbor resolved against the full action collection.
    test('Shift+Tab from a disabled-while-focused action lands on the previous enabled action', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', {
        action: '1',
        action2: '1',
        action2disabled: '1',
        open: '1',
      });
      await el(page, 'action2').focus();

      await el(page, 'action2').press('Shift+Tab');

      await expectFocused(el(page, 'action'));
    });

    test('Tab from a disabled-while-focused action wraps to the input', async ({ page }) => {
      await gotoFixture(page, 'combobox', {
        action: '1',
        action2: '1',
        action2disabled: '1',
        open: '1',
      });
      await el(page, 'action2').focus();

      await el(page, 'action2').press('Tab');

      await expectFocused(el(page, 'combo-input'));
    });

    test('Tab steps through the input and both enabled actions in DOM order', async ({ page }) => {
      await gotoFixture(page, 'combobox', { action: '1', action2: '1', open: '1' });
      await el(page, 'combo-input').click();

      await el(page, 'combo-input').press('Tab');
      await expectFocused(el(page, 'action'));

      await el(page, 'action').press('Tab');
      await expectFocused(el(page, 'action2'));

      await el(page, 'action2').press('Tab');
      await expectFocused(el(page, 'combo-input'));
    });

    // #1389 item 9, CLAIM 3: with no `[forComboboxInput]` the ring drops the
    // input slot and cycles among the enabled actions instead of stranding.
    test('with no input the ring cycles among the actions', async ({ page }) => {
      await gotoFixture(page, 'combobox', { noinput: '1' });
      await el(page, 'trigger').click();
      await expect(el(page, 'content')).toBeVisible();

      await el(page, 'action').focus();
      await el(page, 'action').press('Tab');
      await expectFocused(el(page, 'action2'));

      await el(page, 'action2').press('Tab');
      await expectFocused(el(page, 'action'));
    });
  });

  test.describe('editable multi-select (chips)', () => {
    test('removing a chip with the listbox open keeps it open', async ({ page }) => {
      await gotoFixture(page, 'combobox', { multi: '1', open: '1' });
      await expect(el(page, 'content')).toBeVisible();
      await expect(el(page, 'chip-apple')).toBeVisible();
      await expect(el(page, 'chip-banana')).toBeVisible();

      await el(page, 'remove-apple').click();

      await expect(el(page, 'chip-apple')).toHaveCount(0);
      await expect(el(page, 'chip-banana')).toBeVisible();
      await expect(el(page, 'content')).toBeVisible();
    });

    test('a genuine outside pointer still dismisses in multi mode', async ({ page }) => {
      await gotoFixture(page, 'combobox', { multi: '1', open: '1' });
      await expect(el(page, 'content')).toBeVisible();

      await el(page, 'after').click();
      await expect(el(page, 'content')).toHaveCount(0);
    });

    // #1389 item 12: Escape on a focused chip closes the open popup (routed
    // through the vetoable close path) and returns focus to the input.
    test('Escape on a focused chip closes the open popup and refocuses the input', async ({
      page,
    }) => {
      await gotoFixture(page, 'combobox', { multi: '1', open: '1' });
      await expect(el(page, 'content')).toBeVisible();

      await el(page, 'chip-apple').focus();
      await expectFocused(el(page, 'chip-apple'));

      await el(page, 'chip-apple').press('Escape');

      await expect(el(page, 'content')).toHaveCount(0);
      await expectFocused(el(page, 'combo-input'));
    });
  });
});
