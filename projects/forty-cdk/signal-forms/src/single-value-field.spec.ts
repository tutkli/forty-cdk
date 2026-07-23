import { Component, isSignal, signal } from '@angular/core';
import {
  disabled,
  type FieldTree,
  FormField,
  form,
  required,
  requiredError,
  validate,
} from '@angular/forms/signals';

import { flush, renderHost } from '../../src/test-utils';
import { ForCombobox } from 'forty-cdk/combobox';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForSelect } from 'forty-cdk/select';
import { ForField, ForFieldError } from 'forty-cdk/field';

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

  describe('delegated signal getters preserve their brand and identity', () => {
    @Component({ template: '' })
    class Host {
      readonly model = signal<{ country: string | null }>({ country: null });
      readonly tree = form(this.model, (s) => required(s.country));
      readonly bridged = forSingleValueField(this.tree.country);
    }

    const signalMembers = [
      'errors',
      'disabled',
      'dirty',
      'touched',
      'invalid',
      'pending',
      'readonly',
      'required',
      'name',
    ] as const;

    it('keeps delegated members recognizable as signals via `isSignal`', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged() as unknown as Record<string, unknown>;
      for (const member of signalMembers) {
        expect(isSignal(control[member])).toBe(true);
      }
    });

    it('returns the underlying fields own signal reference (identity preserved)', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged() as unknown as Record<string, unknown>;
      const real = instance.tree.country() as unknown as Record<string, unknown>;
      for (const member of signalMembers) {
        expect(control[member]).toBe(real[member]);
      }
    });

    it('exposes the writable signal API on a delegated signal (no `.bind` stripping)', () => {
      const { instance } = renderHost(Host);
      const errors = instance.bridged().errors;
      expect(isSignal(errors)).toBe(true);
      expect(errors).toBe(instance.tree.country().errors);
    });

    it('still binds genuine methods to the original field', () => {
      const { instance } = renderHost(Host);
      const markAsTouched = instance.bridged().markAsTouched;
      expect(isSignal(markAsTouched)).toBe(false);
      expect(typeof markAsTouched).toBe('function');
      markAsTouched();
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

  describe('introspection coherence (the returned control answers consistently)', () => {
    @Component({ template: '' })
    class Host {
      readonly model = signal<{ country: string | null }>({ country: null });
      readonly tree = form(this.model);
      readonly bridged = forSingleValueField(this.tree.country);
    }

    it('reports `value` and `controlValue` as present via `in` and `Reflect.has`', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      expect('value' in control).toBe(true);
      expect('controlValue' in control).toBe(true);
      expect(Reflect.has(control, 'value')).toBe(true);
      expect(Reflect.has(control, 'controlValue')).toBe(true);
    });

    it('reports delegated members as present and unknown members as absent', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      expect('errors' in control).toBe(true);
      expect('disabled' in control).toBe(true);
      expect('markAsTouched' in control).toBe(true);
      expect('definitelyNotAMember' in control).toBe(false);
      expect(Reflect.has(control, 'definitelyNotAMember')).toBe(false);
    });

    it('enumerates `controlValue` as an own key (Object.keys, Reflect.ownKeys)', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      expect(Object.keys(control)).toContain('controlValue');
      expect(Reflect.ownKeys(control)).toContain('controlValue');
    });

    it('exposes `controlValue` through spread as the same array view the `get` view returns', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      const spread = { ...control } as Record<string, unknown>;
      expect(spread['controlValue']).toBe(control.controlValue);
    });

    it('describes `controlValue` with a descriptor that agrees with the `get` view', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      const descriptor = Object.getOwnPropertyDescriptor(control, 'controlValue');
      expect(descriptor?.value).toBe(control.controlValue);
      expect(descriptor?.configurable).toBe(true);
      expect(descriptor?.enumerable).toBe(true);
    });

    it('returns no descriptor for an unknown member', () => {
      const { instance } = renderHost(Host);
      const control = instance.bridged();
      expect(Object.getOwnPropertyDescriptor(control, 'definitelyNotAMember')).toBeUndefined();
    });
  });

  describe('[formField] control-access contract (tripwire for Signal Forms internals)', () => {
    type TrapOp = 'get' | 'has' | 'ownKeys' | 'getOwnPropertyDescriptor';
    interface Access {
      op: TrapOp;
      key: string;
    }

    const recordingField = <T>(
      field: FieldTree<readonly T[]>,
      accesses: Access[],
    ): FieldTree<readonly T[]> => {
      const control = field() as object;
      const recorder = new Proxy(control, {
        get(target, property) {
          if (typeof property === 'string') {
            accesses.push({ op: 'get', key: property });
          }
          return Reflect.get(target, property);
        },
        has(target, property) {
          if (typeof property === 'string') {
            accesses.push({ op: 'has', key: property });
          }
          return Reflect.has(target, property);
        },
        ownKeys(target) {
          accesses.push({ op: 'ownKeys', key: '*' });
          return Reflect.ownKeys(target);
        },
        getOwnPropertyDescriptor(target, property) {
          if (typeof property === 'string') {
            accesses.push({ op: 'getOwnPropertyDescriptor', key: property });
          }
          return Reflect.getOwnPropertyDescriptor(target, property);
        },
      });
      return (() => recorder) as unknown as FieldTree<readonly T[]>;
    };

    @Component({
      imports: [ForListbox, ForListboxOption, FormField],
      template: `
        <ul forListbox [formField]="fruit">
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
      readonly accesses: Access[] = [];
      readonly fruit = recordingField(forSingleValueField(this.tree.fruit), this.accesses);
    }

    const exerciseLifecycle = async (): Promise<Access[]> => {
      const { el, instance, fixture } = renderHost(Host);
      await flush(fixture);
      instance.model.set({ fruit: 'apple' });
      await flush(fixture);
      optOf(el, 'banana').click();
      await flush(fixture);
      listboxOf(el).dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }),
      );
      await flush(fixture);
      return instance.accesses;
    };

    it('accesses the control only through property reads, never membership or enumeration checks', async () => {
      const accesses = await exerciseLifecycle();
      const introspection = accesses.filter((a) => a.op !== 'get');
      expect(introspection).toEqual([]);
    });

    it('reads exactly the documented member set on the control', async () => {
      const accesses = await exerciseLifecycle();
      const readMembers = [
        ...new Set(accesses.filter((a) => a.op === 'get').map((a) => a.key)),
      ].sort();
      expect(readMembers).toEqual([
        'controlValue',
        'dirty',
        'disabled',
        'disabledReasons',
        'errors',
        'hidden',
        'invalid',
        'markAsTouched',
        'max',
        'maxLength',
        'min',
        'minLength',
        'name',
        'nodeState',
        'pattern',
        'pending',
        'readonly',
        'required',
        'touched',
      ]);
    });
  });
});
