import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForListbox } from './listbox';
import { ForListboxGroup } from './listbox-group';
import { ForListboxGroupLabel } from './listbox-group-label';
import { ForListboxOption } from './listbox-option';
import { ForListboxOptionIndicator } from './listbox-option-indicator';

const LISTBOX_IMPORTS = [ForListbox, ForListboxOption] as const;
const GROUP_IMPORTS = [
  ForListbox,
  ForListboxOption,
  ForListboxGroup,
  ForListboxGroupLabel,
] as const;

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

  describe('multi-select APG keyboard model', () => {
    const setupMulti = (initial: string[] = []) => {
      const result = renderHost(ListboxHost);
      result.fixture.componentInstance.isMulti.set(true);
      result.fixture.componentInstance.picked.set(initial);
      result.flush();
      return result;
    };

    describe('Shift+ArrowDown / Shift+ArrowUp', () => {
      it('moves focus to the next option AND toggles it on', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });

      it('toggles already-selected options off on Shift+Arrow', () => {
        const { el, fixture, flush } = setupMulti(['apricot']);
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowUp toggles the previous option', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), 'ArrowUp', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual(['apple']);
      });

      it('skips disabled options', () => {
        const { el, fixture, flush } = setupMulti();
        fixture.componentInstance.options.set([
          { value: 'apple', label: 'Apple', disabled: false },
          { value: 'apricot', label: 'Apricot', disabled: true },
          { value: 'banana', label: 'Banana', disabled: false },
        ]);
        flush();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'banana'));
        expect(fixture.componentInstance.picked()).toEqual(['banana']);
      });

      it('does NOT toggle in single mode (just moves focus)', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('does not change the anchor (so a later Shift+Space spans from the click)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').click();
        flush();
        // Shift+Arrow should NOT move the anchor.
        keyDown(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        keyDown(optOf(el, 'apricot'), 'ArrowDown', { shiftKey: true });
        flush();
        // Now focus is on banana. Shift+Space should select [apple..banana].
        keyDown(optOf(el, 'banana'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['apple', 'apricot', 'banana']);
      });

      it('respects readonly (no toggle, focus still moves)', () => {
        @Component({
          imports: [...LISTBOX_IMPORTS],
          template: `
            <ul forListbox multiple readonly [(value)]="picked">
              <li><button type="button" forListboxOption value="a" data-test-id="a">A</button></li>
              <li><button type="button" forListboxOption value="b" data-test-id="b">B</button></li>
            </ul>
          `,
        })
        class Host {
          readonly picked = signal<string[]>([]);
        }

        const r = renderHost(Host);
        optOf(r.el, 'a').focus();
        keyDown(optOf(r.el, 'a'), 'ArrowDown', { shiftKey: true });
        r.flush();
        expect(document.activeElement).toBe(optOf(r.el, 'b'));
        expect(r.fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Shift+Space (range from anchor)', () => {
      it('selects contiguous from anchor to focused option (forward)', () => {
        const { el, fixture, flush } = setupMulti();
        // Click sets the anchor.
        optOf(el, 'apple').click();
        flush();
        // Move focus a few steps without modifying anchor.
        optOf(el, 'cherry').focus();
        keyDown(optOf(el, 'cherry'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
      });

      it('selects contiguous from anchor to focused option (backward)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'cherry').click();
        flush();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'cherry',
          'apple',
          'apricot',
          'banana',
          'blueberry',
        ]);
      });

      it('preserves selection outside the range', () => {
        const { el, fixture, flush } = setupMulti(['cherry']);
        optOf(el, 'apple').click(); // Anchor = apple, picks now = [cherry, apple].
        flush();
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'cherry',
          'apple',
          'apricot',
        ]);
      });

      it('skips disabled options in the range', () => {
        const { el, fixture, flush } = setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: false },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C', disabled: false },
        ]);
        flush();
        optOf(el, 'a').click();
        flush();
        optOf(el, 'c').focus();
        keyDown(optOf(el, 'c'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('falls back to selecting the focused option when no anchor exists', () => {
        const { el, fixture, flush } = setupMulti();
        // No prior click → anchor is null. Shift+Space at apricot picks just apricot.
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });

      it('no-op in single mode (Space falls through to native click)', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), ' ', { shiftKey: true });
        flush();
        // Space was preventDefaulted-by-nobody; native click on a button doesn't fire
        // from a synthetic `keydown` event in jsdom. Single-mode picks stays empty.
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Ctrl/Cmd+A', () => {
      it('selects every enabled option', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
      });

      it('also accepts uppercase A', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'A', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('also accepts metaKey (mac Cmd+A)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'a', { metaKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('clears the selection when every enabled option is already selected (toggle)', () => {
        const { el, fixture, flush } = setupMulti(['apple', 'apricot', 'banana', 'blueberry', 'cherry']);
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('skips disabled options', () => {
        const { el, fixture, flush } = setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: false },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C', disabled: false },
        ]);
        flush();
        optOf(el, 'a').focus();
        keyDown(optOf(el, 'a'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('no-op in single mode', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        keyDown(optOf(el, 'apple'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Ctrl+Shift+Home / Ctrl+Shift+End', () => {
      it('Ctrl+Shift+End selects from current to the last enabled option and focuses it', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'banana').focus();
        keyDown(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'cherry'));
        expect(fixture.componentInstance.picked()).toEqual([
          'banana',
          'blueberry',
          'cherry',
        ]);
      });

      it('Ctrl+Shift+Home selects from current to the first enabled option and focuses it', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'banana').focus();
        keyDown(optOf(el, 'banana'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'apricot',
          'banana',
        ]);
      });

      it('preserves selection outside the range', () => {
        const { el, fixture, flush } = setupMulti(['cherry']);
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'cherry',
          'apple',
          'apricot',
        ]);
      });

      it('skips disabled options when picking the focus edge', () => {
        const { el, fixture, flush } = setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: true },
          { value: 'b', label: 'B', disabled: false },
          { value: 'c', label: 'C', disabled: false },
        ]);
        flush();
        optOf(el, 'c').focus();
        keyDown(optOf(el, 'c'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'b'));
        expect(fixture.componentInstance.picked()).toEqual(['b', 'c']);
      });

      it('no-op in single mode', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'banana').focus();
        keyDown(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('anchor lifecycle', () => {
      it('is set on click activation', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'banana').click();
        flush();
        // Now Shift+Space at apricot should span apricot..banana.
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'banana',
          'apricot',
        ]);
      });

      it('moves to the most recent click', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').click(); // anchor = apple
        optOf(el, 'cherry').click(); // anchor moves to cherry
        flush();
        // Shift+Space at apricot should span apricot..cherry.
        optOf(el, 'apricot').focus();
        keyDown(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'cherry',
          'apricot',
          'banana',
          'blueberry',
        ]);
      });
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

    it('ignores cross-axis arrows in horizontal mode (ArrowDown/ArrowUp no-op)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      optOf(el, 'apple').focus();
      keyDown(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
      keyDown(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });
  });

  describe('readonly', () => {
    it('exposes aria-readonly and blocks click selection while keeping options focusable', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox [(value)]="picked" readonly>
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
        readonly picked = signal<string[]>([]);
      }

      const { el, fixture, flush } = renderHost(Host);
      expect(listboxOf(el).getAttribute('aria-readonly')).toBe('true');

      optOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);

      // Arrow nav still works — readonly only blocks selection, not focus.
      optOf(el, 'a').focus();
      keyDown(optOf(el, 'a'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'b'));
    });

    it('does not auto-select on focus nav when readonly even with selectionFollowsFocus', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox [(value)]="picked" readonly selectionFollowsFocus>
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
        readonly picked = signal<string[]>([]);
      }

      const { el, fixture, flush } = renderHost(Host);
      optOf(el, 'a').focus();
      keyDown(optOf(el, 'a'), 'ArrowDown');
      flush();

      expect(fixture.componentInstance.picked()).toEqual([]);
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

  describe('groups (ForListboxGroup + ForListboxGroupLabel)', () => {
    @Component({
      imports: [...GROUP_IMPORTS],
      template: `
        <ul forListbox [(value)]="picked">
          <li forListboxGroup>
            <div forListboxGroupLabel>Fruit</div>
            <button type="button" forListboxOption value="a" data-test-id="a">A</button>
            <button type="button" forListboxOption value="b" data-test-id="b">B</button>
          </li>
          <li forListboxGroup>
            <div forListboxGroupLabel>Other</div>
            <button type="button" forListboxOption value="c" data-test-id="c">C</button>
          </li>
        </ul>
      `,
    })
    class GroupHost {
      readonly picked = signal<string[]>([]);
    }

    it('renders role=group and links aria-labelledby to the label id', () => {
      const { el } = renderHost(GroupHost);
      const groups = el.querySelectorAll<HTMLElement>('[forListboxGroup]');
      expect(groups).toHaveLength(2);
      for (const group of Array.from(groups)) {
        expect(group.getAttribute('role')).toBe('group');
        const labelId = group.getAttribute('aria-labelledby');
        expect(labelId).toBeTruthy();
        const label = el.querySelector(`#${labelId}`);
        expect(label?.matches('[forListboxGroupLabel]')).toBe(true);
      }
    });

    it('produces unique label ids across groups', () => {
      const { el } = renderHost(GroupHost);
      const ids = Array.from(el.querySelectorAll<HTMLElement>('[forListboxGroupLabel]')).map((n) => n.id);
      expect(ids[0]).not.toBe(ids[1]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps options registered with the listbox across groups, in DOM order', () => {
      const { el, fixture, flush } = renderHost(GroupHost);
      const a = el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!;
      const c = el.querySelector<HTMLButtonElement>('[data-test-id="c"]')!;

      a.focus();
      a.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      flush();

      // End jumps to the last enabled option, even when it lives in another
      // group — proving the listbox sees options from both groups in DOM order.
      expect(document.activeElement).toBe(c);
      void fixture;
    });

    it('throws when ForListboxGroupLabel is used outside [forListboxGroup]', () => {
      @Component({
        imports: [ForListboxGroupLabel],
        template: `<div forListboxGroupLabel></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/listbox\] ForListboxGroupLabel must be used inside a \[forListboxGroup\] element\./,
      );
    });
  });

  describe('ForListboxOptionIndicator', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS, ForListboxOptionIndicator],
      template: `
        <ul forListbox [(value)]="picked" [multiple]="true">
          <li>
            <button type="button" forListboxOption value="a" data-test-id="opt-a">
              A <span forListboxOptionIndicator data-ind="a"></span>
            </button>
          </li>
          <li>
            <button type="button" forListboxOption value="b" data-test-id="opt-b">
              B <span forListboxOptionIndicator data-ind="b"></span>
            </button>
          </li>
        </ul>
      `,
    })
    class IndicatorHost {
      readonly picked = signal<string[]>([]);
    }

    it('hides indicators while no option is selected', () => {
      const { el } = renderHost(IndicatorHost);
      const inds = el.querySelectorAll<HTMLElement>('[data-ind]');
      expect(Array.from(inds).every((n) => n.hasAttribute('hidden'))).toBe(true);
    });

    it('reflects per-option selection (independent of siblings) in multi mode', () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.picked.set(['a']);
      flush();

      const a = el.querySelector<HTMLElement>('[data-ind="a"]')!;
      const b = el.querySelector<HTMLElement>('[data-ind="b"]')!;
      expect(a.hasAttribute('hidden')).toBe(false);
      expect(a.getAttribute('data-state')).toBe('checked');
      expect(b.hasAttribute('hidden')).toBe(true);
    });

    it('throws when used outside [forListboxOption]', () => {
      @Component({
        imports: [ForListboxOptionIndicator],
        template: `<span forListboxOptionIndicator></span>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrow(
        /\[forty-cdk\/listbox\] ForListboxOptionIndicator must be used inside a \[forListboxOption\] element\./,
      );
    });
  });

  describe('form-state data attributes', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <ul
          forListbox
          [(value)]="picked"
          [(touched)]="touched"
          [dirty]="dirty()"
          [pending]="pending()"
          [invalid]="invalid()"
        >
          <li><button type="button" forListboxOption value="a">A</button></li>
        </ul>
      `,
    })
    class FlagsHost {
      readonly picked = signal<string[]>([]);
      readonly touched = signal(false);
      readonly dirty = signal(false);
      readonly pending = signal(false);
      readonly invalid = signal(false);
    }

    it('reflects each form-state flag as a boolean data-* attribute on the listbox', () => {
      const { el, fixture, flush } = renderHost(FlagsHost);
      const lb = el.querySelector<HTMLElement>('[forListbox]')!;

      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.dirty.set(true);
      fixture.componentInstance.pending.set(true);
      fixture.componentInstance.invalid.set(true);
      flush();

      expect(lb.getAttribute('data-touched')).toBe('');
      expect(lb.getAttribute('data-dirty')).toBe('');
      expect(lb.getAttribute('data-pending')).toBe('');
      expect(lb.getAttribute('data-invalid')).toBe('');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <form>
          <ul forListbox [(value)]="picked" [multiple]="true" [name]="fieldName()">
            <li><button type="button" forListboxOption value="a">A</button></li>
            <li><button type="button" forListboxOption value="b">B</button></li>
            <li><button type="button" forListboxOption value="c">C</button></li>
          </ul>
        </form>
      `,
    })
    class FormHost {
      readonly picked = signal<string[]>([]);
      readonly fieldName = signal<string>('');
    }

    it('submits one entry per selected value with the same name (multi mode)', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('tags');
      fixture.componentInstance.picked.set(['a', 'c']);
      flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([
        ['tags', 'a'],
        ['tags', 'c'],
      ]);
    });

    it('omits the value when nothing is selected', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('tags');
      flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
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
