import { Component, Directive, ElementRef, inject } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';

import { ForCombobox } from './combobox';
import { ForComboboxContent } from './combobox-content';
import { FOR_COMBOBOX_CONTEXT } from './combobox-context';
import { ForComboboxInput } from './combobox-input';

@Directive({
  selector: '[wrapperCombobox]',
  exportAs: 'wrapperCombobox',
  providers: [{ provide: FOR_COMBOBOX_CONTEXT, useExisting: WrapperCombobox }],
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

describe('ForCombobox subclass wrapper (#1593)', () => {
  afterEachOverlayCleanup();

  it('mounts a subclassed root that re-provides FOR_COMBOBOX_CONTEXT by hand', () => {
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

  it('warns about a second anchor registered through the public surface', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { fixture, flush } = renderHost(WrapperHost);
    const wrapper = fixture.debugElement
      .query(By.directive(WrapperCombobox))
      .injector.get(WrapperCombobox);

    const second = document.createElement('div');
    wrapper.registerAnchor(second);
    await flush();

    expect(wrapper.anchor()).toBe(second);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain(
      '[forty-cdk/combobox] FORCDK-CORE-005: A [forCombobox] coordinates a single [forComboboxAnchor], but 2 are registered.',
    );
  });
});
