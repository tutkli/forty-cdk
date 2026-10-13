import { Component, Directive, signal, viewChild, ViewEncapsulation } from '@angular/core';

import { nextMacrotask } from '../../../src/test-utils/flush';
import { renderHost } from '../../../src/test-utils/render';
import { injectNativeFormReset } from './native-form-reset';

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
