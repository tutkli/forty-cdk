import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, required, requiredError, validate } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../test-utils';
import { ForListbox } from './listbox';
import { ForListboxGroup } from './listbox-group';
import { ForListboxGroupLabel } from './listbox-group-label';
import { FOR_LISTBOX_OPTION, ForListboxOption } from './listbox-option';
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
      [loop]="loop()"
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
  readonly picked = signal<readonly string[]>([]);
  readonly isMulti = signal(false);
  readonly orientation = signal<'vertical' | 'horizontal'>('vertical');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly follow = signal(false);
  readonly rootDisabled = signal(false);
  readonly loop = signal(true);
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

describe('ForListbox', () => {
  afterEachOverlayCleanup();

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

  describe('aria-label', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <ul forListbox [(value)]="picked" [ariaLabel]="label()">
          <li><button type="button" forListboxOption value="a" data-test-id="a">A</button></li>
        </ul>
      `,
    })
    class LabelHost {
      readonly picked = signal<readonly string[]>([]);
      readonly label = signal<string | null>(null);
    }

    it('emits aria-label when the input is set', () => {
      const { el, fixture, flush } = renderHost(LabelHost);
      fixture.componentInstance.label.set('Fruit');
      flush();
      expect(listboxOf(el).getAttribute('aria-label')).toBe('Fruit');
    });

    it('emits no aria-label attribute when the input is null (default)', () => {
      const { el } = renderHost(LabelHost);
      expect(listboxOf(el).hasAttribute('aria-label')).toBe(false);
    });

    it('emits no aria-label attribute for an empty string', () => {
      const { el, fixture, flush } = renderHost(LabelHost);
      fixture.componentInstance.label.set('');
      flush();
      expect(listboxOf(el).hasAttribute('aria-label')).toBe(false);
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

    it('multi-select with ≥2 preselected options exposes exactly one tabindex=0', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.picked.set(['banana', 'cherry']);
      flush();

      const zeros = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'].filter(
        (v) => optOf(el, v).getAttribute('tabindex') === '0',
      );
      expect(zeros).toEqual(['banana']);
    });

    it('multi-select tab entry is the first selected enabled option in DOM order', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry', disabled: false },
      ]);
      fixture.componentInstance.picked.set(['banana', 'cherry']);
      flush();

      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'cherry').getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
    });

    it('roving takes over after an option is focused (multi + preselection)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.picked.set(['banana', 'cherry']);
      flush();

      optOf(el, 'apple').focus();
      flush();

      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('0');
      const zeros = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'].filter(
        (v) => optOf(el, v).getAttribute('tabindex') === '0',
      );
      expect(zeros).toEqual(['apple']);
    });

    it('removing the focused option re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      flush();
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.options.set([
        { value: 'apricot', label: 'Apricot', disabled: false },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();

      const zeros = ['apricot', 'banana'].filter(
        (v) => optOf(el, v).getAttribute('tabindex') === '0',
      );
      expect(zeros).toEqual(['apricot']);
    });

    it('disabling the focused option re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      flush();
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'apricot', label: 'Apricot', disabled: false },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();

      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      const zeros = ['apple', 'apricot', 'banana'].filter(
        (v) => optOf(el, v).getAttribute('tabindex') === '0',
      );
      expect(zeros).toEqual(['apricot']);
    });
  });

  describe('host fallback tabindex', () => {
    it('host carries no tabindex while an option qualifies as the roving entry', () => {
      const { el } = renderHost(ListboxHost);
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
    });

    it('host becomes tabindex=0 when every option is disabled', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('-1');
    });

    it('host becomes tabindex=0 when there are no options', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([]);
      flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');
    });

    it('a disabled listbox is never tabbable, even with all options disabled', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.rootDisabled.set(true);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      flush();
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
    });

    it('host drops its fallback tabindex once an enabled option appears', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([{ value: 'apple', label: 'Apple', disabled: true }]);
      flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      flush();
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
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

      pressKey(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('wraps at the ends', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
    });

    it('stops at the ends when loop=false', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.loop.set(false);
      flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'apple'));

      optOf(el, 'cherry').focus();
      pressKey(optOf(el, 'cherry'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
    });

    it('Home / End jump', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'banana').focus();
      pressKey(optOf(el, 'banana'), 'End');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
      pressKey(optOf(el, 'cherry'), 'Home');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('PageDown / PageUp jump to last / first', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'banana').focus();
      pressKey(optOf(el, 'banana'), 'PageDown');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
      pressKey(optOf(el, 'cherry'), 'PageUp');
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
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });
  });

  describe('selectionFollowsFocus (single mode opt-in)', () => {
    it('arrow nav also selects when enabled', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.follow.set(true);
      flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['apricot']);
    });

    it('does NOT auto-select in multi mode even when flag is set', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.follow.set(true);
      flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('typeahead', () => {
    it('focuses the first option matching the typed prefix', () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'b');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });

    it('extends the prefix on consecutive keystrokes', () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'b');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
      pressKey(optOf(el, 'banana'), 'l');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'blueberry'));
    });

    it('skips disabled matches on a multi-character prefix', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'banana', label: 'Banana', disabled: false },
        { value: 'avocet', label: 'Avocet', disabled: true },
        { value: 'avocado', label: 'Avocado', disabled: false },
      ]);
      flush();

      // 'av' matches avocet first but it is disabled, so focus lands on avocado.
      optOf(el, 'banana').focus();
      pressKey(optOf(el, 'banana'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));
      pressKey(optOf(el, 'avocado'), 'v');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));
    });

    it('ignores Space (reserved for activation)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), ' ');
      flush();
      // Space is not a typeahead character; focus stays on apple.
      expect(document.activeElement).toBe(optOf(el, 'apple'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('cycles through same-initial options on repeated key with wrap', () => {
      const { el, flush } = renderHost(ListboxHost);

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));

      pressKey(optOf(el, 'apricot'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apple'));

      pressKey(optOf(el, 'apple'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('skips disabled options while cycling on repeated key', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'avocado', label: 'Avocado', disabled: false },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));

      pressKey(optOf(el, 'avocado'), 'a');
      flush();
      expect(document.activeElement).toBe(optOf(el, 'apple'));
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
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });

      it('toggles already-selected options off on Shift+Arrow', () => {
        const { el, fixture, flush } = setupMulti(['apricot']);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowUp toggles the previous option', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), 'ArrowUp', { shiftKey: true });
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
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'banana'));
        expect(fixture.componentInstance.picked()).toEqual(['banana']);
      });

      it('does NOT toggle in single mode (just moves focus)', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('does not change the anchor (so a later Shift+Space spans from the click)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').click();
        flush();
        // Shift+Arrow should NOT move the anchor.
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        pressKey(optOf(el, 'apricot'), 'ArrowDown', { shiftKey: true });
        flush();
        // Now focus is on banana. Shift+Space should select [apple..banana].
        pressKey(optOf(el, 'banana'), ' ', { shiftKey: true });
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
          readonly picked = signal<readonly string[]>([]);
        }

        const r = renderHost(Host);
        optOf(r.el, 'a').focus();
        pressKey(optOf(r.el, 'a'), 'ArrowDown', { shiftKey: true });
        r.flush();
        expect(document.activeElement).toBe(optOf(r.el, 'b'));
        expect(r.fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowDown on the last option is a no-op (no wrap, no opposite-end toggle)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'cherry').focus();
        pressKey(optOf(el, 'cherry'), 'ArrowDown', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'cherry'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowUp on the first option is a no-op (no wrap, no opposite-end toggle)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowUp', { shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual([]);
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
        pressKey(optOf(el, 'cherry'), ' ', { shiftKey: true });
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
        pressKey(optOf(el, 'apple'), ' ', { shiftKey: true });
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
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['cherry', 'apple', 'apricot']);
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
        pressKey(optOf(el, 'c'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('falls back to selecting the focused option when no anchor exists', () => {
        const { el, fixture, flush } = setupMulti();
        // No prior click → anchor is null. Shift+Space at apricot picks just apricot.
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });
    });

    describe('Ctrl/Cmd+A', () => {
      it('selects every enabled option', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
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
        pressKey(optOf(el, 'apple'), 'A', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('also accepts metaKey (mac Cmd+A)', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { metaKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('clears the selection when every enabled option is already selected (toggle)', () => {
        const { el, fixture, flush } = setupMulti([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
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
        pressKey(optOf(el, 'a'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('no-op in single mode', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Ctrl+Shift+Home / Ctrl+Shift+End', () => {
      it('Ctrl+Shift+End selects from current to the last enabled option and focuses it', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'cherry'));
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'blueberry', 'cherry']);
      });

      it('Ctrl+Shift+Home selects from current to the first enabled option and focuses it', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual(['apple', 'apricot', 'banana']);
      });

      it('preserves selection outside the range', () => {
        const { el, fixture, flush } = setupMulti(['cherry']);
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['cherry', 'apple', 'apricot']);
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
        pressKey(optOf(el, 'c'), 'Home', { ctrlKey: true, shiftKey: true });
        flush();
        expect(document.activeElement).toBe(optOf(el, 'b'));
        expect(fixture.componentInstance.picked()).toEqual(['b', 'c']);
      });

      it('no-op in single mode', () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
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
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'apricot']);
      });

      it('moves to the most recent click', () => {
        const { el, fixture, flush } = setupMulti();
        optOf(el, 'apple').click(); // anchor = apple
        optOf(el, 'cherry').click(); // anchor moves to cherry
        flush();
        // Shift+Space at apricot should span apricot..cherry.
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'cherry',
          'apricot',
          'banana',
          'blueberry',
        ]);
      });

      it('survives a reorder/insert of preceding options (#590 F4 — identity anchor)', () => {
        const { el, fixture, flush } = setupMulti();
        // Click banana → anchor = banana (DOM index 2 at this point).
        optOf(el, 'banana').click();
        flush();

        // Insert a new option before everything: banana's DOM index shifts to 3.
        fixture.componentInstance.options.update((opts) => [
          { value: 'almond', label: 'Almond', disabled: false },
          ...opts,
        ]);
        flush();

        // Shift+Space at cherry must still span banana..cherry by identity
        // (banana, blueberry, cherry are contiguous). The stale-index span
        // would instead start at index 2 (now blueberry) and miss banana.
        optOf(el, 'cherry').focus();
        pressKey(optOf(el, 'cherry'), ' ', { shiftKey: true });
        flush();
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'blueberry', 'cherry']);
      });
    });
  });

  describe('horizontal & RTL', () => {
    it('reflects dir to the native dir attribute for both ltr and rtl', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      const lb = el.querySelector('[forListbox]')!;

      expect(lb.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      flush();
      expect(lb.getAttribute('dir')).toBe('rtl');
    });

    it('uses ArrowLeft / ArrowRight in horizontal', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowRight');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('RTL swaps ArrowLeft / ArrowRight in horizontal', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.dir.set('rtl');
      flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowLeft');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('vertical: ArrowDown / ArrowUp stay axis-positive under dir="rtl" (dir does not flip vertical)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.dir.set('rtl');
      flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));

      pressKey(optOf(el, 'apricot'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('ignores cross-axis arrows in horizontal mode (ArrowDown/ArrowUp no-op)', () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
      pressKey(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });
  });

  describe('ambient writing direction', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <div [attr.dir]="ambient()">
          <ul forListbox orientation="horizontal" [dir]="explicit()">
            @for (opt of ['apple', 'apricot', 'banana']; track opt) {
              <li>
                <button type="button" forListboxOption [value]="opt" [attr.data-test-id]="opt">
                  {{ opt }}
                </button>
              </li>
            }
          </ul>
        </div>
      `,
    })
    class AmbientHost {
      readonly ambient = signal<string | null>(null);
      readonly explicit = signal<'ltr' | 'rtl' | null>(null);
    }

    it('reflects dir="rtl" from an ancestor [dir] when no explicit dir is set', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      const lb = fixture.nativeElement.querySelector('[forListbox]') as HTMLElement;
      expect(lb.getAttribute('dir')).toBe('rtl');
    });

    it('lets an explicit [dir]="ltr" win over an rtl ancestor', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      fixture.componentInstance.explicit.set('ltr');
      await flush(fixture);
      const lb = fixture.nativeElement.querySelector('[forListbox]') as HTMLElement;
      expect(lb.getAttribute('dir')).toBe('ltr');
    });

    it('swaps ArrowLeft / ArrowRight from the ambient rtl ancestor', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const opt = (id: string) => el.querySelector<HTMLButtonElement>(`[data-test-id="${id}"]`)!;
      opt('apple').focus();
      pressKey(opt('apple'), 'ArrowLeft');
      expect(document.activeElement).toBe(opt('apricot'));
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
        readonly picked = signal<readonly string[]>([]);
      }

      const { el, fixture, flush } = renderHost(Host);
      expect(listboxOf(el).getAttribute('aria-readonly')).toBe('true');

      optOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([]);

      // Arrow nav still works — readonly only blocks selection, not focus.
      optOf(el, 'a').focus();
      pressKey(optOf(el, 'a'), 'ArrowDown');
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
        readonly picked = signal<readonly string[]>([]);
      }

      const { el, fixture, flush } = renderHost(Host);
      optOf(el, 'a').focus();
      pressKey(optOf(el, 'a'), 'ArrowDown');
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
      expect(optOf(el, 'apple').hasAttribute('disabled')).toBe(false);
      expect(optOf(el, 'apple').getAttribute('aria-disabled')).toBe('true');
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
        readonly picked = signal<readonly string[]>([]);
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
      readonly picked = signal<readonly string[]>([]);
    }

    it('renders role=group and links aria-labelledby to the label id', () => {
      const { el } = renderHost(GroupHost);
      const groups = el.querySelectorAll<HTMLElement>('[forListboxGroup]');
      expect(groups).toHaveLength(2);
      for (const group of Array.from(groups)) {
        expect(group.getAttribute('role')).toBe('group');
        const labelId = group.getAttribute('aria-labelledby');
        const label = el.querySelector(`#${labelId}`);
        expect(label?.matches('[forListboxGroupLabel]')).toBe(true);
      }
    });

    it('produces unique label ids across groups', () => {
      const { el } = renderHost(GroupHost);
      const ids = Array.from(el.querySelectorAll<HTMLElement>('[forListboxGroupLabel]')).map(
        (n) => n.id,
      );
      expect(ids[0]).not.toBe(ids[1]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it('keeps options registered with the listbox across groups, in DOM order', () => {
      const { el, fixture, flush } = renderHost(GroupHost);
      const a = el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!;
      const c = el.querySelector<HTMLButtonElement>('[data-test-id="c"]')!;

      a.focus();
      pressKey(a, 'End');
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
      readonly picked = signal<readonly string[]>([]);
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

    it('enforces inline display:none while unselected so a consumer display class cannot leak through', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS, ForListboxOptionIndicator],
        template: `
          <ul forListbox [(value)]="picked" [multiple]="true">
            <li>
              <button type="button" forListboxOption value="a" data-test-id="opt-a">
                A <span forListboxOptionIndicator data-ind="a" class="consumer-flex"></span>
              </button>
            </li>
          </ul>
        `,
      })
      class StyledIndicatorHost {
        readonly picked = signal<readonly string[]>([]);
      }

      const { el, fixture, flush } = renderHost(StyledIndicatorHost);
      const a = el.querySelector<HTMLElement>('[data-ind="a"]')!;
      expect(a.style.display).toBe('none');

      fixture.componentInstance.picked.set(['a']);
      flush();
      expect(a.style.display).toBe('');
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

    it('resolves a subclassed option via the re-provided FOR_LISTBOX_OPTION token', () => {
      @Directive({
        selector: '[testListboxOption]',
        providers: [{ provide: FOR_LISTBOX_OPTION, useExisting: TestListboxOption }],
      })
      class TestListboxOption extends ForListboxOption {}

      @Component({
        imports: [ForListbox, TestListboxOption, ForListboxOptionIndicator],
        template: `
          <ul forListbox [(value)]="picked">
            <li>
              <button type="button" testListboxOption value="a" data-test-id="opt-a">
                A <span forListboxOptionIndicator data-ind="a"></span>
              </button>
            </li>
          </ul>
        `,
      })
      class SubclassHost {
        readonly picked = signal<readonly string[]>(['a']);
      }

      const { el } = renderHost(SubclassHost);
      const ind = el.querySelector<HTMLElement>('[data-ind="a"]')!;
      expect(ind.getAttribute('data-state')).toBe('checked');
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
      readonly picked = signal<readonly string[]>([]);
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
      readonly picked = signal<readonly string[]>([]);
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

  describe('selected (single-select accessor)', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <ul forListbox #lb="forListbox" [(value)]="picked" [multiple]="isMulti()">
          <li><button type="button" forListboxOption value="a" data-test-id="a">A</button></li>
          <li><button type="button" forListboxOption value="b" data-test-id="b">B</button></li>
        </ul>
        <output data-testid="selected">{{ lb.selected() ?? 'none' }}</output>
      `,
    })
    class SelectedHost {
      readonly picked = signal<readonly string[]>([]);
      readonly isMulti = signal(false);
    }

    const selectedText = (el: HTMLElement) =>
      el.querySelector<HTMLElement>('[data-testid="selected"]')!.textContent;

    it('is null when nothing is selected', () => {
      const { el } = renderHost(SelectedHost);
      expect(selectedText(el)).toBe('none');
    });

    it('exposes the sole selected value in single mode', () => {
      const { el, fixture, flush } = renderHost(SelectedHost);
      fixture.componentInstance.picked.set(['b']);
      flush();
      expect(selectedText(el)).toBe('b');
    });

    it('tracks single-mode click activation', () => {
      const { el, flush } = renderHost(SelectedHost);
      el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!.click();
      flush();
      expect(selectedText(el)).toBe('a');
    });

    it('is null when more than one value is selected (multi mode)', () => {
      const { el, fixture, flush } = renderHost(SelectedHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.picked.set(['a', 'b']);
      flush();
      expect(selectedText(el)).toBe('none');
    });
  });

  describe('object values', () => {
    interface City {
      id: number;
      name: string;
    }

    const PARIS: City = { id: 1, name: 'Paris' };
    const BERLIN: City = { id: 2, name: 'Berlin' };
    const TOKYO: City = { id: 3, name: 'Tokyo' };

    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <ul
          forListbox
          #lb="forListbox"
          [(value)]="picked"
          [multiple]="isMulti()"
          [isItemEqualToValue]="byId"
          [itemToFormValue]="toId"
        >
          @for (city of cities; track city.id) {
            <li>
              <button type="button" forListboxOption [value]="city" [attr.data-test-id]="city.name">
                {{ city.name }}
              </button>
            </li>
          }
        </ul>
        <output data-testid="selected">{{ lb.selected()?.name ?? 'none' }}</output>
      `,
    })
    class ObjectHost {
      readonly cities: readonly City[] = [PARIS, BERLIN, TOKYO];
      readonly picked = signal<readonly City[]>([]);
      readonly isMulti = signal(false);
      readonly byId = (a: City, b: City) => a.id === b.id;
      readonly toId = (c: City) => String(c.id);
    }

    const selectedText = (host: HTMLElement) =>
      host.querySelector('[data-testid="selected"]')!.textContent;

    it('selects an object value on click and exposes it via the selected accessor', () => {
      const { el, fixture, flush } = renderHost(ObjectHost);

      optOf(el, 'Berlin').click();
      flush();

      expect(fixture.componentInstance.picked()).toEqual([BERLIN]);
      expect(selectedText(el)).toBe('Berlin');
    });

    it('matches selection by custom equality even when the bound value is a different reference', () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      // A distinct object equal-by-id to BERLIN — `aria-selected` must resolve
      // through `isItemEqualToValue`, not reference identity.
      fixture.componentInstance.picked.set([{ id: 2, name: 'Berlin' }]);
      flush();

      expect(optOf(el, 'Berlin').getAttribute('aria-selected')).toBe('true');
      expect(optOf(el, 'Berlin').getAttribute('data-state')).toBe('checked');
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('false');
    });

    it('toggles object values in/out by id in multi mode', () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      fixture.componentInstance.isMulti.set(true);
      flush();

      optOf(el, 'Paris').click();
      optOf(el, 'Tokyo').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([PARIS, TOKYO]);

      optOf(el, 'Paris').click();
      flush();
      expect(fixture.componentInstance.picked()).toEqual([TOKYO]);
    });

    it('dedupes object values by id under Ctrl+A select-all', () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      fixture.componentInstance.isMulti.set(true);
      // Seed with an equal-by-id duplicate of PARIS that is a distinct
      // reference — select-all must not add a second Paris entry.
      fixture.componentInstance.picked.set([{ id: 1, name: 'Paris' }]);
      flush();

      optOf(el, 'Berlin').focus();
      pressKey(optOf(el, 'Berlin'), 'a', { ctrlKey: true });
      flush();

      const ids = fixture.componentInstance.picked().map((c) => c.id);
      expect(ids).toEqual([1, 2, 3]);
    });

    it('serializes object values into native form submission via itemToFormValue', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <form>
            <ul forListbox multiple name="cities" [(value)]="picked" [itemToFormValue]="toId">
              <li>
                <button type="button" forListboxOption [value]="paris" data-test-id="Paris">
                  Paris
                </button>
              </li>
              <li>
                <button type="button" forListboxOption [value]="berlin" data-test-id="Berlin">
                  Berlin
                </button>
              </li>
            </ul>
          </form>
        `,
      })
      class ObjectFormHost {
        readonly paris = PARIS;
        readonly berlin = BERLIN;
        readonly picked = signal<readonly City[]>([PARIS, BERLIN]);
        readonly toId = (c: City) => String(c.id);
      }

      const { el } = renderHost(ObjectFormHost);
      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([
        ['cities', '1'],
        ['cities', '2'],
      ]);
    });

    it('keeps object selection reactive without Zone.js', () => {
      const { el, fixture, flush } = renderHost(ObjectHost);

      fixture.componentInstance.picked.set([PARIS]);
      flush();
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('true');
      expect(selectedText(el)).toBe('Paris');

      fixture.componentInstance.picked.set([TOKYO]);
      flush();
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('false');
      expect(optOf(el, 'Tokyo').getAttribute('aria-selected')).toBe('true');
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

    it('reflects aria-label changes without Zone.js', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox [(value)]="picked" [ariaLabel]="label()">
            <li><button type="button" forListboxOption value="x" data-test-id="x">X</button></li>
          </ul>
        `,
      })
      class ZonelessLabelHost {
        readonly picked = signal<readonly string[]>([]);
        readonly label = signal<string | null>(null);
      }

      const { el, fixture, flush } = renderHost(ZonelessLabelHost);
      expect(listboxOf(el).hasAttribute('aria-label')).toBe(false);

      fixture.componentInstance.label.set('Fruit');
      flush();
      expect(listboxOf(el).getAttribute('aria-label')).toBe('Fruit');
    });

    it('exposes the single-select accessor without Zone.js', () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox #lb="forListbox" [(value)]="picked">
            <li><button type="button" forListboxOption value="x" data-test-id="x">X</button></li>
          </ul>
          <output data-testid="selected">{{ lb.selected() ?? 'none' }}</output>
        `,
      })
      class ZonelessSelectedHost {
        readonly picked = signal<readonly string[]>([]);
      }

      const { el, fixture, flush } = renderHost(ZonelessSelectedHost);
      expect(el.querySelector('[data-testid="selected"]')!.textContent).toBe('none');

      fixture.componentInstance.picked.set(['x']);
      flush();
      expect(el.querySelector('[data-testid="selected"]')!.textContent).toBe('x');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    @Component({
      imports: [ForListbox, ForListboxOption, FormField],
      template: `
        <ul forListbox multiple [formField]="prefs.priorities">
          <li>
            <button type="button" forListboxOption value="speed" data-test-id="speed">Speed</button>
          </li>
          <li>
            <button type="button" forListboxOption value="quality" data-test-id="quality">
              Quality
            </button>
          </li>
          <li>
            <button type="button" forListboxOption value="cost" data-test-id="cost">Cost</button>
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

    it('treats Angular `required` on the array value as a no-op (empty `[]` stays valid)', () => {
      const { fixture, flush } = renderHost(SignalFormsHost);
      flush();
      expect(fixture.componentInstance.prefs.priorities().valid()).toBe(true);
    });

    @Component({
      imports: [ForListbox, ForListboxOption, FormField],
      template: `
        <ul forListbox multiple [formField]="prefs.priorities">
          <li>
            <button type="button" forListboxOption value="speed" data-test-id="speed">Speed</button>
          </li>
          <li>
            <button type="button" forListboxOption value="quality" data-test-id="quality">
              Quality
            </button>
          </li>
        </ul>
      `,
    })
    class NonEmptyRequiredHost {
      readonly model = signal({ priorities: [] as string[] });
      readonly prefs = form(this.model, (s) =>
        validate(s.priorities, ({ value }) =>
          value().length === 0 ? requiredError({ message: 'Pick at least one' }) : undefined,
        ),
      );
    }

    it('invalidates an empty array-backed control with the documented non-empty `validate` rule', () => {
      const { el, fixture, flush } = renderHost(NonEmptyRequiredHost);
      flush();
      expect(fixture.componentInstance.prefs.priorities().valid()).toBe(false);

      optOf(el, 'speed').click();
      flush();
      expect(fixture.componentInstance.prefs.priorities().valid()).toBe(true);
    });
  });

  describe('virtualized option windowing (Shape C)', () => {
    @Component({
      imports: [ForListbox, ForListboxOption],
      template: `
        <div
          forListbox
          [(value)]="picked"
          [multiple]="isMulti()"
          [totalCount]="total()"
          [visibleRange]="range()"
          (scrollToIndex)="onScrollToIndex($event)"
        >
          @for (i of windowIndices(); track i) {
            <button
              type="button"
              forListboxOption
              [value]="'item-' + i"
              [posInSet]="i"
              [attr.data-test-id]="'opt-' + i"
            >
              Item {{ i }}
            </button>
          }
        </div>
      `,
    })
    class VirtualHost {
      readonly picked = signal<readonly string[]>([]);
      readonly isMulti = signal(false);
      readonly total = signal<number | undefined>(50);
      readonly range = signal<readonly [number, number]>([0, 10]);
      readonly scrolled = signal<number | null>(null);
      windowIndices() {
        const [s, e] = this.range();
        return Array.from({ length: e - s }, (_, k) => s + k);
      }
      onScrollToIndex(idx: number) {
        this.scrolled.set(idx);
        const start = Math.max(0, Math.min(idx - 4, (this.total() ?? 0) - 10));
        this.range.set([start, start + 10]);
      }
    }

    const lbOf = (el: HTMLElement) => el.querySelector<HTMLElement>('[forListbox]')!;
    const voptOf = (el: HTMLElement, idx: number) =>
      el.querySelector<HTMLButtonElement>(`[data-test-id="opt-${idx}"]`)!;

    it('focus model switch — virtualized host has tabindex=0, all options have tabindex=-1', () => {
      const { el, flush } = renderHost(VirtualHost);
      flush();
      const lb = lbOf(el);
      expect(lb.getAttribute('tabindex')).toBe('0');
      for (const i of [0, 1, 2, 3, 4]) {
        expect(voptOf(el, i).getAttribute('tabindex')).toBe('-1');
      }

      @Component({
        imports: [ForListbox, ForListboxOption],
        template: `
          <div forListbox [(value)]="picked">
            <button type="button" forListboxOption value="a" data-test-id="roving-a">A</button>
            <button type="button" forListboxOption value="b" data-test-id="roving-b">B</button>
          </div>
        `,
      })
      class RovingHost {
        readonly picked = signal<readonly string[]>([]);
      }
      TestBed.resetTestingModule();
      const r = renderHost(RovingHost);
      const rlb = r.el.querySelector<HTMLElement>('[forListbox]')!;
      expect(rlb.hasAttribute('tabindex')).toBe(false);
      expect(
        r.el
          .querySelector<HTMLButtonElement>('[data-test-id="roving-a"]')!
          .getAttribute('tabindex'),
      ).toBe('0');
    });

    it('aria-setsize / aria-posinset — set on virtualized options, absent in roving mode', () => {
      const { el } = renderHost(VirtualHost);
      expect(voptOf(el, 0).getAttribute('aria-setsize')).toBe('50');
      expect(voptOf(el, 0).getAttribute('aria-posinset')).toBe('1');
      expect(voptOf(el, 5).getAttribute('aria-posinset')).toBe('6');

      @Component({
        imports: [ForListbox, ForListboxOption],
        template: `
          <div forListbox>
            <button type="button" forListboxOption value="a" data-test-id="nr-a">A</button>
          </div>
        `,
      })
      class NonVirtualRovingHost {}
      TestBed.resetTestingModule();
      const r = renderHost(NonVirtualRovingHost);
      const opt = r.el.querySelector<HTMLButtonElement>('[data-test-id="nr-a"]')!;
      expect(opt.hasAttribute('aria-setsize')).toBe(false);
      expect(opt.hasAttribute('aria-posinset')).toBe(false);
    });

    it('focusin seeds aria-activedescendant to the first enabled option', () => {
      const { el, flush } = renderHost(VirtualHost);
      flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      const activeId = lb.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      expect(activeId).toBe(voptOf(el, 0).getAttribute('id'));
      expect(voptOf(el, 0).getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowDown moves aria-activedescendant to the next rendered option', () => {
      const { el, flush } = renderHost(VirtualHost);
      flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      flush();
      const activeId = lb.getAttribute('aria-activedescendant');
      expect(activeId).toBe(voptOf(el, 1).getAttribute('id'));
      expect(voptOf(el, 1).getAttribute('data-highlighted')).toBe('');
    });

    it('End to an off-window index emits scrollToIndex, pending resolves when option mounts', async () => {
      const result = renderHost(VirtualHost);
      result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      result.flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush(result.fixture);

      expect(result.fixture.componentInstance.scrolled()).toBe(49);

      await flush(result.fixture);
      const opt49 = result.el.querySelector<HTMLButtonElement>('[data-test-id="opt-49"]');
      expect(opt49).not.toBeNull();
      expect(lb.getAttribute('aria-activedescendant')).toBe(opt49!.getAttribute('id'));
    });

    it('PageDown jumps to the last index like End; PageUp returns to the first', async () => {
      const result = renderHost(VirtualHost);
      result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      result.flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
      await flush(result.fixture);
      expect(result.fixture.componentInstance.scrolled()).toBe(49);
      await flush(result.fixture);
      const opt49 = result.el.querySelector<HTMLButtonElement>('[data-test-id="opt-49"]');
      expect(lb.getAttribute('aria-activedescendant')).toBe(opt49!.getAttribute('id'));

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
      await flush(result.fixture);
      expect(result.fixture.componentInstance.scrolled()).toBe(0);
      await flush(result.fixture);
      expect(lb.getAttribute('aria-activedescendant')).toBe(
        voptOf(result.el, 0).getAttribute('id'),
      );
    });

    it('Enter activates the active descendant in single mode', () => {
      const { el, fixture, flush } = renderHost(VirtualHost);
      flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      flush();
      expect(fixture.componentInstance.picked()).toEqual(['item-1']);
      expect(voptOf(el, 1).getAttribute('aria-selected')).toBe('true');
    });

    it('multi-select survives window recycling — selection is value-keyed', async () => {
      const result = renderHost(VirtualHost);
      result.fixture.componentInstance.isMulti.set(true);
      result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      result.flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      result.flush();
      expect(result.fixture.componentInstance.picked()).toContain('item-2');

      result.fixture.componentInstance.range.set([20, 30]);
      await flush(result.fixture);
      expect(result.el.querySelector('[data-test-id="opt-2"]')).toBeNull();

      result.fixture.componentInstance.range.set([0, 10]);
      await flush(result.fixture);
      const opt2 = voptOf(result.el, 2);
      expect(opt2.getAttribute('data-state')).toBe('checked');
      expect(opt2.getAttribute('aria-selected')).toBe('true');
    });

    it('unmounting the active option clears aria-activedescendant', async () => {
      const result = renderHost(VirtualHost);
      result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      result.flush();
      expect(lb.getAttribute('aria-activedescendant')).toBe(
        voptOf(result.el, 1).getAttribute('id'),
      );

      result.fixture.componentInstance.range.set([20, 30]);
      await flush(result.fixture);
      expect(lb.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('non-virtualized path unchanged — no aria-activedescendant, arrow moves DOM focus', () => {
      @Component({
        imports: [ForListbox, ForListboxOption],
        template: `
          <div forListbox>
            <button type="button" forListboxOption value="x" data-test-id="nv-x">X</button>
            <button type="button" forListboxOption value="y" data-test-id="nv-y">Y</button>
          </div>
        `,
      })
      class NonVirtualHost {}
      const { el } = renderHost(NonVirtualHost);
      const lb = el.querySelector<HTMLElement>('[forListbox]')!;
      expect(lb.hasAttribute('aria-activedescendant')).toBe(false);
      const x = el.querySelector<HTMLButtonElement>('[data-test-id="nv-x"]')!;
      const y = el.querySelector<HTMLButtonElement>('[data-test-id="nv-y"]')!;
      x.focus();
      x.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(y);
    });

    describe('zoneless reactivity', () => {
      it('ArrowDown moves aria-activedescendant without Zone.js', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(VirtualHost);
        await flush(fixture);
        const lb = fixture.nativeElement.querySelector('[forListbox]') as HTMLElement;
        lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        await flush(fixture);
        lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        await flush(fixture);
        const opt1Id = (
          fixture.nativeElement.querySelector('[data-test-id="opt-1"]') as HTMLButtonElement
        ).getAttribute('id');
        expect(lb.getAttribute('aria-activedescendant')).toBe(opt1Id);
      });
    });
  });
});
