import { Component, type Provider, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { ForCheckbox } from '../../../src/lib/checkbox/checkbox';
import { ForFieldset } from '../../../src/lib/fieldset/fieldset';
import { ForListbox } from '../../../src/lib/listbox/listbox';
import { ForListboxOption } from '../../../src/lib/listbox/listbox-option';
import { ForNumberInput } from '../../../src/lib/number-input/number-input';
import { ForSlider } from '../../../src/lib/slider/slider';
import { ForSwitch } from '../../../src/lib/switch/switch';

/**
 * Library-wide contract for native-submit exclusion under a disabled
 * `[forFieldset]` (#728, guarding the #695 fix). Every form-value primitive
 * mirrors its value into hidden `<input>` siblings via `injectHiddenInput`, and
 * a disabled hidden input is skipped by native `<form>` serialization. The
 * contract is that the hidden input's `disabled` must track
 * `effectiveDisabled()` — the control's own `disabled` OR'd with a surrounding
 * disabled `[forFieldset]` — not the raw `disabled` input.
 *
 * Each host leaves the control's own `disabled` at its default (`false`) and
 * disables only the surrounding `[forFieldset]`, so the assertion isolates the
 * fieldset-composition path: a primitive that passes raw `disabled` (instead of
 * `effectiveDisabled`) to `injectHiddenInput` leaves the hidden input enabled
 * under a disabled fieldset and still submits its value — the exact regression
 * #695 fixed for `[forNumberInput]` / `[forSlider]`. This spec fails the moment
 * any covered primitive reintroduces it.
 */

function configure(providers: Provider[] = []): void {
  TestBed.configureTestingModule({
    providers: [provideZonelessChangeDetection(), ...providers],
  });
}

function mount<T>(component: { new (): T }): ComponentFixture<T> {
  const fixture = TestBed.createComponent(component);
  fixture.detectChanges();
  return fixture;
}

/** The hidden submit input the primitive appends, located by its `name`. */
function hiddenInput<T>(fixture: ComponentFixture<T>, name: string): HTMLInputElement {
  return (fixture.nativeElement as HTMLElement).querySelector<HTMLInputElement>(
    `input[type="hidden"][name="${name}"]`,
  )!;
}

/**
 * Drives a covered host through an enable→disable cycle on the surrounding
 * `[forFieldset]` and asserts the hidden input's `disabled` attribute tracks it
 * while the control's own `disabled` stays `false`.
 */
function expectFieldsetExcludesFromSubmit<T extends { disabled: { set(v: boolean): void } }>(
  fixture: ComponentFixture<T>,
  name: string,
): void {
  // Fieldset enabled, control's own disabled false: the value submits.
  expect(hiddenInput(fixture, name).hasAttribute('disabled')).toBe(false);

  // Disabling the surrounding fieldset must exclude the value from submit.
  fixture.componentInstance.disabled.set(true);
  fixture.detectChanges();
  expect(hiddenInput(fixture, name).hasAttribute('disabled')).toBe(true);

  // Re-enabling the fieldset restores submission.
  fixture.componentInstance.disabled.set(false);
  fixture.detectChanges();
  expect(hiddenInput(fixture, name).hasAttribute('disabled')).toBe(false);
}

@Component({
  imports: [ForFieldset, ForNumberInput],
  template: `
    <div forFieldset [disabled]="disabled()">
      <input forNumberInput [(value)]="qty" name="qty" />
    </div>
  `,
})
class NumberInputHost {
  readonly disabled = signal(false);
  readonly qty = signal<number | null>(5);
}

@Component({
  imports: [ForFieldset, ForSlider],
  template: `
    <div forFieldset [disabled]="disabled()">
      <div forSlider name="vol"></div>
    </div>
  `,
})
class SliderHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForFieldset, ForCheckbox],
  template: `
    <div forFieldset [disabled]="disabled()">
      <button forCheckbox name="terms" [(checked)]="checked"></button>
    </div>
  `,
})
class CheckboxHost {
  readonly disabled = signal(false);
  readonly checked = signal(true);
}

@Component({
  imports: [ForFieldset, ForSwitch],
  template: `
    <div forFieldset [disabled]="disabled()">
      <button forSwitch name="notify" [(checked)]="checked"></button>
    </div>
  `,
})
class SwitchHost {
  readonly disabled = signal(false);
  readonly checked = signal(true);
}

@Component({
  imports: [ForFieldset, ForListbox, ForListboxOption],
  template: `
    <div forFieldset [disabled]="disabled()">
      <div forListbox [(value)]="value" name="fruit" [ariaLabel]="'Fruit'">
        <button forListboxOption value="apple">Apple</button>
        <button forListboxOption value="pear">Pear</button>
      </div>
    </div>
  `,
})
class ListboxHost {
  readonly disabled = signal(false);
  readonly value = signal<readonly string[]>(['apple']);
}

describe('fieldset submit exclusion — library-wide contract', () => {
  it('number-input', () => {
    configure();
    expectFieldsetExcludesFromSubmit(mount(NumberInputHost), 'qty');
  });

  it('slider', () => {
    configure();
    expectFieldsetExcludesFromSubmit(mount(SliderHost), 'vol');
  });

  it('checkbox', () => {
    configure();
    expectFieldsetExcludesFromSubmit(mount(CheckboxHost), 'terms');
  });

  it('switch', () => {
    configure();
    expectFieldsetExcludesFromSubmit(mount(SwitchHost), 'notify');
  });

  it('listbox', () => {
    configure();
    expectFieldsetExcludesFromSubmit(mount(ListboxHost), 'fruit');
  });

  it('composes through the disabled fieldset under zoneless change detection', () => {
    configure();
    const fixture = mount(NumberInputHost);
    expect(hiddenInput(fixture, 'qty').hasAttribute('disabled')).toBe(false);

    fixture.componentInstance.disabled.set(true);
    fixture.detectChanges();
    expect(hiddenInput(fixture, 'qty').hasAttribute('disabled')).toBe(true);
  });
});
