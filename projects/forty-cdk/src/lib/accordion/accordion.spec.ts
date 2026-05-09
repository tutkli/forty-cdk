import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost, withReducedMotion } from '../../test-utils';
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
    <div forAccordion [(value)]="value" [multiple]="multiple()" [collapsible]="collapsible()">
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
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('open');

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
      expect(contentOf(el, 'c')!.getAttribute('data-state')).toBe('open');
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('keyboard navigation', () => {
    it('moves focus to the next trigger on ArrowDown and wraps around', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));

      pressKey(triggerOf(el, 'c'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });

    it('moves focus to the previous trigger on ArrowUp and wraps around', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowUp');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });

    it('jumps to first/last on Home/End', () => {
      const { el } = renderHost(AccordionHost);
      triggerOf(el, 'b').focus();

      pressKey(triggerOf(el, 'b'), 'End');
      expect(document.activeElement).toBe(triggerOf(el, 'c'));

      pressKey(triggerOf(el, 'c'), 'Home');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });

    it('skips disabled triggers', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowDown');

      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });
  });

  describe('orientation: horizontal', () => {
    @Component({
      imports: [...ACCORDION_IMPORTS],
      template: `
        <div forAccordion orientation="horizontal" [dir]="dir()">
          @for (id of ['a', 'b', 'c']; track id) {
            <div forAccordionItem [value]="id">
              <h3>
                <button type="button" forAccordionTrigger [attr.data-test-id]="id">
                  {{ id }}
                </button>
              </h3>
              <section forAccordionContent></section>
            </div>
          }
        </div>
      `,
    })
    class HorizontalHost {
      readonly dir = signal<'ltr' | 'rtl'>('ltr');
    }

    it('reflects orientation on data-orientation', () => {
      const { el } = renderHost(HorizontalHost);
      const root = el.querySelector('[forAccordion]')!;
      expect(root.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('propagates data-orientation to item, trigger, and content', () => {
      const { el } = renderHost(HorizontalHost);
      const item = el.querySelector('[forAccordionItem]')!;
      const trigger = el.querySelector('[forAccordionTrigger]')!;
      const content = el.querySelector('[forAccordionContent]')!;

      expect(item.getAttribute('data-orientation')).toBe('horizontal');
      expect(trigger.getAttribute('data-orientation')).toBe('horizontal');
      expect(content.getAttribute('data-orientation')).toBe('horizontal');
    });

    it('uses ArrowRight/ArrowLeft instead of ArrowDown/ArrowUp', () => {
      const { el } = renderHost(HorizontalHost);
      triggerOf(el, 'a').focus();

      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowLeft');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));

      // ArrowDown is a no-op horizontally — focus stays put.
      pressKey(triggerOf(el, 'a'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });

    it('swaps horizontal arrows in RTL', () => {
      const { el, fixture, flush } = renderHost(HorizontalHost);
      fixture.componentInstance.dir.set('rtl');
      flush();
      triggerOf(el, 'a').focus();

      pressKey(triggerOf(el, 'a'), 'ArrowLeft');
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowRight');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
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

  describe('(valueChange) output', () => {
    it('emits the new value when a trigger toggles via click', () => {
      @Component({
        imports: [...ACCORDION_IMPORTS],
        template: `
          <div forAccordion multiple (valueChange)="emitted.push($event)">
            <div forAccordionItem value="a">
              <h3>
                <button type="button" forAccordionTrigger data-test-id="a">A</button>
              </h3>
              <section forAccordionContent></section>
            </div>
            <div forAccordionItem value="b">
              <h3>
                <button type="button" forAccordionTrigger data-test-id="b">B</button>
              </h3>
              <section forAccordionContent></section>
            </div>
          </div>
        `,
      })
      class Host {
        readonly emitted: (readonly string[])[] = [];
      }

      const { fixture, el, flush } = renderHost(Host);
      triggerOf(el, 'a').click();
      flush();
      triggerOf(el, 'b').click();
      flush();

      expect(fixture.componentInstance.emitted).toEqual([['a'], ['a', 'b']]);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', () => {
      @Component({
        imports: [...ACCORDION_IMPORTS],
        template: `
          <div forAccordion [(value)]="value" (valueChange)="emitted.push($event)">
            <div forAccordionItem value="a">
              <h3>
                <button type="button" forAccordionTrigger>A</button>
              </h3>
              <section forAccordionContent></section>
            </div>
          </div>
        `,
      })
      class Host {
        readonly value = signal<readonly string[]>([]);
        readonly emitted: (readonly string[])[] = [];
      }

      const { fixture, flush } = renderHost(Host);
      fixture.componentInstance.value.set(['a']);
      flush();
      fixture.componentInstance.value.set([]);
      flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
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

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
    });
    afterEach(() => {
      restoreReducedMotion();
    });

    it('clicking a trigger still flips aria-expanded and data-state under reduced-motion', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      flush();

      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('open');

      triggerOf(el, 'b').click();
      flush();

      expect(fixture.componentInstance.value()).toEqual(['b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('closed');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'b')!.getAttribute('data-state')).toBe('open');
    });
  });

  describe('mounted-but-closed a11y', () => {
    it('marks closed panels aria-hidden + inert and clears both when opened', () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      const panelA = contentOf(el, 'a')!;
      expect(panelA.getAttribute('aria-hidden')).toBe('true');
      expect(panelA.hasAttribute('inert')).toBe(true);

      fixture.componentInstance.value.set(['a']);
      flush();

      expect(panelA.hasAttribute('aria-hidden')).toBe(false);
      expect(panelA.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.value.set([]);
      flush();

      expect(panelA.getAttribute('aria-hidden')).toBe('true');
      expect(panelA.hasAttribute('inert')).toBe(true);
    });

    it('does not apply the native [hidden] attribute', () => {
      const { el } = renderHost(AccordionHost);
      for (const id of ['a', 'b', 'c']) {
        expect(contentOf(el, id)!.hasAttribute('hidden')).toBe(false);
      }
    });

    it('with @if-driven mounting, panels unmount on close (no host attrs to assert)', () => {
      @Component({
        imports: [...ACCORDION_IMPORTS],
        template: `
          <div forAccordion [(value)]="value" multiple>
            <div forAccordionItem value="a">
              <h3>
                <button type="button" forAccordionTrigger data-test-id="a">A</button>
              </h3>
              @if (value().includes('a')) {
                <section forAccordionContent data-test-content="a"></section>
              }
            </div>
          </div>
        `,
      })
      class IfHost {
        readonly value = signal<readonly string[]>([]);
      }

      const { el, fixture, flush } = renderHost(IfHost);

      expect(el.querySelector('[data-test-content="a"]')).toBeNull();

      fixture.componentInstance.value.set(['a']);
      flush();

      const mounted = el.querySelector<HTMLElement>('[data-test-content="a"]')!;
      expect(mounted).not.toBeNull();
      expect(mounted.hasAttribute('aria-hidden')).toBe(false);
      expect(mounted.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.value.set([]);
      flush();

      expect(el.querySelector('[data-test-content="a"]')).toBeNull();
    });
  });
});
