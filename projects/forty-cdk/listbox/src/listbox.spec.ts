import {
  Component,
  Directive,
  ErrorHandler,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { form, FormField, required, requiredError, validate } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import {
  assertFormControlContract,
  assertRovingTabindexContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
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

const listboxItems = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forListboxOption]'));

@Component({
  imports: [...LISTBOX_IMPORTS],
  template: `
    <ul
      forListbox
      [(value)]="picked"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
    >
      <li>
        <button type="button" forListboxOption value="apple">Apple</button>
      </li>
    </ul>
  `,
})
class ListboxFormControlHost {
  readonly picked = signal<readonly string[]>([]);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
}

describe('ForListbox', () => {
  assertRovingTabindexContract(
    {
      mount: async () => {
        const r = renderHost(ListboxHost);
        await r.flush();
        return { items: listboxItems(r.el), flush: r.flush };
      },
      mountWithDisabledFirst: async () => {
        const r = renderHost(ListboxHost);
        r.instance.options.set([
          { value: 'apple', label: 'Apple', disabled: true },
          { value: 'apricot', label: 'Apricot', disabled: false },
          { value: 'banana', label: 'Banana', disabled: false },
        ]);
        await r.flush();
        return { items: listboxItems(r.el), enabledIndices: [1, 2], flush: r.flush };
      },
      mountWithDisabledMiddle: async () => {
        const r = renderHost(ListboxHost);
        r.instance.options.set([
          { value: 'apple', label: 'Apple', disabled: false },
          { value: 'apricot', label: 'Apricot', disabled: true },
          { value: 'banana', label: 'Banana', disabled: false },
        ]);
        await r.flush();
        return { items: listboxItems(r.el), enabledIndices: [0, 2], flush: r.flush };
      },
      mountRtl: async () => {
        const r = renderHost(ListboxHost);
        r.instance.orientation.set('horizontal');
        r.instance.dir.set('rtl');
        await r.flush();
        return { items: listboxItems(r.el), flush: r.flush };
      },
      mountWithSelection: async () => {
        const r = renderHost(ListboxHost);
        r.instance.picked.set(['banana']);
        await r.flush();
        return { items: listboxItems(r.el), selectedIndices: [2], flush: r.flush };
      },
      mountWithMultiSelection: async () => {
        const r = renderHost(ListboxHost);
        r.instance.isMulti.set(true);
        r.instance.picked.set(['banana', 'cherry']);
        await r.flush();
        return { items: listboxItems(r.el), selectedIndices: [2, 4], flush: r.flush };
      },
      mountWithSelectedDisabled: async () => {
        const r = renderHost(ListboxHost);
        r.instance.options.set([
          { value: 'apple', label: 'Apple', disabled: false },
          { value: 'apricot', label: 'Apricot', disabled: false },
          { value: 'banana', label: 'Banana', disabled: true },
        ]);
        r.instance.picked.set(['banana']);
        await r.flush();
        return {
          items: listboxItems(r.el),
          enabledIndices: [0, 1],
          selectedIndices: [2],
          flush: r.flush,
        };
      },
    },
    { forwardArrow: 'ArrowDown' },
  );

  assertFormControlContract(
    () => {
      const r = renderHost(ListboxFormControlHost);
      const result: FormControlMountResult = {
        control: listboxOf(r.el),
        flush: r.flush,
        setFlag: (flag, value) => {
          switch (flag) {
            case 'readonly':
              r.instance.isReadonly.set(value);
              return;
            case 'required':
              r.instance.isRequired.set(value);
              return;
            case 'invalid':
              r.instance.isInvalid.set(value);
              return;
            case 'pending':
              r.instance.isPending.set(value);
              return;
            case 'touched':
              r.instance.isTouched.set(value);
              return;
            case 'dirty':
              r.instance.isDirty.set(value);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['readonly', 'required', 'invalid', 'pending', 'touched', 'dirty'] },
  );

  describe('focus (focus-on-error)', () => {
    it('targets the first enabled option, not the listbox host', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      await flush();
      const listbox = fixture.debugElement.query(By.directive(ForListbox)).injector.get(ForListbox);
      listbox.focus();
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('targets the selected option when one is selected', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.picked.set(['banana']);
      await flush();
      const listbox = fixture.debugElement.query(By.directive(ForListbox)).injector.get(ForListbox);
      listbox.focus();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });
  });

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

    it('exposes aria-multiselectable=true when multiple is set', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      await flush();
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

    it('emits aria-label when the input is set', async () => {
      const { el, fixture, flush } = renderHost(LabelHost);
      fixture.componentInstance.label.set('Fruit');
      await flush();
      expect(listboxOf(el).getAttribute('aria-label')).toBe('Fruit');
    });

    it('emits no aria-label attribute when the input is null (default)', () => {
      const { el } = renderHost(LabelHost);
      expect(listboxOf(el).hasAttribute('aria-label')).toBe(false);
    });

    it('emits no aria-label attribute for an empty string', async () => {
      const { el, fixture, flush } = renderHost(LabelHost);
      fixture.componentInstance.label.set('');
      await flush();
      expect(listboxOf(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('initial tabindex', () => {
    it('multi-select tab entry is the first selected enabled option in DOM order', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'banana', label: 'Banana', disabled: true },
        { value: 'cherry', label: 'Cherry', disabled: false },
      ]);
      fixture.componentInstance.picked.set(['banana', 'cherry']);
      await flush();

      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'cherry').getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
    });

    it('roving takes over after an option is focused (multi + preselection)', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.picked.set(['banana', 'cherry']);
      await flush();

      optOf(el, 'apple').focus();
      await flush();

      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('0');
      const zeros = ['apple', 'apricot', 'banana', 'blueberry', 'cherry'].filter(
        (v) => optOf(el, v).getAttribute('tabindex') === '0',
      );
      expect(zeros).toEqual(['apple']);
    });

    it('removing the focused option re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      await flush();
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
      await flush();
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

  describe('seeded selection on first render', () => {
    @Component({
      imports: [...LISTBOX_IMPORTS],
      template: `
        <ul forListbox [(value)]="picked">
          @for (opt of options(); track opt) {
            <li>
              <button type="button" forListboxOption [value]="opt" [attr.data-test-id]="opt">
                {{ opt }}
              </button>
            </li>
          }
        </ul>
      `,
    })
    class SeededHost {
      readonly picked = signal<readonly string[]>(['banana']);
      readonly options = signal(['apple', 'banana', 'cherry']);
    }

    it('mounts a non-empty selection without throwing, and seeds the roving tab stop', async () => {
      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }

      TestBed.configureTestingModule({
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });

      const fixture = TestBed.createComponent(SeededHost);
      let thrown: unknown = null;
      try {
        fixture.detectChanges();
        await flush(fixture);
      } catch (e) {
        thrown = e;
      }

      const errors = thrown === null ? captured : [...captured, thrown];
      expect(errors).toEqual([]);

      const el = fixture.nativeElement as HTMLElement;
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'cherry').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('host fallback tabindex', () => {
    it('host carries no tabindex while an option qualifies as the roving entry', () => {
      const { el } = renderHost(ListboxHost);
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
    });

    it('host becomes tabindex=0 when every option is disabled', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      await flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');
      expect(optOf(el, 'apple').getAttribute('tabindex')).toBe('-1');
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('-1');
    });

    it('host becomes tabindex=0 when there are no options', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([]);
      await flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');
    });

    it('a disabled listbox is never tabbable, even with all options disabled', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.rootDisabled.set(true);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: true },
      ]);
      await flush();
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
    });

    it('host drops its fallback tabindex once an enabled option appears', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([{ value: 'apple', label: 'Apple', disabled: true }]);
      await flush();
      expect(listboxOf(el).getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();
      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
      expect(optOf(el, 'banana').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('single-mode click semantics', () => {
    it('selects on click and replaces previous selection', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple']);

      optOf(el, 'cherry').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['cherry']);
    });

    it('clicking the selected option does NOT deselect (idempotent)', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').click();
      await flush();
      optOf(el, 'apple').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple']);
    });
  });

  describe('multi-mode click semantics', () => {
    it('toggles each option independently', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      await flush();

      optOf(el, 'apple').click();
      optOf(el, 'cherry').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['apple', 'cherry']);

      optOf(el, 'apple').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['cherry']);
    });
  });

  describe('arrow navigation (no selection-on-focus by default)', () => {
    it('moves focus only — value stays put', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();

      pressKey(optOf(el, 'apple'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('wraps at the ends', () => {
      const { el } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'cherry'));
    });

    it('stops at the ends when loop=false', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.loop.set(false);
      await flush();

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

    it('skips disabled options', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });
  });

  describe('selectionFollowsFocus (single mode opt-in)', () => {
    it('arrow nav also selects when enabled', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.follow.set(true);
      await flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['apricot']);
    });

    it('does NOT auto-select in multi mode even when flag is set', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.follow.set(true);
      await flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('typeahead', () => {
    it('focuses the first option matching the typed prefix', async () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'b');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
    });

    it('extends the prefix on consecutive keystrokes', async () => {
      const { el, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'b');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'banana'));
      pressKey(optOf(el, 'banana'), 'l');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'blueberry'));
    });

    it('skips disabled matches on a multi-character prefix', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'banana', label: 'Banana', disabled: false },
        { value: 'avocet', label: 'Avocet', disabled: true },
        { value: 'avocado', label: 'Avocado', disabled: false },
      ]);
      await flush();

      // 'av' matches avocet first but it is disabled, so focus lands on avocado.
      optOf(el, 'banana').focus();
      pressKey(optOf(el, 'banana'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));
      pressKey(optOf(el, 'avocado'), 'v');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));
    });

    it('excludes an aria-hidden indicator glyph from the matched text', async () => {
      @Component({
        imports: [...LISTBOX_IMPORTS, ForListboxOptionIndicator],
        template: `
          <ul forListbox [(value)]="picked">
            <li>
              <button type="button" forListboxOption value="apple" data-test-id="apple">
                <span forListboxOptionIndicator>✓</span>Apple
              </button>
            </li>
            <li>
              <button type="button" forListboxOption value="banana" data-test-id="banana">
                <span forListboxOptionIndicator>✓</span>Banana
              </button>
            </li>
          </ul>
        `,
      })
      class IndicatorTypeaheadHost {
        readonly picked = signal<readonly string[]>([]);
      }

      const { el, flush } = renderHost(IndicatorTypeaheadHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('ignores Space (reserved for activation)', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), ' ');
      await flush();
      // Space is not a typeahead character; focus stays on apple.
      expect(document.activeElement).toBe(optOf(el, 'apple'));
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('cycles through same-initial options on repeated key with wrap', async () => {
      const { el, flush } = renderHost(ListboxHost);

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));

      pressKey(optOf(el, 'apricot'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apple'));

      pressKey(optOf(el, 'apple'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('skips disabled options while cycling on repeated key', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: false },
        { value: 'apricot', label: 'Apricot', disabled: true },
        { value: 'avocado', label: 'Avocado', disabled: false },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();

      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'avocado'));

      pressKey(optOf(el, 'avocado'), 'a');
      await flush();
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });
  });

  describe('multi-select APG keyboard model', () => {
    const setupMulti = async (initial: string[] = []) => {
      const result = renderHost(ListboxHost);
      result.fixture.componentInstance.isMulti.set(true);
      result.fixture.componentInstance.picked.set(initial);
      await result.flush();
      return result;
    };

    describe('Shift+ArrowDown / Shift+ArrowUp', () => {
      it('moves focus to the next option AND toggles it on', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });

      it('toggles already-selected options off on Shift+Arrow', async () => {
        const { el, fixture, flush } = await setupMulti(['apricot']);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowUp toggles the previous option', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), 'ArrowUp', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual(['apple']);
      });

      it('skips disabled options', async () => {
        const { el, fixture, flush } = await setupMulti();
        fixture.componentInstance.options.set([
          { value: 'apple', label: 'Apple', disabled: false },
          { value: 'apricot', label: 'Apricot', disabled: true },
          { value: 'banana', label: 'Banana', disabled: false },
        ]);
        await flush();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'banana'));
        expect(fixture.componentInstance.picked()).toEqual(['banana']);
      });

      it('does NOT toggle in single mode (just moves focus)', async () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apricot'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('does not change the anchor (so a later Shift+Space spans from the click)', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').click();
        await flush();
        // Shift+Arrow should NOT move the anchor.
        pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
        pressKey(optOf(el, 'apricot'), 'ArrowDown', { shiftKey: true });
        await flush();
        // Now focus is on banana. Shift+Space should select [apple..banana].
        pressKey(optOf(el, 'banana'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['apple', 'apricot', 'banana']);
      });

      it('respects readonly (no toggle, focus still moves)', async () => {
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
        await r.flush();
        expect(document.activeElement).toBe(optOf(r.el, 'b'));
        expect(r.fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowDown on the last option is a no-op (no wrap, no opposite-end toggle)', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'cherry').focus();
        pressKey(optOf(el, 'cherry'), 'ArrowDown', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'cherry'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('Shift+ArrowUp on the first option is a no-op (no wrap, no opposite-end toggle)', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'ArrowUp', { shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Shift+Space (range from anchor)', () => {
      it('selects contiguous from anchor to focused option (forward)', async () => {
        const { el, fixture, flush } = await setupMulti();
        // Click sets the anchor.
        optOf(el, 'apple').click();
        await flush();
        // Move focus a few steps without modifying anchor.
        optOf(el, 'cherry').focus();
        pressKey(optOf(el, 'cherry'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
      });

      it('selects contiguous from anchor to focused option (backward)', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'cherry').click();
        await flush();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'cherry',
          'apple',
          'apricot',
          'banana',
          'blueberry',
        ]);
      });

      it('preserves selection outside the range', async () => {
        const { el, fixture, flush } = await setupMulti(['cherry']);
        optOf(el, 'apple').click(); // Anchor = apple, picks now = [cherry, apple].
        await flush();
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['cherry', 'apple', 'apricot']);
      });

      it('skips disabled options in the range', async () => {
        const { el, fixture, flush } = await setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: false },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C', disabled: false },
        ]);
        await flush();
        optOf(el, 'a').click();
        await flush();
        optOf(el, 'c').focus();
        pressKey(optOf(el, 'c'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('falls back to selecting the focused option when no anchor exists', async () => {
        const { el, fixture, flush } = await setupMulti();
        // No prior click → anchor is null. Shift+Space at apricot picks just apricot.
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['apricot']);
      });
    });

    describe('Ctrl/Cmd+A', () => {
      it('selects every enabled option', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
      });

      it('also accepts uppercase A', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'A', { ctrlKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('also accepts metaKey (mac Cmd+A)', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { metaKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toHaveLength(5);
      });

      it('clears the selection when every enabled option is already selected (toggle)', async () => {
        const { el, fixture, flush } = await setupMulti([
          'apple',
          'apricot',
          'banana',
          'blueberry',
          'cherry',
        ]);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });

      it('skips disabled options', async () => {
        const { el, fixture, flush } = await setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: false },
          { value: 'b', label: 'B', disabled: true },
          { value: 'c', label: 'C', disabled: false },
        ]);
        await flush();
        optOf(el, 'a').focus();
        pressKey(optOf(el, 'a'), 'a', { ctrlKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['a', 'c']);
      });

      it('no-op in single mode', async () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'apple').focus();
        pressKey(optOf(el, 'apple'), 'a', { ctrlKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('Ctrl+Shift+Home / Ctrl+Shift+End', () => {
      it('Ctrl+Shift+End selects from current to the last enabled option and focuses it', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'cherry'));
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'blueberry', 'cherry']);
      });

      it('Ctrl+Shift+Home selects from current to the first enabled option and focuses it', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'Home', { ctrlKey: true, shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'apple'));
        expect(fixture.componentInstance.picked()).toEqual(['apple', 'apricot', 'banana']);
      });

      it('preserves selection outside the range', async () => {
        const { el, fixture, flush } = await setupMulti(['cherry']);
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), 'Home', { ctrlKey: true, shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['cherry', 'apple', 'apricot']);
      });

      it('skips disabled options when picking the focus edge', async () => {
        const { el, fixture, flush } = await setupMulti();
        fixture.componentInstance.options.set([
          { value: 'a', label: 'A', disabled: true },
          { value: 'b', label: 'B', disabled: false },
          { value: 'c', label: 'C', disabled: false },
        ]);
        await flush();
        optOf(el, 'c').focus();
        pressKey(optOf(el, 'c'), 'Home', { ctrlKey: true, shiftKey: true });
        await flush();
        expect(document.activeElement).toBe(optOf(el, 'b'));
        expect(fixture.componentInstance.picked()).toEqual(['b', 'c']);
      });

      it('no-op in single mode', async () => {
        const { el, fixture, flush } = renderHost(ListboxHost);
        optOf(el, 'banana').focus();
        pressKey(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([]);
      });
    });

    describe('range navigation scrolls the focused option into view (#1284)', () => {
      function withScrollStub(run: (stub: ReturnType<typeof vi.fn>) => Promise<void>) {
        const had = 'scrollIntoView' in Element.prototype;
        const stub = vi.fn();
        Element.prototype.scrollIntoView = stub;
        return run(stub).finally(() => {
          if (!had) {
            delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
          }
        });
      }

      it('Shift+ArrowDown reveals the extended option', () =>
        withScrollStub(async (stub) => {
          const { el, flush } = await setupMulti();
          optOf(el, 'apple').focus();
          pressKey(optOf(el, 'apple'), 'ArrowDown', { shiftKey: true });
          await flush();
          expect(document.activeElement).toBe(optOf(el, 'apricot'));
          expect(stub.mock.contexts).toContain(optOf(el, 'apricot'));
        }));

      it('Ctrl+Shift+End reveals the range edge option', () =>
        withScrollStub(async (stub) => {
          const { el, flush } = await setupMulti();
          optOf(el, 'banana').focus();
          pressKey(optOf(el, 'banana'), 'End', { ctrlKey: true, shiftKey: true });
          await flush();
          expect(document.activeElement).toBe(optOf(el, 'cherry'));
          expect(stub.mock.contexts).toContain(optOf(el, 'cherry'));
        }));
    });

    describe('anchor lifecycle', () => {
      it('is set on click activation', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'banana').click();
        await flush();
        // Now Shift+Space at apricot should span apricot..banana.
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'apricot']);
      });

      it('moves to the most recent click', async () => {
        const { el, fixture, flush } = await setupMulti();
        optOf(el, 'apple').click(); // anchor = apple
        optOf(el, 'cherry').click(); // anchor moves to cherry
        await flush();
        // Shift+Space at apricot should span apricot..cherry.
        optOf(el, 'apricot').focus();
        pressKey(optOf(el, 'apricot'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual([
          'apple',
          'cherry',
          'apricot',
          'banana',
          'blueberry',
        ]);
      });

      it('survives a reorder/insert of preceding options (#590 F4 — identity anchor)', async () => {
        const { el, fixture, flush } = await setupMulti();
        // Click banana → anchor = banana (DOM index 2 at this point).
        optOf(el, 'banana').click();
        await flush();

        // Insert a new option before everything: banana's DOM index shifts to 3.
        fixture.componentInstance.options.update((opts) => [
          { value: 'almond', label: 'Almond', disabled: false },
          ...opts,
        ]);
        await flush();

        // Shift+Space at cherry must still span banana..cherry by identity
        // (banana, blueberry, cherry are contiguous). The stale-index span
        // would instead start at index 2 (now blueberry) and miss banana.
        optOf(el, 'cherry').focus();
        pressKey(optOf(el, 'cherry'), ' ', { shiftKey: true });
        await flush();
        expect(fixture.componentInstance.picked()).toEqual(['banana', 'blueberry', 'cherry']);
      });
    });
  });

  describe('horizontal & RTL', () => {
    it('reflects dir to the native dir attribute for both ltr and rtl', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      const lb = el.querySelector('[forListbox]')!;

      expect(lb.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      await flush();
      expect(lb.getAttribute('dir')).toBe('rtl');
    });

    it('uses ArrowLeft / ArrowRight in horizontal', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowRight');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('RTL swaps ArrowLeft / ArrowRight in horizontal', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      fixture.componentInstance.dir.set('rtl');
      await flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowLeft');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));
    });

    it('vertical: ArrowDown / ArrowUp stay axis-positive under dir="rtl" (dir does not flip vertical)', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      optOf(el, 'apple').focus();
      pressKey(optOf(el, 'apple'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'apricot'));

      pressKey(optOf(el, 'apricot'), 'ArrowUp');
      expect(document.activeElement).toBe(optOf(el, 'apple'));
    });

    it('ignores cross-axis arrows in horizontal mode (ArrowDown/ArrowUp no-op)', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.orientation.set('horizontal');
      await flush();
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
    it('exposes aria-readonly and blocks click selection while keeping options focusable', async () => {
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
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([]);

      // Arrow nav still works — readonly only blocks selection, not focus.
      optOf(el, 'a').focus();
      pressKey(optOf(el, 'a'), 'ArrowDown');
      expect(document.activeElement).toBe(optOf(el, 'b'));
    });

    it('does not auto-select on focus nav when readonly even with selectionFollowsFocus', async () => {
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
      await flush();

      expect(fixture.componentInstance.picked()).toEqual([]);
    });
  });

  describe('disabled', () => {
    it('disabled option ignores click', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.options.set([
        { value: 'apple', label: 'Apple', disabled: true },
        { value: 'banana', label: 'Banana', disabled: false },
      ]);
      await flush();

      optOf(el, 'apple').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
    });

    it('root disabled cascades and blocks selection', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();
      expect(listboxOf(el).getAttribute('aria-disabled')).toBe('true');
      expect(listboxOf(el).getAttribute('data-disabled')).toBe('');
      expect(listboxOf(el).hasAttribute('disabled')).toBe(false);

      optOf(el, 'apple').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([]);
      expect(optOf(el, 'apple').hasAttribute('disabled')).toBe(false);
      expect(optOf(el, 'apple').getAttribute('aria-disabled')).toBe('true');
    });

    it('clears both root disabled channels when disabled flips back to false', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();
      expect(listboxOf(el).getAttribute('aria-disabled')).toBe('true');
      expect(listboxOf(el).getAttribute('data-disabled')).toBe('');

      fixture.componentInstance.rootDisabled.set(false);
      await flush();
      expect(listboxOf(el).hasAttribute('aria-disabled')).toBe(false);
      expect(listboxOf(el).hasAttribute('data-disabled')).toBe(false);
      expect(listboxOf(el).hasAttribute('disabled')).toBe(false);
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
    it('emits the new selection when an option is clicked', async () => {
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
      await flush();
      optOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.emitted).toEqual([['a'], ['a', 'b']]);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', async () => {
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
      await flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });

    it('does not re-emit valueChange when the already-selected single option is clicked again', async () => {
      @Component({
        imports: [...LISTBOX_IMPORTS],
        template: `
          <ul forListbox [(value)]="picked" (valueChange)="emitted.push($event)">
            <li><button type="button" forListboxOption value="a" data-test-id="a">A</button></li>
            <li><button type="button" forListboxOption value="b" data-test-id="b">B</button></li>
          </ul>
        `,
      })
      class Host {
        readonly picked = signal<readonly string[]>([]);
        readonly emitted: (readonly string[])[] = [];
      }

      const { fixture, el, flush } = renderHost(Host);
      optOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.emitted).toEqual([['a']]);

      optOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.emitted).toEqual([['a']]);
      expect(fixture.componentInstance.picked()).toEqual(['a']);

      optOf(el, 'b').click();
      await flush();
      expect(fixture.componentInstance.emitted).toEqual([['a'], ['b']]);
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

    it('keeps options registered with the listbox across groups, in DOM order', async () => {
      const { el, fixture, flush } = renderHost(GroupHost);
      const a = el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!;
      const c = el.querySelector<HTMLButtonElement>('[data-test-id="c"]')!;

      a.focus();
      pressKey(a, 'End');
      await flush();

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

    it('marks the indicator aria-hidden so screen readers ignore the decoration', () => {
      const { el } = renderHost(IndicatorHost);
      const inds = el.querySelectorAll<HTMLElement>('[data-ind]');
      expect(Array.from(inds).every((n) => n.getAttribute('aria-hidden') === 'true')).toBe(true);
    });

    it('reflects per-option selection (independent of siblings) in multi mode', async () => {
      const { el, fixture, flush } = renderHost(IndicatorHost);
      fixture.componentInstance.picked.set(['a']);
      await flush();

      const a = el.querySelector<HTMLElement>('[data-ind="a"]')!;
      const b = el.querySelector<HTMLElement>('[data-ind="b"]')!;
      expect(a.hasAttribute('hidden')).toBe(false);
      expect(a.getAttribute('data-state')).toBe('checked');
      expect(b.hasAttribute('hidden')).toBe(true);
    });

    it('enforces inline display:none while unselected so a consumer display class cannot leak through', async () => {
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
      await flush();
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

    it('reflects each form-state flag as a boolean data-* attribute on the listbox', async () => {
      const { el, fixture, flush } = renderHost(FlagsHost);
      const lb = el.querySelector<HTMLElement>('[forListbox]')!;

      fixture.componentInstance.touched.set(true);
      fixture.componentInstance.dirty.set(true);
      fixture.componentInstance.pending.set(true);
      fixture.componentInstance.invalid.set(true);
      await flush();

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

    it('submits one entry per selected value with the same name (multi mode)', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('tags');
      fixture.componentInstance.picked.set(['a', 'c']);
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([
        ['tags', 'a'],
        ['tags', 'c'],
      ]);
    });

    it('omits the value when nothing is selected', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('tags');
      await flush();

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

    it('exposes the sole selected value in single mode', async () => {
      const { el, fixture, flush } = renderHost(SelectedHost);
      fixture.componentInstance.picked.set(['b']);
      await flush();
      expect(selectedText(el)).toBe('b');
    });

    it('tracks single-mode click activation', async () => {
      const { el, flush } = renderHost(SelectedHost);
      el.querySelector<HTMLButtonElement>('[data-test-id="a"]')!.click();
      await flush();
      expect(selectedText(el)).toBe('a');
    });

    it('is null when more than one value is selected (multi mode)', async () => {
      const { el, fixture, flush } = renderHost(SelectedHost);
      fixture.componentInstance.isMulti.set(true);
      fixture.componentInstance.picked.set(['a', 'b']);
      await flush();
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
          [compareWith]="byId"
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

    it('selects an object value on click and exposes it via the selected accessor', async () => {
      const { el, fixture, flush } = renderHost(ObjectHost);

      optOf(el, 'Berlin').click();
      await flush();

      expect(fixture.componentInstance.picked()).toEqual([BERLIN]);
      expect(selectedText(el)).toBe('Berlin');
    });

    it('matches selection by custom equality even when the bound value is a different reference', async () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      // A distinct object equal-by-id to BERLIN — `aria-selected` must resolve
      // through `compareWith`, not reference identity.
      fixture.componentInstance.picked.set([{ id: 2, name: 'Berlin' }]);
      await flush();

      expect(optOf(el, 'Berlin').getAttribute('aria-selected')).toBe('true');
      expect(optOf(el, 'Berlin').getAttribute('data-state')).toBe('checked');
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('false');
    });

    it('toggles object values in/out by id in multi mode', async () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      fixture.componentInstance.isMulti.set(true);
      await flush();

      optOf(el, 'Paris').click();
      optOf(el, 'Tokyo').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([PARIS, TOKYO]);

      optOf(el, 'Paris').click();
      await flush();
      expect(fixture.componentInstance.picked()).toEqual([TOKYO]);
    });

    it('dedupes object values by id under Ctrl+A select-all', async () => {
      const { el, fixture, flush } = renderHost(ObjectHost);
      fixture.componentInstance.isMulti.set(true);
      // Seed with an equal-by-id duplicate of PARIS that is a distinct
      // reference — select-all must not add a second Paris entry.
      fixture.componentInstance.picked.set([{ id: 1, name: 'Paris' }]);
      await flush();

      optOf(el, 'Berlin').focus();
      pressKey(optOf(el, 'Berlin'), 'a', { ctrlKey: true });
      await flush();

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

    it('keeps object selection reactive without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(ObjectHost);

      fixture.componentInstance.picked.set([PARIS]);
      await flush();
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('true');
      expect(selectedText(el)).toBe('Paris');

      fixture.componentInstance.picked.set([TOKYO]);
      await flush();
      expect(optOf(el, 'Paris').getAttribute('aria-selected')).toBe('false');
      expect(optOf(el, 'Tokyo').getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(ListboxHost);
      fixture.componentInstance.picked.set(['cherry']);
      await flush();
      expect(optOf(el, 'cherry').getAttribute('aria-selected')).toBe('true');

      fixture.componentInstance.picked.set([]);
      await flush();
      expect(optOf(el, 'cherry').getAttribute('aria-selected')).toBe('false');
    });

    it('reflects aria-label changes without Zone.js', async () => {
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
      await flush();
      expect(listboxOf(el).getAttribute('aria-label')).toBe('Fruit');
    });

    it('exposes the single-select accessor without Zone.js', async () => {
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
      await flush();
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

    it('two-way binds the array with the field value', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const speed = optOf(el, 'speed');
      const quality = optOf(el, 'quality');

      speed.click();
      quality.click();
      await flush();
      expect(fixture.componentInstance.model().priorities).toEqual(['speed', 'quality']);

      fixture.componentInstance.model.set({ priorities: ['cost'] });
      await flush();
      expect(optOf(el, 'cost').getAttribute('aria-selected')).toBe('true');
      expect(speed.getAttribute('aria-selected')).toBe('false');
    });

    it('flows schema `required` into aria-required on the listbox', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(listboxOf(el).getAttribute('aria-required')).toBe('true');
    });

    it('treats Angular `required` on the array value as a no-op (empty `[]` stays valid)', async () => {
      const { fixture, flush } = renderHost(SignalFormsHost);
      await flush();
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

    it('invalidates an empty array-backed control with the documented non-empty `validate` rule', async () => {
      const { el, fixture, flush } = renderHost(NonEmptyRequiredHost);
      await flush();
      expect(fixture.componentInstance.prefs.priorities().valid()).toBe(false);

      optOf(el, 'speed').click();
      await flush();
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

    it('focus model switch — virtualized host has tabindex=0, all options have tabindex=-1', async () => {
      const { el, flush } = renderHost(VirtualHost);
      await flush();
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

    it('focusin seeds aria-activedescendant to the first enabled option', async () => {
      const { el, flush } = renderHost(VirtualHost);
      await flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      const activeId = lb.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      expect(activeId).toBe(voptOf(el, 0).getAttribute('id'));
      expect(voptOf(el, 0).getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowDown moves aria-activedescendant to the next rendered option', async () => {
      const { el, flush } = renderHost(VirtualHost);
      await flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush();
      const activeId = lb.getAttribute('aria-activedescendant');
      expect(activeId).toBe(voptOf(el, 1).getAttribute('id'));
      expect(voptOf(el, 1).getAttribute('data-highlighted')).toBe('');
    });

    it('End to an off-window index emits scrollToIndex, pending resolves when option mounts', async () => {
      const result = renderHost(VirtualHost);
      await result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await result.flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush(result.fixture);

      expect(result.fixture.componentInstance.scrolled()).toBe(49);

      await flush(result.fixture);
      const opt49 = result.el.querySelector<HTMLButtonElement>('[data-test-id="opt-49"]');
      expect(lb.getAttribute('aria-activedescendant')).toBe(opt49!.getAttribute('id'));
    });

    it('PageDown jumps to the last index like End; PageUp returns to the first', async () => {
      const result = renderHost(VirtualHost);
      await result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await result.flush();

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

    it('Enter activates the active descendant in single mode', async () => {
      const { el, fixture, flush } = renderHost(VirtualHost);
      await flush();
      const lb = lbOf(el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush();
      expect(fixture.componentInstance.picked()).toEqual(['item-1']);
      expect(voptOf(el, 1).getAttribute('aria-selected')).toBe('true');
    });

    it('multi-select survives window recycling — selection is value-keyed', async () => {
      const result = renderHost(VirtualHost);
      result.fixture.componentInstance.isMulti.set(true);
      await result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await result.flush();

      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await result.flush();
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
      await result.flush();
      const lb = lbOf(result.el);
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await result.flush();
      lb.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await result.flush();
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

  describe('selectionFollowsFocus + virtualization guard', () => {
    @Component({
      imports: [ForListbox, ForListboxOption],
      template: `
        <div
          forListbox
          [(value)]="picked"
          [totalCount]="total()"
          [selectionFollowsFocus]="followsFocus()"
        >
          <button type="button" forListboxOption value="a" [posInSet]="0" data-test-id="opt-a">
            A
          </button>
        </div>
      `,
    })
    class GuardHost {
      readonly picked = signal<readonly string[]>([]);
      readonly total = signal<number | undefined>(undefined);
      readonly followsFocus = signal(false);
    }

    it('throws in dev mode when selectionFollowsFocus is combined with totalCount', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(GuardHost);
      fixture.componentInstance.total.set(50);
      fixture.componentInstance.followsFocus.set(true);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/listbox\] `selectionFollowsFocus` is not supported together with virtualization/,
      );
    });

    it('does not throw when selectionFollowsFocus is set without virtualization', async () => {
      const r = renderHost(GuardHost);
      r.instance.followsFocus.set(true);
      await flush(r.fixture);
      const lb = r.el.querySelector<HTMLElement>('[forListbox]')!;
      const optA = r.el.querySelector<HTMLElement>('[data-test-id="opt-a"]')!;
      expect(lb.hasAttribute('aria-activedescendant')).toBe(false);
      expect(optA.getAttribute('tabindex')).toBe('0');
    });

    it('does not throw when virtualized without selectionFollowsFocus', async () => {
      const r = renderHost(GuardHost);
      r.instance.total.set(50);
      await flush(r.fixture);
      const lb = r.el.querySelector<HTMLElement>('[forListbox]')!;
      expect(lb.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('multi-select keyboard + virtualization guard', () => {
    @Component({
      imports: [ForListbox, ForListboxOption],
      template: `
        <div
          forListbox
          data-test-lb
          [(value)]="picked"
          [multiple]="true"
          [totalCount]="total()"
          [visibleRange]="range"
          aria-label="MultiVirtual"
        >
          @for (i of indices; track i) {
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
    class MultiVirtualHost {
      readonly picked = signal<readonly string[]>([]);
      readonly total = signal<number | undefined>(3);
      readonly range: readonly [number, number] = [0, 3];
      readonly indices = [0, 1, 2];
    }

    async function setupMulti(captured: unknown[]) {
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });
      const fixture = TestBed.createComponent(MultiVirtualHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const lb = el.querySelector<HTMLElement>('[data-test-lb]')!;
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      return { fixture, el, lb };
    }

    const throwsUnsupported = (captured: readonly unknown[]) =>
      captured.some(
        (e) =>
          e instanceof Error &&
          /\[forty-cdk\/listbox\] Multi-select range keyboard/.test(e.message),
      );

    it('throws in dev mode on Shift+ArrowDown in a virtualized multi-select listbox', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, 'ArrowDown', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Shift+ArrowUp', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, 'ArrowUp', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Shift+Space', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, ' ', { shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Ctrl+A', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, 'a', { ctrlKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Meta+A (Cmd)', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, 'A', { metaKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('throws in dev mode on Ctrl+Shift+End', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      pressKey(lb, 'End', { ctrlKey: true, shiftKey: true });
      expect(throwsUnsupported(captured)).toBe(true);
    });

    it('preventDefault is called on the intercepted multi-select shortcut', async () => {
      const captured: unknown[] = [];
      const { lb } = await setupMulti(captured);
      const event = pressKey(lb, 'a', { ctrlKey: true });
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not intercept a plain ArrowDown (navigation still works)', async () => {
      const captured: unknown[] = [];
      const { el, fixture, lb } = await setupMulti(captured);
      const first = el.querySelector<HTMLElement>('[data-test-id="opt-0"]')!;
      expect(lb.getAttribute('aria-activedescendant')).toBe(first.id);
      pressKey(lb, 'ArrowDown');
      await flush(fixture);
      const second = el.querySelector<HTMLElement>('[data-test-id="opt-1"]')!;
      expect(lb.getAttribute('aria-activedescendant')).toBe(second.id);
      expect(throwsUnsupported(captured)).toBe(false);
    });

    it('does not intercept shortcuts in a single-select virtualized listbox', async () => {
      const captured: unknown[] = [];
      class CapturingHandler implements ErrorHandler {
        handleError(err: unknown): void {
          captured.push(err);
        }
      }
      TestBed.configureTestingModule({
        rethrowApplicationErrors: false,
        providers: [
          provideZonelessChangeDetection(),
          { provide: ErrorHandler, useClass: CapturingHandler },
        ],
      });

      @Component({
        imports: [ForListbox, ForListboxOption],
        template: `
          <div forListbox data-test-lb [totalCount]="3" [visibleRange]="range" aria-label="Single">
            @for (i of indices; track i) {
              <button type="button" forListboxOption [value]="'item-' + i" [posInSet]="i">
                Item {{ i }}
              </button>
            }
          </div>
        `,
      })
      class SingleVirtualHost {
        readonly range: readonly [number, number] = [0, 3];
        readonly indices = [0, 1, 2];
      }
      const fixture = TestBed.createComponent(SingleVirtualHost);
      fixture.detectChanges();
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const lb = el.querySelector<HTMLElement>('[data-test-lb]')!;
      lb.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(fixture);
      pressKey(lb, 'ArrowDown', { shiftKey: true });
      pressKey(lb, 'a', { ctrlKey: true });
      expect(throwsUnsupported(captured)).toBe(false);
    });

    it('does not throw when the multi listbox is not virtualized (roving path keeps range keys)', async () => {
      const r = renderHost(MultiVirtualHost);
      r.instance.total.set(undefined);
      await flush(r.fixture);
      const first = r.el.querySelector<HTMLElement>('[data-test-id="opt-0"]')!;
      first.focus();
      await flush(r.fixture);
      expect(() => pressKey(first, 'ArrowDown', { shiftKey: true })).not.toThrow();
      await flush(r.fixture);
      expect(r.instance.picked()).toContain('item-1');
    });
  });
});
