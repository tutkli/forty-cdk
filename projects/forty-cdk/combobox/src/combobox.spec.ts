import { NgTemplateOutlet } from '@angular/common';
import {
  Component,
  computed,
  Directive,
  provideZonelessChangeDetection,
  signal,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { type VetoableEvent, type VetoableNativeEvent } from 'forty-cdk/core';
import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  pressKey,
  renderHost,
} from '../../src/test-utils';
import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { ForField, ForFieldDescription, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForCombobox } from './combobox';
import { ForComboboxAnchor } from './combobox-anchor';
import { ForComboboxChip } from './combobox-chip';
import { ForComboboxChipRemove } from './combobox-chip-remove';
import { ForComboboxChips } from './combobox-chips';
import { ForComboboxClear } from './combobox-clear';
import { ForComboboxContent } from './combobox-content';
import { provideForComboboxDefaults } from './combobox-defaults';
import { ForComboboxEmpty } from './combobox-empty';
import { ForComboboxGroup } from './combobox-group';
import { ForComboboxGroupLabel } from './combobox-group-label';
import { ForComboboxIndicator } from './combobox-indicator';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxList } from './combobox-list';
import { FOR_COMBOBOX_OPTION, ForComboboxOption } from './combobox-option';
import { ForComboboxTrigger } from './combobox-trigger';
import { ForComboboxSeparator } from './combobox-separator';
import { ForComboboxStatus } from './combobox-status';

const BASE_IMPORTS = [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption];
const MULTI_IMPORTS = [
  ForCombobox,
  ForComboboxInput,
  ForComboboxContent,
  ForComboboxOption,
  ForComboboxChips,
  ForComboboxChip,
  ForComboboxChipRemove,
];

interface FruitItem {
  readonly id: string;
  readonly label: string;
  readonly disabled?: boolean;
}

const FRUITS: readonly FruitItem[] = [
  { id: 'apple', label: 'Apple' },
  { id: 'apricot', label: 'Apricot' },
  { id: 'banana', label: 'Banana' },
  { id: 'cherry', label: 'Cherry', disabled: true },
  { id: 'date', label: 'Date' },
];

@Component({
  imports: BASE_IMPORTS,
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [autocompleteMode]="autocompleteMode()"
      [autoHighlight]="autoHighlight()"
      [openOnFocus]="openOnFocus()"
      [openOnQuery]="openOnQuery()"
      [commitOnSelect]="commitOnSelect()"
      [clearOnQueryChange]="clearOnQueryChange()"
      [disabled]="disabled()"
      [readonly]="readonly()"
    >
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          @for (it of filtered(); track it.id) {
            <div
              [attr.data-test-id]="it.id"
              forComboboxOption
              [value]="it.id"
              [label]="it.label"
              [disabled]="!!it.disabled"
            >
              {{ it.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class ComboboxHost {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
  readonly autocompleteMode = signal<'none' | 'list' | 'inline' | 'both'>('list');
  readonly autoHighlight = signal(true);
  readonly openOnFocus = signal(false);
  readonly openOnQuery = signal(true);
  readonly commitOnSelect = signal(true);
  readonly clearOnQueryChange = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);

  readonly filtered = computed<readonly FruitItem[]>(() => {
    const q = this.query().toLowerCase();
    if (!q) return FRUITS;
    return FRUITS.filter((it) => it.label.toLowerCase().includes(q));
  });
}

@Component({
  imports: [ForCombobox, ForComboboxInput],
  template: `
    <div forCombobox [disabled]="disabled()" [required]="required()">
      <input forComboboxInput />
    </div>
  `,
})
class ComboboxFormControlHost {
  readonly disabled = signal(false);
  readonly required = signal(false);
}

function getOption(testId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);
  if (!el) {
    throw new Error(`Option [data-test-id="${testId}"] not found in DOM.`);
  }
  return el;
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
}

/** Simulates the user typing into an input — sets value, caret, fires `input`. */
function typeInto(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text }));
}

describe('ForCombobox', () => {
  describe('focus (focus-on-error)', () => {
    it('moves focus to the input, not the wrapper host', async () => {
      const { el, fixture, flush } = renderHost(ComboboxHost);
      await flush();
      const combobox = fixture.debugElement
        .query(By.directive(ForCombobox))
        .injector.get(ForCombobox);
      combobox.focus();
      expect(document.activeElement).toBe(el.querySelector('[forComboboxInput]'));
    });
  });

  afterEachOverlayCleanup();

  describe('portal cleanup', () => {
    it('removes the portaled content from document.body on close', async () => {
      // Issue #89 reproduction. Combobox previously called `injectPortal()`
      // explicitly *and* let `injectFloating` portal again, doubling the
      // destroy hook. The fix removes the explicit call; this test guards
      // against regressions on either side.
      const r = renderHost(ComboboxHost);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forComboboxContent]')).toHaveLength(1);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forComboboxContent]')).toHaveLength(0);
    });
  });

  describe('a11y baseline', () => {
    it('wires combobox role + aria-haspopup + aria-controls', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.hasAttribute('aria-controls')).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(content.getAttribute('role')).toBe('listbox');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-controls')).toBe(content.id);
    });

    it('drops aria-controls when the listbox closes', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(input.hasAttribute('aria-controls')).toBe(true);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(input.hasAttribute('aria-controls')).toBe(false);
    });

    it('options carry role=option + aria-selected + data-state', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.value.set(['banana']);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      const banana = getOption('banana');
      expect(apple.getAttribute('role')).toBe('option');
      expect(apple.getAttribute('data-state')).toBe('unchecked');
      expect(banana.getAttribute('data-state')).toBe('checked');
    });

    it('reflects data-state on root and input', async () => {
      const r = renderHost(ComboboxHost);
      const root = r.query<HTMLElement>('[forCombobox]')!;
      const input = getInput();
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(input.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(root.getAttribute('data-state')).toBe('open');
      expect(input.getAttribute('data-state')).toBe('open');
    });

    it('portals the listbox content directly under document.body', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(content.parentElement).toBe(document.body);
    });
  });

  describe('open behavior', () => {
    it('opens on ArrowDown and seeds activedescendant to first enabled', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      input.focus();
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      const apple = getOption('apple');
      expect(input.getAttribute('aria-activedescendant')).toBe(apple.id);
      expect(apple.getAttribute('aria-selected')).toBe('true');
    });

    it('opens on ArrowUp and seeds activedescendant to last enabled', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      pressKey(input, 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      const date = getOption('date');
      expect(input.getAttribute('aria-activedescendant')).toBe(date.id);
    });

    it('opens on query change when openOnQuery is on (default)', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      typeInto(input, 'a');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('does NOT open on query change when openOnQuery is off', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.openOnQuery.set(false);
      await flush(r.fixture);
      const input = getInput();
      typeInto(input, 'a');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('does NOT open on focus by default', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      input.focus();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('opens on focus when openOnFocus is on', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.openOnFocus.set(true);
      await flush(r.fixture);
      const input = getInput();
      input.focus();
      input.dispatchEvent(new FocusEvent('focus'));
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('does nothing when disabled', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      const input = getInput();
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(input.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('keyboard navigation', () => {
    it('ArrowDown / ArrowUp move activedescendant, skipping disabled options', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();

      // Auto-highlight has set apple. ArrowDown → apricot.
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apricot').id);

      // ArrowDown → banana.
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('banana').id);

      // ArrowDown → date (cherry is disabled).
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('date').id);

      // ArrowDown wraps with loop=true → apple.
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apple').id);

      // ArrowUp wraps backward → date.
      pressKey(input, 'ArrowUp');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('date').id);
    });

    it('reflects data-highlighted on the option that is the activedescendant', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const input = getInput();
      input.focus();

      const apple = getOption('apple');
      const apricot = getOption('apricot');

      // auto-highlight defaults to first enabled (apple)
      expect(apple.getAttribute('data-highlighted')).toBe('');
      expect(apricot.hasAttribute('data-highlighted')).toBe(false);

      pressKey(input, 'ArrowDown');
      await flush(r.fixture);

      expect(apricot.getAttribute('data-highlighted')).toBe('');
      expect(apple.hasAttribute('data-highlighted')).toBe(false);
    });

    it('Home / End jump to first / last enabled', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const input = getInput();

      pressKey(input, 'End');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('date').id);

      pressKey(input, 'Home');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apple').id);
    });

    it('PageDown / PageUp jump to last / first enabled', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const input = getInput();

      pressKey(input, 'PageDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('date').id);

      pressKey(input, 'PageUp');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apple').id);
    });

    it('Enter activates the activedescendant: commits value + label and closes', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      // Apple is auto-highlighted. ArrowDown → apricot.
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);

      pressKey(input, 'Enter');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['apricot']);
      expect(r.instance.query()).toBe('Apricot');
      expect(r.instance.open()).toBe(false);
    });

    it('Tab closes the listbox without preventing default', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const input = getInput();
      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('Escape', () => {
    it('closes the listbox when open; focus stays in input', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(document.activeElement).toBe(input);
    });

    it('emits (escapeKeyDown) with the native event before closing', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
        template: `
          <div forCombobox [(open)]="open" (escapeKeyDown)="captured.push($event)" ariaLabel="t">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly captured: VetoableNativeEvent<KeyboardEvent>[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      const input = getInput();
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(r.instance.captured[0]?.event.key).toBe('Escape');
      expect(r.instance.open()).toBe(false);
    });

    it('keeps open when (escapeKeyDown) is preventDefault-ed', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
        template: `
          <div forCombobox [(open)]="open" (escapeKeyDown)="$event.preventDefault()" ariaLabel="t">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      const input = getInput();
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('outside dismissal', () => {
    it('closes on pointer-down outside both input and content', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      outside.remove();
    });

    it('does NOT close when pointer-down lands on the input (exempt)', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: input, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [input], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  assertFormControlContract(
    () => {
      const r = renderHost(ComboboxFormControlHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLInputElement>('[forComboboxInput]')!,
        flush: r.flush,
        setFlag: (flag, value) => {
          switch (flag) {
            case 'disabled':
              r.instance.disabled.set(value);
              return;
            case 'required':
              r.instance.required.set(value);
              return;
          }
        },
      };
      return result;
    },
    { flags: ['disabled', 'required'] },
  );

  describe('selection (click)', () => {
    it('clicking an option commits value + label and closes', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.query()).toBe('Banana');
      expect(r.instance.open()).toBe(false);
    });

    it('clicking a disabled option is a no-op', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('cherry').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual([]);
      expect(r.instance.open()).toBe(true);
    });

    it('does not commit label when commitOnSelect is off', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.commitOnSelect.set(false);
      // Query starts empty so the consumer's filter keeps all options
      // rendered; we then assert that activation doesn't overwrite query.
      r.instance.open.set(true);
      await flush(r.fixture);

      // Manually set query *after* the listbox is open and options are
      // registered, so we can assert the post-click value.
      r.instance.query.set('typed');
      await flush(r.fixture);

      // The consumer's filter (`label.toLowerCase().includes(q)`) drops
      // banana once query is 'typed'. Re-clear so banana stays in DOM.
      r.instance.query.set('an');
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      // commitOnSelect=false: query is unchanged by activation.
      expect(r.instance.query()).toBe('an');
    });

    it('hover (pointermove) updates the activedescendant', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const banana = getOption('banana');
      banana.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      await flush(r.fixture);
      expect(getInput().getAttribute('aria-activedescendant')).toBe(banana.id);
    });

    it('keyboard navigation suppresses a hover synthesized by the scroll under a stationary cursor', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      pressKey(input, 'ArrowDown');
      getOption('banana').dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      await flush(r.fixture);

      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apricot').id);
      expect(getOption('banana').hasAttribute('data-highlighted')).toBe(false);
    });
  });

  describe('typing + filtering', () => {
    it('typing updates query and the consumer-filtered list', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      input.focus();
      typeInto(input, 'ap');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('ap');
      expect(r.instance.open()).toBe(true);
      // Filter narrowed to apple + apricot.
      expect(document.querySelector('[data-test-id="apple"]')).not.toBeNull();
      expect(document.querySelector('[data-test-id="apricot"]')).not.toBeNull();
      expect(document.querySelector('[data-test-id="banana"]')).toBeNull();
      // First match auto-highlighted.
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apple').id);
    });

    it('clearOnQueryChange clears value when query changes', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.value.set(['banana']);
      r.instance.clearOnQueryChange.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      typeInto(input, 'a');
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([]);
    });

    it('value survives query edits when clearOnQueryChange is off (default)', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      typeInto(input, 'a');
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
    });
  });

  describe('inline autocomplete', () => {
    it('appends the rest of the first match into the input as selected text', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autocompleteMode.set('both');
      // Pre-warm options cache so inline can resolve from the snapshot.
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      typeInto(input, 'ap');
      await flush(r.fixture);

      expect(input.value).toBe('Apple');
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe(5);
    });

    it('skips inline completion on Backspace so the user can shorten the query', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autocompleteMode.set('both');
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      typeInto(input, 'ap');
      await flush(r.fixture);
      // Apple is now in the input with selection 2..5.

      // Simulate Backspace deleting the selection.
      input.value = 'ap';
      input.setSelectionRange(2, 2);
      input.dispatchEvent(new InputEvent('input', { inputType: 'deleteContentBackward' }));
      await flush(r.fixture);

      // Should NOT have re-completed.
      expect(input.value).toBe('ap');
      expect(r.instance.query()).toBe('ap');
    });
  });

  describe('IME composition', () => {
    it('does not update the query or rewrite the value while composing', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      input.focus();

      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = 'り';
      input.setSelectionRange(1, 1);
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush(r.fixture);

      expect(input.value).toBe('り');
      expect(r.instance.query()).toBe('');
    });

    it('syncs the query once on compositionend', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      input.focus();

      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = 'りんご';
      input.setSelectionRange(3, 3);
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush(r.fixture);
      expect(r.instance.query()).toBe('');

      input.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: 'りんご' }),
      );
      await flush(r.fixture);
      expect(r.instance.query()).toBe('りんご');
    });

    it('skips inline completion when the input event is still composing', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autocompleteMode.set('both');
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      input.value = 'ap';
      input.setSelectionRange(2, 2);
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush(r.fixture);

      expect(input.value).toBe('ap');
    });
  });

  describe('autoHighlight', () => {
    it('does not seed activedescendant when autoHighlight is off', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autoHighlight.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      expect(input.getAttribute('aria-activedescendant')).toBeNull();
    });

    it('clears a stale activedescendant on a programmatic query change (#394)', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autoHighlight.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      // Arrow down to highlight banana so activedescendant points at it.
      pressKey(input, 'ArrowDown');
      pressKey(input, 'ArrowDown');
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      const banana = getOption('banana');
      expect(input.getAttribute('aria-activedescendant')).toBe(banana.id);

      // Consumer's async search writes query directly through the model
      // (not the typing path), filtering banana out. With autoHighlight off
      // nothing reseeds, so the query transition itself must clear the now
      // stale activedescendant.
      r.instance.query.set('apr');
      await flush(r.fixture);

      expect(document.querySelector('[data-test-id="banana"]')).toBeNull();
      expect(input.getAttribute('aria-activedescendant')).toBeNull();
    });

    it('scrolls the auto-highlight-seeded option into view on open (#568)', async () => {
      // jsdom on Windows leaves `scrollIntoView` undefined on the prototype
      // (the production code safe-calls it). Stub it so the call is observable,
      // restoring the prototype afterwards so the global state doesn't leak.
      const had = 'scrollIntoView' in Element.prototype;
      const stub = vi.fn();
      Element.prototype.scrollIntoView = stub;
      try {
        const r = renderHost(ComboboxHost);
        r.instance.open.set(true);
        await flush(r.fixture);

        const apple = getOption('apple');
        expect(getInput().getAttribute('aria-activedescendant')).toBe(apple.id);
        // The seeded option's host is the element scrolled into view.
        expect(stub.mock.contexts).toContain(apple);
      } finally {
        if (!had) {
          delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
        }
      }
    });

    it('seeds the activedescendant without an unbounded self-cycle (#568)', async () => {
      // The auto-highlight decision is a pure derivation in the `#activeId`
      // linkedSignal, so a stable item set must settle without the effect
      // re-running over and over (a self-cycle would scroll the seed on every
      // tick). Guards against a future regression that reintroduces the
      // read-and-write-in-the-same-effect-scope smell.
      const had = 'scrollIntoView' in Element.prototype;
      const stub = vi.fn();
      Element.prototype.scrollIntoView = stub;
      try {
        const r = renderHost(ComboboxHost);
        r.instance.open.set(true);
        await flushPositioning(r.fixture);

        const apple = getOption('apple');
        expect(getInput().getAttribute('aria-activedescendant')).toBe(apple.id);
        const afterOpen = stub.mock.calls.length;
        expect(afterOpen).toBeLessThanOrEqual(2);

        // A flush with nothing changed must not re-seed or re-scroll.
        await flush(r.fixture);
        expect(stub.mock.calls.length).toBe(afterOpen);
        expect(getInput().getAttribute('aria-activedescendant')).toBe(apple.id);
      } finally {
        if (!had) {
          delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
        }
      }
    });

    describe('append vs filter scroll-into-view (#931)', () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forCombobox [(query)]="query" [(open)]="open" [autoHighlight]="true">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                @for (it of items(); track it.id) {
                  <div
                    [attr.data-test-id]="it.id"
                    forComboboxOption
                    [value]="it.id"
                    [label]="it.label"
                  >
                    {{ it.label }}
                  </div>
                }
              </div>
            }
          </div>
        `,
      })
      class AppendHost {
        readonly query = signal('');
        readonly open = signal(false);
        readonly items = signal<readonly FruitItem[]>([
          { id: 'apple', label: 'Apple' },
          { id: 'apricot', label: 'Apricot' },
        ]);
      }

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

      it('does not re-scroll the activedescendant when options are appended, not filtered', () =>
        withScrollStub(async (stub) => {
          const r = renderHost(AppendHost);
          r.instance.open.set(true);
          await flushPositioning(r.fixture);

          const apple = getOption('apple');
          expect(getInput().getAttribute('aria-activedescendant')).toBe(apple.id);
          expect(stub.mock.contexts).toContain(apple);
          const afterOpen = stub.mock.calls.length;

          r.instance.items.update((prev) => [...prev, { id: 'banana', label: 'Banana' }]);
          await flush(r.fixture);

          expect(getInput().getAttribute('aria-activedescendant')).toBe(apple.id);
          expect(stub.mock.calls.length).toBe(afterOpen);
        }));

      it('leaves the scroll untouched when an option is hovered and then a page is appended', () =>
        withScrollStub(async (stub) => {
          const r = renderHost(AppendHost);
          r.instance.open.set(true);
          await flushPositioning(r.fixture);

          const apricot = getOption('apricot');
          apricot.dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
          await flush(r.fixture);
          expect(getInput().getAttribute('aria-activedescendant')).toBe(apricot.id);
          const afterHover = stub.mock.calls.length;

          r.instance.items.update((prev) => [...prev, { id: 'banana', label: 'Banana' }]);
          await flush(r.fixture);

          expect(getInput().getAttribute('aria-activedescendant')).toBe(apricot.id);
          expect(stub.mock.calls.length).toBe(afterHover);
        }));

      it('scrolls the new seed into view when a filter re-seeds the auto-highlight', () =>
        withScrollStub(async (stub) => {
          const r = renderHost(AppendHost);
          r.instance.open.set(true);
          await flush(r.fixture);
          expect(stub.mock.contexts).toContain(getOption('apple'));

          r.instance.query.set('b');
          r.instance.items.set([{ id: 'banana', label: 'Banana' }]);
          await flush(r.fixture);

          const banana = getOption('banana');
          expect(getInput().getAttribute('aria-activedescendant')).toBe(banana.id);
          expect(stub.mock.contexts).toContain(banana);
        }));
    });
  });

  describe('hidden input (form submit)', () => {
    it('mirrors single-mode value into one hidden input', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput],
        template: `
          <div forCombobox name="fruit" [(value)]="value">
            <input forComboboxInput />
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>(['apple']);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.name).toBe('fruit');
      expect(inputs[0]!.value).toBe('apple');
    });

    it('produces no hidden input when value is empty', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput],
        template: `
          <div forCombobox name="fruit" [(value)]="value">
            <input forComboboxInput />
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      expect(r.el.querySelectorAll('input[type=hidden]')).toHaveLength(0);
    });

    it('mirrors multi-mode value into N hidden inputs', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput],
        template: `
          <div forCombobox multiple name="tags" [(value)]="value">
            <input forComboboxInput />
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>(['a', 'b', 'c']);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
      expect(inputs.map((i) => i.value)).toEqual(['a', 'b', 'c']);
      expect(inputs.every((i) => i.name === 'tags')).toBe(true);
    });
  });

  describe('ForComboboxEmpty', () => {
    it('hides when there are options and shows when filter empties them', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForComboboxEmpty],
        template: `
          @let q = query().toLowerCase();
          @let filtered = items.filter((it) => it.toLowerCase().includes(q));

          <div forCombobox [(query)]="query" [(open)]="open">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                @for (it of filtered; track it) {
                  <div [attr.data-test-id]="it" forComboboxOption [value]="it">{{ it }}</div>
                }
                <div forComboboxEmpty data-test-id="empty">No matches.</div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly query = signal('');
        readonly open = signal(true);
        readonly items = ['Apple', 'Banana'];
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const empty = document.querySelector<HTMLElement>('[data-test-id="empty"]')!;
      expect(empty.hasAttribute('hidden')).toBe(true);

      r.instance.query.set('zzz');
      await flush(r.fixture);
      expect(empty.hasAttribute('hidden')).toBe(false);
      expect(empty.getAttribute('role')).toBe('status');
    });

    it('enforces inline display:none while hidden so a consumer display class cannot leak through', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForComboboxEmpty],
        template: `
          @let q = query().toLowerCase();
          @let filtered = items.filter((it) => it.toLowerCase().includes(q));

          <div forCombobox [(query)]="query" [(open)]="open">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                @for (it of filtered; track it) {
                  <div [attr.data-test-id]="it" forComboboxOption [value]="it">{{ it }}</div>
                }
                <div forComboboxEmpty data-test-id="empty" class="consumer-flex">No matches.</div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly query = signal('');
        readonly open = signal(true);
        readonly items = ['Apple', 'Banana'];
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const empty = document.querySelector<HTMLElement>('[data-test-id="empty"]')!;
      expect(empty.style.display).toBe('none');

      r.instance.query.set('zzz');
      await flush(r.fixture);
      expect(empty.style.display).toBe('');
    });
  });

  describe('ForComboboxClear', () => {
    it('hides when nothing to clear, shows otherwise, clears on click', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
        template: `
          <div forCombobox [(value)]="value" [(query)]="query" [(open)]="open">
            <input forComboboxInput />
            <button forComboboxClear data-test-id="clear">×</button>
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
        readonly query = signal('');
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const clear = r.query<HTMLButtonElement>('[data-test-id="clear"]')!;
      expect(clear.hasAttribute('hidden')).toBe(true);

      r.instance.value.set(['apple']);
      r.instance.query.set('Apple');
      await flush(r.fixture);
      expect(clear.hasAttribute('hidden')).toBe(false);

      clear.click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([]);
      expect(r.instance.query()).toBe('');
    });

    it('enforces inline display:none while hidden so a consumer display class cannot leak through', async () => {
      @Component({
        imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
        template: `
          <div forCombobox [(value)]="value" [(query)]="query" [(open)]="open">
            <input forComboboxInput />
            <button forComboboxClear data-test-id="clear" class="consumer-flex">×</button>
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
        readonly query = signal('');
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const clear = r.query<HTMLButtonElement>('[data-test-id="clear"]')!;
      expect(clear.style.display).toBe('none');

      r.instance.value.set(['apple']);
      r.instance.query.set('Apple');
      await flush(r.fixture);
      expect(clear.style.display).toBe('');
    });

    describe('aria-label (issue #1145 item 7)', () => {
      it('carries the default aria-label "Clear"', async () => {
        @Component({
          imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
          template: `
            <div forCombobox [(open)]="open">
              <input forComboboxInput />
              <button forComboboxClear data-test-id="clear">×</button>
            </div>
          `,
        })
        class Host {
          readonly open = signal(false);
        }

        const r = renderHost(Host);
        await flush(r.fixture);

        expect(r.query<HTMLElement>('[data-test-id="clear"]')!.getAttribute('aria-label')).toBe(
          'Clear',
        );
      });

      it('[ariaLabel] overrides the emitted aria-label', async () => {
        @Component({
          imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
          template: `
            <div forCombobox [(open)]="open">
              <input forComboboxInput />
              <button forComboboxClear data-test-id="clear" ariaLabel="Borrar">×</button>
            </div>
          `,
        })
        class Host {
          readonly open = signal(false);
        }

        const r = renderHost(Host);
        await flush(r.fixture);

        expect(r.query<HTMLElement>('[data-test-id="clear"]')!.getAttribute('aria-label')).toBe(
          'Borrar',
        );
      });

      it('an unbound clear button uses provideForComboboxDefaults({ clearAriaLabel })', async () => {
        @Component({
          imports: [ForCombobox, ForComboboxInput, ForComboboxClear],
          providers: [provideForComboboxDefaults({ clearAriaLabel: 'Vaciar' })],
          template: `
            <div forCombobox [(open)]="open">
              <input forComboboxInput />
              <button forComboboxClear data-test-id="clear">×</button>
            </div>
          `,
        })
        class Host {
          readonly open = signal(false);
        }

        const r = renderHost(Host);
        await flush(r.fixture);

        expect(r.query<HTMLElement>('[data-test-id="clear"]')!.getAttribute('aria-label')).toBe(
          'Vaciar',
        );
      });
    });
  });

  describe('groups & separators', () => {
    it('group exposes role + aria-labelledby pointing to the registered label', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForComboboxGroup, ForComboboxGroupLabel],
        template: `
          <div forCombobox [(open)]="open">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                <div forComboboxGroup>
                  <div forComboboxGroupLabel>Fruits</div>
                  <div forComboboxOption value="a">A</div>
                </div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const group = document.querySelector<HTMLElement>('[forComboboxGroup]')!;
      const label = document.querySelector<HTMLElement>('[forComboboxGroupLabel]')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('separator carries role=separator and is skipped by navigation', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForComboboxSeparator],
        template: `
          <div forCombobox [(open)]="open">
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                <div data-test-id="x" forComboboxOption value="x">X</div>
                <div forComboboxSeparator></div>
                <div data-test-id="y" forComboboxOption value="y">Y</div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const sep = document.querySelector<HTMLElement>('[forComboboxSeparator]')!;
      expect(sep.getAttribute('role')).toBe('separator');

      const input = document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
      input.focus();
      // Auto-highlight has activeId on x. ArrowDown → y (separator is skipped).
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(input.getAttribute('aria-activedescendant')).toBe(getOption('y').id);
    });
  });

  describe('(queryChange) / (valueChange) / (openChange) contract', () => {
    it('honors consumer writes without re-emitting', async () => {
      let queryEmits = 0;
      let valueEmits = 0;
      let openEmits = 0;

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div
            forCombobox
            [(query)]="query"
            [(value)]="value"
            [(open)]="open"
            (queryChange)="onQuery($event)"
            (valueChange)="onValue($event)"
            (openChange)="onOpen($event)"
          >
            <input forComboboxInput />
            @if (open()) {
              <div forComboboxContent>
                <div data-test-id="apple" forComboboxOption value="apple" label="Apple">Apple</div>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly query = signal('');
        readonly value = signal<readonly string[]>([]);
        readonly open = signal(false);
        onQuery(_: string): void {
          queryEmits++;
        }
        onValue(_: readonly string[]): void {
          valueEmits++;
        }
        onOpen(_: boolean): void {
          openEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer writes — silent.
      r.instance.query.set('typed');
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(queryEmits).toBe(0);
      expect(valueEmits).toBe(0);
      expect(openEmits).toBe(0);

      // Internal transition: clicking apple commits value (null → 'apple'),
      // copies label into query ('typed' → 'Apple'), and closes (true → false).
      getOption('apple').click();
      await flush(r.fixture);

      expect(openEmits).toBe(1);
      expect(queryEmits).toBe(1);
      expect(valueEmits).toBe(1);
    });
  });

  describe('multi mode', () => {
    /** Multi-mode host that renders chips next to the input. */
    @Component({
      imports: MULTI_IMPORTS,
      template: `
        <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
          <div forComboboxChips>
            @for (chip of selectedFromCtx(); track chip.value) {
              <span forComboboxChip [value]="chip.value" [attr.data-test-chip]="chip.value">
                {{ chip.label }}
                <button forComboboxChipRemove [attr.data-test-remove]="chip.value">×</button>
              </span>
            }
            <input forComboboxInput />
          </div>
          @if (open()) {
            <div forComboboxContent>
              @for (it of FRUITS; track it.id) {
                <div
                  [attr.data-test-id]="it.id"
                  forComboboxOption
                  [value]="it.id"
                  [label]="it.label"
                  [disabled]="!!it.disabled"
                >
                  {{ it.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class MultiHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
      readonly FRUITS = FRUITS;

      // Mirrors the root's `selected()` so the template can iterate without
      // poking into ctx via a directive ref. Re-derives labels from FRUITS
      // so the chip's resolved label doesn't depend on the option cache
      // having warmed up — the cache test is covered separately.
      readonly selectedFromCtx = computed(() =>
        this.value().map((v) => ({
          value: v,
          label: FRUITS.find((it) => it.id === v)?.label ?? v,
        })),
      );
    }

    function getChip(value: string): HTMLElement {
      return document.querySelector<HTMLElement>(`[data-test-chip="${value}"]`)!;
    }

    function getRemove(value: string): HTMLButtonElement {
      return document.querySelector<HTMLButtonElement>(`[data-test-remove="${value}"]`)!;
    }

    it('click toggles options in/out and the listbox stays open', async () => {
      const r = renderHost(MultiHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('apple').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['apple']);
      expect(r.instance.open()).toBe(true);

      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['apple', 'banana']);
      expect(r.instance.open()).toBe(true);

      // Clicking already-selected toggles out.
      getOption('apple').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(true);
    });

    it('commitOnSelect=true clears query on each activation', async () => {
      const r = renderHost(MultiHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      typeInto(input, 'a');
      await flush(r.fixture);
      expect(r.instance.query()).toBe('a');

      getOption('apple').click();
      await flush(r.fixture);
      expect(r.instance.query()).toBe('');
      // Input DOM value also follows.
      expect(input.value).toBe('');
    });

    it('listbox carries aria-multiselectable=true', async () => {
      const r = renderHost(MultiHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(content.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('every selected option carries aria-selected=true (vs. activedescendant in single)', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set(['apple', 'banana']);
      r.instance.open.set(true);
      await flush(r.fixture);

      // Even though apple is the activedescendant (auto-highlighted first),
      // banana ALSO has aria-selected=true because it's in value.
      expect(getOption('apple').getAttribute('aria-selected')).toBe('true');
      expect(getOption('banana').getAttribute('aria-selected')).toBe('true');
      expect(getOption('apricot').getAttribute('aria-selected')).toBe('false');
    });

    it('chips render a node per selected value', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set(['apple', 'banana']);
      await flush(r.fixture);

      expect(getChip('apple')).toBeTruthy();
      expect(getChip('banana')).toBeTruthy();
      expect(document.querySelector('[data-test-chip="cherry"]')).toBeNull();
    });

    it('clicking ChipRemove removes that value and focuses the input', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set(['apple', 'banana']);
      await flush(r.fixture);

      getRemove('apple').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      expect(document.activeElement).toBe(getInput());
    });

    it('ChipRemove generates aria-label="Remove <label>" derived from the option cache', async () => {
      const r = renderHost(MultiHost);
      // Pre-warm option cache by opening the listbox once.
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      r.instance.value.set(['apple']);
      await flush(r.fixture);

      const remove = getRemove('apple');
      expect(remove.getAttribute('aria-label')).toBe('Remove Apple');
    });

    describe('Backspace heuristic on empty input', () => {
      it('Backspace on empty input focuses the last chip', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const input = getInput();
        input.focus();
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(document.activeElement).toBe(getChip('banana'));
      });

      it('Backspace on the focused chip removes it and falls back to previous chip', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const input = getInput();
        input.focus();
        // First Backspace: focus moves to last chip.
        input.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        const banana = document.activeElement as HTMLElement;
        expect(banana.getAttribute('data-test-chip')).toBe('banana');

        // Second Backspace on the chip: removes + focuses previous chip (apple).
        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(r.instance.value()).toEqual(['apple']);
        expect(document.activeElement).toBe(getChip('apple'));
      });

      it('Backspace on the first chip removes it and focuses the new first chip', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana', 'date']);
        await flush(r.fixture);

        const apple = getChip('apple');
        apple.focus();
        apple.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(r.instance.value()).toEqual(['banana', 'date']);
        expect(document.activeElement).toBe(getChip('banana'));
      });

      it('Backspace on the only chip removes it and falls back to the input', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple']);
        await flush(r.fixture);

        const apple = getChip('apple');
        apple.focus();
        apple.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(r.instance.value()).toEqual([]);
        expect(document.activeElement).toBe(getInput());
      });

      it('Backspace falls through to native delete-char while input has text', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple']);
        await flush(r.fixture);

        const input = getInput();
        input.focus();
        // Simulate user typed text in the input.
        typeInto(input, 'b');
        await flush(r.fixture);

        // Backspace event with non-empty input doesn't get preventDefault'd,
        // so the chip doesn't take focus.
        const event = new KeyboardEvent('keydown', {
          key: 'Backspace',
          bubbles: true,
          cancelable: true,
        });
        input.dispatchEvent(event);
        await flush(r.fixture);

        expect(event.defaultPrevented).toBe(false);
        expect(document.activeElement).toBe(input);
      });
    });

    describe('chip keyboard navigation', () => {
      it('ArrowLeft / ArrowRight move focus between chips', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana', 'date']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();

        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getChip('apple'));

        getChip('apple').dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getChip('banana'));
      });

      it('ArrowRight on the last chip hops to the input', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();
        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getInput());
      });

      it('Escape on chip returns focus to the input', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple']);
        await flush(r.fixture);

        const apple = getChip('apple');
        apple.focus();
        apple.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(document.activeElement).toBe(getInput());
      });

      it('Delete on chip removes it', async () => {
        const r = renderHost(MultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();
        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Delete', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);

        expect(r.instance.value()).toEqual(['apple']);
      });
    });

    it('chips wrapper carries role=group', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set(['apple']);
      await flush(r.fixture);

      const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
      expect(chipsEl.getAttribute('role')).toBe('group');
      expect(chipsEl.getAttribute('aria-label')).toBe('Selected items');
    });

    describe('RTL', () => {
      @Component({
        imports: MULTI_IMPORTS,
        template: `
          <div forCombobox multiple dir="rtl" [(query)]="query" [(value)]="value" [(open)]="open">
            <div forComboboxChips>
              @for (chip of selectedFromCtx(); track chip.value) {
                <span forComboboxChip [value]="chip.value" [attr.data-test-chip]="chip.value">
                  {{ chip.label }}
                  <button forComboboxChipRemove [attr.data-test-remove]="chip.value">×</button>
                </span>
              }
              <input forComboboxInput />
            </div>
            @if (open()) {
              <div forComboboxContent>
                @for (it of FRUITS; track it.id) {
                  <div
                    [attr.data-test-id]="it.id"
                    forComboboxOption
                    [value]="it.id"
                    [label]="it.label"
                    [disabled]="!!it.disabled"
                  >
                    {{ it.label }}
                  </div>
                }
              </div>
            }
          </div>
        `,
      })
      class RtlMultiHost {
        readonly query = signal('');
        readonly value = signal<readonly string[]>([]);
        readonly open = signal(false);
        readonly FRUITS = FRUITS;
        readonly selectedFromCtx = computed(() =>
          this.value().map((v) => ({
            value: v,
            label: FRUITS.find((it) => it.id === v)?.label ?? v,
          })),
        );
      }

      it('ArrowRight on a chip moves focus DOM-backward (visually next) in RTL', async () => {
        const r = renderHost(RtlMultiHost);
        r.instance.value.set(['apple', 'banana', 'date']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();

        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getChip('apple'));
      });

      it('ArrowLeft on a chip moves focus DOM-forward (visually next) in RTL', async () => {
        const r = renderHost(RtlMultiHost);
        r.instance.value.set(['apple', 'banana', 'date']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();

        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getChip('date'));
      });

      it('ArrowLeft on the last chip hops to the input in RTL (input sits at the visual leftmost edge)', async () => {
        const r = renderHost(RtlMultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const banana = getChip('banana');
        banana.focus();
        banana.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(getInput());
      });

      it('ArrowRight on the first chip in RTL bounces (no focus move)', async () => {
        const r = renderHost(RtlMultiHost);
        r.instance.value.set(['apple', 'banana']);
        await flush(r.fixture);

        const apple = getChip('apple');
        apple.focus();
        apple.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
        );
        await flush(r.fixture);
        expect(document.activeElement).toBe(apple);
      });
    });
  });

  describe('align default flip under RTL', () => {
    // Hosts mount the content so `injectFloating` resolves and reflects
    // `data-side` / `data-align` on the content host — the DOM contract
    // consumers style against (and the only observable counterpart to the
    // directive's internal `side()` / `align()` computed signals).
    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
      template: `
        <div forCombobox [(open)]="open" dir="rtl">
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent></div>
          }
        </div>
      `,
    })
    class RtlHost {
      readonly open = signal(true);
    }

    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
      template: `
        <div forCombobox [(open)]="open" dir="rtl" align="center">
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent></div>
          }
        </div>
      `,
    })
    class RtlHostWithAlign {
      readonly open = signal(true);
    }

    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent],
      template: `
        <div forCombobox [(open)]="open">
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent></div>
          }
        </div>
      `,
    })
    class LtrHost {
      readonly open = signal(true);
    }

    function getContent(): HTMLElement {
      return document.querySelector<HTMLElement>('[forComboboxContent]')!;
    }

    it('defaults align to start in LTR (side defaults to bottom)', async () => {
      const r = renderHost(LtrHost);
      await flushPositioning(r.fixture);
      const content = getContent();
      expect(content.dataset['side']).toBe('bottom');
      expect(content.dataset['align']).toBe('start');
    });

    it('defaults align to end when dir="rtl" and consumer omits [align]', async () => {
      const r = renderHost(RtlHost);
      await flushPositioning(r.fixture);
      expect(getContent().dataset['align']).toBe('end');
    });

    it('honors a consumer-provided [align] in RTL (no auto-flip)', async () => {
      const r = renderHost(RtlHostWithAlign);
      await flushPositioning(r.fixture);
      expect(getContent().dataset['align']).toBe('center');
    });
  });

  describe('zoneless', () => {
    it('open / value / aria stay reactive without zone.js', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(input.getAttribute('aria-expanded')).toBe('true');

      r.instance.value.set(['apple']);
      await flush(r.fixture);
      const apple = getOption('apple');
      expect(apple.getAttribute('aria-selected')).toBe('true');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(input.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('selectedItem (single-select accessor)', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div
          forCombobox
          #cb="forCombobox"
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          [multiple]="multiple()"
        >
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent>
              @for (it of FRUITS; track it.id) {
                <div
                  [attr.data-test-id]="it.id"
                  forComboboxOption
                  [value]="it.id"
                  [label]="it.label"
                >
                  {{ it.label }}
                </div>
              }
            </div>
          }
        </div>
        <output data-testid="selected">{{ cb.selectedItem() ?? 'none' }}</output>
      `,
    })
    class SelectedHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
      readonly multiple = signal(false);
      readonly FRUITS = FRUITS;
    }

    const selectedText = (root: HTMLElement) =>
      root.querySelector<HTMLElement>('[data-testid="selected"]')!.textContent;

    it('is null when nothing is selected', async () => {
      const r = renderHost(SelectedHost);
      await flush(r.fixture);
      expect(selectedText(r.el)).toBe('none');
    });

    it('exposes the sole selected value in single mode', async () => {
      const r = renderHost(SelectedHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);
      expect(selectedText(r.el)).toBe('banana');
    });

    it('tracks single-mode option activation (replace + close)', async () => {
      const r = renderHost(SelectedHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('apricot').click();
      await flush(r.fixture);
      expect(selectedText(r.el)).toBe('apricot');
    });

    it('is null when more than one value is selected (multi mode)', async () => {
      const r = renderHost(SelectedHost);
      r.instance.multiple.set(true);
      r.instance.value.set(['apple', 'banana']);
      await flush(r.fixture);
      expect(selectedText(r.el)).toBe('none');
    });
  });

  describe('orphan errors', () => {
    it('throws when [forComboboxInput] is used outside [forCombobox]', () => {
      @Component({
        imports: [ForComboboxInput],
        template: `<input forComboboxInput />`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/combobox\] ForComboboxInput must be used inside a \[forCombobox\] element\./,
      );
    });

    it('throws when ForComboboxGroupLabel is used outside [forComboboxGroup]', () => {
      @Component({
        imports: [ForComboboxGroupLabel],
        template: `<div forComboboxGroupLabel></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/combobox\] ForComboboxGroupLabel must be used inside a \[forComboboxGroup\] element\./,
      );
    });

    it('throws when [forComboboxAnchor] is used outside [forCombobox]', () => {
      @Component({
        imports: [ForComboboxAnchor],
        template: `<div forComboboxAnchor></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/combobox\] ForComboboxAnchor must be used inside a \[forCombobox\] element\./,
      );
    });
  });

  describe('anchor (separate positioning element)', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxAnchor,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxOption,
      ],
      template: `
        <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
          @if (showAnchor()) {
            <div data-testid="anchor" forComboboxAnchor>
              <input forComboboxInput />
            </div>
          } @else {
            <input forComboboxInput />
          }
          @if (open()) {
            <div forComboboxContent>
              @for (it of FRUITS; track it.id) {
                <div
                  [attr.data-test-id]="it.id"
                  forComboboxOption
                  [value]="it.id"
                  [label]="it.label"
                >
                  {{ it.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class AnchorHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
      readonly showAnchor = signal(true);
      readonly FRUITS = FRUITS;
    }

    it('mounts the listbox with [forComboboxAnchor] registered alongside the input', async () => {
      // DOM-observable contract for "anchor is wired": the anchor box and the
      // input coexist and the listbox opens and paints. Which element drives
      // floating-ui positioning is a geometry concern asserted in Playwright
      // (jsdom returns zeros for getBoundingClientRect).
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(getInput()).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forComboboxContent]')).not.toBeNull();
    });

    it('lets the input keep driving aria-controls / aria-expanded even with an anchor', async () => {
      const r = renderHost(AnchorHost);
      const input = getInput();

      expect(input.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input.getAttribute('aria-expanded')).toBe('false');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(input.getAttribute('aria-expanded')).toBe('true');
      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(input.getAttribute('aria-controls')).toBe(content.id);
    });

    it('keeps the input exempt from outside dismissal even when an anchor wraps it', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: input, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [input], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('restores the input fallback after the anchor is torn down inside @if', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).toBeNull();

      // Re-opening still works with the input as the (restored) fallback.
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      const input = getInput();
      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(content).not.toBeNull();
      expect(input.getAttribute('aria-controls')).toBe(content.id);
    });

    it('reacts to anchor registration without zone.js', async () => {
      // `renderHost` runs under `provideZonelessChangeDetection()`. Toggling the
      // anchor on and off stays reactive (no throw, listbox keeps painting).
      const r = renderHost(AnchorHost);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(document.querySelector<HTMLElement>('[forComboboxContent]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(true);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forComboboxContent]')).not.toBeNull();
    });

    it('throws when two [forComboboxAnchor] are registered inside the same [forCombobox]', () => {
      // `@if` defers directive construction to the change-detection pass so the
      // duplicate-registration throw surfaces from `detectChanges()`.
      @Component({
        imports: [ForCombobox, ForComboboxAnchor, ForComboboxInput],
        template: `
          @if (show()) {
            <div forCombobox>
              <div forComboboxAnchor></div>
              <div forComboboxAnchor></div>
              <input forComboboxInput />
            </div>
          }
        `,
      })
      class TwoAnchorsHost {
        readonly show = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoAnchorsHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/combobox\] Multiple \[forComboboxAnchor\]/,
      );
    });
  });
});

describe('ForCombobox trigger + list (picker anatomy, issue #675)', () => {
  @Component({
    imports: [
      ForCombobox,
      ForComboboxTrigger,
      ForComboboxInput,
      ForComboboxContent,
      ForComboboxList,
      ForComboboxOption,
    ],
    template: `
      <input data-test-id="before" />
      <div
        forCombobox
        [(query)]="query"
        [(value)]="value"
        [(open)]="open"
        [multiple]="multiple()"
        [returnFocus]="returnFocus()"
        [disabled]="disabled()"
        (autoFocusOnOpen)="onAutoFocusOnOpen($event)"
        (autoFocusOnClose)="onAutoFocusOnClose($event)"
      >
        <button forComboboxTrigger data-test-id="trigger">{{ triggerLabel() }}</button>
        @if (open()) {
          <div forComboboxContent data-test-id="content">
            <input forComboboxInput data-test-id="picker-input" />
            <div forComboboxList data-test-id="list">
              @for (it of filtered(); track it.id) {
                <div
                  [attr.data-test-id]="it.id"
                  forComboboxOption
                  [value]="it.id"
                  [label]="it.label"
                  [disabled]="!!it.disabled"
                >
                  {{ it.label }}
                </div>
              }
            </div>
          </div>
        }
      </div>
    `,
  })
  class PickerHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>([]);
    readonly open = signal(false);
    readonly multiple = signal(false);
    readonly returnFocus = signal(true);
    readonly disabled = signal(false);

    readonly vetoOpen = signal(false);
    readonly vetoClose = signal(false);
    autoFocusOnOpenCount = 0;
    autoFocusOnCloseCount = 0;

    readonly triggerLabel = computed(() => this.value()[0] ?? 'Pick a fruit');

    readonly filtered = computed<readonly FruitItem[]>(() => {
      const q = this.query().toLowerCase();
      if (!q) return FRUITS;
      return FRUITS.filter((it) => it.label.toLowerCase().includes(q));
    });

    onAutoFocusOnOpen(event: VetoableEvent): void {
      this.autoFocusOnOpenCount++;
      if (this.vetoOpen()) {
        event.preventDefault();
      }
    }

    onAutoFocusOnClose(event: VetoableEvent): void {
      this.autoFocusOnCloseCount++;
      if (this.vetoClose()) {
        event.preventDefault();
      }
    }
  }

  function getTrigger(): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>('[forComboboxTrigger]')!;
  }
  function getContent(): HTMLElement {
    return document.querySelector<HTMLElement>('[forComboboxContent]')!;
  }
  function getList(): HTMLElement {
    return document.querySelector<HTMLElement>('[forComboboxList]')!;
  }
  function getPickerInput(): HTMLInputElement {
    return document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
  }

  afterEachOverlayCleanup();

  describe('role split', () => {
    it('the list carries role=listbox; content becomes a neutral popup surface', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = getContent();
      const list = getList();
      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('tabindex')).toBe('-1');
      // Content drops the listbox semantics it owns in the editable anatomy.
      expect(content.hasAttribute('role')).toBe(false);
      expect(content.hasAttribute('tabindex')).toBe(false);
      // The popup surface owns no options; the list does.
      expect(content.querySelector('[forComboboxList] [forComboboxOption]')).not.toBeNull();
    });

    it('content keeps data-state in the picker anatomy', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(getContent().getAttribute('data-state')).toBe('open');
    });

    it("the input's aria-controls points at the list, not the popup surface", async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getPickerInput();
      const list = getList();
      const content = getContent();
      expect(input.getAttribute('aria-controls')).toBe(list.id);
      expect(input.getAttribute('aria-controls')).not.toBe(content.id);
    });

    it('the labelled role + aria-multiselectable move to the list in multi mode', async () => {
      const r = renderHost(PickerHost);
      r.instance.multiple.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const list = getList();
      const content = getContent();
      expect(list.getAttribute('aria-multiselectable')).toBe('true');
      expect(list.getAttribute('aria-labelledby')).toBe(getPickerInput().id);
      // None of the labelled-role attributes leak onto the popup surface.
      expect(content.hasAttribute('aria-multiselectable')).toBe(false);
      expect(content.hasAttribute('aria-labelledby')).toBe(false);
    });
  });

  describe('Tab (picker anatomy, issue #1145 item 5)', () => {
    it('moves focus to the trigger before closing so Tab advances from the trigger, not the portal', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getPickerInput();
      input.focus();
      expect(document.activeElement).toBe(input);

      const event = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
      input.dispatchEvent(event);
      await flush(r.fixture);

      expect(document.activeElement).toBe(getTrigger());
      expect(r.instance.open()).toBe(false);
      expect(event.defaultPrevented).toBe(false);
    });

    it('closes with reason tab so the (autoFocusOnClose) return-focus hook is skipped', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getPickerInput();
      input.focus();
      input.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.autoFocusOnCloseCount).toBe(0);
    });
  });

  describe('trigger', () => {
    it('throws from ForComboboxTrigger on first change detection', () => {
      @Component({
        imports: [ForComboboxTrigger],
        template: `<button forComboboxTrigger></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Orphan);
      let error: unknown;
      try {
        fixture.detectChanges();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/\[forty-cdk\/combobox\] ForComboboxTrigger could not resolve/);
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forComboboxTrigger\]="root"/);
      expect(message).toMatch(/#root="forCombobox"/);
    });

    it('wires aria-haspopup + aria-expanded + aria-controls + data-state', async () => {
      const r = renderHost(PickerHost);
      const trigger = getTrigger();
      expect(trigger.getAttribute('type')).toBe('button');
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      expect(trigger.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(getContent().id);
      expect(trigger.getAttribute('data-state')).toBe('open');
    });

    it('click toggles the popup open and closed', async () => {
      const r = renderHost(PickerHost);
      const trigger = getTrigger();

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('ArrowDown / ArrowUp open the popup', async () => {
      const r = renderHost(PickerHost);
      const trigger = getTrigger();

      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      r.instance.open.set(false);
      await flush(r.fixture);

      pressKey(trigger, 'ArrowUp');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('reflects native disabled and is inert when disabled', async () => {
      const r = renderHost(PickerHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const trigger = getTrigger();
      expect(trigger.hasAttribute('disabled')).toBe(true);
      expect(trigger.getAttribute('data-disabled')).toBe('');

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('focus hooks (wiring — focus moves are E2E)', () => {
    it('fires (autoFocusOnOpen) on open and (autoFocusOnClose) on close', async () => {
      const r = renderHost(PickerHost);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(r.instance.autoFocusOnOpenCount).toBe(1);
      expect(r.instance.autoFocusOnCloseCount).toBe(0);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(r.instance.autoFocusOnCloseCount).toBe(1);
    });

    it('honors a vetoed open without throwing', async () => {
      const r = renderHost(PickerHost);
      r.instance.vetoOpen.set(true);

      r.instance.open.set(true);
      await flush(r.fixture);
      // The veto is observed (output fired); the suppressed focus move itself
      // is asserted in the Playwright suite where activeElement is faithful.
      expect(r.instance.autoFocusOnOpenCount).toBe(1);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('selection', () => {
    it('single-mode activation replaces value, closes, and leaves query empty (no label commit)', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('');
    });

    it('resets the query on close so a reopen shows the full list with the picked option checked', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      typeInto(getPickerInput(), 'ban');
      await flush(r.fixture);
      expect(r.instance.query()).toBe('ban');

      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.query()).toBe('');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.query()).toBe('');
      for (const id of ['apple', 'apricot', 'banana', 'cherry', 'date']) {
        expect(document.querySelector(`[data-test-id="${id}"]`)).not.toBeNull();
      }
      expect(getOption('banana').getAttribute('data-state')).toBe('checked');
    });

    it('resets the query on a non-select close (escape) too', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      typeInto(getPickerInput(), 'ch');
      await flush(r.fixture);
      expect(r.instance.query()).toBe('ch');

      pressKey(getPickerInput(), 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('');
    });
  });

  describe('picker initial highlight on open (issue #754)', () => {
    it('seeds the committed selection on open', async () => {
      const r = renderHost(PickerHost);
      r.instance.value.set(['banana']);

      getTrigger().click();
      await flush(r.fixture);

      const input = getPickerInput();
      const bananaEl = getOption('banana');
      const appleEl = getOption('apple');
      expect(input.getAttribute('aria-activedescendant')).toBe(bananaEl.id);
      expect(bananaEl.getAttribute('data-highlighted')).toBe('');
      expect(appleEl.hasAttribute('data-highlighted')).toBe(false);
    });

    it('falls back to the first enabled option when there is no selection', async () => {
      const r = renderHost(PickerHost);

      getTrigger().click();
      await flush(r.fixture);

      const input = getPickerInput();
      const appleEl = getOption('apple');
      expect(input.getAttribute('aria-activedescendant')).toBe(appleEl.id);
      expect(appleEl.getAttribute('data-highlighted')).toBe('');
    });

    it('falls back to the first enabled option when the selected option is filtered out', async () => {
      const r = renderHost(PickerHost);
      r.instance.value.set(['banana']);

      getTrigger().click();
      await flush(r.fixture);

      typeInto(getPickerInput(), 'ap');
      await flush(r.fixture);

      const input = getPickerInput();
      const appleEl = getOption('apple');
      expect(input.getAttribute('aria-activedescendant')).toBe(appleEl.id);
      expect(document.querySelector('[data-test-id="banana"]')).toBeNull();
    });

    it('zoneless: seeds the committed selection without zone.js', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const r = renderHost(PickerHost);
      r.instance.value.set(['banana']);

      getTrigger().click();
      await flush(r.fixture);

      const input = getPickerInput();
      const bananaEl = getOption('banana');
      expect(input.getAttribute('aria-activedescendant')).toBe(bananaEl.id);
    });

    @Component({
      imports: [
        ForCombobox,
        ForComboboxTrigger,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxList,
        ForComboboxOption,
      ],
      template: `
        <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
          <button forComboboxTrigger data-test-id="trigger">Pick</button>
          @if (open()) {
            <div forComboboxContent>
              <input forComboboxInput data-test-id="picker-input" />
              <div forComboboxList>
                <div
                  data-test-id="add"
                  forComboboxOption
                  [value]="sentinel"
                  [label]="sentinelLabel"
                >
                  {{ sentinelLabel }}
                </div>
                @for (it of filtered(); track it.id) {
                  <div
                    [attr.data-test-id]="it.id"
                    forComboboxOption
                    [value]="it.id"
                    [label]="it.label"
                    [disabled]="!!it.disabled"
                  >
                    {{ it.label }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class StaticPickerHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
      readonly sentinel = '__add__';
      readonly sentinelLabel = 'Add new…';
      readonly filtered = computed<readonly FruitItem[]>(() => {
        const q = this.query().toLowerCase();
        return q ? FRUITS.filter((it) => it.label.toLowerCase().includes(q)) : FRUITS;
      });
    }

    it('seeds the committed selection without NG0950 when a static option precedes the @for list', async () => {
      const r = renderHost(StaticPickerHost);
      r.instance.value.set(['banana']);

      getTrigger().click();
      await flush(r.fixture);

      expect(getPickerInput().getAttribute('aria-activedescendant')).toBe(getOption('banana').id);
    });
  });

  describe('zoneless', () => {
    it('trigger → open → list role + focus hooks stay reactive without zone.js', async () => {
      const r = renderHost(PickerHost);
      const trigger = getTrigger();

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
      expect(getList().getAttribute('role')).toBe('listbox');
      expect(r.instance.autoFocusOnOpenCount).toBe(1);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(r.instance.autoFocusOnCloseCount).toBe(1);
    });

    it('picker query resets on close without zone.js', async () => {
      const r = renderHost(PickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      typeInto(getPickerInput(), 'ap');
      await flush(r.fixture);
      expect(r.instance.query()).toBe('ap');

      getOption('apple').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['apple']);
      expect(r.instance.query()).toBe('');
    });
  });

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxTrigger,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxList,
        ForComboboxOption,
        NgTemplateOutlet,
      ],
      template: `
        <ng-template #trig let-root="root">
          <button type="button" [forComboboxTrigger]="root">Pick</button>
        </ng-template>

        <div forCombobox [(open)]="open" #root="forCombobox">
          <ng-container [ngTemplateOutlet]="trig" [ngTemplateOutletContext]="{ root }" />
          @if (open()) {
            <div forComboboxContent>
              <input forComboboxInput />
              <div forComboboxList>
                <div forComboboxOption value="apple" label="Apple">Apple</div>
              </div>
            </div>
          }
        </div>
      `,
    })
    class StampedHost {
      readonly open = signal(false);
    }

    it('opens on click when the root is passed explicitly', async () => {
      const r = renderHost(StampedHost);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('[forComboboxContent]')).not.toBeNull();
    });

    it('open state stays reactive without zone.js through the explicit reference', async () => {
      const r = renderHost(StampedHost);
      const trigger = r.query<HTMLButtonElement>('button')!;

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-controls')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });
  });
});

describe('ForCombobox static option (issue #674)', () => {
  afterEachOverlayCleanup();

  // Repro shape from the issue: a static "add new…" sentinel option rendered
  // directly inside `@if (open())`, above the `@for` list. The static option
  // registers during the content view's creation pass but its `[value]`
  // binding only lands on the update pass; the label-cache fold (primed by the
  // host's bridge effect in between) used to read its `value()` early and
  // throw NG0950. The fold is now tolerant and re-folds once the binding lands.
  @Component({
    imports: BASE_IMPORTS,
    template: `
      <div forCombobox #cb="forCombobox" [(query)]="query" [(value)]="value" [(open)]="open">
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            <div data-test-id="add" forComboboxOption [value]="sentinel" [label]="sentinelLabel">
              {{ sentinelLabel }}
            </div>
            @for (it of filtered(); track it.id) {
              <div
                [attr.data-test-id]="it.id"
                forComboboxOption
                [value]="it.id"
                [label]="it.label"
                [disabled]="!!it.disabled"
              >
                {{ it.label }}
              </div>
            }
          </div>
        }
      </div>
      <output data-testid="sel">{{
        cb.selected().length ? cb.selected()[0]!.label : 'none'
      }}</output>
    `,
  })
  class StaticOptionHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>([]);
    readonly open = signal(false);
    readonly sentinel = '__add__';
    readonly sentinelLabel = 'Add new…';
    readonly filtered = computed<readonly FruitItem[]>(() => {
      const q = this.query().toLowerCase();
      return q ? FRUITS.filter((it) => it.label.toLowerCase().includes(q)) : FRUITS;
    });
  }

  const selText = (root: HTMLElement) =>
    root.querySelector<HTMLElement>('[data-testid="sel"]')!.textContent;

  it('opens without NG0950 and renders both the static option and the @for list', async () => {
    const r = renderHost(StaticOptionHost);
    r.instance.open.set(true);
    // A throw here is the NG0950 regression — the fold reading the static
    // option's `value()` before its binding was written.
    await flush(r.fixture);

    expect(getOption('add')).toBeTruthy();
    expect(getOption('apple')).toBeTruthy();
    expect(getOption('date')).toBeTruthy();
  });

  it('makes the static option part of the navigable collection (index 0)', async () => {
    const r = renderHost(StaticOptionHost);
    const input = getInput();
    r.instance.open.set(true);
    await flush(r.fixture);

    // Auto-highlight seeds the first enabled option — the static sentinel.
    expect(input.getAttribute('aria-activedescendant')).toBe(getOption('add').id);

    // ArrowDown moves to the first @for option, proving the static option
    // occupies index 0 of the navigable collection.
    pressKey(input, 'ArrowDown');
    await flush(r.fixture);
    expect(input.getAttribute('aria-activedescendant')).toBe(getOption('apple').id);
  });

  it('commits the static option and resolves its label from the cache after close', async () => {
    const r = renderHost(StaticOptionHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    getOption('add').click();
    await flush(r.fixture);

    expect(r.instance.value()).toEqual(['__add__']);
    // Single-mode activation closed the listbox, so the options unmounted. The
    // label still resolves through the persisted cache — proving the static
    // option folded in once its inputs were set.
    expect(selText(r.el)).toBe('Add new…');
  });

  it('keeps the static option mounted while the @for list filters', async () => {
    const r = renderHost(StaticOptionHost);
    const input = getInput();
    r.instance.open.set(true);
    await flush(r.fixture);

    typeInto(input, 'ap');
    await flush(r.fixture);

    expect(getOption('add')).toBeTruthy();
    expect(getOption('apple')).toBeTruthy();
    expect(getOption('apricot')).toBeTruthy();
    expect(document.querySelector('[data-test-id="banana"]')).toBeNull();
  });

  it('zoneless: re-folds the static option once its binding lands', async () => {
    const r = renderHost(StaticOptionHost);
    // Pre-select the sentinel before the listbox ever opens — cold cache.
    r.instance.value.set(['__add__']);
    await flush(r.fixture);
    expect(selText(r.el)).toBe('__add__');

    r.instance.open.set(true);
    await flush(r.fixture);
    // The static option registered, its `[value]` binding landed, and the
    // NG0950-tolerant fold re-ran — the cache now resolves the real label,
    // all without Zone.js (renderHost configures zoneless change detection).
    expect(selText(r.el)).toBe('Add new…');
  });
});

describe('ForCombobox object values', () => {
  afterEachOverlayCleanup();

  interface City {
    readonly id: string;
    readonly name: string;
  }

  const CITIES: readonly City[] = [
    { id: 'paris', name: 'Paris' },
    { id: 'berlin', name: 'Berlin' },
    { id: 'rome', name: 'Rome' },
  ];

  // Single-mode object host. Notice the directive class is not annotated
  // with an explicit `<City>` — the template-binding inference is enough
  // to specialize the model and the option `value` input to `City`.
  @Component({
    imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
    template: `
      <div
        forCombobox
        [(query)]="query"
        [(value)]="value"
        [(open)]="open"
        [isItemEqualToValue]="equals"
        [itemToStringLabel]="toLabel"
      >
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            @for (it of CITIES; track it.id) {
              <div [attr.data-test-id]="it.id" forComboboxOption [value]="it">
                {{ it.name }}
              </div>
            }
          </div>
        }
      </div>
    `,
  })
  class ObjectHost {
    readonly query = signal('');
    readonly value = signal<readonly City[]>([]);
    readonly open = signal(false);
    readonly CITIES = CITIES;
    readonly equals = (a: City, b: City) => a.id === b.id;
    readonly toLabel = (it: City) => it.name;
  }

  it('activation commits the full object into [(value)]', async () => {
    const r = renderHost(ObjectHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    document.querySelector<HTMLElement>('[data-test-id="berlin"]')!.click();
    await flush(r.fixture);

    expect(r.instance.value()).toEqual([{ id: 'berlin', name: 'Berlin' }]);
    // commitOnSelect wrote the resolved label into query (option label
    // falls back through itemToStringLabel because [label] is omitted).
    expect(r.instance.query()).toBe('Berlin');
    expect(r.instance.open()).toBe(false);
  });

  it('selectedItem exposes the sole selected object (single mode)', async () => {
    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
      template: `
        <div
          forCombobox
          #cb="forCombobox"
          [(value)]="value"
          [(open)]="open"
          [isItemEqualToValue]="equals"
          [itemToStringLabel]="toLabel"
        >
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent>
              @for (it of CITIES; track it.id) {
                <div [attr.data-test-id]="it.id" forComboboxOption [value]="it">{{ it.name }}</div>
              }
            </div>
          }
        </div>
        <output data-testid="selected">{{ cb.selectedItem()?.name ?? 'none' }}</output>
      `,
    })
    class Host {
      readonly value = signal<readonly City[]>([]);
      readonly open = signal(false);
      readonly CITIES = CITIES;
      readonly equals = (a: City, b: City) => a.id === b.id;
      readonly toLabel = (it: City) => it.name;
    }

    const r = renderHost(Host);
    const selectedText = () =>
      r.el.querySelector<HTMLElement>('[data-testid="selected"]')!.textContent;
    await flush(r.fixture);
    expect(selectedText()).toBe('none');

    r.instance.open.set(true);
    await flush(r.fixture);
    document.querySelector<HTMLElement>('[data-test-id="rome"]')!.click();
    await flush(r.fixture);
    expect(selectedText()).toBe('Rome');
  });

  it('isItemEqualToValue drives selection lookup (different reference, same id)', async () => {
    const r = renderHost(ObjectHost);
    // Pre-seed value with a NEW reference that has the same id as one of
    // the registered options. Without isItemEqualToValue the option would
    // not be recognised as selected (=== fails on distinct refs).
    r.instance.value.set([{ id: 'paris', name: 'Paris' }]);
    r.instance.open.set(true);
    await flush(r.fixture);

    const paris = document.querySelector<HTMLElement>('[data-test-id="paris"]')!;
    expect(paris.getAttribute('data-state')).toBe('checked');

    const berlin = document.querySelector<HTMLElement>('[data-test-id="berlin"]')!;
    expect(berlin.getAttribute('data-state')).toBe('unchecked');
  });

  it('mirrors the object value into the hidden input via JSON.stringify by default', async () => {
    @Component({
      imports: [ForCombobox, ForComboboxInput],
      template: `
        <div forCombobox name="city" [(value)]="value" [isItemEqualToValue]="equals">
          <input forComboboxInput />
        </div>
      `,
    })
    class Host {
      readonly value = signal<readonly City[]>([{ id: 'paris', name: 'Paris' }]);
      readonly equals = (a: City, b: City) => a.id === b.id;
    }

    const r = renderHost(Host);
    await flush(r.fixture);

    const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.name).toBe('city');
    expect(inputs[0]!.value).toBe(JSON.stringify({ id: 'paris', name: 'Paris' }));
  });

  it('honours a custom itemToFormValue (per-item id)', async () => {
    @Component({
      imports: [ForCombobox, ForComboboxInput],
      template: `
        <div
          forCombobox
          multiple
          name="cities"
          [(value)]="value"
          [isItemEqualToValue]="equals"
          [itemToFormValue]="toForm"
        >
          <input forComboboxInput />
        </div>
      `,
    })
    class Host {
      readonly value = signal<readonly City[]>([CITIES[0]!, CITIES[1]!]);
      readonly equals = (a: City, b: City) => a.id === b.id;
      readonly toForm = (it: City) => it.id;
    }

    const r = renderHost(Host);
    await flush(r.fixture);

    const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
    expect(inputs.map((i) => i.value)).toEqual(['paris', 'berlin']);
    expect(inputs.every((i) => i.name === 'cities')).toBe(true);
  });

  describe('multi mode', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxOption,
        ForComboboxChips,
        ForComboboxChip,
        ForComboboxChipRemove,
      ],
      template: `
        <div
          forCombobox
          multiple
          [(query)]="query"
          [(value)]="value"
          [(open)]="open"
          [isItemEqualToValue]="equals"
          [itemToStringLabel]="toLabel"
        >
          <div forComboboxChips>
            @for (chip of selectedFromCtx(); track chip.value.id) {
              <span forComboboxChip [value]="chip.value" [attr.data-test-chip]="chip.value.id">
                {{ chip.label }}
                <button forComboboxChipRemove [attr.data-test-remove]="chip.value.id">×</button>
              </span>
            }
            <input forComboboxInput />
          </div>
          @if (open()) {
            <div forComboboxContent>
              @for (it of CITIES; track it.id) {
                <div [attr.data-test-id]="it.id" forComboboxOption [value]="it">
                  {{ it.name }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class MultiObjectHost {
      readonly query = signal('');
      readonly value = signal<readonly City[]>([]);
      readonly open = signal(false);
      readonly CITIES = CITIES;
      readonly equals = (a: City, b: City) => a.id === b.id;
      readonly toLabel = (it: City) => it.name;
      readonly selectedFromCtx = computed(() =>
        this.value().map((v) => ({ value: v, label: v.name })),
      );
    }

    it('toggles object values in/out of [(value)] using isItemEqualToValue', async () => {
      const r = renderHost(MultiObjectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.querySelector<HTMLElement>('[data-test-id="paris"]')!.click();
      await flush(r.fixture);
      expect(r.instance.value().map((c) => c.id)).toEqual(['paris']);

      document.querySelector<HTMLElement>('[data-test-id="berlin"]')!.click();
      await flush(r.fixture);
      expect(r.instance.value().map((c) => c.id)).toEqual(['paris', 'berlin']);

      // Toggling Paris off must locate it via id (the click hands a fresh
      // option-handle reference, so === would not find it).
      document.querySelector<HTMLElement>('[data-test-id="paris"]')!.click();
      await flush(r.fixture);
      expect(r.instance.value().map((c) => c.id)).toEqual(['berlin']);
    });

    it('renders one chip per selected object and removes via chip-remove', async () => {
      const r = renderHost(MultiObjectHost);
      r.instance.value.set([CITIES[0]!, CITIES[2]!]);
      await flush(r.fixture);

      expect(document.querySelector('[data-test-chip="paris"]')).not.toBeNull();
      expect(document.querySelector('[data-test-chip="rome"]')).not.toBeNull();
      expect(document.querySelector('[data-test-chip="berlin"]')).toBeNull();

      document.querySelector<HTMLButtonElement>('[data-test-remove="rome"]')!.click();
      await flush(r.fixture);
      expect(r.instance.value().map((c) => c.id)).toEqual(['paris']);
    });
  });

  describe('zoneless', () => {
    it('object selection stays reactive without zone.js', async () => {
      const r = renderHost(ObjectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.value.set([{ id: 'rome', name: 'Rome' }]);
      await flush(r.fixture);

      // data-state reflects membership in value() regardless of mode —
      // that's the canonical CSS hook. aria-selected follows the
      // activedescendant in single mode, so we stay off it here.
      const rome = document.querySelector<HTMLElement>('[data-test-id="rome"]')!;
      expect(rome.getAttribute('data-state')).toBe('checked');
    });
  });
});

describe('ForComboboxStatus', () => {
  afterEachOverlayCleanup();

  @Component({
    imports: [
      ForCombobox,
      ForComboboxInput,
      ForComboboxContent,
      ForComboboxOption,
      ForComboboxStatus,
    ],
    template: `
      <div forCombobox [(open)]="open" [(query)]="query">
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            <div data-test-id="status" forComboboxStatus #status="forComboboxStatus">
              @if (loading()) {
                Searching…
              } @else if (status.count() === 0) {
                No matches.
              } @else {
                {{ status.count() }} results.
              }
            </div>
            @for (it of filtered(); track it) {
              <div [attr.data-test-id]="it" forComboboxOption [value]="it" [label]="it">
                {{ it }}
              </div>
            }
          </div>
        }
      </div>
    `,
  })
  class StatusHost {
    readonly open = signal(true);
    readonly query = signal('');
    readonly loading = signal(false);
    readonly items = signal<readonly string[]>(['apple', 'apricot', 'banana']);
    readonly filtered = computed(() => {
      const q = this.query().toLowerCase();
      return this.items().filter((it) => it.includes(q));
    });
  }

  function statusEl(): HTMLElement {
    const el = document.querySelector<HTMLElement>('[data-test-id="status"]');
    if (!el) throw new Error('Status element not found.');
    return el;
  }

  it('sets role=status, aria-live=polite, and aria-atomic=true', async () => {
    const r = renderHost(StatusHost);
    await flush(r.fixture);
    const el = statusEl();

    expect(el.getAttribute('role')).toBe('status');
    expect(el.getAttribute('aria-live')).toBe('polite');
    expect(el.getAttribute('aria-atomic')).toBe('true');
  });

  it('exposes a live count signal that reflects ctx.options().length', async () => {
    const r = renderHost(StatusHost);
    await flush(r.fixture);

    expect(statusEl().textContent?.trim()).toMatch(/^3 results\.$/);

    r.instance.query.set('ap');
    await flush(r.fixture);
    expect(statusEl().textContent?.trim()).toMatch(/^2 results\.$/);

    r.instance.query.set('zzz');
    await flush(r.fixture);
    expect(statusEl().textContent?.trim()).toMatch(/^No matches\.$/);
  });

  it('hosts the projected loading message when the consumer sets a loading flag', async () => {
    const r = renderHost(StatusHost);
    r.instance.loading.set(true);
    await flush(r.fixture);
    expect(statusEl().textContent?.trim()).toMatch(/^Searching…$/);
  });

  it('throws when used outside [forCombobox]', () => {
    @Component({
      imports: [ForComboboxStatus],
      template: `<div forComboboxStatus></div>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/combobox\] ForComboboxStatus must be used inside a \[forCombobox\] element\./,
    );
  });

  describe('zoneless reactivity', () => {
    it('count tracks options without Zone.js', async () => {
      const r = renderHost(StatusHost);
      await flush(r.fixture);

      expect(statusEl().textContent?.trim()).toMatch(/^3 results\.$/);
      r.instance.items.set(['apple']);
      await flush(r.fixture);
      expect(statusEl().textContent?.trim()).toMatch(/^1 results\.$/);
    });
  });
});

describe('ForComboboxIndicator', () => {
  afterEachOverlayCleanup();

  @Component({
    imports: [
      ForCombobox,
      ForComboboxInput,
      ForComboboxContent,
      ForComboboxOption,
      ForComboboxIndicator,
    ],
    template: `
      <div forCombobox [(open)]="open" [(value)]="value">
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            <div data-test-id="apple" forComboboxOption value="apple" label="Apple">
              <span data-test-id="apple-ind" forComboboxIndicator>✓</span>
              Apple
            </div>
            <div data-test-id="banana" forComboboxOption value="banana" label="Banana">
              <span data-test-id="banana-ind" forComboboxIndicator class="consumer-flex">✓</span>
              Banana
            </div>
          </div>
        }
      </div>
    `,
  })
  class IndicatorHost {
    readonly open = signal(true);
    readonly value = signal<readonly string[]>([]);
  }

  function indicator(testId: string): HTMLElement {
    const el = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);
    if (!el) {
      throw new Error(`Indicator [data-test-id="${testId}"] not found.`);
    }
    return el;
  }

  it('hides while unselected and shows when the option enters value()', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('apple-ind').hasAttribute('hidden')).toBe(true);
    expect(indicator('apple-ind').getAttribute('data-state')).toBe('unchecked');

    r.instance.value.set(['apple']);
    await flush(r.fixture);

    expect(indicator('apple-ind').hasAttribute('hidden')).toBe(false);
    expect(indicator('apple-ind').getAttribute('data-state')).toBe('checked');
  });

  it('enforces inline display:none while unselected so a consumer display class cannot leak through', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('banana-ind').style.display).toBe('none');

    r.instance.value.set(['banana']);
    await flush(r.fixture);

    expect(indicator('banana-ind').style.display).toBe('');
  });

  it('marks the indicator aria-hidden so screen readers ignore the decoration', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);
    expect(indicator('apple-ind').getAttribute('aria-hidden')).toBe('true');
  });

  it('throws when used outside [forComboboxOption]', () => {
    @Component({
      imports: [ForComboboxIndicator],
      template: `<span forComboboxIndicator></span>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/combobox\] ForComboboxIndicator must be used inside a \[forComboboxOption\] element\./,
    );
  });

  it('resolves a subclassed option via the re-provided FOR_COMBOBOX_OPTION token', async () => {
    @Directive({
      selector: '[testComboboxOption]',
      providers: [{ provide: FOR_COMBOBOX_OPTION, useExisting: TestComboboxOption }],
    })
    class TestComboboxOption extends ForComboboxOption {}

    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForComboboxContent,
        TestComboboxOption,
        ForComboboxIndicator,
      ],
      template: `
        <div forCombobox [(open)]="open" [(value)]="value">
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent>
              <div data-test-id="apple" testComboboxOption value="apple" label="Apple">
                <span data-test-id="apple-ind" forComboboxIndicator>✓</span>
                Apple
              </div>
            </div>
          }
        </div>
      `,
    })
    class SubclassHost {
      readonly open = signal(true);
      readonly value = signal<readonly string[]>(['apple']);
    }

    const r = renderHost(SubclassHost);
    await flush(r.fixture);
    expect(indicator('apple-ind').getAttribute('data-state')).toBe('checked');
  });

  describe('zoneless reactivity', () => {
    it('flips visibility on value change without Zone.js', async () => {
      const r = renderHost(IndicatorHost);
      await flush(r.fixture);

      expect(indicator('apple-ind').hasAttribute('hidden')).toBe(true);
      r.instance.value.set(['apple']);
      await flush(r.fixture);
      expect(indicator('apple-ind').hasAttribute('hidden')).toBe(false);
    });
  });
});

describe('ForCombobox virtualization', () => {
  afterEachOverlayCleanup();

  // Synthetic 100-item source. Cherry at index 3 is disabled across all
  // tests so virtualized navigation has a stable disabled boundary.
  interface VItem {
    readonly id: string;
    readonly label: string;
    readonly disabled?: boolean;
  }
  const TOTAL = 100;
  const ITEMS: readonly VItem[] = Array.from({ length: TOTAL }, (_, i) => ({
    id: `item-${i}`,
    label: `Item ${i}`,
    disabled: i === 3,
  }));

  /**
   * Synthetic virtualizer host: renders only `[start, end)` of the source
   * array but exposes the full `totalCount` to the directive. Tracks
   * `(scrollToIndex)` emissions and lets tests advance the visible range.
   */
  @Component({
    imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
    template: `
      <div
        forCombobox
        [(query)]="query"
        [(value)]="value"
        [(open)]="open"
        [totalCount]="ITEMS.length"
        [visibleRange]="range()"
        (scrollToIndex)="onScrollToIndex($event)"
      >
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            @for (it of windowed(); track it.id) {
              <div
                [attr.data-test-id]="it.id"
                forComboboxOption
                [value]="it.id"
                [label]="it.label"
                [posInSet]="it.posInSet"
                [disabled]="!!it.disabled"
              >
                {{ it.label }}
              </div>
            }
          </div>
        }
      </div>
    `,
  })
  class VirtHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>([]);
    readonly open = signal(false);
    readonly ITEMS = ITEMS;
    readonly range = signal<readonly [number, number]>([0, 10]);
    readonly scrollToIndexCalls: number[] = [];

    readonly windowed = computed<readonly (VItem & { posInSet: number })[]>(() => {
      const [start, end] = this.range();
      return ITEMS.slice(start, end).map((it, i) => ({ ...it, posInSet: start + i }));
    });

    onScrollToIndex(idx: number): void {
      this.scrollToIndexCalls.push(idx);
      // Mimic a virtualizer: scroll the requested index into a 10-row
      // window centered around it.
      const start = Math.max(0, Math.min(ITEMS.length - 10, idx - 5));
      this.range.set([start, start + 10]);
    }
  }

  it('emits aria-setsize / aria-posinset on options only, never on the role=listbox container (issue #1145 item 10)', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
    expect(content.getAttribute('role')).toBe('listbox');
    expect(content.getAttribute('aria-setsize')).toBeNull();

    const item0 = document.querySelector<HTMLElement>('[data-test-id="item-0"]')!;
    expect(item0.getAttribute('aria-posinset')).toBe('1');
    expect(item0.getAttribute('aria-setsize')).toBe('100');

    const item5 = document.querySelector<HTMLElement>('[data-test-id="item-5"]')!;
    expect(item5.getAttribute('aria-posinset')).toBe('6');
  });

  describe('aria-posinset fallback (issue #1145 item 6)', () => {
    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
      template: `
        <div forCombobox [(open)]="open" [totalCount]="100">
          <input forComboboxInput />
          @if (open()) {
            <div forComboboxContent>
              @for (row of rows; track row.id) {
                <div
                  [attr.data-test-id]="row.id"
                  forComboboxOption
                  [value]="row.id"
                  [label]="row.label"
                >
                  {{ row.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class VirtNoPosHost {
      readonly open = signal(false);
      readonly rows = [
        { id: 'row-a', label: 'Row A' },
        { id: 'row-b', label: 'Row B' },
      ];
    }

    it('emits null (not the window-relative DOM index) when virtualizing without an explicit posInSet', async () => {
      const r = renderHost(VirtNoPosHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const rowA = document.querySelector<HTMLElement>('[data-test-id="row-a"]')!;
      const rowB = document.querySelector<HTMLElement>('[data-test-id="row-b"]')!;
      expect(rowA.getAttribute('aria-posinset')).toBeNull();
      expect(rowB.getAttribute('aria-posinset')).toBeNull();
      expect(rowA.getAttribute('aria-setsize')).toBe('100');
    });
  });

  describe('picker-anatomy listbox container (issue #1145 item 10)', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxTrigger,
        ForComboboxInput,
        ForComboboxContent,
        ForComboboxList,
        ForComboboxOption,
      ],
      template: `
        <div forCombobox [(open)]="open" [totalCount]="ITEMS.length" [visibleRange]="range()">
          <button forComboboxTrigger>Pick</button>
          @if (open()) {
            <div forComboboxContent>
              <input forComboboxInput />
              <div forComboboxList>
                @for (it of windowed(); track it.id) {
                  <div
                    [attr.data-test-id]="it.id"
                    forComboboxOption
                    [value]="it.id"
                    [label]="it.label"
                    [posInSet]="it.posInSet"
                    [disabled]="!!it.disabled"
                  >
                    {{ it.label }}
                  </div>
                }
              </div>
            </div>
          }
        </div>
      `,
    })
    class VirtPickerHost {
      readonly open = signal(false);
      readonly ITEMS = ITEMS;
      readonly range = signal<readonly [number, number]>([0, 10]);
      readonly windowed = computed<readonly (VItem & { posInSet: number })[]>(() => {
        const [start, end] = this.range();
        return ITEMS.slice(start, end).map((it, i) => ({ ...it, posInSet: start + i }));
      });
    }

    it('carries no aria-setsize on the role=listbox list; its options do', async () => {
      const r = renderHost(VirtPickerHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const list = document.querySelector<HTMLElement>('[forComboboxList]')!;
      expect(list.getAttribute('role')).toBe('listbox');
      expect(list.getAttribute('aria-setsize')).toBeNull();

      const item0 = document.querySelector<HTMLElement>('[data-test-id="item-0"]')!;
      expect(item0.getAttribute('aria-setsize')).toBe('100');
      expect(item0.getAttribute('aria-posinset')).toBe('1');
    });
  });

  it('navigation past the rendered window emits (scrollToIndex)', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);
    // Auto-highlight has activeId on item-0. Visible window is [0, 10).
    const input = getInput();
    input.focus();

    // Press End → last enabled (index 99). Out of window → emits scrollToIndex.
    pressKey(input, 'End');
    await flush(r.fixture);
    expect(r.instance.scrollToIndexCalls).toContain(99);

    // The host advances the window to [89, 99]. Once item-99 mounts, the
    // pending pos resolves to its id.
    const item99 = document.querySelector<HTMLElement>('[data-test-id="item-99"]')!;
    expect(input.getAttribute('aria-activedescendant')).toBe(item99.id);
  });

  it('scrolling the active option out of view does not snap the window back to the top', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);
    // Auto-highlight seeded item-0 in the initial [0, 10) window.
    const input = getInput();
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.querySelector<HTMLElement>('[data-test-id="item-0"]')!.id,
    );

    // Consumer scrolls: advance the rendered window so item-0 unmounts. This
    // clears the activedescendant and re-enters the auto-highlight branch.
    r.instance.scrollToIndexCalls.length = 0;
    r.instance.range.set([30, 40]);
    await flush(r.fixture);

    // The directive must not ask the consumer to scroll back to the top...
    expect(r.instance.scrollToIndexCalls).toEqual([]);
    // ...the window stays where the user left it...
    expect(document.querySelector('[data-test-id="item-0"]')).toBeNull();
    // ...and the highlight rides the topmost rendered row.
    const item30 = document.querySelector<HTMLElement>('[data-test-id="item-30"]')!;
    expect(input.getAttribute('aria-activedescendant')).toBe(item30.id);
  });

  it('in-window navigation skips disabled options and stays inside the visible range', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);
    const input = getInput();
    input.focus();

    // Auto-highlight is item-0. ArrowDown three times: 0 → 1 → 2 → 4 (3 disabled).
    pressKey(input, 'ArrowDown');
    await flush(r.fixture);
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.querySelector<HTMLElement>('[data-test-id="item-1"]')!.id,
    );
    pressKey(input, 'ArrowDown');
    await flush(r.fixture);
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.querySelector<HTMLElement>('[data-test-id="item-2"]')!.id,
    );
    pressKey(input, 'ArrowDown');
    await flush(r.fixture);
    expect(input.getAttribute('aria-activedescendant')).toBe(
      document.querySelector<HTMLElement>('[data-test-id="item-4"]')!.id,
    );
    expect(r.instance.scrollToIndexCalls).toEqual([]);
  });

  // Off-window snapshot merging and totalCount-based reset are covered by
  // `combobox-snapshot.spec.ts` directly against `ComboboxSnapshot` (see
  // `cachedOptions persistence` / `snapshotByPos and merged cachedOptions`).
  // Re-asserting via `directive.cachedOptions()` from this spec would
  // duplicate that coverage AND reach into a directive-internal signal —
  // the headless contract is the DOM (`aria-activedescendant`, inline
  // autocomplete completion, etc.), not the snapshot cache shape.

  it('zoneless: virtualized navigation works without Zone.js', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const input = getInput();
    input.focus();
    pressKey(input, 'End');
    await flush(r.fixture);

    expect(r.instance.scrollToIndexCalls.at(-1)).toBe(99);
    const item99 = document.querySelector<HTMLElement>('[data-test-id="item-99"]')!;
    expect(input.getAttribute('aria-activedescendant')).toBe(item99.id);
  });

  describe('[forField] integration', () => {
    @Component({
      imports: [
        ForCombobox,
        ForComboboxInput,
        ForField,
        ForLabel,
        ForFieldDescription,
        ForFieldError,
      ],
      template: `
        <div forField>
          <label forLabel data-test-id="label">Fruit</label>
          <div forCombobox [invalid]="invalid()">
            <input forComboboxInput data-test-id="input" />
          </div>
          <p forFieldDescription data-test-id="desc">Choose one.</p>
          <p forFieldError data-test-id="error">Required.</p>
        </div>
      `,
    })
    class FieldHost {
      readonly invalid = signal(false);
    }

    // Non-`<label>` label element forwards the click to the input via
    // `clickControl()` instead of the native `for` association.
    @Component({
      imports: [ForCombobox, ForComboboxInput, ForField, ForLabel],
      template: `
        <div forField>
          <span forLabel data-test-id="label">Fruit</span>
          <div forCombobox>
            <input forComboboxInput data-test-id="input" />
          </div>
        </div>
      `,
    })
    class SpanLabelHost {}

    const wrapper = (el: HTMLElement) => el.querySelector<HTMLElement>('[forCombobox]')!;
    const input = (el: HTMLElement) =>
      el.querySelector<HTMLInputElement>('[data-test-id="input"]')!;
    const label = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-test-id="label"]')!;

    it('lands aria-labelledby/aria-describedby on the input, not the wrapper', () => {
      const { el } = renderHost(FieldHost);
      const i = input(el);
      const w = wrapper(el);

      expect(i.getAttribute('aria-labelledby')).toBe(label(el).id);
      expect(i.getAttribute('aria-describedby')).toBe(
        el.querySelector('[data-test-id="desc"]')!.id,
      );
      expect(w.hasAttribute('aria-labelledby')).toBe(false);
      expect(w.hasAttribute('aria-describedby')).toBe(false);
    });

    it('points the label `for` at the input id', () => {
      const { el } = renderHost(FieldHost);
      expect(label(el).getAttribute('for')).toBe(input(el).id);
    });

    it('focuses the input when the label is clicked', () => {
      const { el } = renderHost(SpanLabelHost);
      const i = input(el);

      label(el).click();
      expect(document.activeElement).toBe(i);
    });

    it('targets aria-errormessage at the error on the input while invalid', async () => {
      const r = renderHost(FieldHost);
      const i = input(r.el);
      const error = r.el.querySelector<HTMLElement>('[data-test-id="error"]')!;

      expect(i.hasAttribute('aria-errormessage')).toBe(false);
      r.instance.invalid.set(true);
      await flush(r.fixture);

      expect(i.getAttribute('aria-errormessage')).toBe(error.id);
      expect(i.getAttribute('aria-describedby')).toContain(error.id);
    });
  });
});
