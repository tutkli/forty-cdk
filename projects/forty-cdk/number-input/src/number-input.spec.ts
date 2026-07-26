import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { form, FormField, min as minRule, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { flush } from '../../src/test-utils';
import { pressKey } from '../../src/test-utils/keyboard';
import { renderHost } from '../../src/test-utils/render';
import { ForField, ForFieldDescription, ForLabel } from 'forty-cdk/field';
import { ForFieldset } from 'forty-cdk/fieldset';
import { ForNumberInput } from './number-input';
import { ForNumberInputDecrement } from './number-input-decrement';
import { ForNumberInputGroup } from './number-input-group';
import { ForNumberInputIncrement } from './number-input-increment';

const typeInto = (el: HTMLInputElement, text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input'));
};

@Component({
  imports: [ForNumberInput],
  template: `
    <input
      forNumberInput
      [(value)]="qty"
      [min]="min()"
      [max]="max()"
      [step]="step()"
      [formatOptions]="formatOptions()"
      [locale]="locale()"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
    />
  `,
})
class NumberHost {
  readonly qty = signal<number | null>(null);
  readonly min = signal<number | undefined>(undefined);
  readonly max = signal<number | undefined>(undefined);
  readonly step = signal(1);
  readonly formatOptions = signal<Intl.NumberFormatOptions | null>(null);
  readonly locale = signal<string | null>(null);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal<string>('');
}

const inputOf = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input')!;

describe('ForNumberInput', () => {
  describe('static accessibility', () => {
    it('sets role="spinbutton", numeric inputmode and starts empty', () => {
      const { el } = renderHost(NumberHost);
      const input = inputOf(el);
      expect(input.getAttribute('role')).toBe('spinbutton');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('data-empty')).toBe('');
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
    });

    it('reflects min / max as aria-valuemin / aria-valuemax', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(10);
      await flush();
      const input = inputOf(el);
      expect(input.getAttribute('aria-valuemin')).toBe('0');
      expect(input.getAttribute('aria-valuemax')).toBe('10');
    });

    it('uses decimal inputmode when fractional values are possible', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.step.set(0.1);
      await flush();
      expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
    });

    it('uses decimal inputmode for currency formats that imply fraction digits', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      await flush();
      expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
    });

    it('uses decimal inputmode for percent formats with resolved fraction digits', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.formatOptions.set({ style: 'percent', maximumFractionDigits: 2 });
      await flush();
      expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
    });

    it('keeps numeric inputmode for a whole-number currency format', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.formatOptions.set({
        style: 'currency',
        currency: 'JPY',
      });
      await flush();
      expect(inputOf(el).getAttribute('inputmode')).toBe('numeric');
    });
  });

  assertFormControlContract(
    () => {
      const r = renderHost(NumberHost);
      const result: FormControlMountResult = {
        control: inputOf(r.el),
        flush: r.flush,
        setFlag: (flag, value) => {
          const inst = r.fixture.componentInstance;
          switch (flag) {
            case 'disabled':
              inst.isDisabled.set(value);
              return;
            case 'readonly':
              inst.isReadonly.set(value);
              return;
            case 'required':
              inst.isRequired.set(value);
              return;
            case 'invalid':
              inst.isInvalid.set(value);
              return;
            case 'pending':
              inst.isPending.set(value);
              return;
            case 'touched':
              inst.isTouched.set(value);
              return;
            case 'dirty':
              inst.isDirty.set(value);
              return;
          }
        },
      };
      return result;
    },
    // `name` is excluded: the visible spinbutton does not carry it (the hidden
    // input does — see the native-submission block below).
    { flags: ['disabled', 'readonly', 'required', 'invalid', 'pending', 'touched', 'dirty'] },
  );

  describe('parsing live input', () => {
    it('updates the model and toggles data-empty / aria-valuenow', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.focus();

      typeInto(input, '42');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(42);
      expect(input.hasAttribute('data-empty')).toBe(false);
      expect(input.getAttribute('aria-valuenow')).toBe('42');

      typeInto(input, '');
      await flush();
      expect(fixture.componentInstance.qty()).toBeNull();
      expect(input.getAttribute('data-empty')).toBe('');
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
    });

    it('ignores non-numeric input, keeping the last valid value', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.focus();

      typeInto(input, '7');
      await flush();
      typeInto(input, 'abc');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(7);
    });

    it('rejects exponent notation rather than silently parsing it', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '5');
      await flush();
      typeInto(input, '2e3');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);

      typeInto(input, '1e5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('rejects multi-sign and multi-decimal malformed input', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '8');
      await flush();
      typeInto(input, '+-5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(8);

      typeInto(input, '1.2.3');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(8);
    });

    it('parses a plain decimal in a comma-decimal locale', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('de-DE');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1.234,5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1234.5);
    });

    it('parses a correctly grouped integer', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1,234,567');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1234567);
    });

    describe('incremental edits of grouped values (#1162)', () => {
      const grouped = (host: NumberHost) => {
        host.locale.set('en-US');
        host.formatOptions.set({ maximumFractionDigits: 0 });
        host.qty.set(1234);
      };

      it('accepts a digit appended to the end of a grouped value; blur reformats', async () => {
        const { el, fixture, flush } = renderHost(NumberHost);
        grouped(fixture.componentInstance);
        await flush();
        const input = inputOf(el);
        expect(input.value).toBe('1,234');

        input.focus();
        typeInto(input, '1,2345');
        await flush();
        expect(fixture.componentInstance.qty()).toBe(12345);

        input.dispatchEvent(new FocusEvent('blur'));
        await flush();
        expect(fixture.componentInstance.qty()).toBe(12345);
        expect(input.value).toBe('12,345');
      });

      it('accepts a digit inserted inside a grouped value', async () => {
        const { el, fixture, flush } = renderHost(NumberHost);
        grouped(fixture.componentInstance);
        await flush();
        const input = inputOf(el);
        input.focus();

        typeInto(input, '1,5234');
        await flush();
        expect(fixture.componentInstance.qty()).toBe(15234);
      });

      it('accepts deleting a group separator', async () => {
        const { el, fixture, flush } = renderHost(NumberHost);
        grouped(fixture.componentInstance);
        await flush();
        const input = inputOf(el);
        input.focus();

        typeInto(input, '1234');
        await flush();
        expect(fixture.componentInstance.qty()).toBe(1234);
      });

      it('round-trips en-IN lakh-grouped output through edit → parse', async () => {
        const { el, fixture, flush } = renderHost(NumberHost);
        fixture.componentInstance.locale.set('en-IN');
        fixture.componentInstance.formatOptions.set({ maximumFractionDigits: 0 });
        fixture.componentInstance.qty.set(1234567);
        await flush();
        const input = inputOf(el);
        expect(input.value).toBe('12,34,567');

        input.focus();
        typeInto(input, '12,34,5678');
        await flush();
        expect(fixture.componentInstance.qty()).toBe(12345678);

        input.dispatchEvent(new FocusEvent('blur'));
        await flush();
        expect(input.value).toBe('1,23,45,678');
      });
    });

    it('parses a space-grouped integer typed with ASCII spaces in an NBSP-grouping locale (#590 F5)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      // fr-FR groups with a narrow no-break space (U+202F); a user typing plain
      // ASCII spaces must still parse against it.
      fixture.componentInstance.locale.set('fr-FR');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1 234 567');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1234567);
    });

    it('commits a numpad-dot decimal typed in de-DE without stripping it (#1383)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('de-DE');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1.5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1.5);

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1.5);
    });

    it('commits a numpad-dot decimal typed in fr-FR without stripping it (#1383)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('fr-FR');
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1.5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1.5);

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1.5);
    });

    it('does not clamp while typing (clamps on commit)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(10);
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '5');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(10);
    });
  });

  describe('keyboard stepping', () => {
    it('ArrowUp / ArrowDown step by `step`', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(5);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(6);
      expect(input.getAttribute('aria-valuenow')).toBe('6');

      pressKey(input, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('PageUp / PageDown step by step × stepMultiplier', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(50);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'PageUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(60);

      pressKey(input, 'PageDown');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(50);
    });

    it('Home / End jump to min / max', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(100);
      fixture.componentInstance.qty.set(50);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'End');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(100);

      pressKey(input, 'Home');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0);
    });

    it('prevents default on handled keys', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      await flush();
      const event = pressKey(inputOf(el), 'ArrowUp');
      expect(event.defaultPrevented).toBe(true);
    });

    it('steps from empty to the clamped baseline (min ?? 0)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(3);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(3);
    });

    it('rounds a fractional 0.1 step to a clean value without float noise', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.step.set(0.1);
      fixture.componentInstance.qty.set(0.2);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.3);
      expect(input.getAttribute('aria-valuenow')).toBe('0.3');
    });

    it('ArrowUp from an off-grid value lands on the next multiple of step (#1393)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(0.55);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1);
      expect(input.getAttribute('aria-valuenow')).toBe('1');

      fixture.componentInstance.qty.set(0.55);
      await flush();
      pressKey(input, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0);
    });

    it('measures the step grid from min, not from zero', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(3);
      fixture.componentInstance.step.set(2);
      fixture.componentInstance.qty.set(6);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(7);

      fixture.componentInstance.qty.set(6);
      await flush();
      pressKey(input, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('PageUp from an off-grid value lands on the adjacent grid point', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(0.55);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'PageUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1);
    });
  });

  describe('step precision', () => {
    @Component({
      imports: [ForNumberInput],
      template: `<input forNumberInput [(value)]="qty" [step]="0.1" [stepMultiplier]="3" />`,
    })
    class PageStepHost {
      readonly qty = signal<number | null>(0.1);
    }

    it('increment(by) keeps a `by` finer than step (0.25 with step 0.1)', async () => {
      const { fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.step.set(0.1);
      fixture.componentInstance.qty.set(0.2);
      await flush();
      const directive = fixture.debugElement
        .query(By.directive(ForNumberInput))
        .injector.get(ForNumberInput);

      directive.increment(0.25);
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.45);
    });

    it('ArrowUp with an exponential step (1e-7) rounds cleanly', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.step.set(1e-7);
      fixture.componentInstance.qty.set(2e-7);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(3e-7);
    });

    it('PageUp with a fractional step and non-decade multiplier stays free of float noise', async () => {
      const { el, fixture, flush } = renderHost(PageStepHost);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'PageUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.4);
      expect(input.getAttribute('aria-valuenow')).toBe('0.4');
    });
  });

  describe('clamping', () => {
    it('clamps stepping at min and max', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(2);
      fixture.componentInstance.qty.set(2);
      await flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(2);

      fixture.componentInstance.qty.set(0);
      await flush();
      pressKey(input, 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0);
    });
  });

  describe('increment / decrement buttons', () => {
    @Component({
      imports: [
        ForNumberInputGroup,
        ForNumberInput,
        ForNumberInputIncrement,
        ForNumberInputDecrement,
      ],
      template: `
        <div forNumberInputGroup>
          <button forNumberInputDecrement ariaLabel="Decrease" data-test-id="dec">−</button>
          <input
            forNumberInput
            [(value)]="qty"
            [min]="min()"
            [max]="max()"
            [(touched)]="isTouched"
            (touch)="touchCount.set(touchCount() + 1)"
          />
          <button forNumberInputIncrement ariaLabel="Increase" data-test-id="inc">+</button>
        </div>
      `,
    })
    class ButtonsHost {
      readonly qty = signal<number | null>(5);
      readonly min = signal<number | undefined>(0);
      readonly max = signal<number | undefined>(10);
      readonly isTouched = signal(false);
      readonly touchCount = signal(0);
    }

    const incOf = (host: HTMLElement) =>
      host.querySelector<HTMLButtonElement>('[data-test-id="inc"]')!;
    const decOf = (host: HTMLElement) =>
      host.querySelector<HTMLButtonElement>('[data-test-id="dec"]')!;

    it('forces type="button", tabindex="-1" and reflects the aria-label', () => {
      const { el } = renderHost(ButtonsHost);
      const inc = incOf(el);
      expect(inc.getAttribute('type')).toBe('button');
      expect(inc.getAttribute('tabindex')).toBe('-1');
      expect(inc.getAttribute('aria-label')).toBe('Increase');
    });

    it('steps the value on click', async () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      incOf(el).click();
      await flush();
      expect(fixture.componentInstance.qty()).toBe(6);

      decOf(el).click();
      await flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('marks the field touched on an increment click without ever focusing the input', async () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      expect(inputOf(el).hasAttribute('data-touched')).toBe(false);

      incOf(el).click();
      await flush();

      expect(fixture.componentInstance.qty()).toBe(6);
      expect(fixture.componentInstance.isTouched()).toBe(true);
      expect(inputOf(el).getAttribute('data-touched')).toBe('');
      expect(fixture.componentInstance.touchCount()).toBe(1);
    });

    it('marks the field touched on a decrement click', async () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      expect(inputOf(el).hasAttribute('data-touched')).toBe(false);

      decOf(el).click();
      await flush();

      expect(fixture.componentInstance.qty()).toBe(4);
      expect(fixture.componentInstance.isTouched()).toBe(true);
      expect(inputOf(el).getAttribute('data-touched')).toBe('');
      expect(fixture.componentInstance.touchCount()).toBe(1);
    });

    it('leaves the field untouched when the disabled button at the bound is clicked', async () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      fixture.componentInstance.qty.set(10);
      await flush();

      incOf(el).click();
      await flush();

      expect(fixture.componentInstance.qty()).toBe(10);
      expect(fixture.componentInstance.isTouched()).toBe(false);
      expect(inputOf(el).hasAttribute('data-touched')).toBe(false);
      expect(fixture.componentInstance.touchCount()).toBe(0);
    });

    it('does not throw when no [forNumberInput] is registered in the group', () => {
      @Component({
        imports: [ForNumberInputGroup, ForNumberInputIncrement, ForNumberInputDecrement],
        template: `
          <div forNumberInputGroup>
            <button forNumberInputDecrement data-test-id="dec">−</button>
            <button forNumberInputIncrement data-test-id="inc">+</button>
          </div>
        `,
      })
      class FieldlessHost {}

      const { el } = renderHost(FieldlessHost);
      expect(() => incOf(el).click()).not.toThrow();
      expect(() => decOf(el).click()).not.toThrow();
    });

    it('disables the increment button at max and the decrement button at min', async () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      const inc = incOf(el);
      const dec = decOf(el);

      fixture.componentInstance.qty.set(10);
      await flush();
      expect(inc.hasAttribute('disabled')).toBe(true);
      expect(inc.getAttribute('data-disabled')).toBe('');
      expect(dec.hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.qty.set(0);
      await flush();
      expect(dec.hasAttribute('disabled')).toBe(true);
      expect(dec.getAttribute('data-disabled')).toBe('');
      expect(inc.hasAttribute('disabled')).toBe(false);
    });

    it('throws when used without a [forNumberInputGroup]', () => {
      @Component({
        imports: [ForNumberInputIncrement],
        template: `<button forNumberInputIncrement></button>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrow(/must be used inside a \[forNumberInputGroup\]/);
    });

    it('disables the buttons while no [forNumberInput] is registered in the group', () => {
      @Component({
        imports: [ForNumberInputGroup, ForNumberInputIncrement, ForNumberInputDecrement],
        template: `
          <div forNumberInputGroup>
            <button forNumberInputDecrement data-test-id="dec">−</button>
            <button forNumberInputIncrement data-test-id="inc">+</button>
          </div>
        `,
      })
      class FieldlessHost {}

      const { el } = renderHost(FieldlessHost);
      expect(incOf(el).hasAttribute('disabled')).toBe(true);
      expect(decOf(el).hasAttribute('disabled')).toBe(true);
    });

    @Component({
      imports: [
        ForNumberInputGroup,
        ForNumberInput,
        ForNumberInputIncrement,
        ForNumberInputDecrement,
      ],
      template: `
        <div forNumberInputGroup>
          <button forNumberInputDecrement data-test-id="dec">−</button>
          <input forNumberInput [(value)]="first" data-test-id="first" />
          @if (showSecond()) {
            <input forNumberInput [(value)]="second" data-test-id="second" />
          }
          <button forNumberInputIncrement data-test-id="inc">+</button>
        </div>
      `,
    })
    class DuplicateFieldHost {
      readonly first = signal<number | null>(1);
      readonly second = signal<number | null>(2);
      readonly showSecond = signal(true);
    }

    it('warns when two [forNumberInput]s register under one [forNumberInputGroup]', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderHost(DuplicateFieldHost);

      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain('[forty-cdk/number-input]');
      expect(message).toContain('[forNumberInputGroup]');
      expect(message).toContain('[forNumberInput]');
    });

    it('keeps the stepper buttons bound to the surviving spinbutton when a duplicate unmounts', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { el, fixture, flush } = renderHost(DuplicateFieldHost);

      fixture.componentInstance.showSecond.set(false);
      await flush();

      expect(el.querySelector('[data-test-id="second"]')).toBeNull();
      expect(incOf(el).hasAttribute('disabled')).toBe(false);

      incOf(el).click();
      await flush();
      expect(fixture.componentInstance.first()).toBe(2);
    });
  });

  describe('Intl formatting', () => {
    it('drives aria-valuetext and the displayed text from formatOptions', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      fixture.componentInstance.qty.set(1234.5);
      await flush();
      const input = inputOf(el);

      expect(input.getAttribute('aria-valuenow')).toBe('1234.5');
      expect(input.getAttribute('aria-valuetext')).toBe('$1,234.50');
      expect(input.value).toBe('$1,234.50');
    });

    it('emits no aria-valuetext without formatOptions', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(42);
      await flush();
      expect(inputOf(el).hasAttribute('aria-valuetext')).toBe(false);
    });

    it('reformats the displayed text on blur', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ maximumFractionDigits: 0 });
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1000');
      await flush();
      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1000);
      expect(input.value).toBe('1,000');
    });

    it('round-trips a percent value without ×100 corruption on edit (#1137)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'percent' });
      fixture.componentInstance.qty.set(0.5);
      await flush();
      const input = inputOf(el);
      expect(input.value).toBe('50%');

      input.focus();
      typeInto(input, '51%');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.51);
      expect(input.getAttribute('aria-valuetext')).toBe('51%');

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.51);
      expect(input.value).toBe('51%');
    });

    it('clamps a percent value against its fractional min / max on commit', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'percent' });
      fixture.componentInstance.max.set(1);
      await flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '150%');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1.5);

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1);
      expect(input.value).toBe('100%');
    });

    it('round-trips a currency value unscaled on edit', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      fixture.componentInstance.qty.set(1234.5);
      await flush();
      const input = inputOf(el);
      expect(input.value).toBe('$1,234.50');

      input.focus();
      typeInto(input, '$1,235.50');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1235.5);
    });

    it('round-trips a unit value unscaled on edit', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'unit', unit: 'kilometer' });
      fixture.componentInstance.qty.set(5);
      await flush();
      const input = inputOf(el);
      expect(input.value).toBe('5 km');

      input.focus();
      typeInto(input, '6 km');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(6);
    });

    it('round-trips a percent value in a space-grouping locale on edit (#1174)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('fr-FR');
      fixture.componentInstance.formatOptions.set({ style: 'percent' });
      fixture.componentInstance.qty.set(0.5);
      await flush();
      const input = inputOf(el);
      const fifty = new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(0.5);
      const fiftyOne = new Intl.NumberFormat('fr-FR', { style: 'percent' }).format(0.51);
      expect(input.value).toBe(fifty);

      input.focus();
      typeInto(input, fiftyOne);
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.51);

      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(fixture.componentInstance.qty()).toBe(0.51);
      expect(input.value).toBe(fiftyOne);
    });

    it('round-trips a unit value in a space-grouping locale on edit (#1174)', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('fr-FR');
      fixture.componentInstance.formatOptions.set({ style: 'unit', unit: 'kilometer' });
      fixture.componentInstance.qty.set(5);
      await flush();
      const input = inputOf(el);
      const five = new Intl.NumberFormat('fr-FR', { style: 'unit', unit: 'kilometer' }).format(5);
      const six = new Intl.NumberFormat('fr-FR', { style: 'unit', unit: 'kilometer' }).format(6);
      expect(input.value).toBe(five);

      input.focus();
      typeInto(input, six);
      await flush();
      expect(fixture.componentInstance.qty()).toBe(6);
    });
  });

  describe('disabled / readonly block interaction', () => {
    it('blocks stepping while disabled', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      pressKey(inputOf(el), 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1);
    });

    it('blocks stepping while readonly without disabling the host', async () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      fixture.componentInstance.isReadonly.set(true);
      await flush();
      const input = inputOf(el);
      expect(input.hasAttribute('disabled')).toBe(false);
      pressKey(input, 'ArrowUp');
      await flush();
      expect(fixture.componentInstance.qty()).toBe(1);
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true on blur (reflected as data-touched)', async () => {
      const { el, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(input.getAttribute('data-touched')).toBe('');
    });
  });

  describe('native form submission via hidden input', () => {
    @Component({
      imports: [ForNumberInput],
      template: `
        <form>
          <input
            forNumberInput
            [(value)]="qty"
            [name]="fieldName()"
            [formatOptions]="formatOptions()"
            locale="en-US"
          />
        </form>
      `,
    })
    class FormHost {
      readonly qty = signal<number | null>(null);
      readonly fieldName = signal<string>('');
      readonly formatOptions = signal<Intl.NumberFormatOptions | null>(null);
    }

    it('submits nothing while name is empty', () => {
      const { el } = renderHost(FormHost);
      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });

    it('does not put the name on the visible spinbutton', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      await flush();
      expect(inputOf(el).hasAttribute('name')).toBe(false);
    });

    it('submits the raw number (not the formatted display)', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      fixture.componentInstance.qty.set(1234.5);
      await flush();

      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([['qty', '1234.5']]);
    });

    it('omits the value while empty', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      await flush();
      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });

    @Component({
      imports: [ForNumberInput],
      template: `
        <form>
          <input
            forNumberInput
            [(value)]="qty"
            name="qty"
            [formatOptions]="formatOptions()"
            locale="en-US"
          />
        </form>
      `,
    })
    class StaticNameFormHost {
      readonly qty = signal<number | null>(null);
      readonly formatOptions = signal<Intl.NumberFormatOptions | null>({
        style: 'currency',
        currency: 'USD',
      });
    }

    it('does not double-submit a static `name` alongside the hidden input', async () => {
      const { el, fixture, flush } = renderHost(StaticNameFormHost);
      fixture.componentInstance.qty.set(1234.5);
      await flush();

      const formEl = el.querySelector('form')!;
      expect(inputOf(el).hasAttribute('name')).toBe(false);
      expect(Array.from(new FormData(formEl).entries())).toEqual([['qty', '1234.5']]);
    });
  });

  describe('disabled fieldset', () => {
    @Component({
      imports: [ForNumberInput, ForFieldset],
      template: `
        <div forFieldset [disabled]="disabled()">
          <input forNumberInput [(value)]="qty" name="qty" />
        </div>
      `,
    })
    class FieldsetHost {
      readonly disabled = signal(false);
      readonly qty = signal<number | null>(5);
    }

    const hiddenOf = (host: HTMLElement) =>
      host.querySelector<HTMLInputElement>('input[type="hidden"][name="qty"]')!;

    it('does not disable the hidden input while the fieldset is enabled', () => {
      const { el } = renderHost(FieldsetHost);
      expect(hiddenOf(el).hasAttribute('disabled')).toBe(false);
    });

    it('disables the hidden input when the surrounding fieldset is disabled', async () => {
      const { el, fixture, flush } = renderHost(FieldsetHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      expect(hiddenOf(el).hasAttribute('disabled')).toBe(true);
    });
  });

  describe('field auto-association', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldDescription, ForNumberInput],
      template: `
        <div forField>
          <label forLabel data-test-id="label">Quantity</label>
          <input forNumberInput [(value)]="qty" data-test-id="control" />
          <p forFieldDescription data-test-id="desc">How many?</p>
        </div>
      `,
    })
    class FieldHost {
      readonly qty = signal<number | null>(null);
    }

    const q = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;

    it('assigns an id and points the label `for` at the control', () => {
      const { el } = renderHost(FieldHost);
      const control = q(el, 'control');
      expect(control.id).toBeTruthy();
      expect(q(el, 'label').getAttribute('for')).toBe(control.id);
    });

    it('wires aria-labelledby / aria-describedby to the label and description', () => {
      const { el } = renderHost(FieldHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-labelledby')).toBe(q(el, 'label').id);
      expect(control.getAttribute('aria-describedby')).toBe(q(el, 'desc').id);
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Order {
      qty: number | null;
    }

    @Component({
      imports: [ForNumberInput, FormField],
      template: `<input forNumberInput [formField]="order.qty" data-test-id="qty" />`,
    })
    class SignalFormsHost {
      readonly model = signal<Order>({ qty: null });
      readonly order = form(this.model, (o) => {
        required(o.qty);
        minRule(o.qty, 1);
      });
    }

    const byId = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLInputElement>(`[data-test-id="${id}"]`)!;

    it('two-way binds the value with the field', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const input = byId(el, 'qty');

      typeInto(input, '4');
      await flush();
      expect(fixture.componentInstance.model().qty).toBe(4);

      fixture.componentInstance.model.update((m) => ({ ...m, qty: 9 }));
      await flush();
      expect(input.value).toBe('9');
    });

    it('flows schema-driven required into aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(byId(el, 'qty').getAttribute('aria-required')).toBe('true');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects an external set without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(NumberHost);
      await flush(fixture);
      const input = inputOf(fixture.nativeElement);

      fixture.componentInstance.qty.set(7);
      await flush(fixture);
      expect(input.value).toBe('7');
      expect(input.getAttribute('aria-valuenow')).toBe('7');

      fixture.componentInstance.qty.set(null);
      await flush(fixture);
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });
});
