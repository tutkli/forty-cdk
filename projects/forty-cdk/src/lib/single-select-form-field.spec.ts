import { Component, signal, type Type, type WritableSignal } from '@angular/core';
import {
  disabled,
  type FieldTree,
  form,
  FormField,
  readonly as readonlyField,
  required,
  requiredError,
  type SchemaPathTree,
  validate,
} from '@angular/forms/signals';

import {
  ForCombobox,
  ForComboboxContent,
  ForComboboxInput,
  ForComboboxOption,
} from 'forty-cdk/combobox';
import { ForField, ForFieldError } from 'forty-cdk/field';
import { ForListbox, ForListboxOption } from 'forty-cdk/listbox';
import { ForSelect, ForSelectContent, ForSelectOption, ForSelectTrigger } from 'forty-cdk/select';

import { afterEachOverlayCleanup, flush, flushPositioning, renderHost } from '../test-utils';

/**
 * Library-wide contract: a **single-select** form field binds to the three
 * array-backed selection roots through the standard `[formField]` directive,
 * with nothing in between ([#1579](https://github.com/tutkli/forty-cdk/issues/1579)).
 *
 * The library used to ship `forSingleValueField` in `forty-cdk/signal-forms`, a
 * helper that adapted a `FieldTree<T | null>` into the `FieldTree<readonly T[]>`
 * view the controls accept. It could only do that by reflecting over
 * `@angular/forms/signals` internals — a `Proxy` standing in for `FieldState`,
 * with `.set` / `.update` / `.asReadonly` glued onto a `computed` — because
 * Angular ships no writable-computed primitive and `FieldTree<readonly T[]>` is
 * additionally an array-like of per-element subfield trees. Both holes were
 * erased by `as unknown as` casts, so each of those bets would have failed
 * silently on a dependency bump rather than at compile time.
 *
 * The shipped answer is that there is no adapter: a single-select form field is
 * modeled as the same `readonly T[]` the control exposes, kept at length ≤ 1
 * (see `docs/selection-value-type-contract.md`). This suite is the executable
 * record that the plain binding carries the whole `FormUiControl` surface the
 * helper existed to preserve. The field's value type is checked at compile
 * time, so this file compiling at all is half the assertion.
 *
 * One parameterised contract over the three roots rather than three prose
 * suites: the mechanism under test is Angular's own custom-control resolution,
 * identical for each, and the only per-root variation is which element carries
 * the widget role and which one takes focus.
 */
interface FruitModel {
  readonly fruit: readonly string[];
}

interface FruitFlags {
  readonly disable: WritableSignal<boolean>;
  readonly makeReadonly: WritableSignal<boolean>;
}

function applyFruitSchema(path: SchemaPathTree<FruitModel>, flags: FruitFlags): void {
  required(path.fruit);
  readonlyField(path.fruit, () => flags.makeReadonly());
  disabled(path.fruit, () => flags.disable());
  validate(path.fruit, ({ value }) =>
    value().length === 0 ? requiredError({ message: 'Pick a fruit' }) : undefined,
  );
}

interface FruitFieldHost extends FruitFlags {
  readonly model: WritableSignal<FruitModel>;
  readonly open: WritableSignal<boolean>;
  readonly showError: WritableSignal<boolean>;
  readonly tree: FieldTree<FruitModel>;
}

@Component({
  imports: [ForField, ForFieldError, ForListbox, ForListboxOption, FormField],
  template: `
    <div forField>
      <ul forListbox [formField]="tree.fruit">
        <li>
          <button type="button" forListboxOption value="apple" data-test-id="apple">Apple</button>
        </li>
        <li>
          <button type="button" forListboxOption value="banana" data-test-id="banana">
            Banana
          </button>
        </li>
      </ul>
      @if (showError()) {
        <p forFieldError #err="forFieldError" data-test-id="error">
          {{ err.messages().join(', ') }}
        </p>
      }
    </div>
  `,
})
class ListboxFieldHost implements FruitFieldHost {
  readonly model = signal<FruitModel>({ fruit: [] });
  readonly disable = signal(false);
  readonly makeReadonly = signal(false);
  readonly showError = signal(false);
  readonly open = signal(false);
  readonly tree = form(this.model, (path) => applyFruitSchema(path, this));
}

@Component({
  imports: [
    ForField,
    ForFieldError,
    ForSelect,
    ForSelectTrigger,
    ForSelectContent,
    ForSelectOption,
    FormField,
  ],
  template: `
    <div forField>
      <div forSelect [formField]="tree.fruit" [(open)]="open">
        <button forSelectTrigger>Trigger</button>
        @if (open()) {
          <div forSelectContent>
            <button forSelectOption value="apple" data-test-id="apple">Apple</button>
            <button forSelectOption value="banana" data-test-id="banana">Banana</button>
          </div>
        }
      </div>
      @if (showError()) {
        <p forFieldError #err="forFieldError" data-test-id="error">
          {{ err.messages().join(', ') }}
        </p>
      }
    </div>
  `,
})
class SelectFieldHost implements FruitFieldHost {
  readonly model = signal<FruitModel>({ fruit: [] });
  readonly disable = signal(false);
  readonly makeReadonly = signal(false);
  readonly showError = signal(false);
  readonly open = signal(false);
  readonly tree = form(this.model, (path) => applyFruitSchema(path, this));
}

@Component({
  imports: [
    ForField,
    ForFieldError,
    ForCombobox,
    ForComboboxInput,
    ForComboboxContent,
    ForComboboxOption,
    FormField,
  ],
  template: `
    <div forField>
      <div forCombobox [formField]="tree.fruit" [(open)]="open">
        <input forComboboxInput />
        @if (open()) {
          <div forComboboxContent>
            <button forComboboxOption value="apple" data-test-id="apple">Apple</button>
            <button forComboboxOption value="banana" data-test-id="banana">Banana</button>
          </div>
        }
      </div>
      @if (showError()) {
        <p forFieldError #err="forFieldError" data-test-id="error">
          {{ err.messages().join(', ') }}
        </p>
      }
    </div>
  `,
})
class ComboboxFieldHost implements FruitFieldHost {
  readonly model = signal<FruitModel>({ fruit: [] });
  readonly disable = signal(false);
  readonly makeReadonly = signal(false);
  readonly showError = signal(false);
  readonly open = signal(false);
  readonly tree = form(this.model, (path) => applyFruitSchema(path, this));
}

interface RootCase {
  readonly name: string;
  readonly host: Type<FruitFieldHost>;
  readonly root: string;
  readonly widget: string;
  readonly focusTarget: string;
  readonly overlayBacked: boolean;
}

const CASES: readonly RootCase[] = [
  {
    name: 'ForListbox',
    host: ListboxFieldHost,
    root: '[forListbox]',
    widget: '[forListbox]',
    focusTarget: '[data-test-id="apple"]',
    overlayBacked: false,
  },
  {
    name: 'ForSelect',
    host: SelectFieldHost,
    root: '[forSelect]',
    widget: '[forSelectTrigger]',
    focusTarget: '[forSelectTrigger]',
    overlayBacked: true,
  },
  {
    name: 'ForCombobox',
    host: ComboboxFieldHost,
    root: '[forCombobox]',
    widget: '[forComboboxInput]',
    focusTarget: '[forComboboxInput]',
    overlayBacked: true,
  },
];

const submittedValues = (host: HTMLElement): string[] =>
  Array.from(host.querySelectorAll<HTMLInputElement>('input[type="hidden"]')).map((i) => i.value);

const optionOf = (testId: string): HTMLButtonElement =>
  document.querySelector<HTMLButtonElement>(`[data-test-id="${testId}"]`)!;

describe('single-select form field binds directly through [formField]', () => {
  afterEachOverlayCleanup();

  for (const c of CASES) {
    describe(c.name, () => {
      const rootOf = (host: HTMLElement) => host.querySelector<HTMLElement>(c.root)!;
      const widgetOf = (host: HTMLElement) => host.querySelector<HTMLElement>(c.widget)!;

      it('maps the field value into the control (field → control)', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        expect(submittedValues(el)).toEqual([]);

        instance.model.set({ fruit: ['banana'] });
        instance.open.set(c.overlayBacked);
        await flushPositioning(fixture);

        expect(submittedValues(el)).toEqual(['banana']);
        expect(optionOf('banana').getAttribute('data-state')).toBe('checked');
        expect(optionOf('apple').getAttribute('data-state')).toBe('unchecked');
      });

      it('writes the activated option back into the field (control → field)', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        instance.open.set(c.overlayBacked);
        await flushPositioning(fixture);

        optionOf('apple').click();
        await flushPositioning(fixture);

        expect(instance.model().fruit).toEqual(['apple']);
        expect(submittedValues(el)).toEqual(['apple']);
      });

      it('replaces rather than appends, so single mode stays at one entry', async () => {
        const { instance, fixture } = renderHost(c.host);
        instance.open.set(c.overlayBacked);
        await flushPositioning(fixture);
        optionOf('apple').click();
        await flushPositioning(fixture);

        instance.open.set(c.overlayBacked);
        await flushPositioning(fixture);
        optionOf('banana').click();
        await flushPositioning(fixture);

        expect(instance.model().fruit).toEqual(['banana']);
      });

      it('reflects schema `disabled` on the root', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        await flush(fixture);
        expect(rootOf(el).hasAttribute('data-disabled')).toBe(false);

        instance.disable.set(true);
        await flush(fixture);
        expect(rootOf(el).hasAttribute('data-disabled')).toBe(true);
      });

      it('reflects schema `readonly` on the root and the widget host', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        instance.makeReadonly.set(true);
        await flush(fixture);

        expect(rootOf(el).hasAttribute('data-readonly')).toBe(true);
        expect(widgetOf(el).getAttribute('aria-readonly')).toBe('true');
      });

      it('reflects schema `required` on the widget host', async () => {
        const { el, fixture } = renderHost(c.host);
        await flush(fixture);
        expect(widgetOf(el).getAttribute('aria-required')).toBe('true');
      });

      it('reflects field `invalid` on the root and the widget host, clearing it on commit', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        await flush(fixture);
        expect(rootOf(el).hasAttribute('data-invalid')).toBe(true);
        expect(widgetOf(el).getAttribute('aria-invalid')).toBe('true');

        instance.model.set({ fruit: ['apple'] });
        await flush(fixture);
        expect(rootOf(el).hasAttribute('data-invalid')).toBe(false);
        expect(widgetOf(el).getAttribute('aria-invalid')).toBeNull();
      });

      it('surfaces the field validation errors through the error region', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        instance.showError.set(true);
        await flush(fixture);
        expect(el.querySelector('[data-test-id="error"]')?.textContent).toContain('Pick a fruit');
      });

      it('marks the field touched on blur and reflects it on the root', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        await flush(fixture);

        el.querySelector<HTMLElement>(c.focusTarget)!.dispatchEvent(
          new FocusEvent('focusout', { relatedTarget: document.body, bubbles: true }),
        );
        await flush(fixture);

        expect(instance.tree.fruit().touched()).toBe(true);
        expect(rootOf(el).hasAttribute('data-touched')).toBe(true);
      });

      it('routes `focusBoundControl()` to the primitive focus target', async () => {
        const { el, instance, fixture } = renderHost(c.host);
        await flush(fixture);

        instance.tree.fruit().focusBoundControl();
        await flush(fixture);

        expect(document.activeElement).toBe(el.querySelector<HTMLElement>(c.focusTarget));
      });
    });
  }
});
