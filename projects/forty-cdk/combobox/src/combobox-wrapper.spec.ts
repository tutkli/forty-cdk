import { Component, Directive, ElementRef, inject } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';

import { ForCombobox, provideForCombobox } from './combobox';
import { ForComboboxContent } from './combobox-content';
import { ForComboboxInput } from './combobox-input';

@Directive({
  selector: '[wrapperCombobox]',
  exportAs: 'wrapperCombobox',
  providers: provideForCombobox(WrapperCombobox),
})
class WrapperCombobox extends ForCombobox<string> {
  readonly box = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    super();
    this.registerAnchor(this.box);
  }
}

@Directive({ selector: 'input[wrapperComboboxInput]', hostDirectives: [ForComboboxInput] })
class WrapperComboboxInput {}

@Directive({ selector: '[wrapperComboboxContent]', hostDirectives: [ForComboboxContent] })
class WrapperComboboxContent {}

@Component({
  imports: [WrapperCombobox, WrapperComboboxInput, WrapperComboboxContent],
  template: `
    <div wrapperCombobox [open]="true">
      <input wrapperComboboxInput />
      <div wrapperComboboxContent></div>
    </div>
  `,
})
class WrapperHost {}

describe('ForCombobox subclass wrapper (#1399)', () => {
  afterEachOverlayCleanup();

  it('mounts a subclassed root whose own providers come from provideForCombobox', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperCombobox]')?.getAttribute('data-state')).toBe('open');
  });

  it('resolves the pieces against the subclassed root', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    const input = el.querySelector('[wrapperComboboxInput]');
    const content = document.querySelector<HTMLElement>('[wrapperComboboxContent]');

    expect(content?.id).toBeTruthy();
    expect(input?.getAttribute('aria-controls')).toBe(content?.id);
  });

  it('anchors the listbox against the element the subclass registered', () => {
    const { el, fixture } = renderHost(WrapperHost);
    const root = el.querySelector('[wrapperCombobox]') as HTMLElement;
    const wrapper = fixture.debugElement
      .query(By.directive(WrapperCombobox))
      .injector.get(WrapperCombobox);

    expect(wrapper.anchor()).toBe(root);
  });

  it('rejects a second anchor registered through the public surface', () => {
    const { fixture } = renderHost(WrapperHost);
    const wrapper = fixture.debugElement
      .query(By.directive(WrapperCombobox))
      .injector.get(WrapperCombobox);

    expect(() => wrapper.registerAnchor(document.createElement('div'))).toThrowError(
      '[forty-cdk/combobox] Multiple [forComboboxAnchor] inside the same [forCombobox]; only one is allowed.',
    );
  });
});
