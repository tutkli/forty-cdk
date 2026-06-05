import { Component, signal } from '@angular/core';
import { form, FormField, min as minRule, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../test-utils/contract';
import { pressKey } from '../../test-utils/keyboard';
import { renderHost } from '../../test-utils/render';
import { ForFieldDescription } from '../field/field-description';
import { ForField } from '../field/field';
import { ForLabel } from '../field/label';
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

    it('reflects min / max as aria-valuemin / aria-valuemax', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(10);
      flush();
      const input = inputOf(el);
      expect(input.getAttribute('aria-valuemin')).toBe('0');
      expect(input.getAttribute('aria-valuemax')).toBe('10');
    });

    it('uses decimal inputmode when fractional values are possible', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.step.set(0.1);
      flush();
      expect(inputOf(el).getAttribute('inputmode')).toBe('decimal');
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
    it('updates the model and toggles data-empty / aria-valuenow', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.focus();

      typeInto(input, '42');
      flush();
      expect(fixture.componentInstance.qty()).toBe(42);
      expect(input.hasAttribute('data-empty')).toBe(false);
      expect(input.getAttribute('aria-valuenow')).toBe('42');

      typeInto(input, '');
      flush();
      expect(fixture.componentInstance.qty()).toBeNull();
      expect(input.getAttribute('data-empty')).toBe('');
      expect(input.hasAttribute('aria-valuenow')).toBe(false);
    });

    it('ignores non-numeric input, keeping the last valid value', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.focus();

      typeInto(input, '7');
      flush();
      typeInto(input, 'abc');
      flush();
      expect(fixture.componentInstance.qty()).toBe(7);
    });

    it('rejects exponent notation rather than silently parsing it', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '5');
      flush();
      typeInto(input, '2e3');
      flush();
      expect(fixture.componentInstance.qty()).toBe(5);

      typeInto(input, '1e5');
      flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('rejects multi-sign and multi-decimal malformed input', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '8');
      flush();
      typeInto(input, '+-5');
      flush();
      expect(fixture.componentInstance.qty()).toBe(8);

      typeInto(input, '1.2.3');
      flush();
      expect(fixture.componentInstance.qty()).toBe(8);
    });

    it('parses a plain decimal in a comma-decimal locale', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('de-DE');
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1.234,5');
      flush();
      expect(fixture.componentInstance.qty()).toBe(1234.5);
    });

    it('parses a correctly grouped integer', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1,234,567');
      flush();
      expect(fixture.componentInstance.qty()).toBe(1234567);
    });

    it('rejects a misgrouped integer instead of collapsing it', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '9');
      flush();
      // "1,2,3" is not valid grouping; it must NOT silently parse to 123.
      typeInto(input, '1,2,3');
      flush();
      expect(fixture.componentInstance.qty()).toBe(9);
    });

    it('does not clamp while typing (clamps on commit)', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(10);
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '5');
      flush();
      expect(fixture.componentInstance.qty()).toBe(5);

      input.dispatchEvent(new FocusEvent('blur'));
      flush();
      expect(fixture.componentInstance.qty()).toBe(10);
    });
  });

  describe('keyboard stepping', () => {
    it('ArrowUp / ArrowDown step by `step`', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(5);
      flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(6);
      expect(input.getAttribute('aria-valuenow')).toBe('6');

      pressKey(input, 'ArrowDown');
      flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('PageUp / PageDown step by step × stepMultiplier', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(50);
      flush();
      const input = inputOf(el);

      pressKey(input, 'PageUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(60);

      pressKey(input, 'PageDown');
      flush();
      expect(fixture.componentInstance.qty()).toBe(50);
    });

    it('Home / End jump to min / max', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(100);
      fixture.componentInstance.qty.set(50);
      flush();
      const input = inputOf(el);

      pressKey(input, 'End');
      flush();
      expect(fixture.componentInstance.qty()).toBe(100);

      pressKey(input, 'Home');
      flush();
      expect(fixture.componentInstance.qty()).toBe(0);
    });

    it('prevents default on handled keys', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      flush();
      const event = pressKey(inputOf(el), 'ArrowUp');
      expect(event.defaultPrevented).toBe(true);
    });

    it('steps from empty to the clamped baseline (min ?? 0)', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(3);
      flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(3);
    });
  });

  describe('clamping', () => {
    it('clamps stepping at min and max', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.min.set(0);
      fixture.componentInstance.max.set(2);
      fixture.componentInstance.qty.set(2);
      flush();
      const input = inputOf(el);

      pressKey(input, 'ArrowUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(2);

      fixture.componentInstance.qty.set(0);
      flush();
      pressKey(input, 'ArrowDown');
      flush();
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
          <input forNumberInput [(value)]="qty" [min]="min()" [max]="max()" />
          <button forNumberInputIncrement ariaLabel="Increase" data-test-id="inc">+</button>
        </div>
      `,
    })
    class ButtonsHost {
      readonly qty = signal<number | null>(5);
      readonly min = signal<number | undefined>(0);
      readonly max = signal<number | undefined>(10);
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

    it('steps the value on click', () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      incOf(el).click();
      flush();
      expect(fixture.componentInstance.qty()).toBe(6);

      decOf(el).click();
      flush();
      expect(fixture.componentInstance.qty()).toBe(5);
    });

    it('disables the increment button at max and the decrement button at min', () => {
      const { el, fixture, flush } = renderHost(ButtonsHost);
      const inc = incOf(el);
      const dec = decOf(el);

      fixture.componentInstance.qty.set(10);
      flush();
      expect(inc.hasAttribute('disabled')).toBe(true);
      expect(inc.getAttribute('data-disabled')).toBe('');
      expect(dec.hasAttribute('disabled')).toBe(false);

      fixture.componentInstance.qty.set(0);
      flush();
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
  });

  describe('Intl formatting', () => {
    it('drives aria-valuetext and the displayed text from formatOptions', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      fixture.componentInstance.qty.set(1234.5);
      flush();
      const input = inputOf(el);

      expect(input.getAttribute('aria-valuenow')).toBe('1234.5');
      expect(input.getAttribute('aria-valuetext')).toBe('$1,234.50');
      expect(input.value).toBe('$1,234.50');
    });

    it('emits no aria-valuetext without formatOptions', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(42);
      flush();
      expect(inputOf(el).hasAttribute('aria-valuetext')).toBe(false);
    });

    it('reformats the displayed text on blur', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.locale.set('en-US');
      fixture.componentInstance.formatOptions.set({ maximumFractionDigits: 0 });
      flush();
      const input = inputOf(el);
      input.focus();

      typeInto(input, '1000');
      flush();
      input.dispatchEvent(new FocusEvent('blur'));
      flush();
      expect(fixture.componentInstance.qty()).toBe(1000);
      expect(input.value).toBe('1,000');
    });
  });

  describe('disabled / readonly block interaction', () => {
    it('blocks stepping while disabled', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      fixture.componentInstance.isDisabled.set(true);
      flush();
      pressKey(inputOf(el), 'ArrowUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(1);
    });

    it('blocks stepping while readonly without disabling the host', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      fixture.componentInstance.qty.set(1);
      fixture.componentInstance.isReadonly.set(true);
      flush();
      const input = inputOf(el);
      expect(input.hasAttribute('disabled')).toBe(false);
      pressKey(input, 'ArrowUp');
      flush();
      expect(fixture.componentInstance.qty()).toBe(1);
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true on blur (reflected as data-touched)', () => {
      const { el, flush } = renderHost(NumberHost);
      const input = inputOf(el);
      input.dispatchEvent(new FocusEvent('blur'));
      flush();
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

    it('does not put the name on the visible spinbutton', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      flush();
      expect(inputOf(el).hasAttribute('name')).toBe(false);
    });

    it('submits the raw number (not the formatted display)', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      fixture.componentInstance.formatOptions.set({ style: 'currency', currency: 'USD' });
      fixture.componentInstance.qty.set(1234.5);
      flush();

      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([['qty', '1234.5']]);
    });

    it('omits the value while empty', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('qty');
      flush();
      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
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

    it('two-way binds the value with the field', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const input = byId(el, 'qty');

      typeInto(input, '4');
      flush();
      expect(fixture.componentInstance.model().qty).toBe(4);

      fixture.componentInstance.model.update((m) => ({ ...m, qty: 9 }));
      flush();
      expect(input.value).toBe('9');
    });

    it('flows schema-driven required into aria-required', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(byId(el, 'qty').getAttribute('aria-required')).toBe('true');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects an external set without Zone.js', () => {
      const { el, fixture, flush } = renderHost(NumberHost);
      const input = inputOf(el);

      fixture.componentInstance.qty.set(7);
      flush();
      expect(input.value).toBe('7');
      expect(input.getAttribute('aria-valuenow')).toBe('7');

      fixture.componentInstance.qty.set(null);
      flush();
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });
});
