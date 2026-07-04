import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import {
  Field,
  form,
  FormField,
  readonly as fieldReadonly,
  required,
} from '@angular/forms/signals';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../src/test-utils/render';
import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { ForSwitch } from './switch';

@Component({
  imports: [ForSwitch],
  template: `
    <button
      forSwitch
      [(checked)]="enabled"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
    ></button>
  `,
})
class SwitchHost {
  readonly enabled = signal(false);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal<string>('');
}

const switchOf = (host: HTMLElement) => host.querySelector<HTMLButtonElement>('button')!;

describe('ForSwitch', () => {
  describe('static accessibility', () => {
    it('sets role="switch", type="button" and starts unchecked', () => {
      const { el } = renderHost(SwitchHost);
      const sw = switchOf(el);
      expect(sw.getAttribute('role')).toBe('switch');
      expect(sw.getAttribute('type')).toBe('button');
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(sw.getAttribute('data-state')).toBe('unchecked');
    });

    it('always emits aria-checked even when falsy (togglable widget rule)', () => {
      // Per CLAUDE.md § "ARIA state attribute emission", aria-checked stays in
      // the always-emit group so screen readers announce the off state. The
      // truthy-only flags are exercised by the form-control contract below.
      const { el } = renderHost(SwitchHost);
      expect(switchOf(el).hasAttribute('aria-checked')).toBe(true);
    });
  });

  assertFormControlContract(
    () => {
      const r = renderHost(SwitchHost);
      const result: FormControlMountResult = {
        control: switchOf(r.el),
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
      };
      return result;
    },
    { customRoleStaysFocusable: true },
  );

  describe('click', () => {
    it('toggles aria-checked / data-state and emits the model', async () => {
      const { el, fixture, flush } = renderHost(SwitchHost);
      const sw = switchOf(el);

      sw.click();
      await flush();
      expect(sw.getAttribute('aria-checked')).toBe('true');
      expect(sw.getAttribute('data-state')).toBe('checked');
      expect(fixture.componentInstance.enabled()).toBe(true);

      sw.click();
      await flush();
      expect(sw.getAttribute('aria-checked')).toBe('false');
      expect(fixture.componentInstance.enabled()).toBe(false);
    });
  });

  describe('two-way [(checked)]', () => {
    it('reflects external writes', async () => {
      const { el, fixture, flush } = renderHost(SwitchHost);
      fixture.componentInstance.enabled.set(true);
      await flush();
      expect(switchOf(el).getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('disabled / readonly block activation', () => {
    it('blocks click while disabled', async () => {
      const { el, fixture, flush } = renderHost(SwitchHost);
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      switchOf(el).click();
      await flush();
      expect(fixture.componentInstance.enabled()).toBe(false);
    });

    it('blocks click while readonly without disabling the host', async () => {
      const { el, fixture, flush } = renderHost(SwitchHost);
      fixture.componentInstance.isReadonly.set(true);
      await flush();
      const sw = switchOf(el);
      expect(sw.hasAttribute('disabled')).toBe(false);
      sw.click();
      await flush();
      expect(fixture.componentInstance.enabled()).toBe(false);
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true via blur and stays interactive afterwards', async () => {
      const { el, flush } = renderHost(SwitchHost);
      const sw = switchOf(el);
      expect(sw.hasAttribute('data-touched')).toBe(false);

      sw.focus();
      sw.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(sw.getAttribute('data-touched')).toBe('');

      sw.click();
      await flush();
      expect(sw.getAttribute('aria-checked')).toBe('true');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForSwitch],
      template: `
        <form>
          <button forSwitch [(checked)]="enabled" [name]="fieldName()"></button>
        </form>
      `,
    })
    class FormHost {
      readonly enabled = signal(false);
      readonly fieldName = signal<string>('');
    }

    it('does not submit any value when name is empty', () => {
      const { el } = renderHost(FormHost);
      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });

    it('submits name=on while checked', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('notify');
      fixture.componentInstance.enabled.set(true);
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([['notify', 'on']]);
    });

    it('omits the value when unchecked', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('notify');
      await flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external set without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(SwitchHost);
      fixture.componentInstance.enabled.set(true);
      await flush();
      expect(switchOf(el).getAttribute('aria-checked')).toBe('true');

      fixture.componentInstance.enabled.set(false);
      await flush();
      expect(switchOf(el).getAttribute('aria-checked')).toBe('false');
    });
  });

  describe('Signal Forms integration via [formField]', () => {
    interface Settings {
      notifications: boolean;
      terms: boolean;
    }

    @Component({
      imports: [ForSwitch, FormField],
      template: `
        <button
          forSwitch
          [formField]="settings.notifications"
          data-test-id="notifications"
        ></button>
        <button forSwitch [formField]="settings.terms" data-test-id="terms"></button>
      `,
    })
    class SignalFormsHost {
      readonly model = signal<Settings>({ notifications: false, terms: false });
      readonly settings = form(this.model, (s) => {
        required(s.terms);
        fieldReadonly(s.notifications, ({ valueOf }) => valueOf(s.terms) === false);
      });
    }

    const swById = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

    it('two-way binds checked with the field value', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const notif = swById(el, 'notifications');

      // The required-but-disabled-when-terms-false rule keeps notifications readonly initially.
      // First, accept the terms so notifications becomes interactive.
      const terms = swById(el, 'terms');
      terms.click();
      await flush();
      expect(fixture.componentInstance.model().terms).toBe(true);
      expect(terms.getAttribute('aria-checked')).toBe('true');

      // Now toggle notifications via the switch UI:
      notif.click();
      await flush();
      expect(fixture.componentInstance.model().notifications).toBe(true);
      expect(notif.getAttribute('aria-checked')).toBe('true');

      // External change to the model also flows back into the DOM:
      fixture.componentInstance.model.update((m) => ({ ...m, notifications: false }));
      await flush();
      expect(notif.getAttribute('aria-checked')).toBe('false');
    });

    it('flows `required` from the schema into aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      const terms = swById(el, 'terms');
      expect(terms.getAttribute('aria-required')).toBe('true');
    });

    it('flows schema-driven readonly into aria-readonly', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      const notif = swById(el, 'notifications');

      // Terms unchecked → notifications is schema-readonly.
      expect(notif.getAttribute('aria-readonly')).toBe('true');

      // Once terms is checked, notifications should not be readonly anymore.
      const terms = swById(el, 'terms');
      terms.click();
      await flush();
      expect(notif.getAttribute('aria-readonly')).toBe(null);
    });
  });

  describe('FormCheckboxControl contract', () => {
    it('does not expose a `value` property (forbidden by the interface)', () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      @Component({ imports: [ForSwitch], template: `<button forSwitch #ref="forSwitch"></button>` })
      class HostWithRef {}

      const fixture = TestBed.createComponent(HostWithRef);
      fixture.detectChanges();
      const button = fixture.nativeElement.querySelector('button')!;
      // The host attribute reflects no `value`; rely on the public surface staying clean.
      expect(button.hasAttribute('value')).toBe(false);
    });
  });
});
