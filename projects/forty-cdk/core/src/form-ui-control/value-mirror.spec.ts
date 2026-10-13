import {
  Component,
  computed,
  Directive,
  ElementRef,
  inject,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import { renderHost } from '../../../src/test-utils/render';
import { mirrorExternalValue, mirrorValue } from './value-mirror';

@Directive({
  selector: 'input[externalMirrorHost]',
})
class ExternalMirrorHost {
  readonly #el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  readonly value = signal<number | null>(null);
  readonly prefix = signal('#');
  readonly claim = mirrorExternalValue(
    () => this.#el,
    this.value,
    computed(() => {
      const current = this.value();
      return current === null ? '' : `${this.prefix()}${current}`;
    }),
  );

  write(next: number | null): void {
    this.claim(next);
    this.value.set(next);
  }
}

@Directive({
  selector: 'input[liveMirrorHost]',
})
class LiveMirrorHost {
  readonly #el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  readonly value = signal('');
  composing = false;

  constructor() {
    mirrorValue(
      () => this.#el,
      this.value,
      () => this.composing,
    );
  }
}

@Directive({
  selector: '[lazyMirrorHost]',
})
class LazyMirrorHost {
  readonly el = signal<HTMLInputElement | null>(null);
  readonly value = signal('');

  constructor() {
    mirrorValue(this.el, this.value, () => false);
  }
}

describe('mirrorExternalValue', () => {
  describe('element in the light tree', () => {
    @Component({
      imports: [ExternalMirrorHost],
      template: `<input externalMirrorHost />`,
    })
    class Host {
      readonly mirror = viewChild.required(ExternalMirrorHost);
    }

    it('writes the displayed text of an external value while the element is not focused', async () => {
      const { el, instance, flush } = renderHost(Host);
      const input = el.querySelector('input')!;

      instance.mirror().value.set(5);
      await flush();
      expect(input.value).toBe('#5');
    });

    it('writes an external value while the element is focused', async () => {
      const { el, instance, flush } = renderHost(Host);
      const input = el.querySelector('input')!;

      input.focus();
      input.value = '5';
      instance.mirror().write(5);
      await flush();
      expect(input.value).toBe('5');

      instance.mirror().value.set(null);
      await flush();
      expect(document.activeElement).toBe(input);
      expect(input.value).toBe('');
    });

    it('leaves the typed text alone while focused when the value is one the control claimed', async () => {
      const { el, instance, flush } = renderHost(Host);
      const input = el.querySelector('input')!;

      input.focus();
      input.value = '12';
      instance.mirror().write(12);
      await flush();
      expect(input.value).toBe('12');
    });

    it('writes an external value equal to an earlier claimed one once another value came between', async () => {
      const { el, instance, flush } = renderHost(Host);
      const input = el.querySelector('input')!;

      input.focus();
      input.value = '5';
      instance.mirror().write(5);
      await flush();
      instance.mirror().value.set(7);
      await flush();
      instance.mirror().value.set(5);
      await flush();
      expect(input.value).toBe('#5');
    });

    it('writes a claimed value once the element is not focused', async () => {
      const { el, instance, flush } = renderHost(Host);
      const input = el.querySelector('input')!;

      instance.mirror().write(3);
      await flush();
      expect(input.value).toBe('#3');

      instance.mirror().prefix.set('$');
      await flush();
      expect(input.value).toBe('$3');
    });
  });

  describe('element inside an open shadow root', () => {
    @Component({
      imports: [ExternalMirrorHost],
      encapsulation: ViewEncapsulation.ShadowDom,
      template: `<input externalMirrorHost />`,
    })
    class ShadowHost {
      readonly mirror = viewChild.required(ExternalMirrorHost);
    }

    it('treats an element focused inside the shadow tree as focused', async () => {
      const { el, instance, flush } = renderHost(ShadowHost);
      const input = el.shadowRoot!.querySelector('input')!;

      input.focus();
      expect(document.activeElement).toBe(el);
      input.value = '9';
      instance.mirror().write(9);
      await flush();
      expect(input.value).toBe('9');
    });
  });
});

describe('mirrorValue', () => {
  @Component({
    imports: [LiveMirrorHost],
    template: `<input liveMirrorHost />`,
  })
  class Host {
    readonly mirror = viewChild.required(LiveMirrorHost);
  }

  it('writes a value that differs from the displayed text while the element is focused', async () => {
    const { el, instance, flush } = renderHost(Host);
    const input = el.querySelector('input')!;

    instance.mirror().value.set('hello');
    await flush();
    input.focus();
    expect(document.activeElement).toBe(input);

    instance.mirror().value.set('');
    await flush();
    expect(input.value).toBe('');
  });

  it('skips the write while an IME composition is in progress', async () => {
    const { el, instance, flush } = renderHost(Host);
    const input = el.querySelector('input')!;

    input.focus();
    instance.mirror().composing = true;
    input.value = 'かな';

    instance.mirror().value.set('external');
    await flush();
    expect(input.value).toBe('かな');
  });

  describe('element injected lazily', () => {
    @Component({
      imports: [LazyMirrorHost],
      template: `<div lazyMirrorHost></div>`,
    })
    class LazyHost {
      readonly mirror = viewChild.required(LazyMirrorHost);
    }

    it('no-ops while the element accessor returns null, then mirrors once it appears', async () => {
      const { instance, flush } = renderHost(LazyHost);

      instance.mirror().value.set('123');
      await flush();

      const input = document.createElement('input');
      instance.mirror().el.set(input);
      await flush();
      expect(input.value).toBe('123');
    });
  });
});
