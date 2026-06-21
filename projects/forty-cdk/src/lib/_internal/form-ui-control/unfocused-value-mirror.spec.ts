import { Component, Directive, ElementRef, inject, signal } from '@angular/core';

import { renderHost } from '../../../test-utils/render';
import { mirrorUnfocusedValue } from './unfocused-value-mirror';

@Directive({
  selector: 'input[mirrorHost]',
  exportAs: 'mirrorHost',
})
class MirrorHost {
  readonly #el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  readonly value = signal('');

  constructor() {
    mirrorUnfocusedValue(() => this.#el, this.value);
  }
}

@Directive({
  selector: '[lazyMirrorHost]',
  exportAs: 'lazyMirrorHost',
})
class LazyMirrorHost {
  readonly el = signal<HTMLInputElement | null>(null);
  readonly value = signal('');

  constructor() {
    mirrorUnfocusedValue(this.el, this.value);
  }
}

describe('mirrorUnfocusedValue', () => {
  describe('host element present from construction', () => {
    @Component({
      imports: [MirrorHost],
      template: `<input mirrorHost #m="mirrorHost" data-test-id="input" />`,
    })
    class Host {}

    it('writes an external value onto the element while it is not focused', async () => {
      const { fixture, query, flush } = renderHost(Host);
      const input = query<HTMLInputElement>('[data-test-id="input"]')!;
      const directive = fixture.debugElement.children[0]!.references['m'] as MirrorHost;

      directive.value.set('abc');
      await flush();
      expect(input.value).toBe('abc');
    });

    it('skips the write while the element is focused, protecting the caret', async () => {
      const { fixture, query, flush } = renderHost(Host);
      document.body.appendChild(fixture.nativeElement);
      try {
        const input = query<HTMLInputElement>('[data-test-id="input"]')!;
        const directive = fixture.debugElement.children[0]!.references['m'] as MirrorHost;

        input.focus();
        expect(document.activeElement).toBe(input);
        input.value = 'user typing';

        directive.value.set('external');
        await flush();
        expect(input.value).toBe('user typing');
      } finally {
        fixture.nativeElement.remove();
      }
    });
  });

  describe('element injected lazily', () => {
    @Component({
      imports: [LazyMirrorHost],
      template: `<div lazyMirrorHost #m="lazyMirrorHost"></div>`,
    })
    class Host {}

    it('no-ops while the element accessor returns null, then mirrors once it appears', async () => {
      const { fixture, flush } = renderHost(Host);
      const directive = fixture.debugElement.children[0]!.references['m'] as LazyMirrorHost;

      directive.value.set('123');
      await flush();

      const input = document.createElement('input');
      directive.el.set(input);
      await flush();
      expect(input.value).toBe('123');
    });
  });
});
