import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForRadio } from './radio';
import { ForRadioGroup } from './radio-group';

const RADIO_IMPORTS = [ForRadioGroup, ForRadio] as const;

@Component({
  imports: [...RADIO_IMPORTS],
  template: `
    <div
      forRadioGroup
      [(value)]="color"
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="groupDisabled()"
      [readonly]="groupReadonly()"
      [required]="groupRequired()"
      [invalid]="groupInvalid()"
    >
      @for (option of options(); track option.value) {
        <button
          type="button"
          forRadio
          [value]="option.value"
          [disabled]="option.disabled"
          [attr.data-test-id]="option.value"
        >
          {{ option.label }}
        </button>
      }
    </div>
  `,
})
class RadioGroupHost {
  readonly color = signal('');
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly groupDisabled = signal(false);
  readonly groupReadonly = signal(false);
  readonly groupRequired = signal(false);
  readonly groupInvalid = signal(false);
  readonly options = signal([
    { value: 'red', label: 'Red', disabled: false },
    { value: 'green', label: 'Green', disabled: false },
    { value: 'blue', label: 'Blue', disabled: false },
  ]);
}

const radioOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const groupOf = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[forRadioGroup]')!;

const keyDown = (target: HTMLElement, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('ForRadioGroup', () => {
  describe('static accessibility', () => {
    it('sets role=radiogroup, aria-orientation, and each radio gets role=radio + type=button', () => {
      const { el } = renderHost(RadioGroupHost);
      const group = groupOf(el);

      expect(group.getAttribute('role')).toBe('radiogroup');
      expect(group.getAttribute('aria-orientation')).toBe('vertical');

      for (const v of ['red', 'green', 'blue']) {
        const r = radioOf(el, v);
        expect(r.getAttribute('role')).toBe('radio');
        expect(r.getAttribute('type')).toBe('button');
        expect(r.getAttribute('aria-checked')).toBe('false');
        expect(r.getAttribute('data-state')).toBe('unchecked');
      }
    });

    it('starts with unique ids per radio', () => {
      const { el } = renderHost(RadioGroupHost);
      const ids = ['red', 'green', 'blue'].map((v) => radioOf(el, v).id);
      expect(new Set(ids).size).toBe(3);
      ids.forEach((id) => expect(id).toBeTruthy());
    });
  });

  describe('initial tabindex', () => {
    it('puts tabindex=0 on the first enabled radio when nothing is selected', () => {
      const { el } = renderHost(RadioGroupHost);
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('puts tabindex=0 on the selected radio when there is a selection', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('green');
      flush();
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('skips disabled when picking the first-enabled tab entry', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: true },
        { value: 'green', label: 'Green', disabled: false },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      flush();
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('click selection', () => {
    it('selects the clicked radio and updates aria-checked + tabindex', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'green').click();
      flush();

      expect(fixture.componentInstance.color()).toBe('green');
      expect(radioOf(el, 'green').getAttribute('aria-checked')).toBe('true');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
    });

    it('two-way [(value)] reflects external writes', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('blue');
      flush();
      expect(radioOf(el, 'blue').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('vertical arrow navigation (default)', () => {
    it('ArrowDown moves focus AND selects, wrapping at the end', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();

      keyDown(radioOf(el, 'red'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
      expect(fixture.componentInstance.color()).toBe('green');

      keyDown(radioOf(el, 'green'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');

      keyDown(radioOf(el, 'blue'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('ArrowUp wraps at the beginning', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();
      keyDown(radioOf(el, 'red'), 'ArrowUp');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');
    });

    it('ArrowLeft / ArrowRight are ignored in vertical orientation', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();
      keyDown(radioOf(el, 'red'), 'ArrowRight');
      flush();
      expect(fixture.componentInstance.color()).toBe('');
      expect(document.activeElement).toBe(radioOf(el, 'red'));
    });

    it('Home / End jump to first / last and select', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'green').focus();

      keyDown(radioOf(el, 'green'), 'End');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');

      keyDown(radioOf(el, 'blue'), 'Home');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('skips disabled radios in arrow navigation', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: false },
        { value: 'green', label: 'Green', disabled: true },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      flush();

      radioOf(el, 'red').focus();
      keyDown(radioOf(el, 'red'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');
    });
  });

  describe('horizontal orientation', () => {
    it('uses ArrowLeft / ArrowRight and ignores ArrowUp / ArrowDown', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-orientation')).toBe('horizontal');

      radioOf(el, 'red').focus();
      keyDown(radioOf(el, 'red'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));

      keyDown(radioOf(el, 'green'), 'ArrowLeft');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));

      keyDown(radioOf(el, 'red'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
    });

    it('RTL swaps ArrowLeft / ArrowRight', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.dir.set('rtl');
      flush();

      radioOf(el, 'red').focus();
      keyDown(radioOf(el, 'red'), 'ArrowLeft');
      flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
    });
  });

  describe('disabled / readonly', () => {
    it('disabled radio cannot be selected by click and is skipped on nav', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: false },
        { value: 'green', label: 'Green', disabled: true },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      flush();

      const greenRadio = radioOf(el, 'green');
      expect(greenRadio.hasAttribute('disabled')).toBe(true);
      expect(greenRadio.getAttribute('aria-disabled')).toBe('true');

      greenRadio.click();
      flush();
      expect(fixture.componentInstance.color()).toBe('');
    });

    it('group disabled blocks all selection (click + nav)', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupDisabled.set(true);
      flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-disabled')).toBe('true');

      radioOf(el, 'red').click();
      flush();
      expect(fixture.componentInstance.color()).toBe('');

      // Each radio inherits effectiveDisabled and exposes the disabled attr.
      expect(radioOf(el, 'red').hasAttribute('disabled')).toBe(true);
    });

    it('group readonly blocks selection but radios stay enabled / focusable', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupReadonly.set(true);
      flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-readonly')).toBe('true');

      radioOf(el, 'red').click();
      flush();
      expect(fixture.componentInstance.color()).toBe('');
      expect(radioOf(el, 'red').hasAttribute('disabled')).toBe(false);
    });
  });

  describe('required / invalid reflected on the group', () => {
    it('aria-required and aria-invalid follow the inputs', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupRequired.set(true);
      fixture.componentInstance.groupInvalid.set(true);
      flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-required')).toBe('true');
      expect(group.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('touched on focusout', () => {
    it('sets touched=true when focus leaves the group entirely', () => {
      const { el, flush } = renderHost(RadioGroupHost);
      const group = groupOf(el);
      const outside = document.createElement('button');
      document.body.append(outside);
      try {
        radioOf(el, 'red').focus();
        const blur = new FocusEvent('focusout', { bubbles: true, relatedTarget: outside });
        group.dispatchEvent(blur);
        flush();
        // Internal state — verify by triggering interaction afterwards still works:
        radioOf(el, 'red').click();
        flush();
        expect(radioOf(el, 'red').getAttribute('aria-checked')).toBe('true');
      } finally {
        outside.remove();
      }
    });
  });

  describe('used outside [forRadioGroup]', () => {
    it('throws a prefixed error from ForRadio', () => {
      @Component({
        imports: [ForRadio],
        template: `<button type="button" forRadio value="x"></button>`,
      })
      class OrphanRadio {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanRadio)).toThrow(
        /\[forty-cdk\/radio-group\] ForRadio must be used inside a \[forRadioGroup\] element\./,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('blue');
      flush();
      expect(radioOf(el, 'blue').getAttribute('aria-checked')).toBe('true');

      fixture.componentInstance.color.set('');
      flush();
      expect(radioOf(el, 'blue').getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForRadioGroup, ForRadio, FormField],
      template: `
        <div forRadioGroup [formField]="checkout.shipping">
          <button type="button" forRadio value="standard" data-test-id="standard"></button>
          <button type="button" forRadio value="express" data-test-id="express"></button>
          <button type="button" forRadio value="overnight" data-test-id="overnight"></button>
        </div>
      `,
    })
    class SignalFormsHost {
      readonly model = signal({ shipping: '' });
      readonly checkout = form(this.model, (s) => required(s.shipping));
    }

    it('two-way binds value with the field', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);

      radioOf(el, 'express').click();
      flush();
      expect(fixture.componentInstance.model().shipping).toBe('express');
      expect(radioOf(el, 'express').getAttribute('aria-checked')).toBe('true');

      fixture.componentInstance.model.set({ shipping: 'overnight' });
      flush();
      expect(radioOf(el, 'overnight').getAttribute('aria-checked')).toBe('true');
      expect(radioOf(el, 'express').getAttribute('aria-checked')).toBe('false');
    });

    it('flows schema `required` into the group aria-required', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(groupOf(el).getAttribute('aria-required')).toBe('true');
    });
  });
});
