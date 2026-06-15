import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required, requiredError, validate } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost } from '../../test-utils';
import { provideForToggleDefaults } from './toggle-defaults';
import { ForToggleGroup } from './toggle-group';
import { ForToggleGroupItem } from './toggle-group-item';

@Component({
  imports: [ForToggleGroup, ForToggleGroupItem],
  template: `
    <div
      forToggleGroup
      [(value)]="value"
      [multiple]="multiple()"
      [disabled]="groupDisabled()"
      [orientation]="orientation()"
      [dir]="dir()"
      [loop]="loop()"
    >
      @for (item of items(); track item.value) {
        <button
          forToggleGroupItem
          [value]="item.value"
          [disabled]="item.disabled"
          [attr.data-test-id]="item.value"
        >
          {{ item.label }}
        </button>
      }
    </div>
  `,
})
class ToggleGroupHost {
  readonly value = signal<readonly string[]>([]);
  readonly multiple = signal(false);
  readonly groupDisabled = signal(false);
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly loop = signal(true);
  readonly items = signal([
    { value: 'left', label: 'Left', disabled: false },
    { value: 'center', label: 'Center', disabled: false },
    { value: 'right', label: 'Right', disabled: false },
  ]);
}

const itemOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const groupOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forToggleGroup]')!;

describe('ForToggleGroup', () => {
  describe('a11y baseline', () => {
    it('sets role=group, no aria-orientation, and each item type=button + aria-pressed=false', () => {
      const { el } = renderHost(ToggleGroupHost);
      const group = groupOf(el);

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-orientation')).toBeNull();
      expect(group.getAttribute('data-orientation')).toBe('horizontal');

      for (const v of ['left', 'center', 'right']) {
        const item = itemOf(el, v);
        expect(item.getAttribute('type')).toBe('button');
        expect(item.getAttribute('aria-pressed')).toBe('false');
        expect(item.getAttribute('data-state')).toBe('unchecked');
      }
    });

    it('reflects orientation changes', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.flush();

      const group = groupOf(r.el);
      expect(group.getAttribute('aria-orientation')).toBeNull();
      expect(group.getAttribute('data-orientation')).toBe('vertical');
    });

    it('propagates data-orientation to each item', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.flush();

      for (const v of ['left', 'center', 'right']) {
        expect(itemOf(r.el, v).getAttribute('data-orientation')).toBe('vertical');
      }
    });

    it('reflects group-level disabled', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.groupDisabled.set(true);
      r.flush();

      const group = groupOf(r.el);
      expect(group.getAttribute('aria-disabled')).toBe('true');
      expect(group.getAttribute('data-disabled')).toBe('');

      for (const v of ['left', 'center', 'right']) {
        const item = itemOf(r.el, v);
        expect(item.getAttribute('aria-disabled')).toBe('true');
        expect(item.hasAttribute('disabled')).toBe(true);
        expect(item.getAttribute('data-disabled')).toBe('');
      }
    });
  });

  describe('initial roving tabindex', () => {
    it('puts tabindex=0 on the first enabled item when value is empty', () => {
      const { el } = renderHost(ToggleGroupHost);
      expect(itemOf(el, 'left').getAttribute('tabindex')).toBe('0');
      expect(itemOf(el, 'center').getAttribute('tabindex')).toBe('-1');
      expect(itemOf(el, 'right').getAttribute('tabindex')).toBe('-1');
    });

    it('skips a disabled first item when picking the entry point', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.items.set([
        { value: 'left', label: 'Left', disabled: true },
        { value: 'center', label: 'Center', disabled: false },
        { value: 'right', label: 'Right', disabled: false },
      ]);
      r.flush();

      expect(itemOf(r.el, 'left').getAttribute('tabindex')).toBe('-1');
      expect(itemOf(r.el, 'center').getAttribute('tabindex')).toBe('0');
    });

    it('puts tabindex=0 on the first selected item when there is a selection', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.value.set(['center']);
      r.flush();

      expect(itemOf(r.el, 'left').getAttribute('tabindex')).toBe('-1');
      expect(itemOf(r.el, 'center').getAttribute('tabindex')).toBe('0');
      expect(itemOf(r.el, 'right').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('roving tab stop follows focus', () => {
    it('moves tabindex=0 to the focused item so re-entry restores it', () => {
      const { el, flush } = renderHost(ToggleGroupHost);
      const left = itemOf(el, 'left');
      const center = itemOf(el, 'center');

      left.focus();
      pressKey(left, 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(center);

      expect(left.getAttribute('tabindex')).toBe('-1');
      expect(center.getAttribute('tabindex')).toBe('0');
      expect(itemOf(el, 'right').getAttribute('tabindex')).toBe('-1');
    });

    it('keeps the active tab stop after the focus leaves the group', () => {
      const { el, flush } = renderHost(ToggleGroupHost);
      const left = itemOf(el, 'left');
      const right = itemOf(el, 'right');

      left.focus();
      pressKey(left, 'End');
      flush();
      expect(document.activeElement).toBe(right);

      right.blur();
      flush();

      expect(left.getAttribute('tabindex')).toBe('-1');
      expect(right.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('single mode (default)', () => {
    it('replaces the current selection on click', () => {
      const r = renderHost(ToggleGroupHost);

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual(['left']);

      itemOf(r.el, 'right').click();
      r.flush();
      expect(r.instance.value()).toEqual(['right']);
    });

    it('clears the selection when clicking the pressed item', () => {
      const r = renderHost(ToggleGroupHost);

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual(['left']);

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual([]);
    });

    it('reflects aria-pressed and data-state per item', () => {
      const r = renderHost(ToggleGroupHost);

      itemOf(r.el, 'center').click();
      r.flush();

      expect(itemOf(r.el, 'left').getAttribute('aria-pressed')).toBe('false');
      expect(itemOf(r.el, 'center').getAttribute('aria-pressed')).toBe('true');
      expect(itemOf(r.el, 'center').getAttribute('data-state')).toBe('checked');
      expect(itemOf(r.el, 'right').getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('multiple mode', () => {
    it('toggles items independently', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.multiple.set(true);
      r.flush();

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual(['left']);

      itemOf(r.el, 'right').click();
      r.flush();
      expect(new Set(r.instance.value())).toEqual(new Set(['left', 'right']));

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual(['right']);
    });
  });

  describe('disabled', () => {
    it('blocks click on a per-item disabled item', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.items.set([
        { value: 'left', label: 'Left', disabled: false },
        { value: 'center', label: 'Center', disabled: true },
        { value: 'right', label: 'Right', disabled: false },
      ]);
      r.flush();

      itemOf(r.el, 'center').click();
      r.flush();
      expect(r.instance.value()).toEqual([]);
    });

    it('blocks click on every item when group is disabled', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.groupDisabled.set(true);
      r.flush();

      itemOf(r.el, 'left').click();
      r.flush();
      expect(r.instance.value()).toEqual([]);
    });
  });

  describe('keyboard navigation (horizontal)', () => {
    it('ArrowRight moves focus to the next enabled item', () => {
      const { el } = renderHost(ToggleGroupHost);
      const left = itemOf(el, 'left');
      left.focus();
      pressKey(left, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(el, 'center'));
    });

    it('ArrowLeft moves focus to the previous enabled item', () => {
      const { el } = renderHost(ToggleGroupHost);
      const right = itemOf(el, 'right');
      right.focus();
      pressKey(right, 'ArrowLeft');

      expect(document.activeElement).toBe(itemOf(el, 'center'));
    });

    it('Home / End jump to first / last enabled', () => {
      const { el } = renderHost(ToggleGroupHost);
      const center = itemOf(el, 'center');
      center.focus();

      pressKey(center, 'Home');
      expect(document.activeElement).toBe(itemOf(el, 'left'));

      pressKey(itemOf(el, 'left'), 'End');
      expect(document.activeElement).toBe(itemOf(el, 'right'));
    });

    it('skips disabled items during arrow navigation', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.items.set([
        { value: 'left', label: 'Left', disabled: false },
        { value: 'center', label: 'Center', disabled: true },
        { value: 'right', label: 'Right', disabled: false },
      ]);
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(r.el, 'right'));
    });

    it('wraps with loop=true (default)', () => {
      const { el } = renderHost(ToggleGroupHost);
      const right = itemOf(el, 'right');
      right.focus();
      pressKey(right, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(el, 'left'));
    });

    it('does NOT wrap with loop=false', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.loop.set(false);
      r.flush();

      const right = itemOf(r.el, 'right');
      right.focus();
      pressKey(right, 'ArrowRight');

      expect(document.activeElement).toBe(right);
    });

    it('reads the loop default from provideForToggleDefaults when no [loop] input is set', () => {
      @Component({
        imports: [ForToggleGroup, ForToggleGroupItem],
        providers: [provideForToggleDefaults({ loop: false })],
        template: `
          <div forToggleGroup>
            <button forToggleGroupItem value="left" data-test-id="left">Left</button>
            <button forToggleGroupItem value="center" data-test-id="center">Center</button>
            <button forToggleGroupItem value="right" data-test-id="right">Right</button>
          </div>
        `,
      })
      class ScopedDefaultsHost {}

      const { el } = renderHost(ScopedDefaultsHost);
      const right = itemOf(el, 'right');
      right.focus();
      pressKey(right, 'ArrowRight');

      expect(document.activeElement).toBe(right);
    });

    it('does not navigate via vertical arrows in horizontal mode', () => {
      const { el } = renderHost(ToggleGroupHost);
      const left = itemOf(el, 'left');
      left.focus();
      pressKey(left, 'ArrowDown');

      expect(document.activeElement).toBe(left);
    });

    it('does NOT change selection while navigating (no selection-on-focus)', () => {
      const r = renderHost(ToggleGroupHost);
      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowRight');
      r.flush();

      expect(r.instance.value()).toEqual([]);
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));
    });
  });

  describe('keyboard navigation (vertical)', () => {
    it('ArrowDown / ArrowUp drive vertical orientation', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowDown');
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));

      pressKey(itemOf(r.el, 'center'), 'ArrowUp');
      expect(document.activeElement).toBe(left);
    });

    it('ignores horizontal arrows in vertical mode', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowRight');
      expect(document.activeElement).toBe(left);
    });
  });

  describe('RTL', () => {
    it('swaps ArrowLeft/ArrowRight in horizontal RTL mode', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.dir.set('rtl');
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowLeft'); // RTL: visually means "next"
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));
    });

    it('vertical: ArrowDown / ArrowUp stay axis-positive under dir="rtl" (dir does not flip vertical)', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.instance.dir.set('rtl');
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      pressKey(left, 'ArrowDown');
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));

      pressKey(itemOf(r.el, 'center'), 'ArrowUp');
      expect(document.activeElement).toBe(left);
    });
  });

  describe('two-way binding', () => {
    it('honors consumer writes via [(value)] without re-emitting (valueChange)', () => {
      let internalEmits = 0;

      @Component({
        imports: [ForToggleGroup, ForToggleGroupItem],
        template: `
          <div forToggleGroup [(value)]="value" (valueChange)="onChange($event)">
            <button forToggleGroupItem value="a" data-test-id="a">A</button>
            <button forToggleGroupItem value="b" data-test-id="b">B</button>
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
        onChange(_: readonly string[]): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer write — must NOT fire.
      r.instance.value.set(['a']);
      r.flush();
      expect(internalEmits).toBe(0);

      // User click — internal transition.
      itemOf(r.el, 'b').click();
      r.flush();
      expect(internalEmits).toBe(1);
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForToggleGroup, ForToggleGroupItem, FormField],
      template: `
        <div forToggleGroup multiple [formField]="prefs.tags">
          <button forToggleGroupItem value="bold" data-test-id="bold">B</button>
          <button forToggleGroupItem value="italic" data-test-id="italic">I</button>
          <button forToggleGroupItem value="underline" data-test-id="underline">U</button>
        </div>
      `,
    })
    class SignalFormsHost {
      readonly model = signal({ tags: [] as string[] });
      readonly prefs = form(this.model, (s) => required(s.tags));
    }

    it('two-way binds the array with the field value', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const bold = itemOf(el, 'bold');
      const italic = itemOf(el, 'italic');

      bold.click();
      italic.click();
      flush();
      expect(fixture.componentInstance.model().tags).toEqual(['bold', 'italic']);

      fixture.componentInstance.model.set({ tags: ['underline'] });
      flush();
      expect(itemOf(el, 'underline').getAttribute('aria-pressed')).toBe('true');
      expect(bold.getAttribute('aria-pressed')).toBe('false');
    });

    it('flows schema `required` into aria-required on the group', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(groupOf(el).getAttribute('aria-required')).toBe('true');
    });

    it('treats Angular `required` on the array value as a no-op (empty `[]` stays valid)', () => {
      const { fixture, flush } = renderHost(SignalFormsHost);
      flush();
      expect(fixture.componentInstance.prefs.tags().valid()).toBe(true);
    });

    @Component({
      imports: [ForToggleGroup, ForToggleGroupItem, FormField],
      template: `
        <div forToggleGroup multiple [formField]="prefs.tags">
          <button forToggleGroupItem value="bold" data-test-id="bold">B</button>
          <button forToggleGroupItem value="italic" data-test-id="italic">I</button>
        </div>
      `,
    })
    class NonEmptyRequiredHost {
      readonly model = signal({ tags: [] as string[] });
      readonly prefs = form(this.model, (s) =>
        validate(s.tags, ({ value }) =>
          value().length === 0 ? requiredError({ message: 'Pick at least one' }) : undefined,
        ),
      );
    }

    it('invalidates an empty array-backed control with the documented non-empty `validate` rule', () => {
      const { el, fixture, flush } = renderHost(NonEmptyRequiredHost);
      flush();
      expect(fixture.componentInstance.prefs.tags().valid()).toBe(false);

      itemOf(el, 'bold').click();
      flush();
      expect(fixture.componentInstance.prefs.tags().valid()).toBe(true);
    });

    it('mirrors values into hidden inputs when [name] is set', () => {
      @Component({
        imports: [ForToggleGroup, ForToggleGroupItem],
        template: `
          <form>
            <div forToggleGroup multiple name="formats" [(value)]="value">
              <button forToggleGroupItem value="bold" data-test-id="bold">B</button>
              <button forToggleGroupItem value="italic" data-test-id="italic">I</button>
            </div>
          </form>
        `,
      })
      class FormHost {
        readonly value = signal<readonly string[]>([]);
      }

      const r = renderHost(FormHost);
      r.instance.value.set(['bold', 'italic']);
      r.flush();

      const hiddens = r.el.querySelectorAll<HTMLInputElement>(
        'input[type="hidden"][name="formats"]',
      );
      expect(hiddens.length).toBe(2);
      expect(Array.from(hiddens, (h) => h.value)).toEqual(['bold', 'italic']);
    });

    it('reflects touched as data-touched on focusout outside the group', () => {
      const r = renderHost(ToggleGroupHost);
      const left = itemOf(r.el, 'left');
      left.focus();
      // Move focus elsewhere — relatedTarget is outside the group.
      left.dispatchEvent(
        new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }),
      );
      r.flush();
      expect(groupOf(r.el).hasAttribute('data-touched')).toBe(true);
    });

    it('blocks click when readonly is set', () => {
      @Component({
        imports: [ForToggleGroup, ForToggleGroupItem],
        template: `
          <div forToggleGroup readonly [(value)]="value">
            <button forToggleGroupItem value="a" data-test-id="a">A</button>
          </div>
        `,
      })
      class ReadonlyHost {
        readonly value = signal<readonly string[]>([]);
      }

      const r = renderHost(ReadonlyHost);
      r.el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!.click();
      r.flush();
      expect(r.instance.value()).toEqual([]);
      expect(r.el.querySelector('[forToggleGroup]')!.getAttribute('aria-readonly')).toBe('true');
    });
  });

  describe('used outside [forToggleGroup]', () => {
    it('throws from ForToggleGroupItem', () => {
      @Component({
        imports: [ForToggleGroupItem],
        template: `<button forToggleGroupItem value="a"></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/toggle-group\] ForToggleGroupItem/,
      );
    });
  });
});
