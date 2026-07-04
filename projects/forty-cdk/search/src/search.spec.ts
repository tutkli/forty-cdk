import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { flush } from '../../src/test-utils';
import { renderHost } from '../../src/test-utils/render';
import { ForField, ForLabel } from 'forty-cdk/field';
import { ForSearchClear } from './search-clear';
import { provideForSearchDefaults } from './search-defaults';
import { ForSearchGroup } from './search-group';
import { ForSearch } from './search';

const typeInto = (el: HTMLInputElement, text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input'));
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
      const { el, fixture, flush } = renderHost(SearchHost);
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

  describe('zoneless reactivity', () => {
    it('reflects an external set without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(SearchHost);
      await flush(fixture);
      const input = searchOf(fixture.nativeElement);

      fixture.componentInstance.text.set('hello');
      await flush(fixture);
      expect(input.value).toBe('hello');
      expect(input.hasAttribute('data-empty')).toBe(false);

      fixture.componentInstance.text.set('');
      await flush(fixture);
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });
});
