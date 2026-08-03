import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, readonly as fieldReadonly, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import {
  assertDataStateContract,
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { ForToggle } from './toggle';

@Component({
  imports: [ForToggle],
  template: `
    <button
      forToggle
      [(checked)]="checked"
      [disabled]="disabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
    >
      B
    </button>
  `,
})
class ToggleHost {
  readonly checked = signal(false);
  readonly disabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal<string>('');
}

describe('ForToggle', () => {
  assertDataStateContract({
    vocabulary: ['checked', 'unchecked'],
    mount: () => {
      const r = renderHost(ToggleHost);
      return {
        pieces: () => ({ toggle: r.query<HTMLElement>('[forToggle]') }),
        setState: (state) => r.instance.checked.set(state === 'checked'),
        flush: r.flush,
      };
    },
  });

  describe('a11y baseline', () => {
    it('reflects aria-pressed and type="button" on the host', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('always emits aria-pressed even when falsy (togglable widget rule)', () => {
      const r = renderHost(ToggleHost);
      expect(r.query<HTMLButtonElement>('[forToggle]')!.hasAttribute('aria-pressed')).toBe(true);
    });

    it('reflects checked state changes', async () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      r.instance.checked.set(true);
      await r.flush();

      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });

    it('reflects disabled via aria-disabled and data-disabled, staying focusable (no native disabled)', async () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      await r.flush();

      const btn = r.query<HTMLButtonElement>('[forToggle]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.hasAttribute('disabled')).toBe(false);
      expect(btn.getAttribute('data-disabled')).toBe('');
      btn.focus();
      expect(document.activeElement).toBe(btn);
    });
  });

  assertFormControlContract(
    () => {
      const r = renderHost(ToggleHost);
      const result: FormControlMountResult = {
        control: r.query<HTMLButtonElement>('[forToggle]')!,
        flush: r.flush,
        setFlag: (flag, value) => {
          const inst = r.instance;
          switch (flag) {
            case 'disabled':
              inst.disabled.set(value);
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
        setName: (name) => r.instance.fieldName.set(name),
      };
      return result;
    },
    {
      customRoleStaysFocusable: true,
      roleSupportsAriaReadonly: false,
      roleSupportsAriaRequired: false,
    },
  );

  describe('click', () => {
    it('toggles checked on click', async () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      await r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(r.instance.checked()).toBe(true);

      btn.click();
      await r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(r.instance.checked()).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      await r.flush();
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      await r.flush();
      expect(r.instance.checked()).toBe(false);
    });

    it('does not toggle when readonly without disabling the host', async () => {
      const r = renderHost(ToggleHost);
      r.instance.isReadonly.set(true);
      await r.flush();
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      expect(btn.hasAttribute('disabled')).toBe(false);
      btn.click();
      await r.flush();
      expect(r.instance.checked()).toBe(false);
    });
  });

  describe('two-way binding', () => {
    it('honors consumer writes without re-emitting (checkedChange)', async () => {
      let internalEmits = 0;

      @Component({
        imports: [ForToggle],
        template: `
          <button forToggle [(checked)]="checked" (checkedChange)="onChange($event)">B</button>
        `,
      })
      class Host {
        readonly checked = signal(false);
        onChange(_: boolean): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      r.instance.checked.set(true);
      await r.flush();
      expect(internalEmits).toBe(0);

      r.query<HTMLButtonElement>('[forToggle]')!.click();
      await r.flush();
      expect(internalEmits).toBe(1);
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true via blur and stays interactive afterwards', async () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;
      btn.focus();
      btn.dispatchEvent(new FocusEvent('blur'));
      await r.flush();
      expect(btn.getAttribute('data-touched')).toBe('');

      btn.click();
      await r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForToggle],
      template: `
        <form>
          <button forToggle [(checked)]="checked" [name]="fieldName()">B</button>
        </form>
      `,
    })
    class FormHost {
      readonly checked = signal(false);
      readonly fieldName = signal<string>('');
    }

    it('does not submit any value when name is empty', () => {
      const { el } = renderHost(FormHost);
      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });

    it('submits name=on while checked', async () => {
      const r = renderHost(FormHost);
      r.instance.fieldName.set('bold');
      r.instance.checked.set(true);
      await r.flush();

      const formEl = r.el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([['bold', 'on']]);
    });

    it('omits the value when unchecked', async () => {
      const r = renderHost(FormHost);
      r.instance.fieldName.set('bold');
      await r.flush();

      const formEl = r.el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    interface Prefs {
      bold: boolean;
      italic: boolean;
    }

    @Component({
      imports: [ForToggle, FormField],
      template: `
        <button forToggle [formField]="prefs.bold" data-test-id="bold">B</button>
        <button forToggle [formField]="prefs.italic" data-test-id="italic">I</button>
      `,
    })
    class SignalFormsHost {
      readonly model = signal<Prefs>({ bold: false, italic: false });
      readonly prefs = form(this.model, (s) => {
        required(s.bold);
        fieldReadonly(s.italic, ({ valueOf }) => valueOf(s.bold) === false);
      });
    }

    const toggleById = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

    it('binds the field value through checked in both directions', async () => {
      const r = renderHost(SignalFormsHost);
      const bold = toggleById(r.el, 'bold');

      bold.click();
      await r.flush();
      expect(r.instance.model().bold).toBe(true);
      expect(bold.getAttribute('aria-pressed')).toBe('true');

      r.instance.model.update((m) => ({ ...m, bold: false }));
      await r.flush();
      expect(bold.getAttribute('aria-pressed')).toBe('false');
    });

    it('flows `required` from the schema into data-required (role="button" has no aria-required)', async () => {
      const r = renderHost(SignalFormsHost);
      await r.flush();
      const bold = toggleById(r.el, 'bold');
      expect(bold.getAttribute('data-required')).toBe('');
      expect(bold.hasAttribute('aria-required')).toBe(false);
    });

    it('flows schema-driven readonly into data-readonly, never aria-readonly', async () => {
      const r = renderHost(SignalFormsHost);
      await r.flush();
      const italic = toggleById(r.el, 'italic');

      expect(italic.getAttribute('data-readonly')).toBe('');
      expect(italic.hasAttribute('aria-readonly')).toBe(false);

      toggleById(r.el, 'bold').click();
      await r.flush();
      expect(italic.hasAttribute('data-readonly')).toBe(false);
      expect(italic.hasAttribute('aria-readonly')).toBe(false);
    });
  });

  describe('FormCheckboxControl contract', () => {
    it('does not expose a `value` attribute (forbidden by the interface)', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({ imports: [ForToggle], template: `<button forToggle #ref="forToggle"></button>` })
      class HostWithRef {}

      const fixture = TestBed.createComponent(HostWithRef);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button')!;
      expect(button.hasAttribute('value')).toBe(false);
    });
  });
});
