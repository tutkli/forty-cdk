import { Component, signal } from '@angular/core';
import { form, FormField } from '@angular/forms/signals';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxList,
  ForComboboxOption,
  ForComboboxTrigger,
} from 'forty-cdk/combobox';

import { afterEachOverlayCleanup, flushPositioning, renderHost } from '../../src/test-utils';

interface FruitModel {
  readonly fruit: readonly string[];
}

function typeInto(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.setSelectionRange(text.length, text.length);
  input.dispatchEvent(new InputEvent('input', { inputType: 'insertText', data: text }));
}

const input = (): HTMLInputElement =>
  document.querySelector<HTMLInputElement>('[forComboboxInput]')!;

const option = (testId: string): HTMLElement =>
  document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`)!;

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption, FormField],
  template: `
    <div
      forCombobox
      [formField]="tree.fruit"
      [(query)]="query"
      [(open)]="open"
      [multiple]="multiple()"
      [commitOnSelect]="commitOnSelect()"
    >
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          <button forComboboxOption value="apple" data-test-id="apple">Apple</button>
          <button forComboboxOption value="banana" data-test-id="banana">Banana</button>
        </div>
      }
    </div>
  `,
})
class EditableHost {
  readonly model = signal<FruitModel>({ fruit: [] });
  readonly tree = form(this.model);
  readonly query = signal('');
  readonly open = signal(false);
  readonly multiple = signal(false);
  readonly commitOnSelect = signal(true);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    FormField,
  ],
  template: `
    <div forCombobox [formField]="tree.fruit" [(query)]="query" [(open)]="open">
      <button forComboboxTrigger>Pick</button>
      @if (open()) {
        <div forComboboxContent>
          <input forComboboxInput />
          <div forComboboxList>
            <div forComboboxOption value="apple" data-test-id="apple">Apple</div>
            <div forComboboxOption value="banana" data-test-id="banana">Banana</div>
          </div>
        </div>
      }
    </div>
  `,
})
class PickerHost {
  readonly model = signal<FruitModel>({ fruit: ['apple'] });
  readonly tree = form(this.model);
  readonly query = signal('');
  readonly open = signal(false);
}

describe('ForCombobox under a Signal Forms reset', () => {
  afterEachOverlayCleanup();

  describe('editable single select', () => {
    it('empties the committed label when the reset value is empty', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      instance.open.set(true);
      await flushPositioning(fixture);
      option('apple').click();
      await flushPositioning(fixture);
      expect(input().value).toBe('Apple');

      instance.tree.fruit().reset([]);
      await flushPositioning(fixture);

      expect(instance.model().fruit).toEqual([]);
      expect(input().value).toBe('');
      expect(instance.query()).toBe('');
    });

    it('empties text typed without a pick', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      typeInto(input(), 'Ban');
      await flushPositioning(fixture);
      expect(instance.query()).toBe('Ban');

      instance.tree.fruit().reset([]);
      await flushPositioning(fixture);

      expect(input().value).toBe('');
      expect(instance.query()).toBe('');
    });

    it('shows the label of the value the reset writes', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      instance.open.set(true);
      await flushPositioning(fixture);
      option('apple').click();
      await flushPositioning(fixture);
      typeInto(input(), 'App');
      await flushPositioning(fixture);

      instance.tree.fruit().reset(['banana']);
      await flushPositioning(fixture);

      expect(instance.model().fruit).toEqual(['banana']);
      expect(input().value).toBe('Banana');
      expect(instance.query()).toBe('Banana');
    });

    it('restores the label of the kept value when the reset writes none', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      instance.open.set(true);
      await flushPositioning(fixture);
      option('banana').click();
      await flushPositioning(fixture);
      typeInto(input(), 'Ap');
      await flushPositioning(fixture);

      instance.tree.fruit().reset();
      await flushPositioning(fixture);

      expect(input().value).toBe('Banana');
      expect(instance.query()).toBe('Banana');
    });

    it('empties the text without commitOnSelect, where a pick never shows the label', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      instance.commitOnSelect.set(false);
      instance.open.set(true);
      await flushPositioning(fixture);
      typeInto(input(), 'Ban');
      await flushPositioning(fixture);
      option('banana').click();
      await flushPositioning(fixture);

      instance.tree.fruit().reset(['banana']);
      await flushPositioning(fixture);

      expect(input().value).toBe('');
      expect(instance.query()).toBe('');
    });
  });

  describe('editable multi select', () => {
    it('empties typed text and shows no label, whatever the reset value', async () => {
      const { instance, fixture } = renderHost(EditableHost);
      instance.multiple.set(true);
      instance.open.set(true);
      await flushPositioning(fixture);
      option('apple').click();
      await flushPositioning(fixture);
      typeInto(input(), 'Ban');
      await flushPositioning(fixture);

      instance.tree.fruit().reset(['apple']);
      await flushPositioning(fixture);

      expect(instance.model().fruit).toEqual(['apple']);
      expect(input().value).toBe('');
      expect(instance.query()).toBe('');
    });
  });

  describe('picker anatomy', () => {
    it('empties the in-panel filter and keeps the panel input in step', async () => {
      const { instance, fixture } = renderHost(PickerHost);
      instance.open.set(true);
      await flushPositioning(fixture);
      typeInto(input(), 'Ban');
      await flushPositioning(fixture);
      expect(instance.query()).toBe('Ban');

      instance.tree.fruit().reset();
      await flushPositioning(fixture);

      expect(instance.model().fruit).toEqual(['apple']);
      expect(input().value).toBe('');
      expect(instance.query()).toBe('');
    });
  });
});
