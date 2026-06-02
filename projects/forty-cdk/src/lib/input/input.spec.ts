import { Component, signal } from '@angular/core';
import { form, FormField, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../test-utils/contract';
import { renderHost } from '../../test-utils/render';
import { ForFieldDescription } from '../field/field-description';
import { ForField } from '../field/field';
import { ForLabel } from '../field/label';
import { ForInput } from './input';
import { ForTextarea } from './textarea';

const typeInto = (el: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
  el.value = text;
  el.dispatchEvent(new Event('input'));
};

@Component({
  imports: [ForInput],
  template: `
    <input
      forInput
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
  `,
})
class InputHost {
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

@Component({
  imports: [ForTextarea],
  template: `
    <textarea
      forTextarea
      [(value)]="text"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
    ></textarea>
  `,
})
class TextareaHost {
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

const inputOf = (host: HTMLElement) => host.querySelector<HTMLInputElement>('input')!;
const textareaOf = (host: HTMLElement) => host.querySelector<HTMLTextAreaElement>('textarea')!;

const contractResult = (
  r: ReturnType<typeof renderHost<InputHost | TextareaHost>>,
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

describe('ForInput', () => {
  describe('static', () => {
    it('starts empty and reflects data-empty', () => {
      const { el } = renderHost(InputHost);
      const input = inputOf(el);
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });

  assertFormControlContract(() => {
    const r = renderHost(InputHost);
    return contractResult(r, inputOf(r.el));
  });

  describe('value binding', () => {
    it('updates the model from the native input event and toggles data-empty', () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      typeInto(input, 'hello');
      flush();
      expect(fixture.componentInstance.text()).toBe('hello');
      expect(input.hasAttribute('data-empty')).toBe(false);

      typeInto(input, '');
      flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });

    it('mirrors external [(value)] writes back into the native element', () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      fixture.componentInstance.text.set('world');
      flush();
      expect(input.value).toBe('world');
      expect(input.hasAttribute('data-empty')).toBe(false);

      fixture.componentInstance.text.set('');
      flush();
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true via blur (reflected as data-touched)', () => {
      const { el, flush } = renderHost(InputHost);
      const input = inputOf(el);
      input.dispatchEvent(new FocusEvent('blur'));
      flush();
      expect(input.getAttribute('data-touched')).toBe('');
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForInput],
      template: `
        <form>
          <input forInput [(value)]="text" [name]="fieldName()" />
        </form>
      `,
    })
    class FormHost {
      readonly text = signal('');
      readonly fieldName = signal<string>('');
    }

    it('submits nothing while name is empty', () => {
      const { el } = renderHost(FormHost);
      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([]);
    });

    it('submits the native value exactly once (no duplicate hidden input)', () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('email');
      fixture.componentInstance.text.set('ada@x.dev');
      flush();

      const form = el.querySelector('form')!;
      expect(Array.from(new FormData(form).entries())).toEqual([['email', 'ada@x.dev']]);
    });
  });

  describe('field auto-association', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldDescription, ForInput],
      template: `
        <div forField>
          <label forLabel data-test-id="label">Full name</label>
          <input forInput [(value)]="text" data-test-id="control" />
          <p forFieldDescription data-test-id="desc">As on your passport.</p>
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

    it('wires aria-labelledby / aria-describedby to the label and description', () => {
      const { el } = renderHost(FieldHost);
      const control = q(el, 'control');
      expect(control.getAttribute('aria-labelledby')).toBe(q(el, 'label').id);
      expect(control.getAttribute('aria-describedby')).toBe(q(el, 'desc').id);
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Profile {
      name: string;
      bio: string;
    }

    @Component({
      imports: [ForInput, ForTextarea, FormField],
      template: `
        <input forInput [formField]="profile.name" data-test-id="name" />
        <textarea forTextarea [formField]="profile.bio" data-test-id="bio"></textarea>
      `,
    })
    class SignalFormsHost {
      readonly model = signal<Profile>({ name: '', bio: '' });
      readonly profile = form(this.model, (p) => {
        required(p.name);
      });
    }

    const byId = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[data-test-id="${id}"]`)!;

    it('two-way binds the value with the field', () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const name = byId(el, 'name');

      typeInto(name, 'Ada');
      flush();
      expect(fixture.componentInstance.model().name).toBe('Ada');

      fixture.componentInstance.model.update((m) => ({ ...m, name: 'Lin' }));
      flush();
      expect(name.value).toBe('Lin');
    });

    it('flows schema-driven required into aria-required', () => {
      const { el, flush } = renderHost(SignalFormsHost);
      flush();
      expect(byId(el, 'name').getAttribute('aria-required')).toBe('true');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects an external set without Zone.js', () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      fixture.componentInstance.text.set('a');
      flush();
      expect(input.value).toBe('a');

      fixture.componentInstance.text.set('');
      flush();
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });
});

describe('ForTextarea', () => {
  describe('static', () => {
    it('starts empty and reflects data-empty', () => {
      const { el } = renderHost(TextareaHost);
      expect(textareaOf(el).getAttribute('data-empty')).toBe('');
    });
  });

  assertFormControlContract(() => {
    const r = renderHost(TextareaHost);
    return contractResult(r, textareaOf(r.el));
  });

  describe('value binding parity', () => {
    it('updates the model from the native input event', () => {
      const { el, fixture, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      typeInto(textarea, 'multi\nline');
      flush();
      expect(fixture.componentInstance.text()).toBe('multi\nline');
      expect(textarea.hasAttribute('data-empty')).toBe(false);
    });

    it('mirrors external writes back into the native element', () => {
      const { el, fixture, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      fixture.componentInstance.text.set('about me');
      flush();
      expect(textarea.value).toBe('about me');
    });
  });
});
