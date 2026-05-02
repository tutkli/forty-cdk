import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForListbox } from './listbox';
import { ForListboxOption } from './listbox-option';

const LISTBOX_IMPORTS = [ForListbox, ForListboxOption] as const;

@Component({
  imports: [...LISTBOX_IMPORTS],
  template: `
    <ul
      forListbox
      [(value)]="picked"
      [multiple]="isMulti()"
      [orientation]="orientation()"
      [dir]="dir()"
      [selectionFollowsFocus]="follow()"
      [disabled]="rootDisabled()"
    >
      @for (opt of options(); track opt.value) {
        <li>
          <button
            type="button"
            forListboxOption
            [value]="opt.value"
            [disabled]="opt.disabled"
            [attr.data-test-id]="opt.value"
          >
            {{ opt.label }}
          </button>
        </li>
      }
    </ul>
  `,
})
class ListboxHost {
  readonly picked = signal<string[]>([]);
  readonly isMulti = signal(false);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly follow = signal(false);
  readonly rootDisabled = signal(false);
  readonly options = signal([
    { value: 'apple', label: 'Apple', disabled: false },
    { value: 'apricot', label: 'Apricot', disabled: false },
    { value: 'banana', label: 'Banana', disabled: false },
    { value: 'blueberry', label: 'Blueberry', disabled: false },
    { value: 'cherry', label: 'Cherry', disabled: false },
  ]);
}

const optOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const listboxOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forListbox]')!;

const keyDown = (target: HTMLElement, key: string, init: KeyboardEventInit = {}) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, ...init }));

describe('ForListbox', () => {
  describe('static accessibility', () => {
    it('sets role=listbox + role=option, aria-orientation=vertical default', () => {
      const { el } = renderHost(ListboxHost);
      const lb = listboxOf(el);
      expect(lb.getAttribute('role')).toBe('listbox');
      expect(lb.getAttribute('aria-orientation')).toBe('vertical');
      expect(lb.hasAttribute('aria-multiselectable')).toBe(false);

      for (const v of ['apple', 'banana', 'cherry']) {
        const opt = optOf(el, v);
        expect(opt.getAttribute('role')).toBe('option');
        expect(opt.getAttribute('aria-selected')).toBe('false');
      }
    });

    it('exposes aria-multiselectable=true when multiple is set', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      flush();
      expect(listboxOf(el).getAttribute('aria-multiselectable')).toBe('true');
    });
  });

  describe('initial tabindex', () => {
    it('first enabled option has tabindex=0 when nothing is selected', () => {
      const { el } = renderHost(ListboxHost);
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('-1');
    });

    it('selected option has tabindex=0 when there is a selection', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.picked.set(['banana']);
      flush();
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('0');
    });

    it('skips disabled when picking the first-enabled tab entry', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
        { value: 'cherry', label: 'Cherry', disabled: false },
      ]);
      flush();
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('single-mode click semantics', () => {
    it('selects on click and replaces previous selection', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple']);

      optOf(el, 'cherry').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['cherry']);
    });

    it('clicking the selected option does NOT deselect (idempotent)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').click();
      flush();
      optOf(el, 'apple').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple']);
    });
  });

  describe('multi-mode click semantics', () => {
    it('toggles each option independently', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      flush();

      optOf(el, 'apple').click();
      optOf(el, 'cherry').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple', 'cherry']);

      optOf(el, 'apple').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['cherry']);
    });
  });

  describe('arrow navigation (no selection-on-focus by default)', () => {
    it('moves focus only — value stays put', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();

      keyDown(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('wraps at the ends', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
    });

    it('Home / End jump', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'banana').focus();
      keyDown(optOf(el, 'banana'), 'End');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
      keyDown(optOf(el, 'cherry'), 'Home');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('skips disabled options', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      flush();
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });
  });

  describe('selectionFollowsFocus (single mode opt-in)', () => {
    it('arrow nav also selects when enabled', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.follow.set(true);
      flush();

      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['apricot']);
    });

    it('does NOT auto-select in multi mode even when flag is set', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.follow.set(true);
      flush();

      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('typeahead', () => {
    it('focuses the first option matching the typed prefix', () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'b');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });

    it('extends the prefix on consecutive keystrokes', () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'b');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
      keyDown(optOf(el, 'banana'), 'l');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'blueberry'));
    });

    it('skips disabled matches', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'avocado', label: 'Avocado', disabled: false },
      ]);
      flush();

      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'a');
      flush();
      // 'apple' matches first but the focus is already there — typeahead's
      // prefix match returns first enabled match in list order, which is apple.
      expect(document.activeElement).toBe(optOf(el, 'apple'));

      // Type 'av' to skip apricot (disabled).
      keyDown(optOf(el, 'apple'), 'v');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));
    });

    it('ignores Space (reserved for activation)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), ' ');
      flush();
      // Space is not a typeahead character; focus stays on apple.
      expect(document.activeElement).toBe(optOf(el, 'apple'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('horizontal & RTL', () => {
    it('uses ArrowLeft / ArrowRight in horizontal', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowRight');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('RTL swaps ArrowLeft / ArrowRight in horizontal', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.dir.set('rtl');
      flush();
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowLeft');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });
  });

  describe('disabled', () => {
    it('disabled option ignores click', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      flush();

      optOf(el, 'apple').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('root disabled cascades and blocks selection', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.rootDisabled.set(true);
      flush();
      expect(listboxOf(el).getAttribute('aria-disabled')).toBe('true');

      optOf(el, 'apple').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
      expect(optOf(el, 'apple').hasAttribute('disabled')).toBe(true);
    });
  });

  describe('used outside [forListbox]', () => {
    it('throws a prefixed error from ForListboxOption', () => {
      @Component({
        imports: [ForListboxOption],
        template: `<button type="button" forListboxOption value="x"></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/listbox\] ForListboxOption must be used inside a \[forListbox\] element\./,
      );
    });
  });

  describe('(valueChange) output', () => {
    it('emits the new selection when an option is clicked', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox multiple (valueChange)="emitted.push($event)">
            <li>
              <button type="button" forListboxOption value="a" data-test-id="a">A</button>
            </li>
            <li>
              <button type="button" forListboxOption value="b" data-test-id="b">B</button>
            </li>
          </ul>
        `,
      })
      class Host {
        readonly emitted: (readonly string[])[] = [];
      }

      const { fixture, el, flush } = renderHost(Host);
      optOf(el, 'a').click();
      flush();
      optOf(el, 'b').click();
      flush();

      expect(fixture.componentInstance.emitted).toEqual([['a'], ['a', 'b']]);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox [(value)]="picked" (valueChange)="emitted.push($event)">
            <li><button type="button" forListboxOption value="a">A</button></li>
          </ul>
        `,
      })
      class Host {
        readonly picked = signal<string[]>([]);
        readonly emitted: (readonly string[])[] = [];
      }

      const { fixture, flush } = renderHost(Host);
      fixture.componentInstance.picked.set(['a']);
      flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.picked.set(['cherry']);
      flush();
      expect(optOf(el, 'cherry').getAttribute('aria-selected')).toBe('true');

      fixture.componentInstance.picked.set([]);
      flush();
      expect(optOf(el, 'cherry').getAttribute('aria-selected')).toBe('false');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForListbox, ForListboxOption, FormField],
      template: `
        <ul forListbox multiple [formField]="prefs.priorities">
          <li>
            <button type="button" forListboxOption value="speed" data-test-id="speed">
              Speed
            </button>
          </li>
          <li>
            <button type="button" forListboxOption value="quality" data-test-id="quality">
              Quality
            </button>
          </li>
          <li>
            <button type="button" forListboxOption value="cost" data-test-id="cost">
              Cost
            </button>
          </li>
        </ul>
      `,
    })
    class SignalFormsHost {
      readonly model = signal({ priorities: [] as string[] });
      readonly prefs = form(this.model, (s) => required(s.priorities));
    }

    it('two-way binds the array with the field value', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const speed = optOf(el, 'speed');
      const quality = optOf(el, 'quality');

      speed.click();
      quality.click();
      flush();
      expect(fixture.componentInstance.model().priorities).toEqual(['speed', 'quality']);

      fixture.componentInstance.model.set({ priorities: ['cost'] });
      flush();
      expect(optOf(el, 'cost').getAttribute('aria-selected')).toBe('true');
      expect(speed.getAttribute('aria-selected')).toBe('false');
    });

    it('flows schema `required` into aria-required on the listbox', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(listboxOf(el).getAttribute('aria-required')).toBe('true');
    });
  });
});
