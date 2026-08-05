import { Component, Directive } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { pressKey, renderHost } from '../../src/test-utils';

import { ForRadio } from './radio';
import { ForRadioGroup } from './radio-group';
import { FOR_RADIO_GROUP_CONTEXT } from './radio-group-context';

@Directive({
  selector: '[wrapperRadioGroup]',
  exportAs: 'wrapperRadioGroup',
  providers: [{ provide: FOR_RADIO_GROUP_CONTEXT, useExisting: WrapperRadioGroup }],
  host: { class: 'wrapper-radio-group' },
})
class WrapperRadioGroup extends ForRadioGroup {}

@Directive({
  selector: '[wrapperRadio]',
  hostDirectives: [{ directive: ForRadio, inputs: ['value'] }],
})
class WrapperRadio {}

@Component({
  imports: [WrapperRadioGroup, WrapperRadio],
  template: `
    <div wrapperRadioGroup>
      <button wrapperRadio value="a" data-testid="a">A</button>
      <button wrapperRadio value="b" data-testid="b">B</button>
    </div>
  `,
})
class WrapperHost {}

describe('ForRadioGroup subclass wrapper (#1593)', () => {
  it('mounts a subclassed root that re-provides FOR_RADIO_GROUP_CONTEXT by hand', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperRadioGroup]')?.getAttribute('role')).toBe('radiogroup');
  });

  it('gives the radios registered with the subclass a single tab stop', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[data-testid="a"]')?.getAttribute('tabindex')).toBe('0');
    expect(el.querySelector('[data-testid="b"]')?.getAttribute('tabindex')).toBe('-1');
  });

  it('moves focus and selection across the registered radios', async () => {
    const { el, flush } = renderHost(WrapperHost);

    const first = el.querySelector<HTMLElement>('[data-testid="a"]')!;
    const second = el.querySelector<HTMLElement>('[data-testid="b"]')!;
    first.focus();

    pressKey(first, 'ArrowDown');
    await flush();

    expect(document.activeElement).toBe(second);
    expect(second.getAttribute('aria-checked')).toBe('true');
  });
});
