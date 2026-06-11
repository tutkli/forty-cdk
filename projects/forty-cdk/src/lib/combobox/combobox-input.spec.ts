import { Component, computed, signal } from '@angular/core';

import { afterEachOverlayCleanup, flush, renderHost } from '../../test-utils';
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
});
