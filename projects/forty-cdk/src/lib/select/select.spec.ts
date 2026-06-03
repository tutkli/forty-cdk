import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  pressKey,
  renderHost,
} from '../../test-utils';
import { ForField } from '../field/field';
import { ForFieldDescription } from '../field/field-description';
import { ForFieldError } from '../field/field-error';
import { ForLabel } from '../field/label';
import { ForSelect } from './select';
import { ForSelectContent } from './select-content';
import { ForSelectGroup } from './select-group';
import { ForSelectGroupLabel } from './select-group-label';
import { ForSelectIndicator } from './select-indicator';
import { ForSelectOption } from './select-option';
import { ForSelectSeparator } from './select-separator';
import { ForSelectTrigger } from './select-trigger';
import { ForSelectValue } from './select-value';

const BASE_IMPORTS = [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption];

const HOST_IMPORTS = [...BASE_IMPORTS, ForSelectValue];

@Component({
  imports: HOST_IMPORTS,
  template: `
    <div
      forSelect
      [(open)]="open"
      [(value)]="value"
      [multiple]="multiple()"
      [disabled]="disabled()"
      [readonly]="readonly()"
      [dismissible]="dismissible()"
      [modal]="modal()"
      [position]="position()"
      [selectionFollowsFocus]="selectionFollowsFocus()"
      [placeholder]="placeholder()"
    >
      <button forSelectTrigger>
        <span forSelectValue [placeholder]="placeholder()"></span>
      </button>
      @if (open()) {
        <div forSelectContent>
          <button data-test-id="apple" forSelectOption value="apple">Apple</button>
          <button data-test-id="banana" forSelectOption value="banana">Banana</button>
          <button
            data-test-id="cherry"
            forSelectOption
            value="cherry"
            [disabled]="cherryDisabled()"
          >
            Cherry
          </button>
          <button data-test-id="date" forSelectOption value="date">Date</button>
        </div>
      }
    </div>
  `,
})
class SelectHost {
  readonly open = signal(false);
  readonly value = signal<readonly string[]>([]);
  readonly multiple = signal(false);
  readonly disabled = signal(false);
  readonly readonly = signal(false);
  readonly dismissible = signal(true);
  readonly modal = signal(false);
  readonly position = signal<'popper' | 'item-aligned'>('popper');
  readonly selectionFollowsFocus = signal(false);
  readonly placeholder = signal('');
  readonly cherryDisabled = signal(false);
}


/**
 * The option directive owns `[id]` (auto-generated) so literal `id="x"`
 * attributes get replaced. Tests query options by an opt-in `data-test-id`
 * attribute that the directive doesn't touch.
 */
function getOption(testId: string): HTMLElement {
  const el = document.querySelector<HTMLElement>(`[data-test-id="${testId}"]`);
  if (!el) {
    throw new Error(`Option [data-test-id="${testId}"] not found in DOM.`);
  }
  return el;
}

function activeTestId(): string | null {
  return document.activeElement?.getAttribute('data-test-id') ?? null;
}

describe('ForSelect', () => {
  afterEachOverlayCleanup();

  describe('a11y baseline', () => {
    it('wires combobox role + aria-haspopup + aria-expanded + aria-controls', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;

      expect(trigger.getAttribute('role')).toBe('combobox');
      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('role')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
    });

    it('options carry role=option + aria-selected + data-state', async () => {
      const r = renderHost(SelectHost);
      r.instance.value.set(['banana']);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      const banana = getOption('banana');
      expect(apple.getAttribute('role')).toBe('option');
      expect(apple.getAttribute('aria-selected')).toBe('false');
      expect(apple.getAttribute('data-state')).toBe('unchecked');
      expect(banana.getAttribute('aria-selected')).toBe('true');
      expect(banana.getAttribute('data-state')).toBe('checked');
    });

    it('exposes aria-multiselectable when multiple is on', async () => {
      const r = renderHost(SelectHost);
      r.instance.multiple.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('aria-multiselectable')).toBe('true');
    });

    it('reflects data-state on root, trigger, content, and option', async () => {
      const r = renderHost(SelectHost);
      const root = r.query<HTMLElement>('[forSelect]')!;
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      expect(root.getAttribute('data-state')).toBe('closed');
      expect(trigger.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(root.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('data-state')).toBe('open');
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('data-state')).toBe('open');
    });

    it('portals the listbox content directly under document.body', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.parentElement).toBe(document.body);
    });
  });

  describe('trigger interaction (closed)', () => {
    it('opens on click and focuses the first option when nothing selected', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeTestId()).toBe('apple');
    });

    it('opens on click and focuses the selected option', async () => {
      const r = renderHost(SelectHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      trigger.click();
      await flush(r.fixture);

      expect(activeTestId()).toBe('banana');
    });

    it('opens on ArrowDown and focuses first option', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeTestId()).toBe('apple');
    });

    it('opens on ArrowUp and focuses last enabled option (no selection)', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(activeTestId()).toBe('date');
    });

    it('opens on ArrowUp and focuses selected option (when one is selected)', async () => {
      const r = renderHost(SelectHost);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'ArrowUp');
      await flush(r.fixture);
      expect(activeTestId()).toBe('banana');
    });

    it('does nothing when disabled', async () => {
      const r = renderHost(SelectHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(trigger.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('single-mode selection', () => {
    it('click selects and closes the listbox', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(false);
    });

    it('Enter on focused option selects + closes (native button click)', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      // Native button click is synthesized via Enter on most browsers; simulate
      // via direct .click() since jsdom doesn't implement Enter→click.
      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(false);
    });

    it('selecting the same value again is idempotent (no deselect)', async () => {
      const r = renderHost(SelectHost);
      r.instance.value.set(['banana']);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
    });

    it('selecting a different value replaces the selection', async () => {
      const r = renderHost(SelectHost);
      r.instance.value.set(['apple']);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
    });

    it('disabled option is a no-op', async () => {
      const r = renderHost(SelectHost);
      r.instance.cherryDisabled.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('cherry').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([]);
      expect(r.instance.open()).toBe(true);
    });

    it('readonly blocks click selection but stays open', async () => {
      const r = renderHost(SelectHost);
      r.instance.readonly.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([]);
      expect(r.instance.open()).toBe(true);
    });

    it('selectionFollowsFocus commits on arrow nav', async () => {
      const r = renderHost(SelectHost);
      r.instance.selectionFollowsFocus.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'ArrowDown');
      await flush(r.fixture);

      expect(activeTestId()).toBe('banana');
      expect(r.instance.value()).toEqual(['banana']);
    });

    it('selectionFollowsFocus is ignored in readonly', async () => {
      const r = renderHost(SelectHost);
      r.instance.selectionFollowsFocus.set(true);
      r.instance.readonly.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'ArrowDown');
      await flush(r.fixture);

      expect(activeTestId()).toBe('banana');
      expect(r.instance.value()).toEqual([]);
    });
  });

  describe('multi-mode selection', () => {
    it('click toggles values and stays open', async () => {
      const r = renderHost(SelectHost);
      r.instance.multiple.set(true);
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

      getOption('apple').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('keyboard navigation (open)', () => {
    it('ArrowDown / ArrowUp move focus, wrapping with loop', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'ArrowDown');
      await flush(r.fixture);
      expect(activeTestId()).toBe('banana');

      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await flush(r.fixture);
      expect(activeTestId()).toBe('apple');
    });

    it('Home / End jump to first / last enabled', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'End');
      await flush(r.fixture);
      expect(activeTestId()).toBe('date');

      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      );
      await flush(r.fixture);
      expect(activeTestId()).toBe('apple');
    });

    it('navigation skips disabled options', async () => {
      const r = renderHost(SelectHost);
      r.instance.cherryDisabled.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const banana = getOption('banana');
      banana.focus();
      pressKey(banana, 'ArrowDown');
      await flush(r.fixture);
      expect(activeTestId()).toBe('date');
    });

    it('Tab commits the focused option, closes, and parks focus on the trigger', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      r.instance.open.set(true);
      await flush(r.fixture);

      const banana = getOption('banana');
      banana.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        bubbles: true,
        cancelable: true,
      });
      banana.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.value()).toEqual(['banana']);
      // Focus is parked on the trigger so the browser's Tab default action
      // can advance from a stable element to the next focusable.
      expect(document.activeElement).toBe(trigger);
      // CRITICAL: Tab must NOT preventDefault, otherwise the browser would
      // not advance focus past the trigger.
      expect(event.defaultPrevented).toBe(false);
    });

    it('Shift+Tab commits the focused option (same handling as Tab)', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      r.instance.open.set(true);
      await flush(r.fixture);

      const date = getOption('date');
      date.focus();
      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      date.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(r.instance.value()).toEqual(['date']);
      expect(document.activeElement).toBe(trigger);
      expect(event.defaultPrevented).toBe(false);
    });

    it('Tab in multi-mode closes without overwriting selection', async () => {
      const r = renderHost(SelectHost);
      r.instance.multiple.set(true);
      r.instance.value.set(['apple', 'banana']);
      r.instance.open.set(true);
      await flush(r.fixture);

      const date = getOption('date');
      date.focus();
      date.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      // Multi-mode: nothing committed by Tab — selection stays as-is.
      expect(r.instance.value()).toEqual(['apple', 'banana']);
    });

    it('Tab on a disabled select is a no-op', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      // Flip disabled after the listbox is mounted so options exist.
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      apple.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      // Disabled short-circuits commitOnTab — no value change, listbox stays open.
      expect(r.instance.value()).toEqual([]);
      expect(r.instance.open()).toBe(true);
    });

    it('Tab on a readonly select moves focus / closes but does not commit', async () => {
      const r = renderHost(SelectHost);
      r.instance.readonly.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const banana = getOption('banana');
      banana.focus();
      banana.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }),
      );
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      // Readonly: close fine, but no value mutation.
      expect(r.instance.value()).toEqual([]);
    });
  });

  describe('RTL', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div forSelect [(open)]="open" [orientation]="orientation()" [dir]="dir()">
          <button forSelectTrigger>open</button>
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              <button data-test-id="banana" forSelectOption value="banana">Banana</button>
              <button data-test-id="cherry" forSelectOption value="cherry">Cherry</button>
            </div>
          }
        </div>
      `,
    })
    class RtlSelectHost {
      readonly open = signal(false);
      readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
      readonly dir = signal<'ltr' | 'rtl'>('rtl');
    }

    it('reflects dir to the native dir attribute for both ltr and rtl', () => {
      const r = renderHost(RtlSelectHost);
      const root = r.query<HTMLElement>('[forSelect]')!;

      expect(root.getAttribute('dir')).toBe('rtl');

      r.instance.dir.set('ltr');
      r.flush();
      expect(root.getAttribute('dir')).toBe('ltr');
    });

    it('horizontal: ArrowLeft becomes the forward direction under dir="rtl"', async () => {
      const r = renderHost(RtlSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'ArrowLeft');
      await flush(r.fixture);
      expect(activeTestId()).toBe('banana');
    });

    it('vertical: ArrowUp / ArrowDown stay axis-positive (dir does not flip them)', async () => {
      const r = renderHost(RtlSelectHost);
      r.instance.orientation.set('vertical');
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'ArrowDown');
      await flush(r.fixture);
      expect(activeTestId()).toBe('banana');

      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
      );
      await flush(r.fixture);
      expect(activeTestId()).toBe('apple');
    });
  });

  describe('typeahead', () => {
    it('open: prefix-matches and focuses first match', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'd');
      await flush(r.fixture);
      expect(activeTestId()).toBe('date');
    });

    it('closed (single mode): selects matching option without opening', async () => {
      const r = renderHost(SelectHost);
      // Closed-state typeahead reads from the cached option snapshot — the
      // live registry is empty while the listbox is unmounted. Pre-warm the
      // cache by opening + closing once so options are recorded.
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'b');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
      expect(r.instance.open()).toBe(false);
    });

    it('closed (multi mode): typeahead is ignored at the trigger', async () => {
      const r = renderHost(SelectHost);
      r.instance.multiple.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'b');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual([]);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('Escape', () => {
    it('closes and returns focus to the trigger', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('keeps open when (escapeKeyDown) is preventDefault-ed', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open" (escapeKeyDown)="$event.preventDefault()">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button id="a" forSelectOption value="a">A</button>
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
      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('outside dismissal', () => {
    it('closes on pointer-down outside both content and trigger', async () => {
      const r = renderHost(SelectHost);
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

    it('does NOT close when pointer-down lands on the trigger (exempt)', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });
  });

  describe('modal mode', () => {
    // The focus-trap / inert / scroll-lock / return-focus post-state lives in
    // select.e2e.ts (jsdom mis-models `inert`, `document.activeElement`, and
    // the focus-event order). The Vitest layer asserts the wiring branches:
    // which ARIA / dismiss / veto outputs fire on the modal-shell path.
    it('reflects aria-modal="true" on the listbox surface in modal mode', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('role')).toBe('listbox');
      expect(content.getAttribute('aria-modal')).toBe('true');
    });

    it('omits aria-modal in the default (non-modal) mode', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.hasAttribute('aria-modal')).toBe(false);
    });

    it('still portals the listbox to document.body in modal mode', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.parentElement).toBe(document.body);
    });

    it('Escape closes the listbox in modal mode (dismiss via modal-shell)', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('outside pointer-down closes the listbox in modal mode', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
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

    it('dismissible=false keeps the listbox open on Escape in modal mode', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('flips touched on a modal-mode dismiss', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect modal [(open)]="open" [(touched)]="touched">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="a" forSelectOption value="a">A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly touched = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      expect(r.instance.touched()).toBe(false);

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.touched()).toBe(true);
    });

    it('routes through modal-shell, not the anchored positioner (no data-position)', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.position.set('item-aligned');
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      // `position="item-aligned"` would tag the host `data-position` via the
      // item-aligned positioner; modal mode skips it entirely, proving the
      // anchored-positioning inputs are no-ops.
      expect(content.hasAttribute('data-position')).toBe(false);
    });

    it('fires (autoFocusOnOpen) on the modal mount and (autoFocusOnClose) on close', async () => {
      let opens = 0;
      let closes = 0;

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div
            forSelect
            modal
            [(open)]="open"
            (autoFocusOnOpen)="onOpen()"
            (autoFocusOnClose)="onClose()"
          >
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="a" forSelectOption value="a">A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        onOpen(): void {
          opens++;
        }
        onClose(): void {
          closes++;
        }
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      expect(opens).toBe(1);
      expect(closes).toBe(0);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(closes).toBe(1);
    });
  });

  describe('mount / portal', () => {
    it('does not render content while closed', () => {
      renderHost(SelectHost);
      expect(document.querySelector('[forSelectContent]')).toBeNull();
    });

    it('portals content to document.body once open', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.parentElement).toBe(document.body);
    });

    it('removes content when open flips false', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forSelectContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forSelectContent]')).toBeNull();
    });
  });

  describe('ForSelectValue', () => {
    it('renders placeholder when no selection', async () => {
      const r = renderHost(SelectHost);
      r.instance.placeholder.set('Pick a fruit');
      await flush(r.fixture);

      const value = r.query<HTMLSpanElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Pick a fruit');
      expect(value.getAttribute('data-placeholder')).toBe('');
    });

    it('renders the selected option label', async () => {
      const r = renderHost(SelectHost);
      r.instance.placeholder.set('Pick…');
      r.instance.open.set(true);
      r.instance.value.set(['banana']);
      await flush(r.fixture);

      const value = r.query<HTMLSpanElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Banana');
      expect(value.hasAttribute('data-placeholder')).toBe(false);
    });

    it('renders multi-mode labels joined by separator', async () => {
      const r = renderHost(SelectHost);
      r.instance.multiple.set(true);
      r.instance.open.set(true);
      r.instance.value.set(['apple', 'banana']);
      await flush(r.fixture);

      const value = r.query<HTMLSpanElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Apple, Banana');
    });
  });

  describe('hidden input (form submit)', () => {
    it('mirrors a single value into one hidden input', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <form #form>
            <div forSelect name="fruit" [(value)]="value">
              <button forSelectTrigger>x</button>
              @if (open()) {
                <div forSelectContent>
                  <button forSelectOption value="apple">Apple</button>
                </div>
              }
            </div>
          </form>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>(['apple']);
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.name).toBe('fruit');
      expect(inputs[0]!.value).toBe('apple');
    });

    it('mirrors multiple values into multiple hidden inputs', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect multiple name="tags" [(value)]="value">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button forSelectOption value="a">A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>(['a', 'b', 'c']);
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
      expect(inputs.map((i) => i.value)).toEqual(['a', 'b', 'c']);
      expect(inputs.every((i) => i.name === 'tags')).toBe(true);
    });
  });

  describe('groups & separators', () => {
    it('group exposes role + aria-labelledby pointing to the registered label', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForSelectGroup, ForSelectGroupLabel],
        template: `
          <div forSelect [(open)]="open">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <div forSelectGroup>
                  <div forSelectGroupLabel>Fruits</div>
                  <button forSelectOption value="a">A</button>
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

      const group = document.querySelector<HTMLElement>('[forSelectGroup]')!;
      const label = document.querySelector<HTMLElement>('[forSelectGroupLabel]')!;
      expect(group.getAttribute('role')).toBe('group');
      expect(group.getAttribute('aria-labelledby')).toBe(label.id);
    });

    it('separator carries role=separator and is skipped by navigation', async () => {
      @Component({
        imports: [...BASE_IMPORTS, ForSelectSeparator],
        template: `
          <div forSelect [(open)]="open">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="x" forSelectOption value="x">X</button>
                <div forSelectSeparator></div>
                <button data-test-id="y" forSelectOption value="y">Y</button>
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

      const sep = document.querySelector<HTMLElement>('[forSelectSeparator]')!;
      expect(sep.getAttribute('role')).toBe('separator');

      const x = getOption('x');
      x.focus();
      pressKey(x, 'ArrowDown');
      await flush(r.fixture);
      expect(activeTestId()).toBe('y');
    });
  });

  describe('(valueChange) and (openChange) contract', () => {
    it('honors consumer writes via [(value)] / [(open)] without re-emitting', async () => {
      let valueEmits = 0;
      let openEmits = 0;

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div
            forSelect
            [(open)]="open"
            [(value)]="value"
            (valueChange)="onValue($event)"
            (openChange)="onOpen($event)"
          >
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly value = signal<readonly string[]>([]);
        onValue(_: readonly string[]): void {
          valueEmits++;
        }
        onOpen(_: boolean): void {
          openEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer writes: silent.
      r.instance.value.set(['apple']);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(valueEmits).toBe(0);
      expect(openEmits).toBe(0);

      // Internal transition: option click selects + closes.
      getOption('apple').click();
      await flush(r.fixture);

      // Same value, but `set([apple])` still triggers the change emitter once
      // (selection already was apple — but it's still an internal write).
      // Open transitions from true → false once.
      expect(openEmits).toBe(1);
      expect(valueEmits).toBe(1);
    });
  });

  describe('zoneless', () => {
    it('open / value / aria stay reactive without zone.js', async () => {
      const r = renderHost(SelectHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      r.instance.value.set(['cherry']);
      await flush(r.fixture);
      const cherry = getOption('cherry');
      expect(cherry.getAttribute('aria-selected')).toBe('true');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });

    it('modal mode opens, reflects aria-modal, and dismisses on Escape without zone.js', async () => {
      const r = renderHost(SelectHost);
      r.instance.modal.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('aria-modal')).toBe('true');

      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('object values', () => {
    interface City {
      id: number;
      name: string;
    }

    const PARIS: City = { id: 1, name: 'Paris' };
    const BERLIN: City = { id: 2, name: 'Berlin' };
    const TOKYO: City = { id: 3, name: 'Tokyo' };

    @Component({
      imports: [...BASE_IMPORTS, ForSelectValue],
      template: `
        <form #form>
          <div
            forSelect
            name="city"
            [(open)]="open"
            [(value)]="value"
            [multiple]="multiple()"
            [isItemEqualToValue]="byId"
            [itemToFormValue]="toId"
          >
            <button forSelectTrigger>
              <span forSelectValue placeholder="Pick a city"></span>
            </button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="paris" forSelectOption [value]="paris">Paris</button>
                <button data-test-id="berlin" forSelectOption [value]="berlin">Berlin</button>
                <button data-test-id="tokyo" forSelectOption [value]="tokyo">Tokyo</button>
              </div>
            }
          </div>
        </form>
      `,
    })
    class ObjectHost {
      readonly paris = PARIS;
      readonly berlin = BERLIN;
      readonly tokyo = TOKYO;
      readonly open = signal(false);
      readonly multiple = signal(false);
      readonly value = signal<readonly City[]>([]);
      readonly byId = (a: City, b: City) => a.id === b.id;
      readonly toId = (c: City) => String(c.id);
    }

    it('selects an object value on click and exposes it via the selected accessor', async () => {
      const r = renderHost(ObjectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('berlin').click();
      await flush(r.fixture);

      expect(r.instance.value()).toEqual([BERLIN]);
    });

    it('matches selection by custom equality even when the bound value is a different reference', async () => {
      const r = renderHost(ObjectHost);
      // A distinct object that is equal-by-id to BERLIN — the directive must
      // resolve `aria-selected` / `data-state` through `isItemEqualToValue`,
      // not reference identity.
      r.instance.value.set([{ id: 2, name: 'Berlin' }]);
      r.instance.open.set(true);
      await flush(r.fixture);

      const berlin = getOption('berlin');
      const paris = getOption('paris');
      expect(berlin.getAttribute('aria-selected')).toBe('true');
      expect(berlin.getAttribute('data-state')).toBe('checked');
      expect(paris.getAttribute('aria-selected')).toBe('false');
      expect(paris.getAttribute('data-state')).toBe('unchecked');
    });

    it('renders the selected option label through forSelectValue', async () => {
      const r = renderHost(ObjectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('tokyo').click();
      await flush(r.fixture);

      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Tokyo');
    });

    it('toggles object values in/out by id in multi mode', async () => {
      const r = renderHost(ObjectHost);
      r.instance.multiple.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);

      getOption('paris').click();
      getOption('tokyo').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([PARIS, TOKYO]);

      getOption('paris').click();
      await flush(r.fixture);
      expect(r.instance.value()).toEqual([TOKYO]);
    });

    it('serializes object values into the hidden input via itemToFormValue', async () => {
      const r = renderHost(ObjectHost);
      r.instance.value.set([BERLIN]);
      await flush(r.fixture);

      const inputs = Array.from(r.el.querySelectorAll<HTMLInputElement>('input[type=hidden]'));
      expect(inputs).toHaveLength(1);
      expect(inputs[0]!.name).toBe('city');
      expect(inputs[0]!.value).toBe('2');
    });

    it('keeps object selection reactive without Zone.js', async () => {
      const r = renderHost(ObjectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.value.set([PARIS]);
      await flush(r.fixture);
      expect(getOption('paris').getAttribute('aria-selected')).toBe('true');

      r.instance.value.set([TOKYO]);
      await flush(r.fixture);
      expect(getOption('paris').getAttribute('aria-selected')).toBe('false');
      expect(getOption('tokyo').getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('position input', () => {
    @Component({
      imports: HOST_IMPORTS,
      template: `
        <div forSelect [(open)]="open" [(value)]="value" [position]="position()">
          <button forSelectTrigger>
            <span forSelectValue placeholder="Pick"></span>
          </button>
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              <button data-test-id="banana" forSelectOption value="banana">Banana</button>
            </div>
          }
        </div>
      `,
    })
    class PositionHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly position = signal<'popper' | 'item-aligned'>('popper');
    }

    it('defaults to popper mode and does not set data-position on the content', async () => {
      const r = renderHost(PositionHost);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.dataset['position']).toBeUndefined();
    });

    it('reflects data-position="item-aligned" on the content when opted in', async () => {
      const r = renderHost(PositionHost);
      r.instance.position.set('item-aligned');
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.dataset['position']).toBe('item-aligned');
      // Item-aligned exposes `--for-select-content-available-height` for the
      // consumer's `max-height: var(...)` recipe.
      expect(content.style.getPropertyValue('--for-select-content-available-height')).not.toBe('');
      // Item-aligned does NOT emit popper's data-side / data-align — those
      // are only produced by `injectFloating`.
      expect(content.dataset['side']).toBeUndefined();
      expect(content.dataset['align']).toBeUndefined();
    });
  });

  describe('selected (single-select accessor)', () => {
    @Component({
      imports: HOST_IMPORTS,
      template: `
        <div forSelect #sel="forSelect" [(open)]="open" [(value)]="value" [multiple]="multiple()">
          <button forSelectTrigger>
            <span forSelectValue placeholder="Pick"></span>
          </button>
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              <button data-test-id="banana" forSelectOption value="banana">Banana</button>
            </div>
          }
        </div>
        <output data-testid="selected">{{ sel.selected() ?? 'none' }}</output>
      `,
    })
    class SelectedHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly multiple = signal(false);
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

      getOption('apple').click();
      await flush(r.fixture);
      expect(selectedText(r.el)).toBe('apple');
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
    it('throws when [forSelectTrigger] is used outside [forSelect]', () => {
      @Component({
        imports: [ForSelectTrigger],
        template: `<button forSelectTrigger></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/select\] ForSelectTrigger must be used inside a \[forSelect\] element\./,
      );
    });

    it('throws when ForSelectGroupLabel is used outside [forSelectGroup]', () => {
      @Component({
        imports: [ForSelectGroupLabel],
        template: `<div forSelectGroupLabel></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/select\] ForSelectGroupLabel must be used inside a \[forSelectGroup\] element\./,
      );
    });
  });
});

describe('ForSelectIndicator', () => {
  afterEachOverlayCleanup();

  @Component({
    imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, ForSelectIndicator],
    template: `
      <div forSelect [(open)]="open" [(value)]="value">
        <button forSelectTrigger>Open</button>
        @if (open()) {
          <div forSelectContent>
            <button data-test-id="apple" forSelectOption value="apple">
              <span data-test-id="apple-ind" forSelectIndicator>✓</span>
              Apple
            </button>
            <button data-test-id="banana" forSelectOption value="banana">
              <span data-test-id="banana-ind" forSelectIndicator [forceMount]="forceMount()"
                >✓</span
              >
              Banana
            </button>
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

  it('hides the indicator when the option is unselected and shows it when selected', async () => {
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

  it('throws when used outside [forSelectOption]', () => {
    @Component({
      imports: [ForSelectIndicator],
      template: `<span forSelectIndicator></span>`,
    })
    class Orphan {}

    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
    expect(() => TestBed.createComponent(Orphan)).toThrow(
      /\[forty-cdk\/select\] ForSelectIndicator must be used inside a \[forSelectOption\] element\./,
    );
  });

  describe('zoneless reactivity', () => {
    it('flips visibility when the parent selection changes without Zone.js', async () => {
      const r = renderHost(IndicatorHost);
      await flush(r.fixture);

      expect(indicator('apple-ind').hasAttribute('hidden')).toBe(true);
      r.instance.value.set(['apple']);
      await flush(r.fixture);
      expect(indicator('apple-ind').hasAttribute('hidden')).toBe(false);
    });
  });

  describe('[forField] integration', () => {
    @Component({
      imports: [
        ...BASE_IMPORTS,
        ForSelectValue,
        ForField,
        ForLabel,
        ForFieldDescription,
        ForFieldError,
      ],
      template: `
        <div forField>
          <label forLabel data-test-id="label">Fruit</label>
          <div forSelect [(open)]="open" [(value)]="value" [invalid]="invalid()">
            <button forSelectTrigger data-test-id="trigger">
              <span forSelectValue placeholder="Pick"></span>
            </button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              </div>
            }
          </div>
          <p forFieldDescription data-test-id="desc">Choose one.</p>
          <p forFieldError data-test-id="error">Required.</p>
        </div>
      `,
    })
    class FieldHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly invalid = signal(false);
    }

    // Non-`<label>` label element: `[forLabel]` skips the native `for`
    // association and routes click-to-focus through `focusControl()`.
    @Component({
      imports: [ForSelect, ForSelectTrigger, ForSelectValue, ForField, ForLabel],
      template: `
        <div forField>
          <span forLabel data-test-id="label">Fruit</span>
          <div forSelect>
            <button forSelectTrigger data-test-id="trigger">
              <span forSelectValue placeholder="Pick"></span>
            </button>
          </div>
        </div>
      `,
    })
    class SpanLabelHost {}

    const wrapper = (el: HTMLElement) => el.querySelector<HTMLElement>('[forSelect]')!;
    const trigger = (el: HTMLElement) =>
      el.querySelector<HTMLButtonElement>('[data-test-id="trigger"]')!;
    const label = (el: HTMLElement) => el.querySelector<HTMLElement>('[data-test-id="label"]')!;

    it('lands aria-labelledby/aria-describedby on the trigger, not the wrapper', () => {
      const { el } = renderHost(FieldHost);
      const t = trigger(el);
      const w = wrapper(el);

      expect(t.getAttribute('aria-labelledby')).toBe(label(el).id);
      expect(t.getAttribute('aria-describedby')).toBe(
        el.querySelector('[data-test-id="desc"]')!.id,
      );
      expect(w.hasAttribute('aria-labelledby')).toBe(false);
      expect(w.hasAttribute('aria-describedby')).toBe(false);
    });

    it('points the label `for` at the trigger id', () => {
      const { el } = renderHost(FieldHost);
      expect(label(el).getAttribute('for')).toBe(trigger(el).id);
    });

    it('focuses the trigger when the label is clicked', () => {
      const { el } = renderHost(SpanLabelHost);
      const t = trigger(el);

      label(el).click();
      expect(document.activeElement).toBe(t);
    });

    it('targets aria-errormessage at the error on the trigger while invalid', async () => {
      const r = renderHost(FieldHost);
      const t = trigger(r.el);
      const error = r.el.querySelector<HTMLElement>('[data-test-id="error"]')!;

      expect(t.hasAttribute('aria-errormessage')).toBe(false);
      r.instance.invalid.set(true);
      await flush(r.fixture);

      expect(t.getAttribute('aria-errormessage')).toBe(error.id);
      expect(t.getAttribute('aria-describedby')).toContain(error.id);
    });
  });
});
