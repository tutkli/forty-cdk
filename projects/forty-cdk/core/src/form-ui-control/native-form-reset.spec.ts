import {
  Component,
  Directive,
  ElementRef,
  inject,
  model,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { nextMacrotask } from '../../../src/test-utils/flush';
import { renderHost } from '../../../src/test-utils/render';
import {
  injectNativeFormReset,
  injectNativeFormResetToInitial,
  injectRenderedDefaultValue,
} from './native-form-reset';

@Directive({
  selector: '[resetProbe]',
})
class ResetProbe {
  readonly el = signal<HTMLInputElement | null>(null);
  readonly resets = signal<readonly string[]>([]);

  constructor() {
    injectNativeFormReset(this.el, (text) => this.resets.update((all) => [...all, text]));
  }
}

describe('injectNativeFormReset', () => {
  describe('form in the light tree', () => {
    @Component({
      imports: [ResetProbe],
      template: `<form><div resetProbe></div></form>`,
    })
    class Host {
      readonly probe = viewChild.required(ResetProbe);
    }

    it('attaches once the element appears and reports its default text after the reset', async () => {
      const { el, instance, flush } = renderHost(Host);
      const form = el.querySelector('form')!;

      form.reset();
      await flush();
      expect(instance.probe().resets()).toEqual([]);

      const input = document.createElement('input');
      input.defaultValue = 'seed';
      el.querySelector('[resetProbe]')!.appendChild(input);
      instance.probe().el.set(input);
      await flush();

      input.value = 'edited';
      form.reset();
      expect(input.value).toBe('seed');
      expect(instance.probe().resets()).toEqual([]);

      await flush();
      expect(instance.probe().resets()).toEqual(['seed']);
    });

    it('stops listening once the probe is destroyed', async () => {
      const { el, fixture, instance, flush } = renderHost(Host);
      const form = el.querySelector('form')!;
      const input = document.createElement('input');
      el.querySelector('[resetProbe]')!.appendChild(input);
      instance.probe().el.set(input);
      await flush();

      const probe = instance.probe();
      document.body.appendChild(form);
      try {
        fixture.destroy();
        form.reset();
        await nextMacrotask();
        expect(probe.resets()).toEqual([]);
      } finally {
        form.remove();
      }
    });
  });

  describe('form inside an open shadow root', () => {
    @Component({
      imports: [ResetProbe],
      encapsulation: ViewEncapsulation.ShadowDom,
      template: `<form><div resetProbe></div></form>`,
    })
    class ShadowHost {
      readonly probe = viewChild.required(ResetProbe);
    }

    it('hears a reset that never crosses the shadow boundary', async () => {
      const { el, instance, flush } = renderHost(ShadowHost);
      const form = el.shadowRoot!.querySelector('form')!;
      const input = document.createElement('input');
      el.shadowRoot!.querySelector('[resetProbe]')!.appendChild(input);
      instance.probe().el.set(input);
      await flush();

      input.value = 'edited';
      form.reset();
      await flush();
      expect(instance.probe().resets()).toEqual(['']);
    });
  });
});

@Directive({
  selector: '[initialResetProbe]',
})
class InitialResetProbe {
  readonly value = model<string | null>(null);
  readonly afterReset = signal<readonly (string | null)[]>([]);

  constructor() {
    injectNativeFormResetToInitial(this.value, () =>
      this.afterReset.update((all) => [...all, this.value()]),
    );
  }
}

describe('injectNativeFormResetToInitial', () => {
  describe('form in the light tree', () => {
    @Component({
      imports: [InitialResetProbe],
      template: `
        <form data-test-id="own">
          @if (mounted()) {
            <div initialResetProbe [(value)]="value"></div>
          }
          <button type="reset">Reset</button>
        </form>
        <form data-test-id="other"></form>
      `,
    })
    class Host {
      readonly mounted = signal(true);
      readonly value = signal<string | null>('first');
      readonly probe = viewChild(InitialResetProbe);
    }

    it('writes back the value the control held at its first render, then runs onReset', async () => {
      const { el, instance, flush } = renderHost(Host);
      await flush();
      instance.value.set('edited');
      await flush();

      el.querySelector<HTMLFormElement>('[data-test-id="own"]')!.reset();
      expect(instance.value()).toBe('edited');

      await flush();
      expect(instance.value()).toBe('first');
      expect(instance.probe()!.afterReset()).toEqual(['first']);
    });

    it('ignores a reset another listener cancelled', async () => {
      const { el, instance, flush } = renderHost(Host);
      await flush();
      instance.value.set('edited');
      await flush();

      const form = el.querySelector<HTMLFormElement>('[data-test-id="own"]')!;
      form.addEventListener('reset', (event) => event.preventDefault(), { once: true });
      form.reset();
      await flush();
      expect(instance.value()).toBe('edited');
      expect(instance.probe()!.afterReset()).toEqual([]);
    });

    it('ignores the reset of a form that does not own the control', async () => {
      const { el, instance, flush } = renderHost(Host);
      await flush();
      instance.value.set('edited');
      await flush();

      el.querySelector<HTMLFormElement>('[data-test-id="other"]')!.reset();
      await flush();
      expect(instance.value()).toBe('edited');
    });

    it('stops listening once the control is destroyed', async () => {
      const { el, instance, flush } = renderHost(Host);
      await flush();
      const probe = instance.probe()!;
      instance.value.set('edited');
      instance.mounted.set(false);
      await flush();

      el.querySelector<HTMLFormElement>('[data-test-id="own"]')!.reset();
      await nextMacrotask();
      expect(probe.afterReset()).toEqual([]);
      expect(instance.value()).toBe('edited');
    });
  });

  describe('form inside an open shadow root', () => {
    @Component({
      imports: [InitialResetProbe],
      encapsulation: ViewEncapsulation.ShadowDom,
      template: `<form><div initialResetProbe [(value)]="value"></div></form>`,
    })
    class ShadowHost {
      readonly value = signal<string | null>(null);
    }

    it('hears a reset that never crosses the shadow boundary', async () => {
      const { el, instance, flush } = renderHost(ShadowHost);
      await flush();
      instance.value.set('edited');
      await flush();

      el.shadowRoot!.querySelector('form')!.reset();
      await flush();
      expect(instance.value()).toBeNull();
    });
  });
});

describe('injectRenderedDefaultValue', () => {
  @Directive({
    selector: 'input[renderedDefaultProbe]',
  })
  class RenderedDefaultProbe {
    constructor() {
      const host = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
      injectRenderedDefaultValue(() => host);
    }
  }

  @Component({
    imports: [RenderedDefaultProbe],
    template: `<form><input renderedDefaultProbe value="markup" [value]="text" /></form>`,
  })
  class Host {
    readonly text = 'rendered';
  }

  it('makes a form reset restore the text the element showed at its first render', async () => {
    const { el, flush } = renderHost(Host);
    await flush();
    const input = el.querySelector('input')!;
    expect(input.value).toBe('rendered');

    input.value = 'edited';
    el.querySelector('form')!.reset();
    expect(input.value).toBe('rendered');
  });
});
