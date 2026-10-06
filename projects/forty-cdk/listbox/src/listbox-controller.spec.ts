import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';

import { ForSearch } from 'forty-cdk/search';
import { pressKey, pressWithMouse } from 'forty-cdk/testing';

import { renderHost } from '../../src/test-utils';
import { ForListbox } from './listbox';
import { ForListboxController } from './listbox-controller';
import { ForListboxGroup } from './listbox-group';
import { ForListboxGroupLabel } from './listbox-group-label';
import { ForListboxOption } from './listbox-option';

interface Command {
  readonly id: string;
  readonly label: string;
  readonly group: 'navigation' | 'actions';
  readonly disabled?: boolean;
}

const COMMANDS: readonly Command[] = [
  { id: 'home', label: 'Go home', group: 'navigation' },
  { id: 'settings', label: 'Open settings', group: 'navigation' },
  { id: 'archive', label: 'Archive', group: 'actions', disabled: true },
  { id: 'delete', label: 'Delete', group: 'actions' },
];

@Component({
  imports: [
    ForListbox,
    ForListboxController,
    ForListboxGroup,
    ForListboxGroupLabel,
    ForListboxOption,
  ],
  template: `
    @if (withController()) {
      <input
        [forListboxController]="list"
        aria-label="Search commands"
        [value]="query()"
        (input)="query.set($any($event.target).value)"
      />
    }
    <div forListbox #list="forListbox" [(value)]="picked" [loop]="loop()" ariaLabel="Commands">
      @for (group of groups(); track group) {
        <div forListboxGroup>
          <div forListboxGroupLabel>{{ group }}</div>
          @for (command of filtered(group); track command.id) {
            <button
              type="button"
              forListboxOption
              [value]="command.id"
              [disabled]="!!command.disabled"
              [attr.data-test-id]="command.id"
              (click)="ran.push(command.id)"
            >
              {{ command.label }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
class PaletteHost {
  readonly withController = signal(true);
  readonly loop = signal(true);
  readonly query = signal('');
  readonly picked = signal<readonly string[]>([]);
  readonly commands = signal<readonly Command[]>(COMMANDS);
  readonly ran: string[] = [];

  readonly groups = () =>
    (['navigation', 'actions'] as const).filter((group) => this.filtered(group).length > 0);

  filtered(group: Command['group']): readonly Command[] {
    const query = this.query().toLowerCase();
    return this.commands().filter(
      (command) => command.group === group && command.label.toLowerCase().includes(query),
    );
  }
}

@Component({
  imports: [ForListbox, ForListboxController, ForListboxOption, ForSearch],
  template: `
    <input type="search" forSearch [clearOnEscape]="false" [forListboxController]="list" />
    <div forListbox #list="forListbox" ariaLabel="Commands">
      <button type="button" forListboxOption value="home">Go home</button>
    </div>
  `,
})
class SearchPaletteHost {}

@Component({
  imports: [ForListbox, ForListboxController, ForListboxOption],
  template: `
    <input [forListboxController]="list" />
    <input [forListboxController]="list" />
    <div forListbox #list="forListbox" ariaLabel="Commands">
      <button type="button" forListboxOption value="home">Go home</button>
    </div>
  `,
})
class TwoControllersHost {}

const inputOf = (root: HTMLElement): HTMLInputElement =>
  root.querySelector<HTMLInputElement>('input')!;
const listboxOf = (root: HTMLElement): HTMLElement =>
  root.querySelector<HTMLElement>('[forListbox]')!;
const optionOf = (root: HTMLElement, id: string): HTMLElement =>
  root.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;
const options = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('[forListboxOption]'));

describe('ForListboxController', () => {
  describe('ARIA wiring', () => {
    it('exposes the textbox as a combobox controlling the listbox', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      const listbox = listboxOf(el);

      expect(input.getAttribute('role')).toBe('combobox');
      expect(input.getAttribute('aria-expanded')).toBe('true');
      expect(input.getAttribute('aria-autocomplete')).toBe('list');
      expect(input.getAttribute('autocomplete')).toBe('off');
      expect(listbox.id).toMatch(/^for-listbox-/);
      expect(input.getAttribute('aria-controls')).toBe(listbox.id);
      expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('collapses aria-expanded while the listbox has no options', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      fixture.componentInstance.query.set('no such command');
      await flush();

      expect(options(el)).toHaveLength(0);
      expect(inputOf(el).getAttribute('aria-expanded')).toBe('false');
    });

    it('takes the listbox and its options out of the tab order', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();

      expect(listboxOf(el).hasAttribute('tabindex')).toBe(false);
      for (const option of options(el)) {
        expect(option.getAttribute('tabindex')).toBe('-1');
      }
    });

    it('overrides the searchbox role of a [forSearch] on the same input', async () => {
      const { el, flush } = renderHost(SearchPaletteHost);
      await flush();

      expect(inputOf(el).getAttribute('role')).toBe('combobox');
    });
  });

  describe('keyboard', () => {
    it('moves the active option across groups while DOM focus stays in the input', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      input.focus();

      const first = pressKey(input, 'ArrowDown');
      await flush();
      expect(first.defaultPrevented).toBe(true);
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'home').id);

      pressKey(input, 'ArrowDown');
      pressKey(input, 'ArrowDown');
      await flush();
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'delete').id);
      expect(document.activeElement).toBe(input);
      expect(listboxOf(el).hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('reflects data-highlighted on the active option only', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      pressKey(inputOf(el), 'ArrowDown');
      pressKey(inputOf(el), 'ArrowDown');
      await flush();

      const highlighted = options(el).filter((option) => option.hasAttribute('data-highlighted'));
      expect(highlighted).toEqual([optionOf(el, 'settings')]);
    });

    it('starts from the last enabled option on ArrowUp', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      pressKey(inputOf(el), 'ArrowUp');
      await flush();

      expect(inputOf(el).getAttribute('aria-activedescendant')).toBe(optionOf(el, 'delete').id);
    });

    it('skips disabled options in both directions', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      pressKey(input, 'ArrowUp');
      pressKey(input, 'ArrowUp');
      await flush();

      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'settings').id);
    });

    it('wraps at the ends, and stops there with [loop]="false"', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      pressKey(input, 'ArrowUp');
      pressKey(input, 'ArrowDown');
      await flush();
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'home').id);

      fixture.componentInstance.loop.set(false);
      await flush();
      pressKey(input, 'ArrowUp');
      await flush();
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'home').id);
    });

    it('scrolls the active option into view', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const settings = optionOf(el, 'settings');
      const scrollIntoView = vi.fn();
      settings.scrollIntoView = scrollIntoView;

      pressKey(inputOf(el), 'ArrowDown');
      pressKey(inputOf(el), 'ArrowDown');
      await flush();

      expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
    });

    it('leaves Home, End, Escape and printable keys to the textbox', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      pressKey(input, 'ArrowDown');
      await flush();

      for (const key of ['Home', 'End', 'Escape', 'a', ' ']) {
        expect(pressKey(input, key).defaultPrevented).toBe(false);
      }
      await flush();
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'home').id);
    });

    it('leaves modified arrows to the textbox', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);

      expect(pressKey(input, 'ArrowDown', { shiftKey: true }).defaultPrevented).toBe(false);
      expect(pressKey(input, 'ArrowDown', { altKey: true }).defaultPrevented).toBe(false);
      await flush();
      expect(input.hasAttribute('aria-activedescendant')).toBe(false);
    });

    it('clicks the active option on Enter, running its own (click) handler', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      input.focus();
      pressKey(input, 'ArrowDown');
      pressKey(input, 'ArrowDown');
      await flush();

      const enter = pressKey(input, 'Enter');
      await flush();

      expect(enter.defaultPrevented).toBe(true);
      expect(fixture.componentInstance.ran).toEqual(['settings']);
      expect(fixture.componentInstance.picked()).toEqual(['settings']);
      expect(document.activeElement).toBe(input);
    });

    it('leaves Enter alone while no option is active', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();

      const enter = pressKey(inputOf(el), 'Enter');
      await flush();

      expect(enter.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.ran).toEqual([]);
    });
  });

  describe('query edits', () => {
    it('drops aria-activedescendant when the active option is filtered out', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      pressKey(inputOf(el), 'ArrowDown');
      await flush();

      fixture.componentInstance.query.set('delete');
      await flush();

      expect(inputOf(el).hasAttribute('aria-activedescendant')).toBe(false);
      pressKey(inputOf(el), 'ArrowDown');
      await flush();
      expect(inputOf(el).getAttribute('aria-activedescendant')).toBe(optionOf(el, 'delete').id);
    });

    it('keeps the active option while it survives the filter', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      pressKey(inputOf(el), 'ArrowUp');
      await flush();

      fixture.componentInstance.query.set('de');
      await flush();

      expect(inputOf(el).getAttribute('aria-activedescendant')).toBe(optionOf(el, 'delete').id);
    });
  });

  describe('pointer', () => {
    it('keeps focus in the input when an option is pressed, and activates it', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      const input = inputOf(el);
      input.focus();

      pressWithMouse(optionOf(el, 'delete'));
      await flush();

      expect(document.activeElement).toBe(input);
      expect(fixture.componentInstance.ran).toEqual(['delete']);
      expect(input.getAttribute('aria-activedescendant')).toBe(optionOf(el, 'delete').id);
    });

    it('makes the hovered option the active one', async () => {
      const { el, flush } = renderHost(PaletteHost);
      await flush();

      optionOf(el, 'settings').dispatchEvent(new PointerEvent('pointermove', { bubbles: true }));
      await flush();

      expect(inputOf(el).getAttribute('aria-activedescendant')).toBe(optionOf(el, 'settings').id);
    });
  });

  describe('lifecycle', () => {
    it('hands the listbox back to roving tabindex when the controller unmounts', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();

      fixture.componentInstance.withController.set(false);
      await flush();

      expect(optionOf(el, 'home').getAttribute('tabindex')).toBe('0');
      expect(optionOf(el, 'settings').getAttribute('tabindex')).toBe('-1');
    });

    it('routes the listbox focus() to the controller', async () => {
      const { el, fixture, flush } = renderHost(PaletteHost);
      await flush();
      const listbox = fixture.debugElement.query(By.directive(ForListbox)).injector.get(ForListbox);

      listbox.focus();

      expect(document.activeElement).toBe(inputOf(el));
    });

    it('warns in dev mode when a second controller registers', async () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { flush } = renderHost(TwoControllersHost);
      await flush();

      expect(warn).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[forty-cdk\/listbox\] FORCDK-CORE-005: A \[forListbox\] coordinates a single \[forListboxController\], but 2 are registered/,
        ),
      );
    });
  });
});
