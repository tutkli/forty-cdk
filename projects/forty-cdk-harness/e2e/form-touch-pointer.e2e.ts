import { el, expect, gotoFixture, test } from './_helpers';

for (const id of ['checkbox', 'switch', 'toggle']) {
  test(`${id}: a pointer toggle on and off, then a click outside, marks the control touched`, async ({
    page,
  }) => {
    await gotoFixture(page, 'form-touch-pointer');
    const control = el(page, id);
    await expect(control).not.toHaveAttribute('data-touched');

    await control.click();
    const focusedAfterClick = await control.evaluate((n) => document.activeElement === n);
    await control.click();
    await el(page, 'outside').click();

    await expect(
      control,
      `data-touched after two clicks and an outside click (control focused by click: ${focusedAfterClick})`,
    ).toHaveAttribute('data-touched', '');
  });
}
