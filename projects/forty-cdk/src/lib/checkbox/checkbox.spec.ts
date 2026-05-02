import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import { renderHost } from '../../test-utils/render';
import { ForCheckbox } from './checkbox';
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
  readonly fieldName = signal<string>('');
}

const checkboxOf = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('button')!;

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

  describe('click', () => {
    it('toggles aria-checked between true/false', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      const cb = checkboxOf(el);

      cb.click();
      flush();
      expect(cb.getAttribute('aria-checked')).toBe('true');
      expect(cb.getAttribute('data-state')).toBe('checked');
      expect(fixture.componentInstance.agreed()).toBe(true);

      cb.click();
      flush();
      expect(cb.getAttribute('aria-checked')).toBe('false');
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('two-way [(checked)]', () => {
    it('reflects external writes', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.agreed.set(true);
      flush();
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('indeterminate (tri-state)', () => {
    it('renders aria-checked="mixed" and data-state="indeterminate" when set', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      flush();

      const cb = checkboxOf(el);
      expect(cb.getAttribute('aria-checked')).toBe('mixed');
      expect(cb.getAttribute('data-state')).toBe('indeterminate');
    });

    it('beats `checked` when both are true', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.agreed.set(true);
      fixture.componentInstance.indeterminate.set(true);
      flush();
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('mixed');
    });

    it('clears indeterminate and toggles checked on activation (from unchecked)', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      fixture.componentInstance.agreed.set(false);
      flush();

      checkboxOf(el).click();
      flush();

      expect(fixture.componentInstance.indeterminate()).toBe(false);
      expect(fixture.componentInstance.agreed()).toBe(true);
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('true');
    });

    it('clears indeterminate and toggles checked on activation (from checked)', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.indeterminate.set(true);
      fixture.componentInstance.agreed.set(true);
      flush();

      checkboxOf(el).click();
      flush();

      expect(fixture.componentInstance.indeterminate()).toBe(false);
      expect(fixture.componentInstance.agreed()).toBe(false);
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('disabled', () => {
    it('blocks click and reflects disabled + aria-disabled', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();

      const cb = checkboxOf(el);
      expect(cb.hasAttribute('disabled')).toBe(true);
      expect(cb.getAttribute('aria-disabled')).toBe('true');
      cb.click();
      flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('readonly', () => {
    it('blocks click without setting native disabled', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.isReadonly.set(true);
      flush();

      const cb = checkboxOf(el);
      expect(cb.getAttribute('aria-readonly')).toBe('true');
      expect(cb.hasAttribute('disabled')).toBe(false);
      cb.click();
      flush();
      expect(fixture.componentInstance.agreed()).toBe(false);
    });
  });

  describe('required / invalid / pending / name', () => {
    it('reflects each as the corresponding aria/attr', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.isRequired.set(true);
      fixture.componentInstance.isInvalid.set(true);
      fixture.componentInstance.isPending.set(true);
      fixture.componentInstance.fieldName.set('terms');
      flush();

      const cb = checkboxOf(el);
      expect(cb.getAttribute('aria-required')).toBe('true');
      expect(cb.getAttribute('aria-invalid')).toBe('true');
      expect(cb.getAttribute('aria-busy')).toBe('true');
      expect(cb.getAttribute('name')).toBe('terms');
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

    it('hides the indicator while unchecked', () => {
      const { el } = renderHost(IndicatorHost);
      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.hasAttribute('hidden')).toBe(true);
      expect(ind.getAttribute('data-state')).toBe('unchecked');
    });

    it('shows the indicator while checked', () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.agreed.set(true);
      flush();

      const ind = el.querySelector<HTMLElement>('[data-test-id="ind"]')!;
      expect(ind.hasAttribute('hidden')).toBe(false);
      expect(ind.getAttribute('data-state')).toBe('checked');
    });

    it('shows the indicator while indeterminate', () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.indeterminate.set(true);
      flush();

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
  });

  describe('form-state data attributes', () => {
    @Component({
      imports: [ForCheckbox],
      template: `
        <button
          forCheckbox
          [(checked)]="agreed"
          [(touched)]="touched"
          [dirty]="dirty()"
          [pending]="pending()"
          [invalid]="invalid()"
        ></button>
      `,
    })
    class FlagsHost {
      readonly agreed = signal(false);
      readonly touched = signal(false);
      readonly dirty = signal(false);
      readonly pending = signal(false);
      readonly invalid = signal(false);
    }

    it('reflects each form-state flag as a boolean data-* attribute', () => {
      const { el, fixture, flush } = renderHost(FlagsHost);
      const cb = el.querySelector<HTMLButtonElement>('button')!;

      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.dirty.set(true);
      fixture.componentInstance.pending.set(true);
      fixture.componentInstance.invalid.set(true);
      flush();

      expect(cb.getAttribute('data-touched')).toBe('');
      expect(cb.getAttribute('data-dirty')).toBe('');
      expect(cb.getAttribute('data-pending')).toBe('');
      expect(cb.getAttribute('data-invalid')).toBe('');

      fixture.componentInstance.touched.set(false);
      flush();
      expect(cb.hasAttribute('data-touched')).toBe(false);
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

    it('submits name=on while checked', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('terms');
      fixture.componentInstance.agreed.set(true);
      flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([['terms', 'on']]);
    });

    it('omits the value while unchecked, including in indeterminate state', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('terms');
      fixture.componentInstance.indeterminate.set(true);
      flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external sets without Zone.js', () => {
      const { el, fixture, flush } = renderHost(CheckboxHost);
      fixture.componentInstance.agreed.set(true);
      flush();
      expect(checkboxOf(el).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForCheckbox, FormField],
      template: `
        <button forCheckbox [formField]="checkout.acceptTerms"></button>
      `,
    })
    class SignalFormsHost {
      readonly model = signal({ acceptTerms: false });
      readonly checkout = form(this.model, (s) => required(s.acceptTerms));
    }

    it('two-way binds checked with the field value', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const cb = checkboxOf(el);

      // Click flows to model:
      cb.click();
      flush();
      expect(fixture.componentInstance.model().acceptTerms).toBe(true);
      expect(cb.getAttribute('aria-checked')).toBe('true');

      // External model write flows to DOM:
      fixture.componentInstance.model.set({ acceptTerms: false });
      flush();
      expect(cb.getAttribute('aria-checked')).toBe('false');
    });

    it('flows schema `required` into aria-required', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(checkboxOf(el).getAttribute('aria-required')).toBe('true');
    });
  });
});
