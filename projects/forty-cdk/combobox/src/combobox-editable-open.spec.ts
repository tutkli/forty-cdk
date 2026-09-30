import { Component, computed, signal } from '@angular/core';

import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
  pressWithMouse,
  type RenderResult,
  renderHost,
} from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxContent } from './combobox-content';
import { type ForComboboxOpenHighlight } from './combobox-context';
import { provideForComboboxDefaults } from './combobox-defaults';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxOption } from './combobox-option';
import { ForComboboxToggle } from './combobox-toggle';

interface Fruit {
  readonly id: string;
  readonly label: string;
}

const FRUITS: readonly Fruit[] = [
  { id: 'apple', label: 'Apple' },
  { id: 'apricot', label: 'Apricot' },
  { id: 'banana', label: 'Banana' },
  { id: 'date', label: 'Date' },
];

abstract class FruitHost {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
  readonly openChanges: boolean[] = [];
  readonly touches = signal(0);

  readonly filtered = computed<readonly Fruit[]>(() => {
    const q = this.query().toLowerCase();
    return q ? FRUITS.filter((it) => it.label.toLowerCase().includes(q)) : FRUITS;
  });
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [openHighlight]="openHighlight()"
      [openOnFocus]="openOnFocus()"
      #cb="forCombobox"
    >
      <input forComboboxInput />
      <button data-test-id="open-programmatic" (click)="cb.openOverlay()">Open</button>
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
class OpenHighlightHost extends FruitHost {
  readonly openHighlight = signal<ForComboboxOpenHighlight>('selected');
  readonly openOnFocus = signal(false);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  providers: [provideForComboboxDefaults({ openHighlight: 'selected' })],
  host: { 'data-fixture': 'open-highlight-defaults' },
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
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
class OpenHighlightDefaultsHost extends FruitHost {}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxToggle,
  ],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [disabled]="disabled()"
      (openChange)="openChanges.push($event)"
      (touch)="touches.set(touches() + 1)"
    >
      <input forComboboxInput />
      <button forComboboxToggle data-test-id="toggle">▾</button>
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
class ToggleHost extends FruitHost {
  readonly disabled = signal(false);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxToggle],
  providers: [provideForComboboxDefaults({ toggleAriaLabel: 'Mostrar opciones' })],
  template: `
    <div forCombobox>
      <input forComboboxInput />
      <button forComboboxToggle data-test-id="toggle-default">▾</button>
      <button forComboboxToggle data-test-id="toggle-bound" ariaLabel="Countries">▾</button>
    </div>
  `,
})
class ToggleLabelHost {}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  template: `
    <div
      forCombobox
      [(query)]="query"
      [(value)]="value"
      [(open)]="open"
      [multiple]="multiple()"
      [restoreQueryOnClose]="restore()"
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
class RestoreHost extends FruitHost {
  readonly restore = signal(true);
  readonly multiple = signal(false);
}

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  providers: [provideForComboboxDefaults({ restoreQueryOnClose: true })],
  host: { 'data-fixture': 'restore-defaults' },
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
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
class RestoreDefaultsHost extends FruitHost {}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
}

function getByTestId(testId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);
  if (!el) {
    throw new Error(`[data-test-id="${testId}"] not found in DOM.`);
  }
  return el;
}

function activeOptionTestId(): string | null {
  const id = getInput().getAttribute('aria-activedescendant');
  return id === null ? null : (document.getElementById(id)?.getAttribute('data-test-id') ?? null);
}

function typeInto(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text }));
}

function pressOutside(): void {
  const outside = document.createElement('button');
  document.body.appendChild(outside);
  try {
    pressWithMouse(outside);
  } finally {
    outside.remove();
  }
}

describe('ForCombobox editable anatomy', () => {
  afterEachOverlayCleanup();

  describe('openHighlight', () => {
    it('highlights the selected option when ArrowDown opens a closed combobox', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      pressKey(getInput(), 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeOptionTestId()).toBe('banana');
    });

    it('highlights the selected option when ArrowUp opens a closed combobox', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.value.set(['apricot']);
      await flush(r.fixture);

      pressKey(getInput(), 'ArrowUp');
      await flush(r.fixture);

      expect(activeOptionTestId()).toBe('apricot');
    });

    it('highlights the selected option when focus opens the combobox', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.openOnFocus.set(true);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      getInput().focus();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeOptionTestId()).toBe('banana');
    });

    it('highlights the selected option when a click reopens the combobox', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.openOnFocus.set(true);
      r.instance.value.set(['date']);
      await flush(r.fixture);
      const input = getInput();
      input.focus();
      await flush(r.fixture);
      pressKey(input, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      input.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeOptionTestId()).toBe('date');
    });

    it('falls back to the first option on ArrowDown and the last on ArrowUp with no value', async () => {
      const r = renderHost(OpenHighlightHost);
      const input = getInput();

      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(activeOptionTestId()).toBe('apple');

      pressKey(input, 'Escape');
      await flush(r.fixture);
      pressKey(input, 'ArrowUp');
      await flush(r.fixture);
      expect(activeOptionTestId()).toBe('date');
    });

    it('highlights the first match when typing opens the combobox', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      typeInto(getInput(), 'a');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeOptionTestId()).toBe('apple');
    });

    it('seeds the selection from openOverlay() called without an argument', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.value.set(['date']);
      await flush(r.fixture);

      getByTestId('open-programmatic').click();
      await flush(r.fixture);

      expect(activeOptionTestId()).toBe('date');
    });

    it('keeps highlighting the first option under the default openHighlight', async () => {
      const r = renderHost(OpenHighlightHost);
      r.instance.openHighlight.set('first');
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      pressKey(getInput(), 'ArrowDown');
      await flush(r.fixture);

      expect(activeOptionTestId()).toBe('apple');
    });

    it('applies provideForComboboxDefaults({ openHighlight }) to the scope', async () => {
      const r = renderHost(OpenHighlightDefaultsHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      pressKey(getInput(), 'ArrowDown');
      await flush(r.fixture);

      expect(activeOptionTestId()).toBe('banana');
    });
  });

  describe('[forComboboxToggle]', () => {
    it('closes an open listbox with exactly one openChange(false)', async () => {
      const r = renderHost(ToggleHost);
      const input = getInput();
      input.focus();
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
      r.instance.openChanges.length = 0;

      pressWithMouse(getByTestId('toggle'));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.openChanges).toEqual([false]);
    });

    it('opens with the committed option highlighted and focus in the input', async () => {
      const r = renderHost(ToggleHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      pressWithMouse(getByTestId('toggle'));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeOptionTestId()).toBe('banana');
      expect(document.activeElement).toBe(getInput());
    });

    it('falls back to the first option when nothing is selected', async () => {
      const r = renderHost(ToggleHost);

      pressWithMouse(getByTestId('toggle'));
      await flush(r.fixture);

      expect(activeOptionTestId()).toBe('apple');
    });

    it('keeps focus on the input and does not mark the combobox touched', async () => {
      const r = renderHost(ToggleHost);
      const input = getInput();
      input.focus();
      await flush(r.fixture);

      pressWithMouse(getByTestId('toggle'));
      await flush(r.fixture);
      pressWithMouse(getByTestId('toggle'));
      await flush(r.fixture);

      expect(document.activeElement).toBe(input);
      expect(r.instance.touches()).toBe(0);
    });

    it('treats focus moving onto the toggle as staying inside the combobox', async () => {
      const r = renderHost(ToggleHost);
      getInput().dispatchEvent(
        new FocusEvent('focusout', { bubbles: true, relatedTarget: getByTestId('toggle') }),
      );
      await flush(r.fixture);

      expect(r.instance.touches()).toBe(0);
    });

    it('cancels mousedown so the press never takes focus', async () => {
      renderHost(ToggleHost);
      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

      getByTestId('toggle').dispatchEvent(mousedown);

      expect(mousedown.defaultPrevented).toBe(true);
    });

    it('is out of the Tab sequence and wires aria-expanded / aria-controls to open()', async () => {
      const r = renderHost(ToggleHost);
      const toggle = getByTestId('toggle');

      expect(toggle.getAttribute('type')).toBe('button');
      expect(toggle.getAttribute('tabindex')).toBe('-1');
      expect(toggle.getAttribute('aria-label')).toBe('Show options');
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
      expect(toggle.hasAttribute('aria-controls')).toBe(false);
      expect(toggle.getAttribute('data-state')).toBe('closed');

      pressWithMouse(toggle);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forComboboxContent]')!;
      expect(toggle.getAttribute('aria-expanded')).toBe('true');
      expect(toggle.getAttribute('aria-controls')).toBe(content.id);
      expect(getInput().getAttribute('aria-controls')).toBe(content.id);
      expect(toggle.getAttribute('data-state')).toBe('open');
    });

    it('localizes its accessible name through provideForComboboxDefaults', () => {
      renderHost(ToggleLabelHost);

      expect(getByTestId('toggle-default').getAttribute('aria-label')).toBe('Mostrar opciones');
      expect(getByTestId('toggle-bound').getAttribute('aria-label')).toBe('Countries');
    });

    it('keeps the editable anatomy: a pick commits the label and query survives close', async () => {
      const r = renderHost(ToggleHost);
      const toggle = getByTestId('toggle');

      pressWithMouse(toggle);
      await flush(r.fixture);
      pressWithMouse(getByTestId('apricot'));
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['apricot']);
      expect(r.instance.query()).toBe('Apricot');
      expect(getInput().value).toBe('Apricot');

      typeInto(getInput(), 'Ban');
      await flush(r.fixture);
      pressWithMouse(toggle);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('Ban');
    });

    it('reflects the combobox disabled state and ignores presses', async () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      const toggle = getByTestId('toggle');

      expect(toggle.hasAttribute('disabled')).toBe(true);
      expect(toggle.getAttribute('data-disabled')).toBe('');
      toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('restoreQueryOnClose', () => {
    async function typeOverSelection(
      r: RenderResult<RestoreHost | RestoreDefaultsHost>,
    ): Promise<HTMLInputElement> {
      const input = getInput();
      input.focus();
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      pressKey(input, 'ArrowDown');
      pressKey(input, 'ArrowDown');
      await flush(r.fixture);
      expect(activeOptionTestId()).toBe('banana');
      pressKey(input, 'Enter');
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
      typeInto(input, 'Ap');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
      return input;
    }

    it('restores the selected label on Escape, with focus still in the input', async () => {
      const r = renderHost(RestoreHost);
      const input = await typeOverSelection(r);

      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('Banana');
      expect(input.value).toBe('Banana');
      expect(document.activeElement).toBe(input);
    });

    it('restores the selected label on an outside press', async () => {
      const r = renderHost(RestoreHost);
      const input = await typeOverSelection(r);

      pressOutside();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('Banana');
      expect(input.value).toBe('Banana');
    });

    it('restores the selected label on Tab', async () => {
      const r = renderHost(RestoreHost);
      const input = await typeOverSelection(r);

      pressKey(input, 'Tab');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.query()).toBe('Banana');
      expect(input.value).toBe('Banana');
    });

    it('clears the input when nothing is selected', async () => {
      const r = renderHost(RestoreHost);
      const input = getInput();
      input.focus();
      typeInto(input, 'Ap');
      await flush(r.fixture);

      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('');
      expect(input.value).toBe('');
    });

    it('still commits the activated option label', async () => {
      const r = renderHost(RestoreHost);
      const input = await typeOverSelection(r);

      pressWithMouse(getByTestId('apricot'));
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['apricot']);
      expect(r.instance.query()).toBe('Apricot');
      expect(input.value).toBe('Apricot');
    });

    it('leaves the typed query alone when the input is off', async () => {
      const r = renderHost(RestoreHost);
      r.instance.restore.set(false);
      const input = await typeOverSelection(r);

      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('Ap');
      expect(input.value).toBe('Ap');
    });

    it('is ignored in multi mode', async () => {
      const r = renderHost(RestoreHost);
      r.instance.multiple.set(true);
      const input = await typeOverSelection(r);

      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('Ap');
    });

    it('applies provideForComboboxDefaults({ restoreQueryOnClose }) to the scope', async () => {
      const r = renderHost(RestoreDefaultsHost);
      const input = await typeOverSelection(r);

      pressKey(input, 'Escape');
      await flush(r.fixture);

      expect(r.instance.query()).toBe('Banana');
    });
  });
});
