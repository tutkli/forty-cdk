import { ChangeDetectionStrategy, Component, signal } from '@angular/core';

import { pressKey } from 'forty-cdk/testing';

import {
  afterEachOverlayCleanup,
  flush,
  renderHost,
  type RenderResult,
} from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxOption } from './combobox-option';

const TOTAL = 20;

@Component({
  imports: [ForCombobox, ForComboboxInput, ForComboboxContent, ForComboboxOption],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      forCombobox
      [(open)]="open"
      [(value)]="picked"
      [multiple]="multiple()"
      [autoHighlight]="false"
      [totalCount]="20"
      [visibleRange]="range()"
      (scrollToIndex)="onScrollToIndex($event)"
    >
      <input forComboboxInput aria-label="Rows" />
      @if (open()) {
        <div forComboboxContent>
          @for (row of windowRows(); track row.index) {
            <div forComboboxOption [value]="'row-' + row.index" [posInSet]="row.index">
              Row {{ row.index }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
class ResumeHost {
  readonly open = signal(true);
  readonly multiple = signal(false);
  readonly picked = signal<readonly string[]>([]);
  readonly range = signal<readonly [number, number]>([0, 5]);
  readonly scrolled = signal<number | null>(null);

  windowRows(): readonly { readonly index: number }[] {
    const [start, end] = this.range();
    return Array.from({ length: end - start }, (_, k) => ({ index: start + k }));
  }

  onScrollToIndex(index: number): void {
    this.scrolled.set(index);
    const start = Math.max(0, Math.min(index - 2, TOTAL - 5));
    this.range.set([start, start + 5]);
  }
}

const input = (): HTMLInputElement =>
  document.querySelector<HTMLInputElement>('[forComboboxInput]')!;

async function strandRowTwo(r: RenderResult<ResumeHost>): Promise<void> {
  await flush(r.fixture);
  for (let press = 0; press < 3; press++) {
    pressKey(input(), 'ArrowDown');
    await flush(r.fixture);
  }
  const activeId = input().getAttribute('aria-activedescendant')!;
  expect(document.getElementById(activeId)?.textContent).toContain('Row 2');

  r.instance.range.set([10, 15]);
  await flush(r.fixture);
  expect(input().hasAttribute('aria-activedescendant')).toBe(false);
}

describe('ForCombobox virtualized resume position', () => {
  afterEachOverlayCleanup();

  it('Enter in multiple mode toggles the option the user was on and keeps the listbox open', async () => {
    const r = renderHost(ResumeHost);
    r.instance.multiple.set(true);
    await strandRowTwo(r);

    const enter = pressKey(input(), 'Enter');
    await flush(r.fixture);

    expect(enter.defaultPrevented).toBe(true);
    expect(r.instance.picked()).toEqual(['row-2']);
    expect(r.instance.open()).toBe(true);
  });

  it('typing in the input forgets the position, so ArrowDown restarts from the first option', async () => {
    const r = renderHost(ResumeHost);
    await strandRowTwo(r);

    input().value = 'R';
    input().dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
    await flush(r.fixture);
    pressKey(input(), 'ArrowDown');
    await flush(r.fixture);

    expect(r.instance.scrolled()).toBe(0);
  });

  it('closing the listbox forgets the position, so ArrowDown after reopening starts from the first option', async () => {
    const r = renderHost(ResumeHost);
    await strandRowTwo(r);

    pressKey(input(), 'Escape');
    await flush(r.fixture);
    expect(r.instance.open()).toBe(false);
    r.instance.open.set(true);
    await flush(r.fixture);
    pressKey(input(), 'ArrowDown');
    await flush(r.fixture);

    expect(r.instance.scrolled()).toBe(0);
  });
});
