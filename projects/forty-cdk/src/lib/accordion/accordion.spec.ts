import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForAccordion } from './accordion';
import { ForAccordionContent } from './accordion-content';
import { ForAccordionItem } from './accordion-item';
import { ForAccordionTrigger } from './accordion-trigger';

const ACCORDION_IMPORTS = [
  ForAccordion,
  ForAccordionItem,
  ForAccordionTrigger,
  ForAccordionContent,
] as const;

@Component({
  imports: [...ACCORDION_IMPORTS],
  template: `
    <div
      forAccordion
      [(value)]="value"
      [multiple]="multiple()"
      [collapsible]="collapsible()"
    >
      @for (id of items(); track id) {
        <div forAccordionItem [value]="id" [disabled]="disabledItem() === id">
          <h3>
            <button type="button" forAccordionTrigger [attr.data-test-id]="id">
              {{ id }}
            </button>
          </h3>
          <section forAccordionContent>Panel {{ id }}</section>
        </div>
      }
    </div>
  `,
})
class AccordionHost {
  readonly value = signal<readonly string[]>([]);
  readonly multiple = signal(false);
  readonly collapsible = signal(false);
  readonly items = signal(['a', 'b', 'c']);
  readonly disabledItem = signal<string | null>(null);
}

const triggerOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const contentOf = (host: HTMLElement, id: string) => {
  const trigger = triggerOf(host, id);
  return host.ownerDocument.getElementById(trigger.getAttribute('aria-controls')!);
};

describe('ForAccordion', () => {
  describe('render & wiring', () => {
    it('links each trigger to its content via aria-controls / aria-labelledby', () => {
      const { el } = renderHost(AccordionHost);

      for (const id of ['a', 'b', 'c']) {
        const trigger = triggerOf(el, id);
        const content = contentOf(el, id)!;

        expect(trigger.id).toBeTruthy();
        expect(content.id).toBeTruthy();
        expect(trigger.getAttribute('aria-controls')).toBe(content.id);
        expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
        expect(content.getAttribute('role')).toBe('region');
      }
    });

    it('starts with all panels closed', () => {
      const { el } = renderHost(AccordionHost);

      for (const id of ['a', 'b', 'c']) {
        const trigger = triggerOf(el, id);
        const content = contentOf(el, id)!;
        expect(trigger.getAttribute('aria-expanded')).toBe('false');
        expect(content.hasAttribute('hidden')).toBe(true);
        expect(content.getAttribute('data-state')).toBe('closed');
      }
    });
  });

  describe('single mode (default)', () => {
    it('opens one item and closes the previously open one on the next click', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'a')!.hasAttribute('hidden')).toBe(false);

      triggerOf(el, 'b').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual(['b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
    });

    it('does NOT collapse the open item by default (collapsible=false)', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);

      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
    });

    it('marks the open trigger aria-disabled when collapse is disallowed', () => {
      const { el, flush } = renderHost(AccordionHost);

      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);

      triggerOf(el, 'a').click();
      flush();

      expect(triggerOf(el, 'a').getAttribute('aria-disabled')).toBe('true');
      expect(triggerOf(el, 'b').hasAttribute('aria-disabled')).toBe(false);
    });

    it('collapses the open item when collapsible=true', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.collapsible.set(true);
      flush();

      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);

      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.value()).toEqual([]);
    });
  });

  describe('multiple mode', () => {
    it('keeps multiple items open simultaneously', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.multiple.set(true);
      flush();

      triggerOf(el, 'a').click();
      flush();
      triggerOf(el, 'b').click();
      flush();

      expect(fixture.componentInstance.value()).toEqual(['a', 'b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
    });

    it('toggles each item independently and never marks aria-disabled', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.multiple.set(true);
      flush();

      triggerOf(el, 'a').click();
      flush();
      triggerOf(el, 'a').click();
      flush();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('disabled item', () => {
    it('ignores click and reflects the native disabled attribute', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      flush();

      const triggerB = triggerOf(el, 'b');
      expect(triggerB.hasAttribute('disabled')).toBe(true);

      triggerB.click();
      flush();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(triggerB.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('two-way binding [(value)]', () => {
    it('reflects external value writes into the DOM', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      fixture.componentInstance.value.set(['c']);
      flush();

      expect(triggerOf(el, 'c').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'c')!.hasAttribute('hidden')).toBe(false);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('keyboard navigation', () => {
    const keyDown = (target: HTMLElement, key: string) =>
      target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

    it('moves focus to the next trigger on ArrowDown and wraps around', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      keyDown(triggerOf(el, 'b'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));

      keyDown(triggerOf(el, 'c'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });

    it('moves focus to the previous trigger on ArrowUp and wraps around', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowUp');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });

    it('jumps to first/last on Home/End', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'b').focus();

      keyDown(triggerOf(el, 'b'), 'End');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));

      keyDown(triggerOf(el, 'c'), 'Home');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });

    it('skips disabled triggers', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      flush();

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowDown');

      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });
  });

  describe('used outside [forAccordion]', () => {
    it('throws a prefixed error from ForAccordionItem', () => {
      @Component({
        imports: [ForAccordionItem],
        template: `<div forAccordionItem value="x"></div>`,
      })
      class OrphanItem {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanItem)).toThrow(
        /\[forty-cdk\/accordion\] ForAccordionItem must be used inside a \[forAccordion\] element\./,
      );
    });

    it('throws a prefixed error from ForAccordionTrigger when there is no item', () => {
      @Component({
        imports: [ForAccordion, ForAccordionTrigger],
        template: `
          <div forAccordion>
            <button type="button" forAccordionTrigger></button>
          </div>
        `,
      })
      class OrphanTrigger {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanTrigger)).toThrow(
        /\[forty-cdk\/accordion\] ForAccordionTrigger must be used inside a \[forAccordionItem\] element\./,
      );
    });

    it('throws a prefixed error from ForAccordionContent when there is no item', () => {
      @Component({
        imports: [ForAccordion, ForAccordionContent],
        template: `
          <div forAccordion>
            <section forAccordionContent></section>
          </div>
        `,
      })
      class OrphanContent {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(OrphanContent)).toThrow(
        /\[forty-cdk\/accordion\] ForAccordionContent must be used inside a \[forAccordionItem\] element\./,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      fixture.componentInstance.value.set(['b']);
      flush();
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');

      fixture.componentInstance.value.set([]);
      flush();
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('false');
    });
  });
});
