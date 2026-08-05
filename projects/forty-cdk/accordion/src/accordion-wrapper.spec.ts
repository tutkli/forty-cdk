import { Component, Directive } from '@angular/core';
import { describe, expect, it } from 'vitest';

import { pressKey, renderHost } from '../../src/test-utils';

import { ForAccordion } from './accordion';
import { ForAccordionContent } from './accordion-content';
import { FOR_ACCORDION_CONTEXT } from './accordion-context';
import { ForAccordionItem } from './accordion-item';
import { ForAccordionTrigger } from './accordion-trigger';

@Directive({
  selector: '[wrapperAccordion]',
  exportAs: 'wrapperAccordion',
  providers: [{ provide: FOR_ACCORDION_CONTEXT, useExisting: WrapperAccordion }],
  host: { class: 'wrapper-accordion' },
})
class WrapperAccordion extends ForAccordion {}

@Directive({
  selector: '[wrapperAccordionItem]',
  hostDirectives: [{ directive: ForAccordionItem, inputs: ['value'] }],
})
class WrapperAccordionItem {}

@Directive({ selector: '[wrapperAccordionTrigger]', hostDirectives: [ForAccordionTrigger] })
class WrapperAccordionTrigger {}

@Directive({ selector: '[wrapperAccordionContent]', hostDirectives: [ForAccordionContent] })
class WrapperAccordionContent {}

@Component({
  imports: [
    WrapperAccordion,
    WrapperAccordionItem,
    WrapperAccordionTrigger,
    WrapperAccordionContent,
  ],
  template: `
    <div wrapperAccordion>
      <div wrapperAccordionItem value="a">
        <h3><button wrapperAccordionTrigger data-testid="a">A</button></h3>
        <section wrapperAccordionContent>Panel A</section>
      </div>
      <div wrapperAccordionItem value="b">
        <h3><button wrapperAccordionTrigger data-testid="b">B</button></h3>
        <section wrapperAccordionContent>Panel B</section>
      </div>
    </div>
  `,
})
class WrapperHost {}

describe('ForAccordion subclass wrapper (#1593)', () => {
  it('mounts a subclassed root that re-provides FOR_ACCORDION_CONTEXT by hand', () => {
    const { el } = renderHost(WrapperHost);

    expect(el.querySelector('[wrapperAccordion]')?.getAttribute('data-orientation')).toBe(
      'vertical',
    );
  });

  it('wires each trigger to its own content through the subclassed root', async () => {
    const { el, flush } = renderHost(WrapperHost);

    const trigger = el.querySelector<HTMLElement>('[data-testid="a"]')!;
    const content = el.querySelector<HTMLElement>('[wrapperAccordionContent]');
    trigger.click();
    await flush();

    expect(content?.id).toBeTruthy();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(trigger.getAttribute('aria-controls')).toBe(content?.id);
  });

  it('navigates between the triggers registered with the subclass', () => {
    const { el } = renderHost(WrapperHost);

    const first = el.querySelector<HTMLElement>('[data-testid="a"]')!;
    const second = el.querySelector<HTMLElement>('[data-testid="b"]')!;
    first.focus();

    pressKey(first, 'ArrowDown');

    expect(document.activeElement).toBe(second);
  });
});
