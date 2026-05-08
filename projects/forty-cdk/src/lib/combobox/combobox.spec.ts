import { Component, computed, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxChip } from './combobox-chip';
import { ForComboboxChipRemove } from './combobox-chip-remove';
import { ForComboboxChips } from './combobox-chips';
import { ForComboboxClear } from './combobox-clear';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxEmpty } from './combobox-empty';
import { ForComboboxGroup } from './combobox-group';
import { ForComboboxGroupLabel } from './combobox-group-label';
import { ForComboboxIndicator } from './combobox-indicator';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxOption } from './combobox-option';
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
      [autocomplete]="autocomplete()"
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
  readonly autocomplete = signal<'none' | 'list' | 'inline' | 'both'>('list');
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
  afterEach(() => {
    document.querySelectorAll('[forComboboxContent]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('wires combobox role + aria-haspopup + aria-controls', async () => {
      const r = renderHost(ComboboxHost);
      const input = getInput();
      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-haspopup')).toBe('listbox');
      expect(input.getAttribute('aria-expanded')).toBe('false');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');

      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(content.getAttribute('role')).toBe('listbox');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-controls')).toBe(content.id);
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
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

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
      r.instance.autocomplete.set('both');
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
      r.instance.autocomplete.set('both');
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

  describe('autoHighlight', () => {
    it('does not seed activedescendant when autoHighlight is off', async () => {
      const r = renderHost(ComboboxHost);
      r.instance.autoHighlight.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const input = getInput();
      expect(input.getAttribute('aria-activedescendant')).toBeNull();
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

  describe('placement default flip under RTL', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div forCombobox dir="rtl">
          <input forComboboxInput />
        </div>
      `,
    })
    class RtlHost {}

    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div forCombobox dir="rtl" placement="top-end">
          <input forComboboxInput />
        </div>
      `,
    })
    class RtlHostWithPlacement {}

    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div forCombobox>
          <input forComboboxInput />
        </div>
      `,
    })
    class LtrHost {}

    function getCombobox<T>(r: ReturnType<typeof renderHost<T>>): ForCombobox {
      const el = r.query<HTMLElement>('[forCombobox]')!;
      const debug = r.fixture.debugElement.queryAll((node) => node.nativeElement === el)[0]!;
      return debug.injector.get(ForCombobox);
    }

    it('defaults placement to bottom-start in LTR', () => {
      const r = renderHost(LtrHost);
      expect(getCombobox(r).placement()).toBe('bottom-start');
    });

    it('defaults placement to bottom-end when dir="rtl" and consumer omits [placement]', () => {
      const r = renderHost(RtlHost);
      expect(getCombobox(r).placement()).toBe('bottom-end');
    });

    it('honors a consumer-provided [placement] in RTL (no auto-flip)', () => {
      const r = renderHost(RtlHostWithPlacement);
      expect(getCombobox(r).placement()).toBe('top-end');
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
  });
});

describe('ForCombobox object values', () => {
  interface City {
    readonly id: string;
    readonly name: string;
  }

  const CITIES: readonly City[] = [
    { id: 'paris', name: 'Paris' },
    { id: 'berlin', name: 'Berlin' },
    { id: 'rome', name: 'Rome' },
  ];

  afterEach(() => {
    document.querySelectorAll('[forComboboxContent]').forEach((n) => n.remove());
  });

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
  afterEach(() => {
    document.querySelectorAll('[forComboboxContent]').forEach((n) => n.remove());
  });

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
  afterEach(() => {
    document.querySelectorAll('[forComboboxContent]').forEach((n) => n.remove());
  });

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
              <span data-test-id="banana-ind" forComboboxIndicator [forceMount]="forceMount()"
                >✓</span
              >
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
    readonly forceMount = signal(false);
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

  it('keeps the indicator mounted when forceMount=true', async () => {
    const r = renderHost(IndicatorHost);
    r.instance.forceMount.set(true);
    await flush(r.fixture);

    expect(indicator('banana-ind').hasAttribute('hidden')).toBe(false);
    expect(indicator('banana-ind').getAttribute('data-state')).toBe('unchecked');
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

  afterEach(() => {
    document.querySelectorAll('[forComboboxContent]').forEach((n) => n.remove());
  });

  it('reflects aria-setsize on the listbox and aria-posinset on each option', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);

    const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
    expect(content.getAttribute('aria-setsize')).toBe('100');

    const item0 = document.querySelector<HTMLElement>('[data-test-id="item-0"]')!;
    expect(item0.getAttribute('aria-posinset')).toBe('1');
    expect(item0.getAttribute('aria-setsize')).toBe('100');

    const item5 = document.querySelector<HTMLElement>('[data-test-id="item-5"]')!;
    expect(item5.getAttribute('aria-posinset')).toBe('6');
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

  it('typeahead / inline autocomplete sees off-window labels through the snapshot', async () => {
    const r = renderHost(VirtHost);
    r.instance.open.set(true);
    await flush(r.fixture);
    // Walk the consumer-visible window [0, 10) → [50, 60) so the snapshot
    // captures both ranges. (Selection follows but isn't asserted here.)
    r.instance.range.set([50, 60]);
    await flush(r.fixture);
    r.instance.range.set([0, 10]);
    await flush(r.fixture);

    // Look up the directive instance to inspect its merged cache.
    const root = r.query<HTMLElement>('[forCombobox]')!;
    const debug = r.fixture.debugElement.queryAll((n) => n.nativeElement === root)[0]!;
    const cb = debug.injector.get(ForCombobox);
    const cached = cb.cachedOptions();
    const cachedIds = cached.map((o) => o.id);
    // Should include both windows' option ids — the off-window snapshot
    // is folded in even though only [0,10) is currently in the DOM.
    expect(cached.some((o) => o.label === 'Item 55')).toBe(true);
    expect(cachedIds.length).toBeGreaterThanOrEqual(20);
  });

  it('totalCount change resets the indexed snapshot', async () => {
    @Component({
      imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
      template: `
        <div forCombobox [(open)]="open" [totalCount]="total()">
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
                >
                  {{ it.label }}
                </div>
              }
            </div>
          }
        </div>
      `,
    })
    class ResetHost {
      readonly open = signal(true);
      readonly total = signal(100);
      readonly range = signal<readonly [number, number]>([50, 55]);
      readonly windowed = computed(() => {
        const [start, end] = this.range();
        return Array.from({ length: end - start }, (_, i) => ({
          id: `r-${start + i}`,
          label: `Row ${start + i}`,
          posInSet: start + i,
        }));
      });
    }

    const r = renderHost(ResetHost);
    await flush(r.fixture);

    const root = r.query<HTMLElement>('[forCombobox]')!;
    const debug = r.fixture.debugElement.queryAll((n) => n.nativeElement === root)[0]!;
    const cb = debug.injector.get(ForCombobox);
    expect(cb.cachedOptions().some((o) => o.label === 'Row 52')).toBe(true);

    // Flip totalCount → snapshot resets. Move to a fresh window so the new
    // cache is built from scratch.
    r.instance.total.set(20);
    r.instance.range.set([0, 5]);
    await flush(r.fixture);

    // Old entries from the previous totalCount are gone; only [0,5) appear.
    const labels = cb.cachedOptions().map((o) => o.label);
    expect(labels.some((l) => l === 'Row 52')).toBe(false);
    expect(labels.some((l) => l === 'Row 0')).toBe(true);
  });

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
});
