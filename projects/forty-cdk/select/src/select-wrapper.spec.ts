import { Component, Directive, ElementRef, inject } from '@angular/core';
import { By } from '@angular/platform-browser';
import { describe, expect, it } from 'vitest';

import { afterEachOverlayCleanup, renderHost } from '../../src/test-utils';

import { ForSelect } from './select';
import { ForSelectContent } from './select-content';
import { FOR_SELECT_CONTEXT } from './select-context';
import { ForSelectTrigger } from './select-trigger';

@Directive({
  selector: '[wrapperSelect]',
  exportAs: 'wrapperSelect',
  providers: [{ provide: FOR_SELECT_CONTEXT, useExisting: WrapperSelect }],
})
class WrapperSelect extends ForSelect<string> {
  readonly box = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;

  constructor() {
    super();
    this.overlay.registerAnchor(this.box);
  }
}

@Directive({ selector: 'button[wrapperSelectTrigger]', hostDirectives: [ForSelectTrigger] })
class WrapperSelectTrigger {}

@Directive({ selector: '[wrapperSelectContent]', hostDirectives: [ForSelectContent] })
class WrapperSelectContent {}

@Component({
  imports: [WrapperSelect, WrapperSelectTrigger, WrapperSelectContent],
  template: `
    <div wrapperSelect [open]="true">
      <button wrapperSelectTrigger>pick</button>
      <div wrapperSelectContent></div>
    </div>
  `,
})
class WrapperHost {}

describe('ForSelect subclass wrapper (#1593)', () => {
  afterEachOverlayCleanup();

  it('mounts a subclassed root that re-provides FOR_SELECT_CONTEXT by hand', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperSelect]')?.getAttribute('data-state')).toBe('open');
  });

  it('resolves the pieces against the subclassed root', async () => {
    const { el, flush } = renderHost(WrapperHost);
    await flush();

    const trigger = el.querySelector('[wrapperSelectTrigger]');
    const content = document.querySelector<HTMLElement>('[wrapperSelectContent]');

    expect(content?.id).toBeTruthy();
    expect(trigger?.getAttribute('aria-controls')).toBe(content?.id);
  });

  it('registered the subclass constructor anchor through the public facade', () => {
    const { fixture } = renderHost(WrapperHost);
    const wrapper = fixture.debugElement
      .query(By.directive(WrapperSelect))
      .injector.get(WrapperSelect);

    expect(() => wrapper.overlay.registerAnchor(document.createElement('div'))).toThrowError(
      '[forty-cdk/select] Multiple [forSelectAnchor] inside the same [forSelect]; only one is allowed.',
    );
  });
});
