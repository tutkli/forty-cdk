import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
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

const groupOf = (host: HTMLElement) =>
  host.querySelector<HTMLElement>('[forToggleGroup]')!;

const keyDown = (target: HTMLElement, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));

describe('ForToggleGroup', () => {
  describe('a11y baseline', () => {
    it('sets role=group, aria-orientation, and each item type=button + aria-pressed=false', () => {
      const { el } = renderHost(ToggleGroupHost);
      const group = groupOf(el);

      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-orientation')).toBe('horizontal');
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
      expect(group.getAttribute('aria-orientation')).toBe('vertical');
      expect(group.getAttribute('data-orientation')).toBe('vertical');
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
      keyDown(left, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(el, 'center'));
    });

    it('ArrowLeft moves focus to the previous enabled item', () => {
      const { el } = renderHost(ToggleGroupHost);
      const right = itemOf(el, 'right');
      right.focus();
      keyDown(right, 'ArrowLeft');

      expect(document.activeElement).toBe(itemOf(el, 'center'));
    });

    it('Home / End jump to first / last enabled', () => {
      const { el } = renderHost(ToggleGroupHost);
      const center = itemOf(el, 'center');
      center.focus();

      keyDown(center, 'Home');
      expect(document.activeElement).toBe(itemOf(el, 'left'));

      keyDown(itemOf(el, 'left'), 'End');
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
      keyDown(left, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(r.el, 'right'));
    });

    it('wraps with loop=true (default)', () => {
      const { el } = renderHost(ToggleGroupHost);
      const right = itemOf(el, 'right');
      right.focus();
      keyDown(right, 'ArrowRight');

      expect(document.activeElement).toBe(itemOf(el, 'left'));
    });

    it('does NOT wrap with loop=false', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.loop.set(false);
      r.flush();

      const right = itemOf(r.el, 'right');
      right.focus();
      keyDown(right, 'ArrowRight');

      expect(document.activeElement).toBe(right);
    });

    it('does not navigate via vertical arrows in horizontal mode', () => {
      const { el } = renderHost(ToggleGroupHost);
      const left = itemOf(el, 'left');
      left.focus();
      keyDown(left, 'ArrowDown');

      expect(document.activeElement).toBe(left);
    });

    it('does NOT change selection while navigating (no selection-on-focus)', () => {
      const r = renderHost(ToggleGroupHost);
      const left = itemOf(r.el, 'left');
      left.focus();
      keyDown(left, 'ArrowRight');
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
      keyDown(left, 'ArrowDown');
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));

      keyDown(itemOf(r.el, 'center'), 'ArrowUp');
      expect(document.activeElement).toBe(left);
    });

    it('ignores horizontal arrows in vertical mode', () => {
      const r = renderHost(ToggleGroupHost);
      r.instance.orientation.set('vertical');
      r.flush();

      const left = itemOf(r.el, 'left');
      left.focus();
      keyDown(left, 'ArrowRight');
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
      keyDown(left, 'ArrowLeft'); // RTL: visually means "next"
      expect(document.activeElement).toBe(itemOf(r.el, 'center'));
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
