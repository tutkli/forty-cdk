import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxAction } from './combobox-action';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxOption } from './combobox-option';

const FRUITS = ['apple', 'banana', 'cherry'] as const;

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    ForComboboxAction,
  ],
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          <button
            forComboboxAction
            data-testid="action"
            [disabled]="actionDisabled()"
            (action)="onAction()"
          >
            Create "{{ query() }}"
          </button>
          @for (fruit of FRUITS; track fruit) {
            <div forComboboxOption [value]="fruit">{{ fruit }}</div>
          }
        </div>
      }
    </div>
  `,
})
class ActionHost {
  protected readonly FRUITS = FRUITS;
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
  readonly actionDisabled = signal(false);
  readonly actionCount = signal(0);

  onAction(): void {
    this.actionCount.update((n) => n + 1);
  }
}

function getAction(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[data-testid="action"]')!;
}

function getInput(): HTMLInputElement {
  return document.querySelector<HTMLInputElement>('[forComboboxInput]')!;
}

describe('ForComboboxAction', () => {
  afterEachOverlayCleanup();

  it('renders as a button, out of the option / value collection', async () => {
    const r = renderHost(ActionHost);
    await flush(r.fixture);

    const action = getAction();
    expect(action.getAttribute('role')).toBe('button');
    expect(action.getAttribute('type')).toBe('button');
    expect(action.getAttribute('tabindex')).toBe('-1');
    expect(action.getAttribute('id')).toBeTruthy();

    expect(action.getAttribute('role')).not.toBe('option');
    expect(document.querySelectorAll('[forComboboxContent] [role="option"]').length).toBe(
      FRUITS.length,
    );
  });

  it('emits (action) on click and never mutates value', async () => {
    const r = renderHost(ActionHost);
    await flush(r.fixture);

    getAction().click();
    await flush(r.fixture);

    expect(r.instance.actionCount()).toBe(1);
    expect(r.instance.value()).toEqual([]);
  });

  it('emits (action) on Enter and Space', async () => {
    const r = renderHost(ActionHost);
    await flush(r.fixture);
    const action = getAction();

    const enter = pressKey(action, 'Enter');
    const space = pressKey(action, ' ');
    await flush(r.fixture);

    expect(r.instance.actionCount()).toBe(2);
    expect(enter.defaultPrevented).toBe(true);
    expect(space.defaultPrevented).toBe(true);
    expect(r.instance.value()).toEqual([]);
  });

  it('reflects data-highlighted while focused', async () => {
    const r = renderHost(ActionHost);
    await flush(r.fixture);
    const action = getAction();

    expect(action.hasAttribute('data-highlighted')).toBe(false);

    action.dispatchEvent(new FocusEvent('focus'));
    await flush(r.fixture);
    expect(action.hasAttribute('data-highlighted')).toBe(true);

    action.dispatchEvent(new FocusEvent('blur'));
    await flush(r.fixture);
    expect(action.hasAttribute('data-highlighted')).toBe(false);
  });

  describe('disabled', () => {
    it('drops out of the focus order and reflects aria-disabled / data-disabled', async () => {
      const r = renderHost(ActionHost);
      r.instance.actionDisabled.set(true);
      await flush(r.fixture);

      const action = getAction();
      expect(action.hasAttribute('tabindex')).toBe(false);
      expect(action.getAttribute('aria-disabled')).toBe('true');
      expect(action.hasAttribute('data-disabled')).toBe(true);
    });

    it('ignores click and keyboard activation', async () => {
      const r = renderHost(ActionHost);
      r.instance.actionDisabled.set(true);
      await flush(r.fixture);
      const action = getAction();

      action.click();
      pressKey(action, 'Enter');
      pressKey(action, ' ');
      await flush(r.fixture);

      expect(r.instance.actionCount()).toBe(0);
    });
  });

  describe('input Tab wiring (model A)', () => {
    it('preventDefaults Tab and keeps the popup open when an enabled action exists', async () => {
      const r = renderHost(ActionHost);
      await flush(r.fixture);

      const tab = pressKey(getInput(), 'Tab');
      await flush(r.fixture);

      expect(tab.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(true);
    });

    it('lets Tab close the popup when the only action is disabled', async () => {
      const r = renderHost(ActionHost);
      r.instance.actionDisabled.set(true);
      await flush(r.fixture);

      const tab = pressKey(getInput(), 'Tab');
      await flush(r.fixture);

      expect(tab.defaultPrevented).toBe(false);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('action Tab / Escape', () => {
    it('preventDefaults Tab so focus cycles within the ring instead of leaving', async () => {
      const r = renderHost(ActionHost);
      await flush(r.fixture);

      const tab = pressKey(getAction(), 'Tab');
      expect(tab.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(true);
    });

    it('closes the popup on Escape from the action', async () => {
      const r = renderHost(ActionHost);
      await flush(r.fixture);

      const esc = pressKey(getAction(), 'Escape');
      await flush(r.fixture);

      expect(esc.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(false);
    });
  });

  it('works under zoneless change detection', async () => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    const fixture = TestBed.createComponent(ActionHost);
    await flush(fixture);

    const action = getAction();
    expect(action.getAttribute('aria-disabled')).toBeNull();

    fixture.componentInstance.actionDisabled.set(true);
    await flush(fixture);
    expect(action.getAttribute('aria-disabled')).toBe('true');

    getAction().click();
    await flush(fixture);
    expect(fixture.componentInstance.actionCount()).toBe(0);
  });
});
