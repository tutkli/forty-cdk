import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { afterEachOverlayCleanup, flush, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxAction } from './combobox-action';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxEmpty } from './combobox-empty';
import { ForComboboxGroup } from './combobox-group';
import { ForComboboxGroupLabel } from './combobox-group-label';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxList } from './combobox-list';
import { ForComboboxOption } from './combobox-option';
import { ForComboboxTrigger } from './combobox-trigger';

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxGroup,
    ForComboboxGroupLabel,
    ForComboboxOption,
    ForComboboxEmpty,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox [(open)]="open" [(value)]="value" multiple>
      <input forComboboxInput aria-label="Fruit" data-test-id="input" />
      @if (open()) {
        <div forComboboxContent data-test-id="content">
          <div forComboboxGroup>
            <div forComboboxGroupLabel data-test-id="group-label">Fruit</div>
            <div forComboboxOption value="apple">Apple</div>
            <div forComboboxOption value="banana">Banana</div>
          </div>
          <div forComboboxEmpty data-test-id="empty">No results</div>
          <button type="button" data-test-id="consumer">Help</button>
        </div>
      }
    </div>
  `,
})
class EditableHost {
  readonly open = signal(true);
  readonly value = signal<readonly string[]>([]);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxTrigger,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    ForComboboxAction,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forCombobox [(open)]="open">
      <button forComboboxTrigger>Fruit</button>
      @if (open()) {
        <div forComboboxContent data-test-id="content">
          <input forComboboxInput aria-label="Search" data-test-id="input" />
          <button forComboboxAction data-test-id="action">Create</button>
          <div forComboboxList data-test-id="list">
            <div forComboboxOption value="apple">Apple</div>
            <div forComboboxOption value="banana">Banana</div>
          </div>
        </div>
      }
    </div>
  `,
})
class PickerHost {
  readonly open = signal(true);
}

function byTestId(id: string): HTMLElement {
  const found = document.querySelector<HTMLElement>(`[data-test-id="${id}"]`);
  expect(found, id).not.toBeNull();
  return found!;
}

describe('combobox surface press', () => {
  afterEachOverlayCleanup();

  describe('editable anatomy', () => {
    async function setup() {
      const rendered = renderHost(EditableHost);
      await flush(rendered.fixture);
      byTestId('input').focus();
      await flush(rendered.fixture);
      return rendered;
    }

    for (const target of ['content', 'group-label', 'empty']) {
      it(`keeps focus on the input when ${target} is pressed`, async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId(target));
        await flush(fixture);

        expect(document.activeElement).toBe(byTestId('input'));
        expect(fixture.componentInstance.open()).toBe(true);
      });
    }

    it('keeps the keyboard on the input after a press on the padding', async () => {
      const { fixture } = await setup();

      pressWithMouse(byTestId('content'));
      await flush(fixture);
      pressKey(document.activeElement!, 'ArrowDown');
      await flush(fixture);
      pressKey(document.activeElement!, 'Enter');
      await flush(fixture);

      expect(fixture.componentInstance.value()).toHaveLength(1);
    });

    it('still focuses a consumer control inside the surface', async () => {
      const { fixture } = await setup();

      pressWithMouse(byTestId('consumer'));
      await flush(fixture);

      expect(document.activeElement).toBe(byTestId('consumer'));
    });
  });

  describe('picker anatomy', () => {
    async function setup() {
      const rendered = renderHost(PickerHost);
      await flush(rendered.fixture);
      byTestId('input').focus();
      await flush(rendered.fixture);
      return rendered;
    }

    for (const target of ['list', 'content']) {
      it(`keeps focus on the search input when ${target} is pressed`, async () => {
        const { fixture } = await setup();

        pressWithMouse(byTestId(target));
        await flush(fixture);

        expect(document.activeElement).toBe(byTestId('input'));
        expect(fixture.componentInstance.open()).toBe(true);
      });
    }

    it('still focuses an action pressed inside the surface', async () => {
      const { fixture } = await setup();

      pressWithMouse(byTestId('action'));
      await flush(fixture);

      expect(document.activeElement).toBe(byTestId('action'));
    });
  });
});
