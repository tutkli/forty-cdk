import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import {
  afterEachOverlayCleanup,
  flush,
  flushPositioning,
  pressKey,
  renderHost,
} from '../../src/test-utils';
import { ForField, ForFieldDescription, ForFieldError, ForLabel } from 'forty-cdk/field';
import { ForSelect } from './select';
import { ForSelectAnchor } from './select-anchor';
import { ForSelectContent } from './select-content';
import { ForSelectGroup } from './select-group';
import { ForSelectGroupLabel } from './select-group-label';
import { ForSelectIndicator } from './select-indicator';
import { FOR_SELECT_OPTION, ForSelectOption } from './select-option';
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

@Component({
  imports: BASE_IMPORTS,
  template: `
    <div forSelect [(open)]="open" [(value)]="value">
      <button forSelectTrigger>Trigger</button>
      @if (open()) {
        <div forSelectContent>
          <button data-test-id="evora" forSelectOption value="evora">Évora</button>
          <button data-test-id="madrid" forSelectOption value="madrid">Madrid</button>
        </div>
      }
    </div>
  `,
})
class DiacriticsSelectHost {
  readonly open = signal(false);
  readonly value = signal<readonly string[]>([]);
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
  describe('focus (focus-on-error)', () => {
    it('moves focus to the trigger, not the wrapper host', async () => {
      const { el, fixture, flush } = renderHost(SelectHost);
      await flush();
      const select = fixture.debugElement.query(By.directive(ForSelect)).injector.get(ForSelect);
      select.focus();
      expect(document.activeElement).toBe(el.querySelector('[forSelectTrigger]'));
    });
  });

  afterEachOverlayCleanup();

  describe('focusout touched (containment vs. the wrapper)', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div forSelect [(open)]="open" [(value)]="value" [(touched)]="touched">
          <button forSelectTrigger data-test-id="trigger">Trigger</button>
          <button type="button" data-test-id="clear">Clear</button>
        </div>
      `,
    })
    class ClearButtonSelectHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly touched = signal(false);
    }

    it('does not mark touched when focus moves to a sibling inside the [forSelect] wrapper', async () => {
      const { el, fixture, flush } = renderHost(ClearButtonSelectHost);
      await flush();
      const trigger = el.querySelector<HTMLElement>('[data-test-id="trigger"]')!;
      const clear = el.querySelector<HTMLElement>('[data-test-id="clear"]')!;

      trigger.dispatchEvent(new FocusEvent('focusout', { bubbles: true, relatedTarget: clear }));
      await flush();

      expect(fixture.componentInstance.touched()).toBe(false);
    });

    it('marks touched when focus leaves the [forSelect] wrapper entirely', async () => {
      const { el, fixture, flush } = renderHost(ClearButtonSelectHost);
      await flush();
      const trigger = el.querySelector<HTMLElement>('[data-test-id="trigger"]')!;
      const outside = document.createElement('button');
      document.body.appendChild(outside);

      try {
        trigger.dispatchEvent(
          new FocusEvent('focusout', { bubbles: true, relatedTarget: outside }),
        );
        await flush();
        expect(fixture.componentInstance.touched()).toBe(true);
      } finally {
        outside.remove();
      }
    });
  });

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

    it('PageDown / PageUp jump to last / first enabled', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const apple = getOption('apple');
      apple.focus();
      pressKey(apple, 'PageDown');
      await flush(r.fixture);
      expect(activeTestId()).toBe('date');

      document.activeElement!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }),
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

    it('reflects dir to the native dir attribute for both ltr and rtl', async () => {
      const r = renderHost(RtlSelectHost);
      const root = r.query<HTMLElement>('[forSelect]')!;

      expect(root.getAttribute('dir')).toBe('rtl');

      r.instance.dir.set('ltr');
      await r.flush();
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

    it('closed: matches an accented option from an unaccented key (issue #1145 item 9)', async () => {
      const r = renderHost(DiacriticsSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'e');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['evora']);
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
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [trigger], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
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

      // Open transitions from true → false once. The value is already the sole
      // `apple`, so single-mode `activate` skips the redundant `set` — no
      // duplicate `valueChange` fires for an idempotent re-select.
      expect(openEmits).toBe(1);
      expect(valueEmits).toBe(0);
    });

    it('emits valueChange once when single-mode activation changes the value', async () => {
      let valueEmits = 0;

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open" [(value)]="value" (valueChange)="onValue($event)">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                <button data-test-id="apple" forSelectOption value="apple">Apple</button>
                <button data-test-id="banana" forSelectOption value="banana">Banana</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly value = signal<readonly string[]>(['apple']);
        onValue(_: readonly string[]): void {
          valueEmits++;
        }
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      // A genuine change (apple → banana) emits exactly once — the guard only
      // suppresses idempotent re-selects, never real transitions.
      getOption('banana').click();
      await flush(r.fixture);
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

    it('renders the option label for a pre-set object value before the listbox is ever opened', async () => {
      // Cold cache: the listbox is never opened, so the `afterEveryRender`
      // snapshot that warms `#cachedOptions` never runs. With the options
      // mounted, `selectedLabels` must resolve the label from the live option
      // registry instead of falling back to the serialized id (`toId` → "2").
      @Component({
        imports: [...BASE_IMPORTS, ForSelectValue],
        template: `
          <div forSelect [(value)]="value" [isItemEqualToValue]="byId" [itemToFormValue]="toId">
            <button forSelectTrigger>
              <span forSelectValue placeholder="Pick a city"></span>
            </button>
            <div forSelectContent>
              <button data-test-id="paris" forSelectOption [value]="paris">Paris</button>
              <button data-test-id="berlin" forSelectOption [value]="berlin">Berlin</button>
              <button data-test-id="tokyo" forSelectOption [value]="tokyo">Tokyo</button>
            </div>
          </div>
        `,
      })
      class ColdCacheHost {
        readonly paris = PARIS;
        readonly berlin = BERLIN;
        readonly tokyo = TOKYO;
        readonly value = signal<readonly City[]>([BERLIN]);
        readonly byId = (a: City, b: City) => a.id === b.id;
        readonly toId = (c: City) => String(c.id);
      }

      const r = renderHost(ColdCacheHost);
      await flush(r.fixture);

      // The listbox was never opened — the root still reflects the closed state.
      expect(r.query<HTMLElement>('[forSelect]')!.getAttribute('data-state')).toBe('closed');
      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Berlin');
    });

    @Component({
      imports: [...BASE_IMPORTS, ForSelectValue],
      template: `
        <div
          forSelect
          [(open)]="open"
          [(value)]="value"
          [isItemEqualToValue]="byId"
          [itemToFormValue]="toId"
          [itemToLabel]="itemToLabel()"
          [multiple]="multiple()"
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
      `,
    })
    class IfPatternHost {
      readonly paris = PARIS;
      readonly berlin = BERLIN;
      readonly tokyo = TOKYO;
      readonly open = signal(false);
      readonly value = signal<readonly City[]>([BERLIN]);
      readonly multiple = signal(false);
      readonly itemToLabel = signal<((c: City) => string) | undefined>(undefined);
      readonly byId = (a: City, b: City) => a.id === b.id;
      readonly toId = (c: City) => String(c.id);
    }

    it('renders a pre-set object value as the serialized id in the documented @if pattern without itemToLabel', async () => {
      // Documents the gap: with `@if (open())` the listbox is never mounted, so
      // the live registry is empty and the `afterEveryRender` cache never warms.
      // `selectedLabels` falls back to the serialized form value (`toId` → "2").
      const r = renderHost(IfPatternHost);
      await flush(r.fixture);

      expect(r.query<HTMLElement>('[forSelect]')!.getAttribute('data-state')).toBe('closed');
      expect(r.query<HTMLElement>('[forSelectContent]')).toBeNull();
      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('2');
    });

    it('renders the label for a pre-set object value in the @if pattern when itemToLabel is supplied', async () => {
      const r = renderHost(IfPatternHost);
      r.instance.itemToLabel.set((c) => c.name);
      await flush(r.fixture);

      // The listbox is never opened — the content stays unmounted.
      expect(r.query<HTMLElement>('[forSelect]')!.getAttribute('data-state')).toBe('closed');
      expect(r.query<HTMLElement>('[forSelectContent]')).toBeNull();
      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Berlin');
    });

    it('keeps itemToLabel authoritative once the listbox opens (no flicker)', async () => {
      const r = renderHost(IfPatternHost);
      r.instance.itemToLabel.set((c) => `City: ${c.name}`);
      await flush(r.fixture);

      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('City: Berlin');

      r.instance.open.set(true);
      await flush(r.fixture);
      // The option's rendered textContent is "Berlin", but `itemToLabel` wins.
      expect(value.textContent).toBe('City: Berlin');
    });

    it('joins itemToLabel results in multi mode', async () => {
      const r = renderHost(IfPatternHost);
      r.instance.multiple.set(true);
      r.instance.value.set([PARIS, TOKYO]);
      r.instance.itemToLabel.set((c) => c.name);
      await flush(r.fixture);

      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Paris, Tokyo');
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

  describe('multi-select label resolution precedence', () => {
    interface City {
      id: number;
      name: string;
    }

    const PARIS: City = { id: 1, name: 'Paris' };
    const BERLIN: City = { id: 2, name: 'Berlin' };
    const TOKYO: City = { id: 3, name: 'Tokyo' };
    const GHOST: City = { id: 99, name: 'Ghost' };

    @Component({
      imports: [...BASE_IMPORTS, ForSelectValue],
      template: `
        <div
          forSelect
          multiple
          [(open)]="open"
          [(value)]="value"
          [isItemEqualToValue]="byId"
          [itemToFormValue]="toId"
        >
          <button forSelectTrigger>
            <span forSelectValue placeholder="Pick cities"></span>
          </button>
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="paris" forSelectOption [value]="paris">Paris</button>
              <button data-test-id="berlin" forSelectOption [value]="berlin">Berlin</button>
              <button data-test-id="tokyo" forSelectOption [value]="tokyo">Tokyo</button>
            </div>
          }
        </div>
      `,
    })
    class MultiHost {
      readonly paris = PARIS;
      readonly berlin = BERLIN;
      readonly tokyo = TOKYO;
      readonly open = signal(false);
      readonly value = signal<readonly City[]>([]);
      readonly byId = (a: City, b: City) => a.id === b.id;
      readonly toId = (c: City) => String(c.id);
    }

    it('renders labels in selection order from the live registry', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set([TOKYO, PARIS]);
      r.instance.open.set(true);
      await flush(r.fixture);

      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Tokyo, Paris');
    });

    it('falls back to the serialized form value for a value absent from the registry', async () => {
      const r = renderHost(MultiHost);
      r.instance.value.set([BERLIN, GHOST]);
      r.instance.open.set(true);
      await flush(r.fixture);

      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Berlin, 99');
    });

    it('resolves from the cached snapshot once the listbox closes, mixing live, cached, and fallback', async () => {
      const r = renderHost(MultiHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.value.set([PARIS, TOKYO, GHOST]);
      await flush(r.fixture);
      const value = r.query<HTMLElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Paris, Tokyo, 99');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[forSelectContent]')).toBeNull();
      expect(value.textContent).toBe('Paris, Tokyo, 99');
    });
  });

  describe('reactive option label snapshot', () => {
    it('warms the closed-typeahead snapshot from the open cycle without a [forSelectValue]', async () => {
      // No `[forSelectValue]` is present, so nothing pulls `selectedLabels`
      // during the open cycle — the snapshot is warmed solely by the open-gated
      // prime effect. Closed-state typeahead then resolves against it.
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.open.set(false);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'c');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['cherry']);
      expect(r.instance.open()).toBe(false);
    });

    it('keeps resolving a selected label from the snapshot after the listbox closes, without zone.js', async () => {
      const r = renderHost(SelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      // Select while open (live registry), then close so the live options
      // unmount. The persisted snapshot must still resolve the label.
      getOption('banana').click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(r.query<HTMLElement>('[forSelectContent]')).toBeNull();

      const value = r.query<HTMLSpanElement>('[forSelectValue]')!;
      expect(value.textContent).toBe('Banana');
    });

    it('purges an option removed while open so closed typeahead cannot select it', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open" [(value)]="value">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                @for (opt of options(); track opt) {
                  <button [attr.data-test-id]="opt" forSelectOption [value]="opt">{{ opt }}</button>
                }
              </div>
            }
          </div>
        `,
      })
      class DynamicHost {
        readonly open = signal(false);
        readonly value = signal<readonly string[]>([]);
        readonly options = signal<readonly string[]>(['apple', 'banana', 'cherry']);
      }

      const r = renderHost(DynamicHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.options.set(['apple', 'banana']);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'c');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual([]);
    });

    it('still selects an option that survived the removal', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open" [(value)]="value">
            <button forSelectTrigger>x</button>
            @if (open()) {
              <div forSelectContent>
                @for (opt of options(); track opt) {
                  <button [attr.data-test-id]="opt" forSelectOption [value]="opt">{{ opt }}</button>
                }
              </div>
            }
          </div>
        `,
      })
      class DynamicHost {
        readonly open = signal(false);
        readonly value = signal<readonly string[]>([]);
        readonly options = signal<readonly string[]>(['apple', 'banana', 'cherry']);
      }

      const r = renderHost(DynamicHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.options.set(['apple', 'banana']);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      pressKey(trigger, 'b');
      await flush(r.fixture);

      expect(r.instance.value()).toEqual(['banana']);
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
    it('throws from ForSelectTrigger on first change detection', () => {
      @Component({
        imports: [ForSelectTrigger],
        template: `<button forSelectTrigger></button>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(Orphan);
      let error: unknown;
      try {
        fixture.detectChanges();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/\[forty-cdk\/select\] ForSelectTrigger could not resolve/);
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forSelectTrigger\]="root"/);
      expect(message).toMatch(/#root="forSelect"/);
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

    it('throws when [forSelectAnchor] is used outside [forSelect]', () => {
      @Component({
        imports: [ForSelectAnchor],
        template: `<div forSelectAnchor></div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/select\] ForSelectAnchor must be used inside a \[forSelect\] element\./,
      );
    });
  });

  describe('anchor (separate positioning element)', () => {
    @Component({
      imports: [ForSelect, ForSelectAnchor, ForSelectTrigger, ForSelectContent, ForSelectOption],
      template: `
        <div forSelect [(open)]="open" [(value)]="value">
          @if (showAnchor()) {
            <div data-testid="anchor" forSelectAnchor>
              <button forSelectTrigger>Open</button>
            </div>
          } @else {
            <button forSelectTrigger>Open</button>
          }
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="apple" forSelectOption value="apple">Apple</button>
              <button data-test-id="banana" forSelectOption value="banana">Banana</button>
            </div>
          }
        </div>
      `,
    })
    class AnchorHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly showAnchor = signal(true);
    }

    it('mounts the listbox with [forSelectAnchor] registered alongside the trigger', async () => {
      // The DOM-observable contract for "anchor is wired": the anchor box and
      // the trigger coexist and the listbox opens and paints. Which element
      // drives floating-ui positioning is a geometry concern asserted in the
      // Playwright suite (jsdom returns zeros for getBoundingClientRect).
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(r.query<HTMLButtonElement>('[forSelectTrigger]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forSelectContent]')).not.toBeNull();
    });

    it('lets the trigger keep driving aria-controls and the toggle even with an anchor', async () => {
      const r = renderHost(AnchorHost);
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('listbox');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('keeps the trigger exempt from outside dismissal even when an anchor wraps it', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [trigger], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('restores the trigger fallback after the anchor is torn down inside @if', async () => {
      // The anchor lives inside `@if`; tearing it down must not throw and the
      // select must keep opening / dismissing from the trigger.
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).toBeNull();

      // Re-opening still works with the trigger as the (restored) fallback.
      const trigger = r.query<HTMLButtonElement>('[forSelectTrigger]')!;
      trigger.click();
      await flushPositioning(r.fixture);
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content).not.toBeNull();
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('reacts to anchor registration without zone.js', async () => {
      // `renderHost` runs under `provideZonelessChangeDetection()`. Toggling the
      // anchor on and off stays reactive (no throw, listbox keeps painting).
      const r = renderHost(AnchorHost);
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(document.querySelector<HTMLElement>('[forSelectContent]')).not.toBeNull();

      r.instance.open.set(false);
      r.instance.showAnchor.set(true);
      await flush(r.fixture);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);
      expect(r.query<HTMLElement>('[data-testid="anchor"]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forSelectContent]')).not.toBeNull();
    });

    it('throws when two [forSelectAnchor] are registered inside the same [forSelect]', () => {
      // `@if` defers directive construction to the change-detection pass so the
      // duplicate-registration throw surfaces from `detectChanges()`.
      @Component({
        imports: [ForSelect, ForSelectAnchor, ForSelectTrigger],
        template: `
          @if (show()) {
            <div forSelect>
              <div forSelectAnchor></div>
              <div forSelectAnchor></div>
              <button forSelectTrigger>Open</button>
            </div>
          }
        `,
      })
      class TwoAnchorsHost {
        readonly show = signal(true);
      }

      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(TwoAnchorsHost);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/select\] Multiple \[forSelectAnchor\]/,
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
              <span data-test-id="banana-ind" forSelectIndicator class="consumer-flex">✓</span>
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

  it('enforces inline display:none while unselected so a consumer display class cannot leak through', async () => {
    const r = renderHost(IndicatorHost);
    await flush(r.fixture);

    expect(indicator('banana-ind').style.display).toBe('none');

    r.instance.value.set(['banana']);
    await flush(r.fixture);

    expect(indicator('banana-ind').style.display).toBe('');
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

  it('resolves a subclassed option via the re-provided FOR_SELECT_OPTION token', async () => {
    @Directive({
      selector: '[testSelectOption]',
      providers: [{ provide: FOR_SELECT_OPTION, useExisting: TestSelectOption }],
    })
    class TestSelectOption extends ForSelectOption {}

    @Component({
      imports: [
        ForSelect,
        ForSelectTrigger,
        ForSelectContent,
        TestSelectOption,
        ForSelectIndicator,
      ],
      template: `
        <div forSelect [(open)]="open" [(value)]="value">
          <button forSelectTrigger>Open</button>
          @if (open()) {
            <div forSelectContent>
              <button data-test-id="apple" testSelectOption value="apple">
                <span data-test-id="apple-ind" forSelectIndicator>✓</span>
                Apple
              </button>
            </div>
          }
        </div>
      `,
    })
    class SubclassHost {
      readonly open = signal(true);
      readonly value = signal<readonly string[]>(['apple']);
    }

    const r = renderHost(SubclassHost);
    await flush(r.fixture);
    expect(indicator('apple-ind').getAttribute('data-state')).toBe('checked');
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
    // association and forwards the click to the trigger via `clickControl()`.
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

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [ForSelect, ForSelectTrigger, ForSelectContent, ForSelectOption, NgTemplateOutlet],
      template: `
        <ng-template #trig let-root="root">
          <button type="button" [forSelectTrigger]="root">Open</button>
        </ng-template>

        <div forSelect [(open)]="open" #root="forSelect">
          <ng-container [ngTemplateOutlet]="trig" [ngTemplateOutletContext]="{ root }" />
          @if (open()) {
            <div forSelectContent>
              <button forSelectOption value="apple">Apple</button>
            </div>
          }
        </div>
      `,
    })
    class StampedHost {
      readonly open = signal(false);
    }

    it('opens on click when the root is passed explicitly', async () => {
      const r = renderHost(StampedHost);
      const trigger = r.query<HTMLButtonElement>('button')!;

      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(document.querySelector('[forSelectContent]')).not.toBeNull();
    });

    it('open state stays reactive without zone.js through the explicit reference', async () => {
      const r = renderHost(StampedHost);
      const trigger = r.query<HTMLButtonElement>('button')!;

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('aria-controls')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });
  });

  describe('scroll-to-selected on open (#1145)', () => {
    function withScrollStub(run: (stub: ReturnType<typeof vi.fn>) => Promise<void>) {
      const had = 'scrollIntoView' in Element.prototype;
      const stub = vi.fn();
      Element.prototype.scrollIntoView = stub;
      return run(stub).finally(() => {
        if (!had) {
          delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
        }
      });
    }

    it('reveals the selected option once the positioner resolves (popper)', () =>
      withScrollStub(async (stub) => {
        const r = renderHost(SelectHost);
        r.instance.value.set(['date']);
        r.instance.open.set(true);
        await flushPositioning(r.fixture);

        expect(stub.mock.contexts).toContain(getOption('date'));
      }));

    it('does not scroll when nothing is selected (initial focus lands on the first option)', () =>
      withScrollStub(async (stub) => {
        const r = renderHost(SelectHost);
        r.instance.open.set(true);
        await flushPositioning(r.fixture);

        expect(stub).not.toHaveBeenCalled();
      }));
  });

  describe('virtualized option windowing (Shape C)', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div
          forSelect
          [(open)]="open"
          [(value)]="value"
          [totalCount]="total()"
          [visibleRange]="range()"
          (scrollToIndex)="onScrollToIndex($event)"
        >
          <button forSelectTrigger data-test-id="trigger">
            <span forSelectValue></span>
          </button>
          @if (open()) {
            <div forSelectContent data-test-id="content">
              @for (i of windowIndices(); track i) {
                <button
                  forSelectOption
                  [value]="'item-' + i"
                  [posInSet]="i"
                  [attr.data-test-id]="'opt-' + i"
                >
                  Item {{ i }}
                </button>
              }
            </div>
          }
        </div>
      `,
    })
    class VirtualSelectHost {
      readonly open = signal(false);
      readonly value = signal<readonly string[]>([]);
      readonly total = signal<number | undefined>(50);
      readonly range = signal<readonly [number, number]>([0, 10]);
      readonly scrolled = signal<number | null>(null);
      windowIndices() {
        const [s, e] = this.range();
        return Array.from({ length: e - s }, (_, k) => s + k);
      }
      onScrollToIndex(idx: number) {
        this.scrolled.set(idx);
        const start = Math.max(0, Math.min(idx - 4, (this.total() ?? 0) - 10));
        this.range.set([start, start + 10]);
      }
    }

    const contentEl = () => document.querySelector<HTMLElement>('[data-test-id="content"]')!;
    const voptOf = (idx: number) =>
      document.querySelector<HTMLButtonElement>(`[data-test-id="opt-${idx}"]`)!;

    it('focus-model switch — content has tabindex=0 and aria-activedescendant when totalCount set; options have tabindex=-1', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      expect(content.getAttribute('tabindex')).toBe('0');
      for (const i of [0, 1, 2, 3]) {
        expect(voptOf(i).getAttribute('tabindex')).toBe('-1');
      }

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open">
            <button forSelectTrigger>T</button>
            @if (open()) {
              <div forSelectContent data-test-id="nv-content">
                <button forSelectOption value="a" data-test-id="nv-a">A</button>
              </div>
            }
          </div>
        `,
      })
      class NonVirtualSelectHost {
        readonly open = signal(true);
      }
      TestBed.resetTestingModule();
      const r2 = renderHost(NonVirtualSelectHost);
      await flush(r2.fixture);
      const nvc = document.querySelector<HTMLElement>('[data-test-id="nv-content"]')!;
      expect(nvc.getAttribute('tabindex')).toBe('-1');
      expect(nvc.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('aria-setsize / aria-posinset set on virtualized options, absent in non-virtualized', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(voptOf(0).getAttribute('aria-setsize')).toBe('50');
      expect(voptOf(0).getAttribute('aria-posinset')).toBe('1');
      expect(voptOf(5).getAttribute('aria-posinset')).toBe('6');

      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open">
            <button forSelectTrigger>T</button>
            @if (open()) {
              <div forSelectContent>
                <button forSelectOption value="a" data-test-id="nr-a">A</button>
              </div>
            }
          </div>
        `,
      })
      class NrHost {
        readonly open = signal(true);
      }
      TestBed.resetTestingModule();
      const r2 = renderHost(NrHost);
      await flush(r2.fixture);
      const opt = document.querySelector<HTMLButtonElement>('[data-test-id="nr-a"]')!;
      expect(opt.hasAttribute('aria-setsize')).toBe(false);
      expect(opt.hasAttribute('aria-posinset')).toBe(false);
    });

    it('initial focus on open seeds aria-activedescendant to the first enabled option', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);
      const activeId = content.getAttribute('aria-activedescendant');
      expect(activeId).toBeTruthy();
      expect(activeId).toBe(voptOf(0).getAttribute('id'));
      expect(voptOf(0).getAttribute('data-highlighted')).toBe('');
    });

    it('ArrowDown moves aria-activedescendant to the next rendered option', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);
      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush(r.fixture);
      const activeId = content.getAttribute('aria-activedescendant');
      expect(activeId).toBe(voptOf(1).getAttribute('id'));
      expect(voptOf(1).getAttribute('data-highlighted')).toBe('');
    });

    it('End to an off-window index emits scrollToIndex, pending resolves when option mounts', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.scrolled()).toBe(49);

      await flush(r.fixture);
      const opt49 = document.querySelector<HTMLButtonElement>('[data-test-id="opt-49"]');
      expect(opt49).not.toBeNull();
      expect(content.getAttribute('aria-activedescendant')).toBe(opt49!.getAttribute('id'));
    });

    it('PageDown jumps to the last index like End; PageUp returns to the first', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.scrolled()).toBe(49);
      await flush(r.fixture);
      const opt49 = document.querySelector<HTMLButtonElement>('[data-test-id="opt-49"]');
      expect(content.getAttribute('aria-activedescendant')).toBe(opt49!.getAttribute('id'));

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageUp', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.scrolled()).toBe(0);
      await flush(r.fixture);
      expect(content.getAttribute('aria-activedescendant')).toBe(voptOf(0).getAttribute('id'));
    });

    it('Enter activates the active descendant in single mode', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);
      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush(r.fixture);

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.value()).toEqual(['item-1']);
      expect(r.instance.open()).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(voptOf(1).getAttribute('aria-selected')).toBe('true');
    });

    it('selection survives window recycling — value-keyed (single mode)', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.value.set(['item-2']);
      r.instance.open.set(true);
      r.instance.range.set([0, 10]);
      await flush(r.fixture);

      expect(voptOf(2).getAttribute('data-state')).toBe('checked');
      expect(voptOf(2).getAttribute('aria-selected')).toBe('true');

      r.instance.range.set([20, 30]);
      await flush(r.fixture);
      expect(document.querySelector('[data-test-id="opt-2"]')).toBeNull();

      r.instance.range.set([0, 10]);
      await flush(r.fixture);
      const opt2 = voptOf(2);
      expect(opt2.getAttribute('data-state')).toBe('checked');
      expect(opt2.getAttribute('aria-selected')).toBe('true');
    });

    it('open-time scroll-to-selected emits scrollToIndex with the committed option index', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
      await flush(r.fixture);
      await flush(r.fixture);

      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      await flush(r.fixture);
      expect(r.instance.value()).toContain('item-49');

      r.instance.open.set(false);
      await flush(r.fixture);
      r.instance.range.set([0, 10]);
      r.instance.scrolled.set(null);

      r.instance.open.set(true);
      await flush(r.fixture);
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);

      expect(r.instance.scrolled()).toBe(49);
    });

    it('unmounting the active option clears aria-activedescendant', async () => {
      const r = renderHost(VirtualSelectHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = contentEl();
      content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      await flush(r.fixture);
      content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      await flush(r.fixture);
      expect(content.getAttribute('aria-activedescendant')).toBe(voptOf(1).getAttribute('id'));

      r.instance.range.set([20, 30]);
      await flush(r.fixture);
      expect(content.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('non-virtualized path unchanged — no aria-activedescendant, arrow moves DOM focus', async () => {
      @Component({
        imports: BASE_IMPORTS,
        template: `
          <div forSelect [(open)]="open">
            <button forSelectTrigger>T</button>
            @if (open()) {
              <div forSelectContent>
                <button forSelectOption value="x" data-test-id="nv2-x">X</button>
                <button forSelectOption value="y" data-test-id="nv2-y">Y</button>
              </div>
            }
          </div>
        `,
      })
      class NonVirtualHost2 {
        readonly open = signal(true);
      }
      const r = renderHost(NonVirtualHost2);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.hasAttribute('aria-activedescendant')).toBe(false);
      const x = document.querySelector<HTMLButtonElement>('[data-test-id="nv2-x"]')!;
      const y = document.querySelector<HTMLButtonElement>('[data-test-id="nv2-y"]')!;
      x.focus();
      x.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      expect(document.activeElement).toBe(y);
    });

    describe('zoneless reactivity', () => {
      it('ArrowDown moves aria-activedescendant without Zone.js', async () => {
        TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
        const fixture = TestBed.createComponent(VirtualSelectHost);
        fixture.componentInstance.open.set(true);
        await flush(fixture);
        const content = document.querySelector('[data-test-id="content"]') as HTMLElement;
        content.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
        await flush(fixture);
        content.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
        await flush(fixture);
        const opt1Id = (
          document.querySelector('[data-test-id="opt-1"]') as HTMLButtonElement
        ).getAttribute('id');
        expect(content.getAttribute('aria-activedescendant')).toBe(opt1Id);
      });
    });
  });

  describe('selectionFollowsFocus + virtualization guard (#1145)', () => {
    @Component({
      imports: BASE_IMPORTS,
      template: `
        <div
          forSelect
          [(open)]="open"
          [totalCount]="total()"
          [selectionFollowsFocus]="followsFocus()"
        >
          <button forSelectTrigger>T</button>
          @if (open()) {
            <div forSelectContent>
              <button forSelectOption value="a" [posInSet]="0">A</button>
            </div>
          }
        </div>
      `,
    })
    class GuardHost {
      readonly open = signal(false);
      readonly total = signal<number | undefined>(undefined);
      readonly followsFocus = signal(false);
    }

    it('throws in dev mode when selectionFollowsFocus is combined with totalCount', () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(GuardHost);
      fixture.componentInstance.total.set(50);
      fixture.componentInstance.followsFocus.set(true);
      expect(() => fixture.detectChanges()).toThrow(
        /\[forty-cdk\/select\] `selectionFollowsFocus` is not supported together with virtualization/,
      );
    });

    it('does not throw when selectionFollowsFocus is set without virtualization', async () => {
      const r = renderHost(GuardHost);
      r.instance.followsFocus.set(true);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('tabindex')).toBe('-1');
    });

    it('does not throw when virtualized without selectionFollowsFocus', async () => {
      const r = renderHost(GuardHost);
      r.instance.total.set(50);
      r.instance.open.set(true);
      await flush(r.fixture);
      const content = document.querySelector<HTMLElement>('[forSelectContent]')!;
      expect(content.getAttribute('tabindex')).toBe('0');
    });
  });
});
