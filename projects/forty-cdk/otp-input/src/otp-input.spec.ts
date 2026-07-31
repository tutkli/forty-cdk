import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { flush } from '../../src/test-utils/flush';
import { renderHost } from '../../src/test-utils/render';
import { ForField, ForFieldDescription, ForLabel } from 'forty-cdk/field';
import { ForOtpInput } from './otp-input';
import { ForOtpInputSlot } from './otp-input-slot';
import { OTP_REGEXP_ONLY_DIGITS } from './otp-patterns';

@Component({
  imports: [ForOtpInput, ForOtpInputSlot],
  template: `
    <div
      forOtpInput
      [(value)]="code"
      [length]="length()"
      [type]="type()"
      [allowedPattern]="allowedPattern()"
      [mask]="mask()"
      [oneTimeCode]="oneTimeCode()"
      [pasteTransformer]="pasteTransformer()"
      [ariaLabel]="ariaLabel()"
      [disabled]="isDisabled()"
      [readonly]="isReadonly()"
      [required]="isRequired()"
      [invalid]="isInvalid()"
      [pending]="isPending()"
      [(touched)]="isTouched"
      [dirty]="isDirty()"
      [name]="fieldName()"
      (complete)="completed.set($event)"
      (reject)="invalidEvents.update((e) => [...e, $event])"
      #otp="forOtpInput"
    >
      @for (i of otp.slots(); track i) {
        <div forOtpInputSlot [index]="i" [attr.data-test-id]="'slot-' + i" #s="forOtpInputSlot">
          <span class="char">{{ s.char() }}</span>
          @if (s.hasFakeCaret()) {
            <span class="caret" data-test-id="caret"></span>
          }
        </div>
      }
    </div>
  `,
})
class OtpHost {
  readonly code = signal('');
  readonly length = signal(6);
  readonly type = signal<'numeric' | 'alphanumeric' | 'alphabetic'>('numeric');
  readonly allowedPattern = signal<RegExp | null>(null);
  readonly mask = signal(false);
  readonly oneTimeCode = signal(true);
  readonly pasteTransformer = signal<((pasted: string) => string) | null>(null);
  readonly ariaLabel = signal<string | null>(null);
  readonly isDisabled = signal(false);
  readonly isReadonly = signal(false);
  readonly isRequired = signal(false);
  readonly isInvalid = signal(false);
  readonly isPending = signal(false);
  readonly isTouched = signal(false);
  readonly isDirty = signal(false);
  readonly fieldName = signal('');
  readonly completed = signal<string | null>(null);
  readonly invalidEvents = signal<{ value: string }[]>([]);
}

interface MountedOtp {
  fixture: ComponentFixture<OtpHost>;
  instance: OtpHost;
  el: HTMLElement;
  group: HTMLElement;
  input: HTMLInputElement;
  flush: () => Promise<void>;
}

async function mountOtp(): Promise<MountedOtp> {
  const r = renderHost(OtpHost);
  await flush(r.fixture);
  const group = r.el.querySelector<HTMLElement>('[role="group"]')!;
  const input = group.querySelector('input')!;
  return {
    fixture: r.fixture,
    instance: r.fixture.componentInstance,
    el: r.el,
    group,
    input,
    flush: () => flush(r.fixture),
  };
}

const typeInto = (input: HTMLInputElement, text: string): void => {
  input.value = text;
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const typeIntoAt = (input: HTMLInputElement, text: string, caret: number): void => {
  input.value = text;
  input.setSelectionRange(caret, caret);
  input.dispatchEvent(new Event('input', { bubbles: true }));
};

const pasteInto = (input: HTMLInputElement, text: string): void => {
  const event = new Event('paste', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: { getData: () => text } });
  input.dispatchEvent(event);
};

const slot = (group: HTMLElement, index: number): HTMLElement =>
  group.querySelector<HTMLElement>(`[data-test-id="slot-${index}"]`)!;

const slotChar = (group: HTMLElement, index: number): string =>
  slot(group, index).querySelector('.char')!.textContent!.trim();

describe('ForOtpInput', () => {
  describe('static accessibility', () => {
    it('makes the wrapper a role="group" and injects a single text input', async () => {
      const { group } = await mountOtp();
      expect(group.getAttribute('role')).toBe('group');
      const inputs = group.querySelectorAll('input');
      expect(inputs.length).toBe(1);
      expect(inputs[0]!.type).toBe('text');
    });

    it('renders one slot per length', async () => {
      const { group } = await mountOtp();
      expect(group.querySelectorAll('[data-test-id^="slot-"]').length).toBe(6);
    });

    it('host-binds aria-label only when truthy', async () => {
      const { group, instance, flush } = await mountOtp();
      expect(group.hasAttribute('aria-label')).toBe(false);
      instance.ariaLabel.set('Verification code');
      await flush();
      expect(group.getAttribute('aria-label')).toBe('Verification code');
    });

    it('reflects ariaLabel as aria-label on the injected input when standalone', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.ariaLabel.set('Verification code');
      await flush();
      expect(input.getAttribute('aria-label')).toBe('Verification code');
    });

    it('emits no aria-label on the injected input while ariaLabel is unset', async () => {
      const { input, instance, flush } = await mountOtp();
      expect(input.hasAttribute('aria-label')).toBe(false);
      instance.ariaLabel.set('');
      await flush();
      expect(input.hasAttribute('aria-label')).toBe(false);
    });

    it('reflects data-complete on the group when every slot is filled', async () => {
      const { group, input, instance, flush } = await mountOtp();
      expect(group.hasAttribute('data-complete')).toBe(false);
      typeInto(input, '123456');
      await flush();
      expect(instance.code()).toBe('123456');
      expect(group.getAttribute('data-complete')).toBe('');
    });

    it('reflects data-readonly on the group while read-only, and clears it', async () => {
      const { group, instance, flush } = await mountOtp();
      expect(group.hasAttribute('data-readonly')).toBe(false);

      instance.isReadonly.set(true);
      await flush();
      expect(group.getAttribute('data-readonly')).toBe('');

      instance.isReadonly.set(false);
      await flush();
      expect(group.hasAttribute('data-readonly')).toBe(false);
    });

    it('sets maxlength, numeric inputmode, the legacy pattern and one-time-code autofill', async () => {
      const { input } = await mountOtp();
      expect(input.getAttribute('maxlength')).toBe('6');
      expect(input.getAttribute('inputmode')).toBe('numeric');
      expect(input.getAttribute('pattern')).toBe('[0-9]*');
      expect(input.getAttribute('autocomplete')).toBe('one-time-code');
    });

    it('derives text inputmode for letter classes and drops the legacy pattern', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.type.set('alphanumeric');
      await flush();
      expect(input.getAttribute('inputmode')).toBe('text');
      expect(input.hasAttribute('pattern')).toBe(false);
    });

    it('switches autocomplete off when oneTimeCode is disabled', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.oneTimeCode.set(false);
      await flush();
      expect(input.getAttribute('autocomplete')).toBe('off');
    });
  });

  assertFormControlContract(
    async () => {
      const m = await mountOtp();
      const result: FormControlMountResult = {
        control: m.input,
        flush: m.flush,
        setName: (name) => m.instance.fieldName.set(name),
        setFlag: (flag, value) => {
          switch (flag) {
            case 'disabled':
              m.instance.isDisabled.set(value);
              return;
            case 'readonly':
              m.instance.isReadonly.set(value);
              return;
            case 'required':
              m.instance.isRequired.set(value);
              return;
            case 'invalid':
              m.instance.isInvalid.set(value);
              return;
            case 'pending':
              m.instance.isPending.set(value);
              return;
            case 'touched':
              m.instance.isTouched.set(value);
              return;
            case 'dirty':
              m.instance.isDirty.set(value);
              return;
          }
        },
      };
      return result;
    },
    {
      flags: ['disabled', 'readonly', 'required', 'invalid', 'pending', 'touched', 'dirty', 'name'],
    },
  );

  describe('typing & character restriction', () => {
    it('fills slots left-to-right from the typed value', async () => {
      const { group, input, instance, flush } = await mountOtp();
      typeInto(input, '123');
      await flush();
      expect(instance.code()).toBe('123');
      expect(slotChar(group, 0)).toBe('1');
      expect(slotChar(group, 1)).toBe('2');
      expect(slotChar(group, 2)).toBe('3');
      expect(slotChar(group, 3)).toBe('');
    });

    it('rejects non-digits for type="numeric" and fires (reject)', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '12a3');
      await flush();
      expect(instance.code()).toBe('123');
      expect(input.value).toBe('123');
      expect(instance.invalidEvents()).toEqual([{ value: '12a3' }]);
    });

    it('lets allowedPattern override type', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.type.set('alphanumeric');
      instance.allowedPattern.set(OTP_REGEXP_ONLY_DIGITS);
      await flush();
      typeInto(input, '1a2b3');
      await flush();
      expect(instance.code()).toBe('123');
      expect(instance.invalidEvents().length).toBe(1);
    });

    it('clamps an over-length typed value to length', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '12345678');
      await flush();
      expect(instance.code()).toBe('123456');
      expect(input.value).toBe('123456');
    });

    it('clears slots as the value shrinks (backspace path)', async () => {
      const { group, input, instance, flush } = await mountOtp();
      typeInto(input, '12345');
      await flush();
      typeInto(input, '1234');
      await flush();
      expect(instance.code()).toBe('1234');
      expect(slotChar(group, 4)).toBe('');
      expect(slot(group, 4).getAttribute('data-empty')).toBe('');
    });
  });

  describe('caret preservation on rejected input', () => {
    it('keeps the caret in place when a rejected character is typed mid-string', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '1236');
      await flush();

      typeIntoAt(input, '1a236', 2);
      await flush();

      expect(input.value).toBe('1236');
      expect(input.selectionStart).toBe(1);
      expect(input.selectionEnd).toBe(1);
      expect(instance.code()).toBe('1236');
      expect(instance.invalidEvents()).toEqual([{ value: '1a236' }]);
    });

    it('keeps the caret at the end when the rejected character is typed at the end', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '123');
      await flush();

      typeIntoAt(input, '123a', 4);
      await flush();

      expect(input.value).toBe('123');
      expect(input.selectionStart).toBe(3);
      expect(instance.code()).toBe('123');
    });

    it('leaves the caret at the start when the first typed character is rejected', async () => {
      const { input, instance, flush } = await mountOtp();
      typeIntoAt(input, 'a', 1);
      await flush();

      expect(input.value).toBe('');
      expect(input.selectionStart).toBe(0);
      expect(instance.code()).toBe('');
      expect(instance.invalidEvents()).toEqual([{ value: 'a' }]);
    });

    it('collapses to the edit point when a selection is replaced by a rejected character', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '1234');
      await flush();

      typeIntoAt(input, '1a4', 2);
      await flush();

      expect(input.value).toBe('14');
      expect(input.selectionStart).toBe(1);
      expect(instance.code()).toBe('14');
    });

    it('clamps the restored caret to the truncated value', async () => {
      const { input, flush } = await mountOtp();
      typeIntoAt(input, '12345678', 8);
      await flush();

      expect(input.value).toBe('123456');
      expect(input.selectionStart).toBe(6);
    });

    it('moves the active slot back to the restored caret', async () => {
      const { group, input, flush } = await mountOtp();
      input.dispatchEvent(new FocusEvent('focus'));
      typeInto(input, '1236');
      await flush();

      typeIntoAt(input, '1a236', 2);
      await flush();

      expect(slot(group, 1).getAttribute('data-active')).toBe('');
      expect(group.querySelectorAll('[data-active]').length).toBe(1);
    });
  });

  describe('paste', () => {
    it('fills all slots from a paste', async () => {
      const { input, instance, flush } = await mountOtp();
      pasteInto(input, '987654');
      await flush();
      expect(instance.code()).toBe('987654');
      expect(input.value).toBe('987654');
    });

    it('runs pasteTransformer to strip separators', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.pasteTransformer.set((text) => text.replace(/-/g, ''));
      await flush();
      pasteInto(input, '123-456');
      await flush();
      expect(instance.code()).toBe('123456');
    });

    it('slices an over-length paste to length', async () => {
      const { input, instance, flush } = await mountOtp();
      pasteInto(input, '1234567890');
      await flush();
      expect(instance.code()).toBe('123456');
    });

    it('drops rejected pasted characters and fires (reject)', async () => {
      const { input, instance, flush } = await mountOtp();
      pasteInto(input, '12ab34');
      await flush();
      expect(instance.code()).toBe('1234');
      expect(instance.invalidEvents()).toEqual([{ value: '12ab34' }]);
    });

    it('leaves the caret at the end after a partially-rejected paste', async () => {
      const { input, flush } = await mountOtp();
      pasteInto(input, '12ab34');
      await flush();
      expect(input.value).toBe('1234');
      expect(input.selectionStart).toBe(4);
      expect(input.selectionEnd).toBe(4);
    });
  });

  describe('completion', () => {
    it('fires (complete) on the completing keystroke', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '12345');
      await flush();
      expect(instance.completed()).toBeNull();
      typeInto(input, '123456');
      await flush();
      expect(instance.completed()).toBe('123456');
    });

    it('fires (complete) on a completing paste', async () => {
      const { input, instance, flush } = await mountOtp();
      pasteInto(input, '654321');
      await flush();
      expect(instance.completed()).toBe('654321');
    });

    it('does not re-fire (complete) on a further keystroke while already full', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '123456');
      await flush();
      expect(instance.completed()).toBe('123456');

      instance.completed.set(null);
      typeInto(input, '1234567');
      await flush();
      expect(instance.code()).toBe('123456');
      expect(instance.completed()).toBeNull();
    });

    it('does not fire (complete) on an external write that keeps the value full', async () => {
      const { instance, flush } = await mountOtp();
      instance.code.set('123456');
      await flush();

      instance.completed.set(null);
      instance.code.set('999999');
      await flush();
      expect(instance.completed()).toBeNull();
    });

    it('fires (complete) when a full value is replaced by a different full value via paste', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '123456');
      await flush();
      expect(instance.completed()).toBe('123456');

      instance.completed.set(null);
      pasteInto(input, '654321');
      await flush();
      expect(instance.code()).toBe('654321');
      expect(instance.completed()).toBe('654321');
    });

    it('does not re-fire (complete) when a full value is replaced by the same full value via paste', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '123456');
      await flush();
      expect(instance.completed()).toBe('123456');

      instance.completed.set(null);
      pasteInto(input, '123456');
      await flush();
      expect(instance.completed()).toBeNull();
    });

    it('re-fires (complete) after dropping below full and completing again', async () => {
      const { input, instance, flush } = await mountOtp();
      typeInto(input, '123456');
      await flush();
      expect(instance.completed()).toBe('123456');

      instance.completed.set(null);
      typeInto(input, '12345');
      await flush();
      expect(instance.completed()).toBeNull();

      typeInto(input, '123450');
      await flush();
      expect(instance.completed()).toBe('123450');
    });
  });

  describe('masking', () => {
    it('obscures the rendered char but not the value', async () => {
      const { group, input, instance, flush } = await mountOtp();
      instance.mask.set(true);
      await flush();
      typeInto(input, '12');
      await flush();
      expect(instance.code()).toBe('12');
      expect(slotChar(group, 0)).toBe('•');
      expect(slotChar(group, 1)).toBe('•');
    });
  });

  describe('active slot & fake caret', () => {
    it('marks exactly one slot active at the caret and renders a fake caret when empty', async () => {
      const { group, input, instance, flush } = await mountOtp();
      input.dispatchEvent(new FocusEvent('focus'));
      typeInto(input, '12');
      await flush();

      const active = group.querySelectorAll('[data-active]');
      expect(active.length).toBe(1);
      expect(slot(group, 2).getAttribute('data-active')).toBe('');
      expect(slot(group, 2).getAttribute('data-highlighted')).toBeNull();
      expect(slot(group, 2).querySelector('[data-test-id="caret"]')).not.toBeNull();
    });

    it('marks no slot active while blurred', async () => {
      const { group, input, flush } = await mountOtp();
      typeInto(input, '12');
      await flush();
      expect(group.querySelectorAll('[data-active]').length).toBe(0);
    });

    it('tracks the active slot from the caret position', async () => {
      const { group, input, flush } = await mountOtp();
      input.dispatchEvent(new FocusEvent('focus'));
      typeInto(input, '1234');
      await flush();
      input.setSelectionRange(1, 1);
      input.dispatchEvent(new Event('select'));
      await flush();
      expect(slot(group, 1).getAttribute('data-active')).toBe('');
      expect(slot(group, 1).querySelector('[data-test-id="caret"]')).toBeNull();
    });
  });

  describe('disabled / readonly block interaction', () => {
    it('ignores typing while disabled', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.isDisabled.set(true);
      await flush();
      typeInto(input, '123');
      await flush();
      expect(instance.code()).toBe('');
    });

    it('ignores typing while readonly', async () => {
      const { input, instance, flush } = await mountOtp();
      instance.isReadonly.set(true);
      await flush();
      typeInto(input, '123');
      await flush();
      expect(instance.code()).toBe('');
    });
  });

  describe('IME composition', () => {
    it('does not rewrite value or move the caret while composing', async () => {
      const { input, instance, flush } = await mountOtp();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));

      input.value = 'あ';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      await flush();

      expect(input.value).toBe('あ');
      expect(instance.code()).toBe('');
    });

    it('normalizes once on compositionend (filter + value sync)', async () => {
      const { input, instance, flush } = await mountOtp();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = '1a2';
      input.dispatchEvent(new InputEvent('input', { bubbles: true, isComposing: true }));
      await flush();
      expect(instance.code()).toBe('');

      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '1a2' }));
      await flush();
      expect(input.value).toBe('12');
      expect(instance.code()).toBe('12');
      expect(input.selectionStart).toBe(2);
    });

    it('resumes filtering plain input after composition ends', async () => {
      const { input, instance, flush } = await mountOtp();
      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
      await flush();

      typeInto(input, '12a3');
      await flush();
      expect(instance.code()).toBe('123');
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true on blur (reflected as data-touched on the input)', async () => {
      const { input, instance, flush } = await mountOtp();
      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(instance.isTouched()).toBe(true);
      expect(input.getAttribute('data-touched')).toBe('');
    });
  });

  describe('external write while focused', () => {
    it('reconciles the input on blur after an external reset while focused, so Backspace cannot resurrect the old code', async () => {
      const { el, input, instance, flush } = await mountOtp();
      document.body.appendChild(el);
      try {
        input.focus();
        typeInto(input, '123456');
        await flush();
        expect(instance.code()).toBe('123456');
        expect(document.activeElement).toBe(input);

        instance.code.set('');
        await flush();
        expect(input.value).toBe('123456');

        input.blur();
        await flush();
        expect(input.value).toBe('');
        expect(instance.code()).toBe('');

        input.focus();
        typeInto(input, '');
        await flush();
        expect(instance.code()).toBe('');
      } finally {
        el.remove();
      }
    });
  });

  describe('native form submission', () => {
    @Component({
      imports: [ForOtpInput, ForOtpInputSlot],
      template: `
        <form>
          <div forOtpInput [(value)]="code" [length]="6" [name]="fieldName()" #otp="forOtpInput">
            @for (i of otp.slots(); track i) {
              <div forOtpInputSlot [index]="i"></div>
            }
          </div>
        </form>
      `,
    })
    class FormHost {
      readonly code = signal('');
      readonly fieldName = signal('');
    }

    it('puts name on the real input and submits its value', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      r.fixture.componentInstance.fieldName.set('otp');
      r.fixture.componentInstance.code.set('123456');
      await flush(r.fixture);

      const formEl = r.el.querySelector('form')!;
      const input = formEl.querySelector('input')!;
      expect(input.getAttribute('name')).toBe('otp');
      expect(input.value).toBe('123456');
      expect(Array.from(new FormData(formEl).entries())).toEqual([['otp', '123456']]);
    });

    it('submits nothing while name is empty', async () => {
      const r = renderHost(FormHost);
      await flush(r.fixture);
      r.fixture.componentInstance.code.set('123456');
      await flush(r.fixture);
      const formEl = r.el.querySelector('form')!;
      expect(Array.from(new FormData(formEl).entries())).toEqual([]);
    });
  });

  describe('field auto-association', () => {
    @Component({
      imports: [ForField, ForLabel, ForFieldDescription, ForOtpInput, ForOtpInputSlot],
      template: `
        <div forField>
          <label forLabel data-test-id="label">One-time code</label>
          <div
            forOtpInput
            [(value)]="code"
            [length]="6"
            [ariaLabel]="ariaLabel()"
            #otp="forOtpInput"
          >
            @for (i of otp.slots(); track i) {
              <div forOtpInputSlot [index]="i"></div>
            }
          </div>
          <p forFieldDescription data-test-id="desc">Check your phone</p>
        </div>
      `,
    })
    class FieldHost {
      readonly code = signal('');
      readonly ariaLabel = signal<string | null>(null);
    }

    @Component({
      imports: [ForField, ForOtpInput, ForOtpInputSlot],
      template: `
        <div forField>
          <div
            forOtpInput
            [(value)]="code"
            [length]="6"
            [ariaLabel]="ariaLabel()"
            #otp="forOtpInput"
          >
            @for (i of otp.slots(); track i) {
              <div forOtpInputSlot [index]="i"></div>
            }
          </div>
        </div>
      `,
    })
    class LabellessFieldHost {
      readonly code = signal('');
      readonly ariaLabel = signal<string | null>(null);
    }

    it('wires id / aria-labelledby / aria-describedby onto the real input', async () => {
      const r = renderHost(FieldHost);
      await flush(r.fixture);
      const input = r.el.querySelector('input')!;
      const label = r.el.querySelector<HTMLElement>('[data-test-id="label"]')!;
      const desc = r.el.querySelector<HTMLElement>('[data-test-id="desc"]')!;

      expect(input.id).toBeTruthy();
      expect(label.getAttribute('for')).toBe(input.id);
      expect(input.getAttribute('aria-labelledby')).toBe(label.id);
      expect(input.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('keeps the field aria-labelledby and emits no aria-label when both apply', async () => {
      const r = renderHost(FieldHost);
      r.fixture.componentInstance.ariaLabel.set('Verification code');
      await flush(r.fixture);
      const input = r.el.querySelector('input')!;
      const label = r.el.querySelector<HTMLElement>('[data-test-id="label"]')!;

      expect(input.getAttribute('aria-labelledby')).toBe(label.id);
      expect(input.hasAttribute('aria-label')).toBe(false);
    });

    it('falls back to aria-label on the input inside a field without a label', async () => {
      const r = renderHost(LabellessFieldHost);
      r.fixture.componentInstance.ariaLabel.set('Verification code');
      await flush(r.fixture);
      const input = r.el.querySelector('input')!;

      expect(input.hasAttribute('aria-labelledby')).toBe(false);
      expect(input.getAttribute('aria-label')).toBe('Verification code');
    });
  });

  describe('Signal Forms via [formField]', () => {
    interface Login {
      otp: string;
    }

    @Component({
      imports: [ForOtpInput, ForOtpInputSlot, FormField],
      template: `
        <div forOtpInput [formField]="login.otp" [length]="6" #otp="forOtpInput">
          @for (i of otp.slots(); track i) {
            <div forOtpInputSlot [index]="i"></div>
          }
        </div>
      `,
    })
    class SignalFormsHost {
      readonly model = signal<Login>({ otp: '' });
      readonly login = form(this.model, (l) => {
        required(l.otp);
      });
    }

    it('two-way binds the value with the field', async () => {
      const r = renderHost(SignalFormsHost);
      await flush(r.fixture);
      const input = r.el.querySelector('input')!;

      typeInto(input, '123');
      await flush(r.fixture);
      expect(r.fixture.componentInstance.model().otp).toBe('123');

      r.fixture.componentInstance.model.update((m) => ({ ...m, otp: '999999' }));
      await flush(r.fixture);
      expect(input.value).toBe('999999');
    });

    it('flows schema-driven required into aria-required on the input', async () => {
      const r = renderHost(SignalFormsHost);
      await flush(r.fixture);
      expect(r.el.querySelector('input')!.getAttribute('aria-required')).toBe('true');
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects an external value set into the slots without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(OtpHost);
      await flush(fixture);
      const group = fixture.nativeElement.querySelector('[role="group"]') as HTMLElement;
      const input = group.querySelector('input') as HTMLInputElement;

      fixture.componentInstance.code.set('4242');
      await flush(fixture);
      expect(input.value).toBe('4242');
      expect(slotChar(group, 0)).toBe('4');
      expect(slot(group, 3).getAttribute('data-empty')).toBe(null);
      expect(slot(group, 4).getAttribute('data-empty')).toBe('');
    });
  });
});
