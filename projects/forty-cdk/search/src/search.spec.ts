import { Component, signal, viewChild } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { afterEachOverlayCleanup, pressKey } from '../../src/test-utils';
import { renderHost } from '../../src/test-utils/render';
import { ForDialog } from 'forty-cdk/dialog';
import { ForField, ForLabel } from 'forty-cdk/field';
import { ForSearchClear } from './search-clear';
import { provideForSearchDefaults } from './search-defaults';
import { ForSearchGroup } from './search-group';
import { ForSearch } from './search';

const typeInto = (el: HTMLInputElement, text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input'));
};

const withDocumentEscapeSpy = (fn: () => void): KeyboardEvent[] => {
  const seen: KeyboardEvent[] = [];
  const onKeyDown = (e: Event) => seen.push(e as KeyboardEvent);
  document.addEventListener('keydown', onKeyDown);
  try {
    fn();
  } finally {
    document.removeEventListener('keydown', onKeyDown);
  }
  return seen;
};

@Component({
  imports: [ForSearchGroup, ForSearch, ForSearchClear],
  template: `
    <div forSearchGroup>
      <input
        forSearch
        [(value)]="text"
        [disabled]="isDisabled()"
        [readonly]="isReadonly()"
        [required]="isRequired()"
        [invalid]="isInvalid()"
        [pending]="isPending()"
        [(touched)]="isTouched"
        [dirty]="isDirty()"
        [name]="fieldName()"
        [clearOnEscape]="clearOnEscape()"
      />
      <button forSearchClear data-test-id="clear">×</button>
    </div>
  `,
})
class SearchHost {
  readonly text = signal('');
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal<string>('');
  readonly clearOnEscape = signal(true);
}

const searchOf = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input[forSearch]')!;
const clearOf = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>('[data-test-id="clear"]')!;

const contractResult = (
  r: ReturnType<typeof renderHost<SearchHost>>,
  control: HTMLElement,
): FormControlMountResult => ({
  control,
  flush: r.flush,
  setFlag: (flag, value) => {
    const inst = r.fixture.componentInstance;
    switch (flag) {
      case 'disabled':
        inst.isDisabled.set(value);
        return;
      case 'readonly':
        inst.isReadonly.set(value);
        return;
      case 'required':
        inst.isRequired.set(value);
        return;
      case 'invalid':
        inst.isInvalid.set(value);
        return;
      case 'pending':
        inst.isPending.set(value);
        return;
      case 'touched':
        inst.isTouched.set(value);
        return;
      case 'dirty':
        inst.isDirty.set(value);
        return;
    }
  },
  setName: (name) => r.fixture.componentInstance.fieldName.set(name),
});

describe('ForSearch', () => {
  describe('static', () => {
    it('carries role="searchbox"', () => {
      const { el } = renderHost(SearchHost);
      expect(searchOf(el).getAttribute('role')).toBe('searchbox');
    });

    it('starts empty and reflects data-empty', () => {
      const { el } = renderHost(SearchHost);
      expect(searchOf(el).getAttribute('data-empty')).toBe('');
    });
  });

  assertFormControlContract(() => {
    const r = renderHost(SearchHost);
    return contractResult(r, searchOf(r.el));
  });

  describe('value binding', () => {
    it('updates the model from the native input event and toggles data-empty', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'angular');
      await flush();
      expect(fixture.componentInstance.text()).toBe('angular');
      expect(input.hasAttribute('data-empty')).toBe(false);

      typeInto(input, '');
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });

    it('mirrors external [(value)] writes back into the native element', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      fixture.componentInstance.text.set('search term');
      await flush();
      expect(input.value).toBe('search term');
      expect(input.hasAttribute('data-empty')).toBe(false);

      fixture.componentInstance.text.set('');
      await flush();
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });

  describe('clear button visibility', () => {
    it('is hidden while value is empty', () => {
      const { el } = renderHost(SearchHost);
      const clear = clearOf(el);
      expect(clear.hasAttribute('hidden')).toBe(true);
      expect(clear.style.display).toBe('none');
    });

    it('becomes visible once value is non-empty', async () => {
      const { el, flush } = renderHost(SearchHost);
      const input = searchOf(el);
      const clear = clearOf(el);

      typeInto(input, 'hello');
      await flush();
      expect(clear.hasAttribute('hidden')).toBe(false);
      expect(clear.style.display).not.toBe('none');
    });
  });

  describe('clear button behaviour', () => {
    it('resets the value to empty and refocuses the input on click', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);
      const clear = clearOf(el);

      typeInto(input, 'query');
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');

      clear.click();
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
      expect(document.activeElement).toBe(input);
    });

    it('does not clear or refocus when the search is disabled', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);
      const clear = clearOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isDisabled.set(true);
      await flush();

      clear.click();
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(document.activeElement).not.toBe(input);
    });

    it('does not clear or refocus when the search is readonly', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);
      const clear = clearOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isReadonly.set(true);
      await flush();

      clear.click();
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(document.activeElement).not.toBe(input);
    });
  });

  describe('clear() through the context (issue #1393 item 2)', () => {
    @Component({
      imports: [ForSearchGroup, ForSearch],
      template: `
        <div forSearchGroup>
          <input forSearch [(value)]="text" [disabled]="isDisabled()" [readonly]="isReadonly()" />
        </div>
      `,
    })
    class ContextClearHost {
      readonly text = signal('');
      readonly isDisabled = signal(false);
      readonly isReadonly = signal(false);
      readonly group = viewChild.required(ForSearchGroup);

      clearViaContext(): void {
        this.group().field()?.clear();
      }
    }

    it('clears the value when the field is enabled', async () => {
      const { el, fixture, flush } = renderHost(ContextClearHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.clearViaContext();
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });

    it('is a no-op while the field is disabled', async () => {
      const { el, fixture, flush } = renderHost(ContextClearHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isDisabled.set(true);
      await flush();

      fixture.componentInstance.clearViaContext();
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(input.value).toBe('query');
    });

    it('is a no-op while the field is readonly', async () => {
      const { el, fixture, flush } = renderHost(ContextClearHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isReadonly.set(true);
      await flush();

      fixture.componentInstance.clearViaContext();
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(input.value).toBe('query');
    });
  });

  describe('Escape to clear (issue #1393 item 16)', () => {
    it('clears a non-empty value and consumes the key', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      const event = pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
      expect(event.defaultPrevented).toBe(true);
    });

    it('does not let a clearing Escape reach the document', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(seen).toHaveLength(0);
      expect(fixture.componentInstance.text()).toBe('');
    });

    it('propagates Escape when the value is already empty', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(seen.map((e) => e.defaultPrevented)).toEqual([false]);
      expect(fixture.componentInstance.text()).toBe('');
    });

    it('is inert and propagates while readonly', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isReadonly.set(true);
      await flush();

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(seen.map((e) => e.defaultPrevented)).toEqual([false]);
    });

    it('is inert and propagates while disabled', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      fixture.componentInstance.isDisabled.set(true);
      await flush();

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(seen.map((e) => e.defaultPrevented)).toEqual([false]);
    });

    it('ignores Escape during IME composition', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      const event = pressKey(input, 'Escape', { isComposing: true });
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('clearOnEscape opt-out (issue #1473)', () => {
    afterEachOverlayCleanup();

    it('clears and consumes the key with the default (no binding)', async () => {
      @Component({
        imports: [ForSearch],
        template: `<input forSearch [(value)]="text" />`,
      })
      class DefaultHost {
        readonly text = signal('');
      }

      const { el, fixture, flush } = renderHost(DefaultHost);
      const input = searchOf(el);

      typeInto(input, 'query');
      await flush();

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(seen).toHaveLength(0);
    });

    it('neither clears nor consumes a non-empty Escape when false', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      fixture.componentInstance.clearOnEscape.set(false);
      typeInto(input, 'query');
      await flush();

      const event = pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');
      expect(input.value).toBe('query');
      expect(event.defaultPrevented).toBe(false);
    });

    it('lets a non-empty Escape reach the document when false', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      fixture.componentInstance.clearOnEscape.set(false);
      typeInto(input, 'query');
      await flush();

      const seen = withDocumentEscapeSpy(() => pressKey(input, 'Escape'));
      await flush();
      expect(seen).toHaveLength(1);
      expect(seen[0]?.defaultPrevented).toBe(false);
      expect(fixture.componentInstance.text()).toBe('query');
    });

    it('honours a flip back to true at runtime', async () => {
      const { el, fixture, flush } = renderHost(SearchHost);
      const input = searchOf(el);

      fixture.componentInstance.clearOnEscape.set(false);
      typeInto(input, 'query');
      await flush();

      pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.text()).toBe('query');

      fixture.componentInstance.clearOnEscape.set(true);
      await flush();

      pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
    });

    @Component({
      imports: [ForDialog, ForSearch],
      template: `
        @if (open()) {
          <div forDialog ariaLabel="Command palette" (dismiss)="open.set(false)">
            <input
              forSearch
              [(value)]="query"
              [clearOnEscape]="clearOnEscape()"
              data-test-id="palette"
            />
          </div>
        }
      `,
    })
    class CommandPaletteHost {
      readonly open = signal(true);
      readonly query = signal('git ');
      readonly clearOnEscape = signal(false);
    }

    const paletteInput = () =>
      document.querySelector<HTMLInputElement>('[data-test-id="palette"]')!;

    it('dismisses the enclosing dialog on the first Escape', async () => {
      const { fixture, flush } = renderHost(CommandPaletteHost);
      await flush();
      const input = paletteInput();
      expect(document.querySelector('[forDialog]')).not.toBeNull();

      pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.open()).toBe(false);
      expect(document.querySelector('[forDialog]')).toBeNull();
      expect(fixture.componentInstance.query()).toBe('git ');
    });

    it('keeps the dialog open on the first Escape with the default', async () => {
      const { fixture, flush } = renderHost(CommandPaletteHost);
      fixture.componentInstance.clearOnEscape.set(true);
      await flush();
      const input = paletteInput();

      pressKey(input, 'Escape');
      await flush();
      expect(fixture.componentInstance.open()).toBe(true);
      expect(fixture.componentInstance.query()).toBe('');

      pressKey(paletteInput(), 'Escape');
      await flush();
      expect(fixture.componentInstance.open()).toBe(false);
    });
  });

  describe('clear button aria-label (issue #1159)', () => {
    it('carries the default aria-label "Clear"', () => {
      const { el } = renderHost(SearchHost);
      expect(clearOf(el).getAttribute('aria-label')).toBe('Clear');
    });

    it('[ariaLabel] overrides the emitted aria-label', () => {
      @Component({
        imports: [ForSearchGroup, ForSearch, ForSearchClear],
        template: `
          <div forSearchGroup>
            <input forSearch [(value)]="text" />
            <button forSearchClear data-test-id="clear" ariaLabel="Borrar">×</button>
          </div>
        `,
      })
      class Host {
        readonly text = signal('');
      }

      const { el } = renderHost(Host);
      expect(clearOf(el).getAttribute('aria-label')).toBe('Borrar');
    });

    it('[ariaLabel]="null" drops the attribute', () => {
      @Component({
        imports: [ForSearchGroup, ForSearch, ForSearchClear],
        template: `
          <div forSearchGroup>
            <input forSearch [(value)]="text" />
            <button forSearchClear data-test-id="clear" [ariaLabel]="null">×</button>
          </div>
        `,
      })
      class Host {
        readonly text = signal('');
      }

      const { el } = renderHost(Host);
      expect(clearOf(el).hasAttribute('aria-label')).toBe(false);
    });

    it('an unbound clear button uses provideForSearchDefaults({ clearAriaLabel })', () => {
      @Component({
        imports: [ForSearchGroup, ForSearch, ForSearchClear],
        providers: [provideForSearchDefaults({ clearAriaLabel: 'Vaciar' })],
        template: `
          <div forSearchGroup>
            <input forSearch [(value)]="text" />
            <button forSearchClear data-test-id="clear">×</button>
          </div>
        `,
      })
      class Host {
        readonly text = signal('');
      }

      const { el } = renderHost(Host);
      expect(clearOf(el).getAttribute('aria-label')).toBe('Vaciar');
    });
  });

  describe('group coordination', () => {
    @Component({
      imports: [ForSearchClear],
      template: `<button forSearchClear>×</button>`,
    })
    class OrphanClearHost {}

    it('throws when [forSearchClear] is used without a [forSearchGroup]', () => {
      expect(() => renderHost(OrphanClearHost)).toThrow(
        /\[forty-cdk\/search\] ForSearchClear must be used inside a \[forSearchGroup\]/,
      );
    });

    @Component({
      imports: [ForSearchGroup, ForSearch, ForSearchClear],
      template: `
        <div forSearchGroup>
          <input forSearch [(value)]="first" data-test-id="first" />
          @if (showSecond()) {
            <input forSearch [(value)]="second" data-test-id="second" />
          }
          <button forSearchClear data-test-id="clear">×</button>
        </div>
      `,
    })
    class DuplicateFieldHost {
      readonly first = signal('a');
      readonly second = signal('b');
      readonly showSecond = signal(true);
    }

    it('warns when two [forSearch]es register under one [forSearchGroup]', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      renderHost(DuplicateFieldHost);

      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain('[forty-cdk/search]');
      expect(message).toContain('[forSearchGroup]');
      expect(message).toContain('[forSearch]');
    });

    it('keeps the clear button bound to the surviving field when a duplicate unmounts', async () => {
      vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { el, instance, flush: f } = renderHost(DuplicateFieldHost);
      const clear = clearOf(el);

      expect(clear.hasAttribute('hidden')).toBe(false);

      instance.showSecond.set(false);
      await f();

      expect(el.querySelector('[data-test-id="second"]')).toBeNull();
      expect(clear.hasAttribute('hidden')).toBe(false);
      expect(clear.hasAttribute('disabled')).toBe(false);

      clear.click();
      await f();

      expect(instance.first()).toBe('');
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface SearchModel {
      query: string;
    }

    @Component({
      imports: [ForSearch, FormField],
      template: ` <input forSearch [formField]="searchForm.query" data-test-id="search" /> `,
    })
    class SignalFormsHost {
      readonly model = signal<SearchModel>({ query: '' });
      readonly searchForm = form(this.model, (s) => {
        required(s.query);
      });
    }

    const byId = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLInputElement>(`[data-test-id="${id}"]`)!;

    it('two-way binds the value with the field', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const search = byId(el, 'search');

      typeInto(search, 'cats');
      await flush();
      expect(fixture.componentInstance.model().query).toBe('cats');

      fixture.componentInstance.model.update((m) => ({ ...m, query: 'dogs' }));
      await flush();
      expect(search.value).toBe('dogs');
    });

    it('flows schema-driven required into aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(byId(el, 'search').getAttribute('aria-required')).toBe('true');
    });
  });

  describe('field auto-association', () => {
    @Component({
      imports: [ForField, ForLabel, ForSearch],
      template: `
        <div forField>
          <label forLabel data-test-id="label">Search</label>
          <input forSearch [(value)]="text" data-test-id="control" />
        </div>
      `,
    })
    class FieldHost {
      readonly text = signal('');
    }

    const q = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLElement>(`[data-test-id="${id}"]`)!;

    it('assigns an id and points the label `for` at the control', () => {
      const { el } = renderHost(FieldHost);
      const control = q(el, 'control');
      expect(control.id).toBeTruthy();
      expect(q(el, 'label').getAttribute('for')).toBe(control.id);
    });

    it('wires aria-labelledby to the label', () => {
      const { el } = renderHost(FieldHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-labelledby')).toBe(q(el, 'label').id);
    });
  });
});
