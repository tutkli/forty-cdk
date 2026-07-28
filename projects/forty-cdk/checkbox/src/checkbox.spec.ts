import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';

import { flush, pressKey } from '../../src/test-utils';
import { renderHost } from '../../src/test-utils/render';
import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { FOR_CHECKBOX, ForCheckbox } from './checkbox';
import {
  FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS,
  FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS,
} from './checkbox-host-directive';
import { ForCheckboxIndicator } from './checkbox-indicator';

@Component({
  imports: [ForCheckbox],
  template: `
    <button
      forCheckbox
      [(checked)]="agreed"
      [(indeterminate)]="indeterminate"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
    ></button>
  `,
})
class CheckboxHost {
  readonly agreed = signal(false);
  readonly indeterminate = signal(false);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal<string>('');
}

@Component({
  imports: [ForCheckbox],
  template: `
    <div forCheckbox [(checked)]="agreed" [disabled]="isDisabled()" [readonly]="isReadonly()"></div>
  `,
})
class DivCheckboxHost {
  readonly agreed = signal(false);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
}

const checkboxOf = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('button')!;

const divCheckboxOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forCheckbox]')!;

describe('ForCheckbox', () => {
  describe('static accessibility', () => {
    it('sets role="checkbox", type="button", and starts unchecked', () => {
      const { el } = renderHost(CheckboxHost);
      const cb = checkboxOf(el);
      expect(cb.getAttribute('role')).toBe('checkbox');
      expect(cb.getAttribute('type')).toBe('button');
      expect(cb.getAttribute('aria-checked')).toBe('false');
      expect(cb.getAttribute('data-state')).toBe('unchecked');
    });
  });

  assertFormControlContract(
    () => {
      const r = renderHost(CheckboxHost);
      const result: FormControlMountResult = {
        control: checkboxOf(r.el),
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
        setName: (name) => r.fixture.componentInstance.fieldName.set(name),
      };
      return result;
    },
    { customRoleStaysFocusable: true },
  );

  describe('click', () => {
    it('toggles aria-checked between true/false', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      const cb = checkboxOf(el);

      cb.click();
      await flush();
      expect(cb.getAttribute('aria-checked')).toBe('true');
      expect(cb.getAttribute('data-state')).toBe('checked');
      expect(fixture.componentInstance.agreed()).toBe(true);

      cb.click();
      await flush();
      expect(cb.getAttribute('aria-checked')).toBe('false');
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('two-way [(checked)]', () => {
    it('reflects external writes', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.agreed.set(true);
      await flush();
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('indeterminate (tri-state)', () => {
    it('renders aria-checked="mixed" and data-state="indeterminate" when set', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      await flush();

      const cb = checkboxOf(el);
      expect(cb.getAttribute('aria-checked')).toBe('mixed');
      expect(cb.getAttribute('data-state')).toBe('indeterminate');
    });

    it('beats `checked` when both are true', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.agreed.set(true);
      fixture.componentInstance.indeterminate.set(true);
      await flush();
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('mixed');
    });

    it('clears indeterminate and toggles checked on activation (from unchecked)', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      fixture.componentInstance.agreed.set(false);
      await flush();

      checkboxOf(el).click();
      await flush();

      expect(fixture.componentInstance.indeterminate()).toBe(false);
      expect(fixture.componentInstance.agreed()).toBe(true);
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('true');
    });

    it('clears indeterminate and toggles checked on activation (from checked)', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      fixture.componentInstance.agreed.set(true);
      await flush();

      checkboxOf(el).click();
      await flush();

      expect(fixture.componentInstance.indeterminate()).toBe(false);
      expect(fixture.componentInstance.agreed()).toBe(false);
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('disabled / readonly block activation', () => {
    it('blocks click while disabled', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      checkboxOf(el).click();
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });

    it('blocks click while readonly without disabling the host', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.isReadonly.set(true);
      await flush();
      const cb = checkboxOf(el);
      expect(cb.hasAttribute('disabled')).toBe(false);
      cb.click();
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('non-button host keyboard activation', () => {
    it('adds tabindex="0" so the announced role="checkbox" is focusable', () => {
      const { el } = renderHost(DivCheckboxHost);
      const cb = divCheckboxOf(el);
      expect(cb.getAttribute('role')).toBe('checkbox');
      expect(cb.getAttribute('tabindex')).toBe('0');
      cb.focus();
      expect(document.activeElement).toBe(cb);
    });

    it('emits no tabindex on a native <button> host, whose tab stop the platform owns', () => {
      const { el } = renderHost(CheckboxHost);
      expect(checkboxOf(el).hasAttribute('tabindex')).toBe(false);
    });

    it('toggles on Space keyup and blocks page scroll on the keydown', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      const cb = divCheckboxOf(el);

      const down = pressKey(cb, ' ');
      await flush();
      expect(down.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.agreed()).toBe(false);

      pressKey(cb, ' ', { type: 'keyup' });
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(true);
      expect(cb.getAttribute('aria-checked')).toBe('true');
      expect(cb.getAttribute('data-state')).toBe('checked');
    });

    it('toggles on Enter keydown', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      const cb = divCheckboxOf(el);

      const down = pressKey(cb, 'Enter');
      await flush();
      expect(down.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.agreed()).toBe(true);
    });

    it('ignores a Space keyup with no preceding keydown', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      pressKey(divCheckboxOf(el), ' ', { type: 'keyup' });
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });

    it('drops a half-finished Space press when focus leaves the host', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      const cb = divCheckboxOf(el);

      pressKey(cb, ' ');
      cb.dispatchEvent(new FocusEvent('blur'));
      pressKey(cb, ' ', { type: 'keyup' });
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });

    it('does not activate while disabled, but still blocks page scroll on Space', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      const cb = divCheckboxOf(el);

      const down = pressKey(cb, ' ');
      pressKey(cb, ' ', { type: 'keyup' });
      pressKey(cb, 'Enter');
      await flush();
      expect(down.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.agreed()).toBe(false);
    });

    it('does not activate while readonly', async () => {
      const { el, fixture, flush } = renderHost(DivCheckboxHost);
      fixture.componentInstance.isReadonly.set(true);
      await flush();
      const cb = divCheckboxOf(el);

      pressKey(cb, ' ');
      pressKey(cb, ' ', { type: 'keyup' });
      pressKey(cb, 'Enter');
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });

    it('synthesizes nothing on a native <button> host, so activation never doubles', async () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      const cb = checkboxOf(el);

      const down = pressKey(cb, ' ');
      pressKey(cb, ' ', { type: 'keyup' });
      pressKey(cb, 'Enter');
      await flush();
      expect(down.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('hostDirectives composition on a non-button host', () => {
    @Component({
      selector: 'div[wrapped-checkbox]',
      template: '',
      hostDirectives: [
        {
          directive: ForCheckbox,
          inputs: [...FOR_CHECKBOX_HOST_DIRECTIVE_INPUTS],
          outputs: [...FOR_CHECKBOX_HOST_DIRECTIVE_OUTPUTS],
        },
      ],
    })
    class WrappedCheckbox {}

    @Component({
      imports: [WrappedCheckbox],
      template: `<div wrapped-checkbox [(checked)]="agreed"></div>`,
    })
    class WrapperHost {
      readonly agreed = signal(false);
    }

    it('gets the same tab stop and Space activation as a direct selector match', async () => {
      const { el, fixture, flush } = renderHost(WrapperHost);
      const cb = el.querySelector<HTMLElement>('[wrapped-checkbox]')!;
      expect(cb.getAttribute('role')).toBe('checkbox');
      expect(cb.getAttribute('tabindex')).toBe('0');

      pressKey(cb, ' ');
      pressKey(cb, ' ', { type: 'keyup' });
      await flush();
      expect(fixture.componentInstance.agreed()).toBe(true);
      expect(cb.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('ForCheckboxIndicator', () => {
    @Component({
      imports: [ForCheckbox, ForCheckboxIndicator],
      template: `
        <button forCheckbox [(checked)]="agreed" [(indeterminate)]="indeterminate">
          <span forCheckboxIndicator data-test-id="ind">✓</span>
        </button>
      `,
    })
    class IndicatorHost {
      readonly agreed = signal(false);
      readonly indeterminate = signal(false);
    }

    it('reflects data-state unchecked without a hidden attribute while unchecked', () => {
      const { el } = renderHost(IndicatorHost);
      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.hasAttribute('hidden')).toBe(false);
      expect(ind.getAttribute('data-state')).toBe('unchecked');
    });

    it('reflects data-state checked without a hidden attribute while checked', async () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.agreed.set(true);
      await flush();

      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.hasAttribute('hidden')).toBe(false);
      expect(ind.getAttribute('data-state')).toBe('checked');
    });

    it('reflects data-state indeterminate without a hidden attribute while indeterminate', async () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.indeterminate.set(true);
      await flush();

      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.hasAttribute('hidden')).toBe(false);
      expect(ind.getAttribute('data-state')).toBe('indeterminate');
    });

    it('throws when used outside [forCheckbox]', () => {
      @Component({
        imports: [ForCheckboxIndicator],
        template: `<span forCheckboxIndicator></span>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrow(
        /\[forty-cdk\/checkbox\] ForCheckboxIndicator must be used inside a \[forCheckbox\] element\./,
      );
    });

    it('resolves a subclassed checkbox via the re-provided FOR_CHECKBOX token', () => {
      @Directive({
        selector: '[testCheckbox]',
        providers: [{ provide: FOR_CHECKBOX, useExisting: TestCheckbox }],
      })
      class TestCheckbox extends ForCheckbox {}

      @Component({
        imports: [TestCheckbox, ForCheckboxIndicator],
        template: `
          <button testCheckbox [(checked)]="agreed">
            <span forCheckboxIndicator data-test-id="ind">✓</span>
          </button>
        `,
      })
      class SubclassHost {
        readonly agreed = signal(true);
      }

      const { el } = renderHost(SubclassHost);
      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.getAttribute('data-state')).toBe('checked');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForCheckbox],
      template: `
        <form>
          <button
            forCheckbox
            [(checked)]="agreed"
            [(indeterminate)]="indeterminate"
            [name]="fieldName()"
          ></button>
        </form>
      `,
    })
    class FormHost {
      readonly agreed = signal(false);
      readonly indeterminate = signal(false);
      readonly fieldName = signal<string>('');
    }

    it('submits name=on while checked', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('terms');
      fixture.componentInstance.agreed.set(true);
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([['terms', 'on']]);
    });

    it('omits the value while unchecked, including in indeterminate state', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('terms');
      fixture.componentInstance.indeterminate.set(true);
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external sets without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(CheckboxHost);
      await flush(fixture);

      const checkbox = checkboxOf(fixture.nativeElement);
      expect(checkbox.getAttribute('aria-checked')).toBe('false');

      fixture.componentInstance.agreed.set(true);
      await flush(fixture);

      expect(checkbox.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForCheckbox, FormField],
      template: ` <button forCheckbox [formField]="checkout.acceptTerms"></button> `,
    })
    class SignalFormsHost {
      readonly model = signal({ acceptTerms: false });
      readonly checkout = form(this.model, (s) => required(s.acceptTerms));
    }

    it('two-way binds checked with the field value', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const cb = checkboxOf(el);

      // Click flows to model:
      cb.click();
      await flush();
      expect(fixture.componentInstance.model().acceptTerms).toBe(true);
      expect(cb.getAttribute('aria-checked')).toBe('true');

      // External model write flows to DOM:
      fixture.componentInstance.model.set({ acceptTerms: false });
      await flush();
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });

    it('flows schema `required` into aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(checkboxOf(el).getAttribute('aria-required')).toBe('true');
    });
  });
});
