import { Component, signal } from '@angular/core';
import {
  disabled,
  FormField,
  form,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';

import { flush, renderHost } from '../../test-utils';
import { ForCombobox } from '../combobox/combobox';
import { ForField } from '../field/field';
import { ForFieldError } from '../field/field-error';
import { ForListbox } from '../listbox/listbox';
import { ForListboxOption } from '../listbox/listbox-option';
import { ForSelect } from '../select/select';
import { forSingleValueField } from './single-value-field';

const optOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const listboxOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forListbox]')!;

const hiddenInputs = (host: HTMLElement) =>
  Array.from(host.querySelectorAll<HTMLInputElement>('input[type="hidden"]'));

describe('forSingleValueField', () => {
  describe('value view (returned FieldTree)', () => {
    @Component({ template: '' })
    class Host {
      readonly model = signal<{ country: string | null }>({ country: null });
      readonly tree = form(this.model);
      readonly bridged = forSingleValueField(this.tree.country);
    }

    it('reads `null` as the empty array', () => {
      const { instance } = renderHost(Host);
      expect(instance.bridged().controlValue()).toEqual([]);
      expect(instance.bridged().value()).toEqual([]);
    });

    it('reads a present value as a single-element array', () => {
      const { instance, fixture } = renderHost(Host);
      instance.model.set({ country: 'fr' });
      fixture.detectChanges();
      expect(instance.bridged().controlValue()).toEqual(['fr']);
      expect(instance.bridged().value()).toEqual(['fr']);
    });

    it('returns a stable array reference while the value is unchanged', () => {
      const { instance, fixture } = renderHost(Host);
      instance.model.set({ country: 'fr' });
      fixture.detectChanges();
      const first = instance.bridged().controlValue();
      fixture.detectChanges();
      expect(instance.bridged().controlValue()).toBe(first);
    });

    it('writes a single-element array back as the value', async () => {
      const { instance, fixture } = renderHost(Host);
      instance.bridged().controlValue.set(['fr']);
      await flush(fixture);
      expect(instance.model().country).toBe('fr');
    });

    it('writes the empty array back as `null`', async () => {
      const { instance, fixture } = renderHost(Host);
      instance.model.set({ country: 'fr' });
      fixture.detectChanges();
      instance.bridged().controlValue.set([]);
      await flush(fixture);
      expect(instance.model().country).toBeNull();
    });

    it('keeps the last entry when a longer array is written (single-mode contract)', async () => {
      const { instance, fixture } = renderHost(Host);
      instance.bridged().controlValue.set(['fr', 'de']);
      await flush(fixture);
      expect(instance.model().country).toBe('de');
    });
  });

  describe('state pass-through (delegates to the original field)', () => {
    it('delegates `disabled`', () => {
      @Component({ template: '' })
      class Host {
        readonly model = signal<{ country: string | null }>({ country: null });
        readonly tree = form(this.model, (s) => disabled(s.country));
        readonly bridged = forSingleValueField(this.tree.country);
      }
      const { instance } = renderHost(Host);
      expect(instance.bridged().disabled()).toBe(true);
    });

    it('delegates `required`', () => {
      @Component({ template: '' })
      class Host {
        readonly model = signal<{ country: string | null }>({ country: null });
        readonly tree = form(this.model, (s) => required(s.country));
        readonly bridged = forSingleValueField(this.tree.country);
      }
      const { instance } = renderHost(Host);
      expect(instance.bridged().required()).toBe(true);
    });

    it('delegates `invalid` and `errors`', () => {
      @Component({ template: '' })
      class Host {
        readonly model = signal<{ country: string | null }>({ country: null });
        readonly tree = form(this.model, (s) =>
          validate(s.country, ({ value }) =>
            value() == null ? requiredError({ message: 'Required' }) : undefined,
          ),
        );
        readonly bridged = forSingleValueField(this.tree.country);
      }
      const { instance, fixture } = renderHost(Host);
      expect(instance.bridged().invalid()).toBe(true);
      expect(
        instance
          .bridged()
          .errors()
          .map((e) => e.kind),
      ).toEqual(['required']);

      instance.model.set({ country: 'fr' });
      fixture.detectChanges();
      expect(instance.bridged().invalid()).toBe(false);
      expect(instance.bridged().errors()).toEqual([]);
    });

    it('delegates `markAsTouched` to the original field', () => {
      @Component({ template: '' })
      class Host {
        readonly model = signal<{ country: string | null }>({ country: null });
        readonly tree = form(this.model);
        readonly bridged = forSingleValueField(this.tree.country);
      }
      const { instance } = renderHost(Host);
      expect(instance.tree.country().touched()).toBe(false);
      instance.bridged().markAsTouched();
      expect(instance.tree.country().touched()).toBe(true);
    });
  });

  describe('integration with ForListbox via [formField]', () => {
    @Component({
      imports: [ForListbox, ForListboxOption, FormField],
      template: `
        <ul forListbox [formField]="country">
          <li>
            <button type="button" forListboxOption value="apple" data-test-id="apple">Apple</button>
          </li>
          <li>
            <button type="button" forListboxOption value="banana" data-test-id="banana">
              Banana
            </button>
          </li>
        </ul>
      `,
    })
    class Host {
      readonly model = signal<{ fruit: string | null }>({ fruit: null });
      readonly tree = form(this.model);
      readonly country = forSingleValueField(this.tree.fruit);
    }

    it('reflects the field value as the selected option (field → control)', async () => {
      const { el, instance, fixture } = renderHost(Host);
      expect(optOf(el, 'apple').getAttribute('aria-selected')).toBe('false');

      instance.model.set({ fruit: 'apple' });
      await flush(fixture);
      expect(optOf(el, 'apple').getAttribute('aria-selected')).toBe('true');
      expect(optOf(el, 'banana').getAttribute('aria-selected')).toBe('false');
    });

    it('writes the activated option into the field (control → field)', async () => {
      const { el, instance, fixture } = renderHost(Host);
      optOf(el, 'banana').click();
      await flush(fixture);
      expect(instance.model().fruit).toBe('banana');
      expect(optOf(el, 'banana').getAttribute('aria-selected')).toBe('true');
    });

    it('clears the selection when the field becomes `null`', async () => {
      const { el, instance, fixture } = renderHost(Host);
      instance.model.set({ fruit: 'apple' });
      await flush(fixture);
      expect(optOf(el, 'apple').getAttribute('aria-selected')).toBe('true');

      instance.model.set({ fruit: null });
      await flush(fixture);
      expect(optOf(el, 'apple').getAttribute('aria-selected')).toBe('false');
      expect(optOf(el, 'banana').getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('integration: field UI state flows through [formField]', () => {
    @Component({
      imports: [ForListbox, ForListboxOption, ForField, ForFieldError, FormField],
      template: `
        <div forField>
          <ul forListbox [formField]="country">
            <li>
              <button type="button" forListboxOption value="apple" data-test-id="apple">
                Apple
              </button>
            </li>
          </ul>
          @if (showError()) {
            <p forFieldError #err="forFieldError" data-test-id="error">
              {{ err.messages().join(', ') }}
            </p>
          }
        </div>
      `,
    })
    class Host {
      readonly model = signal<{ fruit: string | null }>({ fruit: null });
      readonly tree = form(this.model, (s) => {
        required(s.fruit);
        disabled(s.fruit, () => this.disable());
        validate(s.fruit, ({ value }) =>
          value() == null ? requiredError({ message: 'Pick a fruit' }) : undefined,
        );
      });
      readonly country = forSingleValueField(this.tree.fruit);
      readonly disable = signal(false);
      readonly showError = signal(false);
    }

    it('reflects schema `required` as aria-required', async () => {
      const { el, fixture } = renderHost(Host);
      await flush(fixture);
      expect(listboxOf(el).getAttribute('aria-required')).toBe('true');
    });

    it('reflects schema `disabled` as aria-disabled and data-disabled', async () => {
      const { el, instance, fixture } = renderHost(Host);
      instance.disable.set(true);
      await flush(fixture);
      expect(listboxOf(el).getAttribute('aria-disabled')).toBe('true');
      expect(listboxOf(el).hasAttribute('data-disabled')).toBe(true);
    });

    it('reflects field `invalid` as aria-invalid', async () => {
      const { el, fixture } = renderHost(Host);
      await flush(fixture);
      expect(listboxOf(el).getAttribute('aria-invalid')).toBe('true');
    });

    it('surfaces the field validation errors through the error region', async () => {
      const { el, instance, fixture } = renderHost(Host);
      instance.showError.set(true);
      await flush(fixture);
      expect(el.querySelector('[data-test-id="error"]')?.textContent).toContain('Pick a fruit');
    });

    it('propagates touch back to the field on blur', async () => {
      const { el, instance, fixture } = renderHost(Host);
      listboxOf(el).dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }),
      );
      await flush(fixture);
      expect(instance.tree.fruit().touched()).toBe(true);
      expect(listboxOf(el).hasAttribute('data-touched')).toBe(true);
    });
  });

  describe('integration with ForSelect and ForCombobox (read direction via hidden inputs)', () => {
    @Component({
      imports: [ForSelect, FormField],
      template: `<div forSelect [formField]="country"></div>`,
    })
    class SelectHost {
      readonly model = signal<{ country: string | null }>({ country: null });
      readonly tree = form(this.model);
      readonly country = forSingleValueField(this.tree.country);
    }

    it('binds a single-valued field to ForSelect', async () => {
      const { el, instance, fixture } = renderHost(SelectHost);
      expect(hiddenInputs(el)).toHaveLength(0);

      instance.model.set({ country: 'fr' });
      await flush(fixture);
      const inputs = hiddenInputs(el);
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.value).toBe('fr');

      instance.model.set({ country: null });
      await flush(fixture);
      expect(hiddenInputs(el)).toHaveLength(0);
    });

    @Component({
      imports: [ForCombobox, FormField],
      template: `<div forCombobox [formField]="country"></div>`,
    })
    class ComboboxHost {
      readonly model = signal<{ country: string | null }>({ country: null });
      readonly tree = form(this.model);
      readonly country = forSingleValueField(this.tree.country);
    }

    it('binds a single-valued field to ForCombobox', async () => {
      const { el, instance, fixture } = renderHost(ComboboxHost);
      expect(hiddenInputs(el)).toHaveLength(0);

      instance.model.set({ country: 'fr' });
      await flush(fixture);
      const inputs = hiddenInputs(el);
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.value).toBe('fr');
    });
  });
});
