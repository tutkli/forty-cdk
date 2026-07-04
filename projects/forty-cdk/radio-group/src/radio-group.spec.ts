import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost } from '../../src/test-utils';
import { assertRovingTabindexContract } from '../../src/test-utils/contract';
import { FOR_RADIO, ForRadio } from './radio';
import { ForRadioGroup } from './radio-group';
import { ForRadioIndicator } from './radio-indicator';

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
      [loop]="loop()"
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
  readonly color = signal<string | null>('');
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly groupDisabled = signal(false);
  readonly groupReadonly = signal(false);
  readonly groupRequired = signal(false);
  readonly groupInvalid = signal(false);
  readonly loop = signal(true);
  readonly options = signal([
    { value: 'red', label: 'Red', disabled: false },
    { value: 'green', label: 'Green', disabled: false },
    { value: 'blue', label: 'Blue', disabled: false },
  ]);
}

const radioOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const groupOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forRadioGroup]')!;

const radioItems = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forRadio]'));

describe('ForRadioGroup', () => {
  assertRovingTabindexContract(
    {
      mount: async () => {
        const r = renderHost(RadioGroupHost);
        r.instance.color.set(null);
        await r.flush();
        return { items: radioItems(r.el), flush: r.flush };
      },
      mountWithDisabledFirst: async () => {
        const r = renderHost(RadioGroupHost);
        r.instance.color.set(null);
        r.instance.options.set([
          { value: 'red', label: 'Red', disabled: true },
          { value: 'green', label: 'Green', disabled: false },
          { value: 'blue', label: 'Blue', disabled: false },
        ]);
        await r.flush();
        return { items: radioItems(r.el), enabledIndices: [1, 2], flush: r.flush };
      },
      mountWithDisabledMiddle: async () => {
        const r = renderHost(RadioGroupHost);
        r.instance.color.set(null);
        r.instance.options.set([
          { value: 'red', label: 'Red', disabled: false },
          { value: 'green', label: 'Green', disabled: true },
          { value: 'blue', label: 'Blue', disabled: false },
        ]);
        await r.flush();
        return { items: radioItems(r.el), enabledIndices: [0, 2], flush: r.flush };
      },
      mountRtl: async () => {
        const r = renderHost(RadioGroupHost);
        r.instance.color.set(null);
        r.instance.orientation.set('horizontal');
        r.instance.dir.set('rtl');
        await r.flush();
        return { items: radioItems(r.el), flush: r.flush };
      },
    },
    { forwardArrow: 'ArrowDown' },
  );

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
    });

    it('propagates data-orientation to each radio (and to the indicator when present)', () => {
      @Component({
        imports: [ForRadioGroup, ForRadio, ForRadioIndicator],
        template: `
          <div forRadioGroup [(value)]="color" orientation="horizontal">
            <button type="button" forRadio value="red" data-test-id="red">
              <span forRadioIndicator data-test-id="red-indicator"></span>
            </button>
            <button type="button" forRadio value="green" data-test-id="green"></button>
          </div>
        `,
      })
      class IndicatorHost {
        readonly color = signal<string | null>('red');
      }

      const { el } = renderHost(IndicatorHost);
      expect(radioOf(el, 'red').getAttribute('data-orientation')).toBe('horizontal');
      expect(radioOf(el, 'green').getAttribute('data-orientation')).toBe('horizontal');
      const indicator = el.querySelector<HTMLElement>('[data-test-id="red-indicator"]')!;
      expect(indicator.getAttribute('data-orientation')).toBe('horizontal');
    });
  });

  describe('initial tabindex', () => {
    it('puts tabindex=0 on the first enabled radio when nothing is selected', () => {
      const { el } = renderHost(RadioGroupHost);
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('puts tabindex=0 on the selected radio when there is a selection', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('green');
      await flush();
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('falls back to the first enabled radio when value matches no registered radio', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('magenta');
      await flush();

      const tabindexes = ['red', 'green', 'blue'].map((v) =>
        radioOf(el, v).getAttribute('tabindex'),
      );
      expect(tabindexes).toEqual(['0', '-1', '-1']);
      expect(tabindexes.filter((t) => t === '0')).toHaveLength(1);
    });

    it('skips disabled radios in the fallback when value matches no registered radio', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: true },
        { value: 'green', label: 'Green', disabled: false },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      fixture.componentInstance.color.set('magenta');
      await flush();

      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('recovers the fallback when a previously selected value goes stale', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('green');
      await flush();
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: false },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      await flush();

      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'blue').getAttribute('tabindex')).toBe('-1');
    });

    it('skips disabled when picking the first-enabled tab entry', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: true },
        { value: 'green', label: 'Green', disabled: false },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      await flush();
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
    });

    it('falls back to the first enabled radio when the selected radio is disabled', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: true },
        { value: 'green', label: 'Green', disabled: false },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      fixture.componentInstance.color.set('red');
      await flush();

      const tabindexes = ['red', 'green', 'blue'].map((v) =>
        radioOf(el, v).getAttribute('tabindex'),
      );
      expect(tabindexes).toEqual(['-1', '0', '-1']);
      expect(tabindexes.filter((t) => t === '0')).toHaveLength(1);
    });
  });

  describe('click selection', () => {
    it('selects the clicked radio and updates aria-checked + tabindex', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'green').click();
      await flush();

      expect(fixture.componentInstance.color()).toBe('green');
      expect(radioOf(el, 'green').getAttribute('aria-checked')).toBe('true');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('-1');
    });

    it('two-way [(value)] reflects external writes', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('blue');
      await flush();
      expect(radioOf(el, 'blue').getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('empty selection (null sentinel)', () => {
    it('clears the selection back to none when the value is set to null', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('green');
      await flush();
      expect(radioOf(el, 'green').getAttribute('aria-checked')).toBe('true');
      expect(radioOf(el, 'green').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.color.set(null);
      await flush();
      for (const v of ['red', 'green', 'blue']) {
        expect(radioOf(el, v).getAttribute('aria-checked')).toBe('false');
      }
      expect(radioOf(el, 'red').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('vertical arrow navigation (default)', () => {
    it('ArrowDown moves focus AND selects, wrapping at the end', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();

      pressKey(radioOf(el, 'red'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
      expect(fixture.componentInstance.color()).toBe('green');

      pressKey(radioOf(el, 'green'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');

      pressKey(radioOf(el, 'blue'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('ArrowUp wraps at the beginning', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');
    });

    it('does not wrap when loop=false', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.loop.set(false);
      await flush();

      radioOf(el, 'blue').focus();
      fixture.componentInstance.color.set('blue');
      await flush();

      pressKey(radioOf(el, 'blue'), 'ArrowDown');
      await flush();
      // Stays on blue — no wrap.
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');

      // ArrowUp at the start also doesn't wrap.
      radioOf(el, 'red').focus();
      fixture.componentInstance.color.set('red');
      await flush();
      pressKey(radioOf(el, 'red'), 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('ArrowRight / ArrowLeft also move focus AND select in vertical orientation (four-cursor APG)', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'red').focus();

      pressKey(radioOf(el, 'red'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
      expect(fixture.componentInstance.color()).toBe('green');

      pressKey(radioOf(el, 'green'), 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('Home / End jump to first / last and select', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      radioOf(el, 'green').focus();

      pressKey(radioOf(el, 'green'), 'End');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');

      pressKey(radioOf(el, 'blue'), 'Home');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
      expect(fixture.componentInstance.color()).toBe('red');
    });

    it('skips disabled radios in arrow navigation', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: false },
        { value: 'green', label: 'Green', disabled: true },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      await flush();

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('blue');
    });
  });

  describe('horizontal orientation', () => {
    it('uses ArrowLeft / ArrowRight and also accepts ArrowUp / ArrowDown (four-cursor APG)', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-orientation')).toBe('horizontal');

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));

      pressKey(radioOf(el, 'green'), 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));

      pressKey(radioOf(el, 'red'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
      expect(fixture.componentInstance.color()).toBe('green');
    });

    it('RTL swaps ArrowLeft / ArrowRight', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.dir.set('rtl');
      await flush();

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
    });
  });

  describe('vertical orientation under dir="rtl"', () => {
    it('ArrowDown / ArrowUp stay axis-positive (dir does not flip vertical)', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));

      pressKey(radioOf(el, 'green'), 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'red'));
    });

    it('swaps only the horizontal pair (ArrowLeft advances) while ArrowDown stays axis-positive', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowLeft');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
    });
  });

  describe('disabled / readonly', () => {
    it('disabled radio cannot be selected by click and is skipped on nav', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.options.set([
        { value: 'red', label: 'Red', disabled: false },
        { value: 'green', label: 'Green', disabled: true },
        { value: 'blue', label: 'Blue', disabled: false },
      ]);
      await flush();

      const greenRadio = radioOf(el, 'green');
      expect(greenRadio.hasAttribute('disabled')).toBe(false);
      expect(greenRadio.getAttribute('aria-disabled')).toBe('true');
      expect(greenRadio.getAttribute('data-disabled')).toBe('');

      greenRadio.click();
      await flush();
      expect(fixture.componentInstance.color()).toBe('');
    });

    it('group disabled blocks all selection (click + nav)', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupDisabled.set(true);
      await flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-disabled')).toBe('true');

      radioOf(el, 'red').click();
      await flush();
      expect(fixture.componentInstance.color()).toBe('');

      // Each radio inherits effectiveDisabled and reflects aria-disabled /
      // data-disabled, but stays focusable (no native disabled) per APG.
      expect(radioOf(el, 'red').hasAttribute('disabled')).toBe(false);
      expect(radioOf(el, 'red').getAttribute('aria-disabled')).toBe('true');
    });

    it('group readonly blocks selection but radios stay enabled / focusable', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupReadonly.set(true);
      await flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-readonly')).toBe('true');

      radioOf(el, 'red').click();
      await flush();
      expect(fixture.componentInstance.color()).toBe('');
      expect(radioOf(el, 'red').hasAttribute('disabled')).toBe(false);
    });

    it('readonly group: arrow keys move focus but never change the value', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('red');
      fixture.componentInstance.groupReadonly.set(true);
      await flush();

      radioOf(el, 'red').focus();
      pressKey(radioOf(el, 'red'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'green'));
      expect(fixture.componentInstance.color()).toBe('red');

      pressKey(radioOf(el, 'green'), 'End');
      await flush();
      expect(document.activeElement).toBe(radioOf(el, 'blue'));
      expect(fixture.componentInstance.color()).toBe('red');
    });
  });

  describe('required / invalid reflected on the group', () => {
    it('aria-required and aria-invalid follow the inputs', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.groupRequired.set(true);
      fixture.componentInstance.groupInvalid.set(true);
      await flush();

      const group = groupOf(el);
      expect(group.getAttribute('aria-required')).toBe('true');
      expect(group.getAttribute('aria-invalid')).toBe('true');
    });
  });

  describe('touched on focusout', () => {
    it('reflects data-touched when focus leaves the group entirely', async () => {
      const { el, flush } = renderHost(RadioGroupHost);
      const group = groupOf(el);
      const outside = document.createElement('button');
      document.body.append(outside);
      try {
        expect(group.hasAttribute('data-touched')).toBe(false);

        radioOf(el, 'red').focus();
        const blur = new FocusEvent('focusout', { bubbles: true, relatedTarget: outside });
        group.dispatchEvent(blur);
        await flush();

        expect(group.hasAttribute('data-touched')).toBe(true);
      } finally {
        outside.remove();
      }
    });

    it('stays untouched when focus moves to another radio within the group', async () => {
      const { el, flush } = renderHost(RadioGroupHost);
      const group = groupOf(el);
      try {
        radioOf(el, 'red').focus();
        const blur = new FocusEvent('focusout', {
          bubbles: true,
          relatedTarget: radioOf(el, 'green'),
        });
        group.dispatchEvent(blur);
        await flush();

        expect(group.hasAttribute('data-touched')).toBe(false);
      } finally {
        radioOf(el, 'red').blur();
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

  describe('ForRadioIndicator', () => {
    @Component({
      imports: [...RADIO_IMPORTS, ForRadioIndicator],
      template: `
        <div forRadioGroup [(value)]="color">
          <button type="button" forRadio value="red" data-test-id="red">
            <span forRadioIndicator data-ind="red"></span>
          </button>
          <button type="button" forRadio value="blue" data-test-id="blue">
            <span forRadioIndicator data-ind="blue"></span>
          </button>
        </div>
      `,
    })
    class IndicatorHost {
      readonly color = signal<string | null>('');
    }

    it('reflects data-state unchecked without a hidden attribute while no radio is selected', () => {
      const { el } = renderHost(IndicatorHost);
      const inds = el.querySelectorAll<HTMLElement>('[data-ind]');
      expect(Array.from(inds).some((n) => n.hasAttribute('hidden'))).toBe(false);
      expect(Array.from(inds).every((n) => n.getAttribute('data-state') === 'unchecked')).toBe(
        true,
      );
    });

    it("reflects data-state on the selected radio's indicator without a hidden attribute", async () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.color.set('blue');
      await flush();

      const red = el.querySelector<HTMLElement>('[data-ind="red"]')!;
      const blue = el.querySelector<HTMLElement>('[data-ind="blue"]')!;
      expect(red.hasAttribute('hidden')).toBe(false);
      expect(blue.hasAttribute('hidden')).toBe(false);
      expect(red.getAttribute('data-state')).toBe('unchecked');
      expect(blue.getAttribute('data-state')).toBe('checked');
    });

    it('throws when used outside [forRadio]', () => {
      @Component({
        imports: [ForRadioIndicator],
        template: `<span forRadioIndicator></span>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrow(
        /\[forty-cdk\/radio-group\] ForRadioIndicator must be used inside a \[forRadio\] element\./,
      );
    });

    it('resolves a subclassed radio via the re-provided FOR_RADIO token', () => {
      @Directive({
        selector: '[testRadio]',
        providers: [{ provide: FOR_RADIO, useExisting: TestRadio }],
      })
      class TestRadio extends ForRadio {}

      @Component({
        imports: [ForRadioGroup, TestRadio, ForRadioIndicator],
        template: `
          <div forRadioGroup [(value)]="color">
            <button type="button" testRadio value="red" data-test-id="red">
              <span forRadioIndicator data-ind="red"></span>
            </button>
          </div>
        `,
      })
      class SubclassHost {
        readonly color = signal<string | null>('red');
      }

      const { el } = renderHost(SubclassHost);
      const ind = el.querySelector<HTMLElement>('[data-ind="red"]')!;
      expect(ind.getAttribute('data-state')).toBe('checked');
    });
  });

  describe('form-state data attributes', () => {
    @Component({
      imports: [...RADIO_IMPORTS],
      template: `
        <div
          forRadioGroup
          [(value)]="color"
          [(touched)]="touched"
          [dirty]="dirty()"
          [pending]="pending()"
          [invalid]="invalid()"
        >
          <button type="button" forRadio value="red">Red</button>
        </div>
      `,
    })
    class FlagsHost {
      readonly color = signal<string | null>('');
      readonly touched = signal(false);
      readonly dirty = signal(false);
      readonly pending = signal(false);
      readonly invalid = signal(false);
    }

    it('reflects each form-state flag as a boolean data-* attribute on the group', async () => {
      const { el, fixture, flush } = renderHost(FlagsHost);
      const group = el.querySelector<HTMLElement>('[forRadioGroup]')!;

      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.dirty.set(true);
      fixture.componentInstance.pending.set(true);
      fixture.componentInstance.invalid.set(true);
      await flush();

      expect(group.getAttribute('data-touched')).toBe('');
      expect(group.getAttribute('data-dirty')).toBe('');
      expect(group.getAttribute('data-pending')).toBe('');
      expect(group.getAttribute('data-invalid')).toBe('');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [...RADIO_IMPORTS],
      template: `
        <form>
          <div forRadioGroup [(value)]="color" [name]="fieldName()">
            <button type="button" forRadio value="red">Red</button>
            <button type="button" forRadio value="green">Green</button>
          </div>
        </form>
      `,
    })
    class FormHost {
      readonly color = signal<string | null>('');
      readonly fieldName = signal<string>('');
    }

    it('submits name=value for the selected radio', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('color');
      fixture.componentInstance.color.set('green');
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([['color', 'green']]);
    });

    it('omits the value when nothing is selected', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('color');
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(RadioGroupHost);
      fixture.componentInstance.color.set('blue');
      await flush();
      expect(radioOf(el, 'blue').getAttribute('aria-checked')).toBe('true');

      fixture.componentInstance.color.set('');
      await flush();
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

    it('two-way binds value with the field', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);

      radioOf(el, 'express').click();
      await flush();
      expect(fixture.componentInstance.model().shipping).toBe('express');
      expect(radioOf(el, 'express').getAttribute('aria-checked')).toBe('true');

      fixture.componentInstance.model.set({ shipping: 'overnight' });
      await flush();
      expect(radioOf(el, 'overnight').getAttribute('aria-checked')).toBe('true');
      expect(radioOf(el, 'express').getAttribute('aria-checked')).toBe('false');
    });

    it('flows schema `required` into the group aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(groupOf(el).getAttribute('aria-required')).toBe('true');
    });

    it('focus-on-error moves focus onto a radio, not the group host', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      await flush();
      fixture.componentInstance.checkout.shipping().focusBoundControl();
      expect(document.activeElement).toBe(radioOf(el, 'standard'));
    });

    it('focus-on-error targets the selected radio when one is checked', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      fixture.componentInstance.model.set({ shipping: 'express' });
      await flush();
      fixture.componentInstance.checkout.shipping().focusBoundControl();
      expect(document.activeElement).toBe(radioOf(el, 'express'));
    });
  });
});
