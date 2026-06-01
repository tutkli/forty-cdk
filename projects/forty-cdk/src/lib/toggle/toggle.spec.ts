import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { form, FormField, readonly as fieldReadonly, required } from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { assertFormControlContract, type FormControlMountResult } from '../../test-utils/contract';
import { ForToggle } from './toggle';

@Component({
  imports: [ForToggle],
  template: `
    <button
      forToggle
      [(pressed)]="pressed"
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
  readonly pressed = signal(false);
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
  describe('a11y baseline', () => {
    it('reflects aria-pressed and data-state on the host', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(btn.getAttribute('data-state')).toBe('unchecked');
      expect(btn.getAttribute('type')).toBe('button');
    });

    it('always emits aria-pressed even when falsy (togglable widget rule)', () => {
      const r = renderHost(ToggleHost);
      expect(r.query<HTMLButtonElement>('[forToggle]')!.hasAttribute('aria-pressed')).toBe(true);
    });

    it('reflects pressed state changes', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      r.instance.pressed.set(true);
      r.flush();

      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-state')).toBe('checked');
    });

    it('reflects disabled via aria-disabled, [disabled], and data-disabled', () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      r.flush();

      const btn = r.query<HTMLButtonElement>('[forToggle]')!;
      expect(btn.getAttribute('aria-disabled')).toBe('true');
      expect(btn.hasAttribute('disabled')).toBe(true);
      expect(btn.getAttribute('data-disabled')).toBe('');
    });
  });

  assertFormControlContract(() => {
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
  });

  describe('click', () => {
    it('toggles pressed on click', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-state')).toBe('checked');
      expect(r.instance.pressed()).toBe(true);

      btn.click();
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(r.instance.pressed()).toBe(false);
    });

    it('does not toggle when disabled', () => {
      const r = renderHost(ToggleHost);
      r.instance.disabled.set(true);
      r.flush();
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      btn.click();
      r.flush();
      expect(r.instance.pressed()).toBe(false);
    });

    it('does not toggle when readonly without disabling the host', () => {
      const r = renderHost(ToggleHost);
      r.instance.isReadonly.set(true);
      r.flush();
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      expect(btn.hasAttribute('disabled')).toBe(false);
      btn.click();
      r.flush();
      expect(r.instance.pressed()).toBe(false);
    });
  });

  describe('two-way binding', () => {
    it('honors consumer writes without re-emitting (pressedChange)', () => {
      let internalEmits = 0;

      @Component({
        imports: [ForToggle],
        template: `
          <button forToggle [(pressed)]="pressed" (pressedChange)="onChange($event)">B</button>
        `,
      })
      class Host {
        readonly pressed = signal(false);
        onChange(_: boolean): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer write — must NOT fire.
      r.instance.pressed.set(true);
      r.flush();
      expect(internalEmits).toBe(0);

      // User click — internal transition, must fire once.
      r.query<HTMLButtonElement>('[forToggle]')!.click();
      r.flush();
      expect(internalEmits).toBe(1);
    });

    it('drives the same DOM state via [(checked)] as via [(pressed)]', () => {
      @Component({
        imports: [ForToggle],
        template: `<button forToggle [(checked)]="checked">B</button>`,
      })
      class Host {
        readonly checked = signal(false);
      }

      const r = renderHost(Host);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      // External write through the form-facing model reflects on the host.
      r.instance.checked.set(true);
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-state')).toBe('checked');

      // A click writes back through the same model.
      btn.click();
      r.flush();
      expect(r.instance.checked()).toBe(false);
      expect(btn.getAttribute('aria-pressed')).toBe('false');
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true via blur and stays interactive afterwards', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;
      btn.focus();
      btn.dispatchEvent(new FocusEvent('blur'));
      r.flush();
      expect(btn.getAttribute('data-touched')).toBe('');

      btn.click();
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForToggle],
      template: `
        <form>
          <button forToggle [(pressed)]="pressed" [name]="fieldName()">B</button>
        </form>
      `,
    })
    class FormHost {
      readonly pressed = signal(false);
      readonly fieldName = signal<string>('');
    }

    it('does not submit any value when name is empty', () => {
      const { el } = renderHost(FormHost);
      const formEl = el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });

    it('submits name=on while pressed', () => {
      const r = renderHost(FormHost);
      r.instance.fieldName.set('bold');
      r.instance.pressed.set(true);
      r.flush();

      const formEl = r.el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([['bold', 'on']]);
    });

    it('omits the value when unpressed', () => {
      const r = renderHost(FormHost);
      r.instance.fieldName.set('bold');
      r.flush();

      const formEl = r.el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external set and click without Zone.js', () => {
      const r = renderHost(ToggleHost);
      const btn = r.query<HTMLButtonElement>('[forToggle]')!;

      r.instance.pressed.set(true);
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('true');
      expect(btn.getAttribute('data-state')).toBe('checked');

      btn.click();
      r.flush();
      expect(btn.getAttribute('aria-pressed')).toBe('false');
      expect(r.instance.pressed()).toBe(false);
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

    it('binds the field value through checked in both directions', () => {
      const r = renderHost(SignalFormsHost);
      const bold = toggleById(r.el, 'bold');

      // Toggle bold via the button UI → field value updates.
      bold.click();
      r.flush();
      expect(r.instance.model().bold).toBe(true);
      expect(bold.getAttribute('aria-pressed')).toBe('true');
      expect(bold.getAttribute('data-state')).toBe('checked');

      // External change to the model flows back into the DOM.
      r.instance.model.update((m) => ({ ...m, bold: false }));
      r.flush();
      expect(bold.getAttribute('aria-pressed')).toBe('false');
      expect(bold.getAttribute('data-state')).toBe('unchecked');
    });

    it('flows `required` from the schema into aria-required', () => {
      const r = renderHost(SignalFormsHost);
      r.flush();
      expect(toggleById(r.el, 'bold').getAttribute('aria-required')).toBe('true');
    });

    it('flows schema-driven readonly into aria-readonly', () => {
      const r = renderHost(SignalFormsHost);
      r.flush();
      const italic = toggleById(r.el, 'italic');

      // bold unpressed → italic is schema-readonly.
      expect(italic.getAttribute('aria-readonly')).toBe('true');

      // Once bold is pressed, italic is no longer readonly.
      toggleById(r.el, 'bold').click();
      r.flush();
      expect(italic.getAttribute('aria-readonly')).toBe(null);
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
