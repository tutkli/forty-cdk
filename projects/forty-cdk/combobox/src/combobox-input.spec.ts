import { Component, computed, signal } from '@angular/core';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxOption } from './combobox-option';

interface FruitItem {
  readonly id: string;
  readonly label: string;
}

const FRUITS: readonly FruitItem[] = [
  { id: 'apple', label: 'apple' },
  { id: 'apricot', label: 'apricot' },
  { id: 'banana', label: 'banana' },
];

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [autocompleteMode]="autocompleteMode()"
      [autoHighlight]="false"
      [openOnQuery]="false"
    >
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          @for (it of filtered(); track it.id) {
            <div [attr.data-test-id]="it.id" forComboboxOption [value]="it.id" [label]="it.label">
              {{ it.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class ComboboxInputHost {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
  readonly autocompleteMode = signal<'none' | 'list' | 'inline' | 'both'>('list');

  readonly filtered = computed<readonly FruitItem[]>(() => {
    const q = this.query().toLowerCase();
    if (!q) return FRUITS;
    return FRUITS.filter((it) => it.label.toLowerCase().includes(q));
  });
}

/**
 * Mirrors the mtx-combobox single-select dismiss UX: the listbox is driven
 * one-way and `(openChange)` restores the committed label whenever it closes
 * without a selection. The committed label write must reach the DOM even
 * though Escape leaves focus in the input.
 */
@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [open]="open()"
      (openChange)="onOpenChange($event)"
      [openOnQuery]="false"
    >
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          @for (it of FRUITS; track it.id) {
            <div [attr.data-test-id]="it.id" forComboboxOption [value]="it.id" [label]="it.label">
              {{ it.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class RestoreOnCloseHost {
  readonly committedLabel = 'apple';
  readonly query = signal('apple');
  readonly value = signal<readonly string[]>(['apple']);
  readonly open = signal(false);
  readonly FRUITS = FRUITS;

  onOpenChange(open: boolean): void {
    this.open.set(open);
    if (!open) {
      this.query.set(this.committedLabel);
    }
  }
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open" [openOnQuery]="false">
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          @for (it of FRUITS; track it.id) {
            <div [attr.data-test-id]="it.id" forComboboxOption [value]="it.id" [label]="it.label">
              {{ it.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class ComboboxImeHost {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
  readonly FRUITS = FRUITS;
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(open)]="open"
      autocompleteMode="both"
      [openOnQuery]="false"
    >
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          @for (it of visible(); track it.id) {
            <div [attr.data-test-id]="it.id" forComboboxOption [value]="it.id" [label]="it.label">
              {{ it.label }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class InlineActiveHost {
  readonly query = signal('');
  readonly open = signal(false);
  readonly visible = signal<readonly FruitItem[]>([
    { id: 'apple', label: 'Apple' },
    { id: 'apricot', label: 'Apricot' },
    { id: 'banana', label: 'Banana' },
  ]);
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
}

function fireInput(input: HTMLInputElement, value: string, caret: number, inputType: string): void {
  input.value = value;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new InputEvent('input', { inputType }));
}

describe('ForComboboxInput', () => {
  afterEachOverlayCleanup();

  describe('mid-string editing (issue #493)', () => {
    for (const mode of ['none', 'list', 'both'] as const) {
      it(`preserves the suffix on a caret-in-middle insert (autocompleteMode='${mode}')`, async () => {
        const r = renderHost(ComboboxInputHost);
        r.instance.autocompleteMode.set(mode);
        await flush(r.fixture);

        const input = getInput();
        input.focus();

        fireInput(input, 'apple', 3, 'insertText');
        await flush(r.fixture);

        expect(input.value).toBe('apple');
        expect(r.instance.query()).toBe('apple');
      });

      it(`preserves the suffix on a caret-in-middle delete (autocompleteMode='${mode}')`, async () => {
        const r = renderHost(ComboboxInputHost);
        r.instance.autocompleteMode.set(mode);
        await flush(r.fixture);

        const input = getInput();
        input.focus();

        fireInput(input, 'apple', 3, 'deleteContentBackward');
        await flush(r.fixture);

        expect(input.value).toBe('apple');
        expect(r.instance.query()).toBe('apple');
      });

      it(`preserves the full value on a caret-in-middle paste (autocompleteMode='${mode}')`, async () => {
        const r = renderHost(ComboboxInputHost);
        r.instance.autocompleteMode.set(mode);
        await flush(r.fixture);

        const input = getInput();
        input.focus();

        fireInput(input, 'apricot', 5, 'insertFromPaste');
        await flush(r.fixture);

        expect(input.value).toBe('apricot');
        expect(r.instance.query()).toBe('apricot');
      });
    }
  });

  describe('inline autocomplete still appends + selects the suggestion', () => {
    for (const mode of ['inline', 'both'] as const) {
      it(`completes the first match as selected text (autocompleteMode='${mode}')`, async () => {
        const r = renderHost(ComboboxInputHost);
        r.instance.autocompleteMode.set(mode);
        r.instance.open.set(true);
        await flush(r.fixture);
        r.instance.open.set(false);
        await flush(r.fixture);

        const input = getInput();
        input.focus();

        fireInput(input, 'ap', 2, 'insertText');
        await flush(r.fixture);

        expect(input.value).toBe('apple');
        expect(input.selectionStart).toBe(2);
        expect(input.selectionEnd).toBe(5);
        expect(r.instance.query()).toBe('ap');
      });
    }
  });

  describe('inline completion resolves against the active option while open (#1145)', () => {
    it('completes the active option, not a cached option filtered out of the list', async () => {
      const r = renderHost(InlineActiveHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.visible.set([{ id: 'apricot', label: 'Apricot' }]);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      fireInput(input, 'ap', 2, 'insertText');
      await flush(r.fixture);

      expect(input.value).toBe('Apricot');
      expect(input.selectionStart).toBe(2);
      expect(input.selectionEnd).toBe('Apricot'.length);
      expect(document.querySelector('[data-highlighted]')?.getAttribute('data-test-id')).toBe(
        'apricot',
      );
    });

    it('suppresses completion when no rendered option starts with the prefix', async () => {
      const r = renderHost(InlineActiveHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.visible.set([{ id: 'banana', label: 'Banana' }]);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      fireInput(input, 'ap', 2, 'insertText');
      await flush(r.fixture);

      expect(input.value).toBe('ap');
    });
  });

  // renderHost configures provideZonelessChangeDetection(), so these cases
  // exercise the close-transition sync under zoneless change detection.
  describe('syncs query to the DOM on the open→closed transition (issue #672)', () => {
    it('restores a committed label written from (openChange) on Escape close, focus in the input', async () => {
      const r = renderHost(RestoreOnCloseHost);
      await flush(r.fixture);

      const input = getInput();
      expect(input.value).toBe('apple');

      input.focus();
      expect(document.activeElement).toBe(input);

      // Open the listbox and edit the query down to a partial match.
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      fireInput(input, 'ap', 2, 'deleteContentBackward');
      await flush(r.fixture);
      expect(input.value).toBe('ap');
      expect(r.instance.query()).toBe('ap');

      // Escape closes the listbox; (openChange) restores the committed label.
      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('apple');
      // The restored label must reach the DOM despite focus staying in the input.
      expect(input.value).toBe('apple');
      expect(document.activeElement).toBe(input);
    });

    it('preserves caret protection: a query write while open and focused does not reach the DOM', async () => {
      const r = renderHost(RestoreOnCloseHost);
      await flush(r.fixture);

      const input = getInput();
      input.focus();
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      fireInput(input, 'ap', 2, 'deleteContentBackward');
      await flush(r.fixture);
      expect(input.value).toBe('ap');

      // A programmatic query write mid-edit (listbox still open, input focused)
      // must NOT clobber the visible text — the caret-protection skip holds.
      r.instance.query.set('apricot');
      await flush(r.fixture);

      expect(input.value).toBe('ap');
      expect(r.instance.query()).toBe('apricot');
    });
  });

  describe('ignores keydown during IME composition (issue #1135)', () => {
    it('confirm-Enter while composing neither activates the active option nor closes the listbox', async () => {
      const r = renderHost(ComboboxImeHost);
      await flush(r.fixture);

      const input = getInput();
      input.focus();

      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
      expect(input.getAttribute('aria-activedescendant')).not.toBeNull();

      const ev = pressKey(input, 'Enter', { isComposing: true });
      await flush(r.fixture);

      expect(ev.defaultPrevented).toBe(false);
      expect(r.instance.open()).toBe(true);
      expect(r.instance.value()).toEqual([]);
      expect(input.getAttribute('aria-expanded')).toBe('true');
    });

    it('arrow keydowns while composing do not move the active option', async () => {
      const r = renderHost(ComboboxImeHost);
      await flush(r.fixture);

      const input = getInput();
      input.focus();

      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      const active = input.getAttribute('aria-activedescendant');
      expect(active).not.toBeNull();

      const down = pressKey(input, 'ArrowDown', { isComposing: true });
      await flush(r.fixture);
      expect(down.defaultPrevented).toBe(false);
      expect(input.getAttribute('aria-activedescendant')).toBe(active);

      const up = pressKey(input, 'ArrowUp', { isComposing: true });
      await flush(r.fixture);
      expect(up.defaultPrevented).toBe(false);
      expect(input.getAttribute('aria-activedescendant')).toBe(active);
    });
  });
});
