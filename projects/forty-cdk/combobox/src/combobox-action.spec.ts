import { Component, ErrorHandler, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxAction } from './combobox-action';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxInput } from './combobox-input';
import { ForComboboxList } from './combobox-list';
import { ForComboboxOption } from './combobox-option';

const FRUITS = ['apple', 'banana', 'cherry'] as const;

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
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
            (activate)="onAction()"
          >
            Create "{{ query() }}"
          </button>
          <div forComboboxList>
            @for (fruit of FRUITS; track fruit) {
              <div forComboboxOption [value]="fruit">{{ fruit }}</div>
            }
          </div>
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

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    ForComboboxAction,
  ],
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
      <input forComboboxInput />
      <div forComboboxContent>
        <button forComboboxAction data-testid="action">Create</button>
        <div forComboboxList>
          @for (fruit of FRUITS; track fruit) {
            <div forComboboxOption [value]="fruit">{{ fruit }}</div>
          }
        </div>
      </div>
    </div>
  `,
})
class ActionMountedWhileClosedHost {
  protected readonly FRUITS = FRUITS;
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
}

@Component({
  imports: [
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxList,
    ForComboboxOption,
    ForComboboxAction,
  ],
  template: `
    <div forCombobox [(query)]="query" [(value)]="value" [(open)]="open">
      <input forComboboxInput />
      @if (open()) {
        <div forComboboxContent>
          <button forComboboxAction data-testid="action1" [disabled]="disabled1()">One</button>
          <button forComboboxAction data-testid="action2" [disabled]="disabled2()">Two</button>
          <div forComboboxList>
            @for (fruit of FRUITS; track fruit) {
              <div forComboboxOption [value]="fruit">{{ fruit }}</div>
            }
          </div>
        </div>
      }
    </div>
  `,
})
class TwoActionHost {
  protected readonly FRUITS = FRUITS;
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
  readonly disabled1 = signal(false);
  readonly disabled2 = signal(false);
}

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
          <button forComboboxAction data-testid="action" [disabled]="actionDisabled()">
            Create
          </button>
          @for (fruit of FRUITS; track fruit) {
            <div forComboboxOption [value]="fruit">{{ fruit }}</div>
          }
        </div>
      }
    </div>
  `,
})
class NoListActionHost {
  protected readonly FRUITS = FRUITS;
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(true);
  readonly actionDisabled = signal(false);
}

function getAction(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>('[data-testid="action"]')!;
}

function getActionByTestId(testid: string): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>(`[data-testid="${testid}"]`)!;
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

  it('emits (activate) on click and never mutates value', async () => {
    const r = renderHost(ActionHost);
    await flush(r.fixture);

    getAction().click();
    await flush(r.fixture);

    expect(r.instance.actionCount()).toBe(1);
    expect(r.instance.value()).toEqual([]);
  });

  it('emits (activate) on Enter and Space', async () => {
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

    it('does not preventDefault Enter / Space on a disabled action', async () => {
      const r = renderHost(ActionHost);
      r.instance.actionDisabled.set(true);
      await flush(r.fixture);
      const action = getAction();

      const enter = pressKey(action, 'Enter');
      const space = pressKey(action, ' ');
      await flush(r.fixture);

      expect(enter.defaultPrevented).toBe(false);
      expect(space.defaultPrevented).toBe(false);
      expect(r.instance.actionCount()).toBe(0);
    });
  });

  describe('action Tab while closed', () => {
    it('does not intercept Tab when the popup is closed', async () => {
      const r = renderHost(ActionMountedWhileClosedHost);
      await flush(r.fixture);

      const tab = pressKey(getAction(), 'Tab');
      await flush(r.fixture);

      expect(tab.defaultPrevented).toBe(false);
    });

    it('intercepts Tab when the popup is open', async () => {
      const r = renderHost(ActionMountedWhileClosedHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const tab = pressKey(getAction(), 'Tab');
      await flush(r.fixture);

      expect(tab.defaultPrevented).toBe(true);
    });
  });

  describe('disabled action keeps the ring', () => {
    it('still intercepts Tab from a focused action that became disabled', async () => {
      const r = renderHost(TwoActionHost);
      await flush(r.fixture);

      const second = getActionByTestId('action2');
      second.dispatchEvent(new FocusEvent('focus'));
      r.instance.disabled2.set(true);
      await flush(r.fixture);

      const tab = pressKey(second, 'Tab');
      await flush(r.fixture);

      expect(tab.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(true);
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

  describe('requires a [forComboboxList]', () => {
    async function collectErrors<T>(host: new () => T): Promise<unknown[]> {
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

      const fixture = TestBed.createComponent(host);
      let thrown: unknown = null;
      try {
        fixture.detectChanges();
        await flush(fixture);
      } catch (e) {
        thrown = e;
      }
      return thrown === null ? captured : [...captured, thrown];
    }

    function hasAnatomyError(errors: unknown[]): boolean {
      return errors.some(
        (e) =>
          e instanceof Error &&
          /\[forty-cdk\/combobox\] \[forComboboxAction\] must be nested/.test(e.message),
      );
    }

    it('throws when an action is rendered without a [forComboboxList]', async () => {
      const errors = await collectErrors(NoListActionHost);
      expect(hasAnatomyError(errors)).toBe(true);
    });

    it('throws even when the action is disabled (a disabled action is still a listbox child)', async () => {
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
      const fixture = TestBed.createComponent(NoListActionHost);
      fixture.componentInstance.actionDisabled.set(true);
      let thrown: unknown = null;
      try {
        fixture.detectChanges();
        await flush(fixture);
      } catch (e) {
        thrown = e;
      }
      const errors = thrown === null ? captured : [...captured, thrown];
      expect(hasAnatomyError(errors)).toBe(true);
    });

    it('does not throw when the action is a sibling of a [forComboboxList]', async () => {
      const errors = await collectErrors(ActionHost);
      expect(hasAnatomyError(errors)).toBe(false);
    });
  });

  it('reflects a disabled write, blocks its click, and consumes Tab when enabled', async () => {
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

    fixture.componentInstance.actionDisabled.set(false);
    await flush(fixture);
    const tab = pressKey(getAction(), 'Tab');
    await flush(fixture);
    expect(tab.defaultPrevented).toBe(true);
  });
});
