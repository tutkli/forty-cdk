import {
  Component,
  PLATFORM_ID,
  provideZonelessChangeDetection,
  signal,
  viewChild,
} from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form, FormField, required } from '@angular/forms/signals';

import {
  assertFormControlContract,
  type FormControlMountResult,
} from '../../src/test-utils/contract';
import { flush } from '../../src/test-utils';
import { installObserverPolyfills } from '../../src/test-utils/observers';
import { renderHost } from '../../src/test-utils/render';
import { ForField, ForFieldDescription, ForLabel } from 'forty-cdk/field';
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

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea [autosize]="autosize()"></textarea>`,
})
class AutosizeTextareaHost {
  readonly autosize = signal(false);
}

@Component({
  imports: [ForTextarea],
  template: `<textarea forTextarea [autosize]="autosize()" [(value)]="text"></textarea>`,
})
class OverflowTextareaHost {
  readonly autosize = signal(false);
  readonly text = signal('');
  readonly textarea = viewChild.required(ForTextarea);
}

class ControlledResizeObserver {
  static instances: ControlledResizeObserver[] = [];
  #observed: Element | null = null;
  constructor(private readonly callback: ResizeObserverCallback) {
    ControlledResizeObserver.instances.push(this);
  }
  observe(el: Element): void {
    this.#observed = el;
  }
  unobserve(): void {
    this.#observed = null;
  }
  disconnect(): void {
    this.#observed = null;
  }
  fire(): void {
    if (this.#observed) {
      this.callback([], this as unknown as ResizeObserver);
    }
  }
}

const stubHeights = (
  el: HTMLElement,
  heights: { scroll: number; client: number },
): { scroll: number; client: number } => {
  Object.defineProperty(el, 'scrollHeight', { configurable: true, get: () => heights.scroll });
  Object.defineProperty(el, 'clientHeight', { configurable: true, get: () => heights.client });
  return heights;
};

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
    it('updates the model from the native input event and toggles data-empty', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      typeInto(input, 'hello');
      await flush();
      expect(fixture.componentInstance.text()).toBe('hello');
      expect(input.hasAttribute('data-empty')).toBe(false);

      typeInto(input, '');
      await flush();
      expect(fixture.componentInstance.text()).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });

    it('mirrors external [(value)] writes back into the native element', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      fixture.componentInstance.text.set('world');
      await flush();
      expect(input.value).toBe('world');
      expect(input.hasAttribute('data-empty')).toBe(false);

      fixture.componentInstance.text.set('');
      await flush();
      expect(input.value).toBe('');
      expect(input.getAttribute('data-empty')).toBe('');
    });
  });

  describe('touched on blur', () => {
    it('flips touched=true via blur (reflected as data-touched)', async () => {
      const { el, flush } = renderHost(InputHost);
      const input = inputOf(el);
      input.dispatchEvent(new FocusEvent('blur'));
      await flush();
      expect(input.getAttribute('data-touched')).toBe('');
    });
  });

  describe('IME composition', () => {
    it('does not emit an intermediate value while composing', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = 'り';
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush();

      expect(fixture.componentInstance.text()).toBe('');
      expect(input.value).toBe('り');
    });

    it('flushes the final composed value once on compositionend', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.value = 'りんご';
      input.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush();
      expect(fixture.componentInstance.text()).toBe('');

      input.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: 'りんご' }),
      );
      await flush();
      expect(fixture.componentInstance.text()).toBe('りんご');
    });

    it('resumes propagating plain input after composition ends', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '' }));
      await flush();

      typeInto(input, 'abc');
      await flush();
      expect(fixture.componentInstance.text()).toBe('abc');
    });
  });

  describe('blur re-syncs the DOM value', () => {
    it('reconciles a stale element value to the model on blur', async () => {
      const { el, fixture, flush } = renderHost(InputHost);
      const input = inputOf(el);

      input.focus();
      typeInto(input, 'typed');
      await flush();
      expect(fixture.componentInstance.text()).toBe('typed');

      input.value = 'stale-during-focus';
      input.dispatchEvent(new FocusEvent('blur'));
      await flush();

      expect(input.value).toBe('typed');
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

    it('submits the native value exactly once (no duplicate hidden input)', async () => {
      const { el, fixture, flush } = renderHost(FormHost);
      fixture.componentInstance.fieldName.set('email');
      fixture.componentInstance.text.set('ada@x.dev');
      await flush();

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

    it('two-way binds the value with the field', async () => {
      const { el, fixture, flush } = renderHost(SignalFormsHost);
      const name = byId(el, 'name');

      typeInto(name, 'Ada');
      await flush();
      expect(fixture.componentInstance.model().name).toBe('Ada');

      fixture.componentInstance.model.update((m) => ({ ...m, name: 'Lin' }));
      await flush();
      expect(name.value).toBe('Lin');
    });

    it('flows schema-driven required into aria-required', async () => {
      const { el, flush } = renderHost(SignalFormsHost);
      await flush();
      expect(byId(el, 'name').getAttribute('aria-required')).toBe('true');
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
    it('updates the model from the native input event', async () => {
      const { el, fixture, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      typeInto(textarea, 'multi\nline');
      await flush();
      expect(fixture.componentInstance.text()).toBe('multi\nline');
      expect(textarea.hasAttribute('data-empty')).toBe(false);
    });

    it('mirrors external writes back into the native element', async () => {
      const { el, fixture, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      fixture.componentInstance.text.set('about me');
      await flush();
      expect(textarea.value).toBe('about me');
    });
  });

  describe('IME composition parity', () => {
    it('suppresses intermediate text and flushes on compositionend', async () => {
      const { el, fixture, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
      textarea.value = 'かな';
      textarea.dispatchEvent(
        new InputEvent('input', { inputType: 'insertCompositionText', isComposing: true }),
      );
      await flush();
      expect(fixture.componentInstance.text()).toBe('');

      textarea.dispatchEvent(
        new CompositionEvent('compositionend', { bubbles: true, data: 'かな' }),
      );
      await flush();
      expect(fixture.componentInstance.text()).toBe('かな');
    });
  });

  describe('blur re-syncs the DOM value', () => {
    it('reconciles a stale element value to the model on blur', async () => {
      const { el, flush } = renderHost(TextareaHost);
      const textarea = textareaOf(el);

      textarea.focus();
      typeInto(textarea, 'note');
      await flush();

      textarea.value = 'stale';
      textarea.dispatchEvent(new FocusEvent('blur'));
      await flush();

      expect(textarea.value).toBe('note');
    });
  });

  describe('autosize', () => {
    let restoreObservers: () => void;
    beforeAll(() => {
      restoreObservers = installObserverPolyfills();
    });
    afterAll(() => restoreObservers());

    it('reflects data-autosize only while enabled', async () => {
      const { el, fixture, flush } = renderHost(AutosizeTextareaHost);
      const textarea = textareaOf(el);
      expect(textarea.hasAttribute('data-autosize')).toBe(false);

      fixture.componentInstance.autosize.set(true);
      await flush();
      expect(textarea.getAttribute('data-autosize')).toBe('');

      fixture.componentInstance.autosize.set(false);
      await flush();
      expect(textarea.hasAttribute('data-autosize')).toBe(false);
    });

    it('reflects data-autosize', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AutosizeTextareaHost);
      await flush(fixture);
      const textarea = textareaOf(fixture.nativeElement);

      fixture.componentInstance.autosize.set(true);
      await flush(fixture);
      expect(textarea.getAttribute('data-autosize')).toBe('');
    });
  });

  describe('overflowing', () => {
    beforeEach(() => {
      ControlledResizeObserver.instances = [];
      vi.stubGlobal('ResizeObserver', ControlledResizeObserver);
    });
    afterEach(() => vi.unstubAllGlobals());

    const fireResize = (): void => {
      for (const observer of ControlledResizeObserver.instances) {
        observer.fire();
      }
    };

    it('follows value edits that leave the capped autosize box unchanged', async () => {
      const { el, fixture, flush } = renderHost(OverflowTextareaHost);
      fixture.componentInstance.autosize.set(true);
      await flush();
      const textarea = textareaOf(el);
      const heights = stubHeights(textarea, { scroll: 60, client: 60 });

      heights.scroll = 140;
      typeInto(textarea, 'one\ntwo\nthree\nfour\nfive\nsix\nseven');
      await flush();
      expect(fixture.componentInstance.textarea().overflowing()).toBe(true);
      expect(textarea.getAttribute('data-overflowing')).toBe('');

      heights.scroll = 60;
      typeInto(textarea, 'one');
      await flush();
      expect(fixture.componentInstance.textarea().overflowing()).toBe(false);
      expect(textarea.hasAttribute('data-overflowing')).toBe(false);
    });

    it('tracks a fixed-height textarea without autosize, on edits and programmatic writes', async () => {
      const { el, fixture, flush } = renderHost(OverflowTextareaHost);
      const textarea = textareaOf(el);
      const heights = stubHeights(textarea, { scroll: 40, client: 40 });

      heights.scroll = 120;
      typeInto(textarea, 'a\nb\nc\nd');
      await flush();
      expect(textarea.getAttribute('data-overflowing')).toBe('');

      heights.scroll = 40;
      fixture.componentInstance.text.set('a');
      await flush();
      expect(textarea.hasAttribute('data-overflowing')).toBe(false);
    });

    it('re-evaluates on resize when the value has not changed', async () => {
      const { el, fixture, flush } = renderHost(OverflowTextareaHost);
      const textarea = textareaOf(el);
      const heights = stubHeights(textarea, { scroll: 100, client: 100 });
      fireResize();
      await flush();
      expect(fixture.componentInstance.textarea().overflowing()).toBe(false);

      heights.client = 50;
      fireResize();
      await flush();
      expect(fixture.componentInstance.textarea().overflowing()).toBe(true);

      heights.client = 100;
      fireResize();
      await flush();
      expect(fixture.componentInstance.textarea().overflowing()).toBe(false);
    });

    it('leaves a consumer-set height alone without autosize', async () => {
      const { el, flush } = renderHost(OverflowTextareaHost);
      const textarea = textareaOf(el);
      textarea.style.height = '120px';

      typeInto(textarea, 'note');
      fireResize();
      await flush();

      expect(textarea.style.height).toBe('120px');
    });

    it('clears the height it wrote once autosize turns off', async () => {
      const { el, fixture, flush } = renderHost(OverflowTextareaHost);
      const textarea = textareaOf(el);
      fixture.componentInstance.autosize.set(true);
      await flush();
      expect(textarea.style.height).not.toBe('');

      fixture.componentInstance.autosize.set(false);
      await flush();
      expect(textarea.style.height).toBe('');
    });

    it('stays false and constructs no observer under SSR', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection(), { provide: PLATFORM_ID, useValue: 'server' }],
      });
      const fixture = TestBed.createComponent(OverflowTextareaHost);
      const textarea = textareaOf(fixture.nativeElement);
      stubHeights(textarea, { scroll: 200, client: 40 });
      await flush(fixture);

      fixture.componentInstance.text.set('a\nb\nc');
      await flush(fixture);

      expect(fixture.componentInstance.textarea().overflowing()).toBe(false);
      expect(textarea.hasAttribute('data-overflowing')).toBe(false);
      expect(ControlledResizeObserver.instances).toHaveLength(0);
    });
  });
});
