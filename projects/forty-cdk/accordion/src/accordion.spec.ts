import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost, withReducedMotion } from '../../src/test-utils';
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
      [disabled]="rootDisabled()"
    >
      @for (id of items(); track id) {
        <div forAccordionItem [value]="id" [disabled]="disabledItem() === id">
          <h3>
            <button type="button" forAccordionTrigger [attr.data-test-id]="id">
              {{ id }}
            </button>
          </h3>
          <section forAccordionContent [attr.data-test-content-id]="id">Panel {{ id }}</section>
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
  readonly rootDisabled = signal(false);
}

@Component({
  imports: [...ACCORDION_IMPORTS],
  template: `
    <form (submit)="submitted = true">
      <div forAccordion collapsible>
        <div forAccordionItem value="a">
          <h3>
            <button forAccordionTrigger data-test-id="a">A</button>
          </h3>
          <section forAccordionContent>Panel A</section>
        </div>
      </div>
    </form>
  `,
})
class FormAccordionHost {
  submitted = false;
}

const triggerOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const contentOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-content-id="${id}"]`);

describe('ForAccordion', () => {
  describe('render & wiring', () => {
    it('host-binds type="button" so a trigger inside a <form> does not submit on toggle', async () => {
      const { el, fixture, flush } = renderHost(FormAccordionHost);
      const trigger = triggerOf(el, 'a');

      expect(trigger.getAttribute('type')).toBe('button');

      trigger.click();
      await flush();

      expect(fixture.componentInstance.submitted).toBe(false);
    });

    it('labels each content by its trigger and marks it a region', () => {
      const { el } = renderHost(AccordionHost);

      for (const id of ['a', 'b', 'c']) {
        const trigger = triggerOf(el, id);
        const content = contentOf(el, id)!;

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

    it('gates aria-controls to the expanded panel, mirroring the overlay triggers', async () => {
      const { el, flush } = renderHost(AccordionHost);

      const trigger = triggerOf(el, 'a');
      const content = contentOf(el, 'a')!;

      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      trigger.click();
      await flush();
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);

      triggerOf(el, 'b').click();
      await flush();
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
    });
  });

  describe('single mode (default)', () => {
    it('opens one item and closes the previously open one on the next click', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('open');

      triggerOf(el, 'b').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual(['b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
    });

    it('does NOT collapse the open item by default (collapsible=false)', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);

      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
    });

    it('marks the open trigger aria-disabled when collapse is disallowed', async () => {
      const { el, flush } = renderHost(AccordionHost);

      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);

      triggerOf(el, 'a').click();
      await flush();

      expect(triggerOf(el, 'a').getAttribute('aria-disabled')).toBe('true');
      expect(triggerOf(el, 'b').hasAttribute('aria-disabled')).toBe(false);
    });

    it('collapses the open item when collapsible=true', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.collapsible.set(true);
      await flush();

      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);

      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.value()).toEqual([]);
    });
  });

  describe('multiple mode', () => {
    it('keeps multiple items open simultaneously', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.multiple.set(true);
      await flush();

      triggerOf(el, 'a').click();
      await flush();
      triggerOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual(['a', 'b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
    });

    it('toggles each item independently and never marks aria-disabled', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.multiple.set(true);
      await flush();

      triggerOf(el, 'a').click();
      await flush();
      triggerOf(el, 'a').click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(triggerOf(el, 'a').hasAttribute('aria-disabled')).toBe(false);
    });
  });

  describe('disabled item', () => {
    it('ignores click and reflects the native disabled attribute', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      await flush();

      const triggerB = triggerOf(el, 'b');
      expect(triggerB.hasAttribute('disabled')).toBe(true);

      triggerB.click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(triggerB.getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('disabled accordion (root [disabled])', () => {
    it('disables every trigger and reflects data-disabled on the root, without a per-item [disabled]', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();

      for (const id of ['a', 'b', 'c']) {
        expect(triggerOf(el, id).hasAttribute('disabled')).toBe(true);
      }
      expect(el.querySelector('[forAccordion]')!.getAttribute('data-disabled')).toBe('');
    });

    it('ignores clicks while the accordion is disabled', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();

      triggerOf(el, 'a').click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual([]);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
    });
  });

  describe('data-disabled reflection (trigger + content)', () => {
    it('reflects data-disabled on every trigger and content under root [disabled]', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();

      for (const id of ['a', 'b', 'c']) {
        expect(triggerOf(el, id).getAttribute('data-disabled')).toBe('');
        expect(contentOf(el, id)!.getAttribute('data-disabled')).toBe('');
      }
    });

    it('reflects data-disabled only on the per-item [disabled] trigger and content', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      await flush();

      expect(triggerOf(el, 'b').getAttribute('data-disabled')).toBe('');
      expect(contentOf(el, 'b')!.getAttribute('data-disabled')).toBe('');

      expect(triggerOf(el, 'a').hasAttribute('data-disabled')).toBe(false);
      expect(contentOf(el, 'a')!.hasAttribute('data-disabled')).toBe(false);
    });

    it('omits data-disabled entirely when nothing is disabled (truthy-only, never "false")', () => {
      const { el } = renderHost(AccordionHost);

      for (const id of ['a', 'b', 'c']) {
        expect(triggerOf(el, id).hasAttribute('data-disabled')).toBe(false);
        expect(contentOf(el, id)!.hasAttribute('data-disabled')).toBe(false);
      }
    });

    it('reflects data-disabled after a runtime [disabled] flip without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      expect(triggerOf(el, 'a').hasAttribute('data-disabled')).toBe(false);
      expect(contentOf(el, 'a')!.hasAttribute('data-disabled')).toBe(false);

      fixture.componentInstance.disabledItem.set('a');
      await flush();

      expect(triggerOf(el, 'a').getAttribute('data-disabled')).toBe('');
      expect(contentOf(el, 'a')!.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('two-way binding [(value)]', () => {
    it('reflects external value writes into the DOM', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      fixture.componentInstance.value.set(['c']);
      await flush();

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

    it('skips disabled triggers', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);
      fixture.componentInstance.disabledItem.set('b');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowDown');

      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });
  });

  describe('nested accordions', () => {
    @Component({
      imports: [...ACCORDION_IMPORTS],
      template: `
        <div forAccordion multiple>
          <div forAccordionItem value="outer-a">
            <h3>
              <button type="button" forAccordionTrigger data-test-id="outer-a">Outer A</button>
            </h3>
            <section forAccordionContent>
              <div forAccordion multiple>
                <div forAccordionItem value="inner-a">
                  <h4>
                    <button type="button" forAccordionTrigger data-test-id="inner-a">
                      Inner A
                    </button>
                  </h4>
                  <section forAccordionContent>Inner panel A</section>
                </div>
                <div forAccordionItem value="inner-b">
                  <h4>
                    <button type="button" forAccordionTrigger data-test-id="inner-b">
                      Inner B
                    </button>
                  </h4>
                  <section forAccordionContent>Inner panel B</section>
                </div>
              </div>
            </section>
          </div>
          <div forAccordionItem value="outer-b">
            <h3>
              <button type="button" forAccordionTrigger data-test-id="outer-b">Outer B</button>
            </h3>
            <section forAccordionContent>Outer panel B</section>
          </div>
        </div>
      `,
    })
    class NestedHost {}

    it('keeps outer arrow navigation within outer triggers, skipping inner ones', () => {
      const { el } = renderHost(NestedHost);

      triggerOf(el, 'outer-a').focus();
      pressKey(triggerOf(el, 'outer-a'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'outer-b'));

      pressKey(triggerOf(el, 'outer-b'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'outer-a'));
    });

    it('keeps inner arrow navigation within inner triggers only', () => {
      const { el } = renderHost(NestedHost);

      triggerOf(el, 'inner-a').focus();
      pressKey(triggerOf(el, 'inner-a'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'inner-b'));

      pressKey(triggerOf(el, 'inner-b'), 'ArrowDown');
      expect(document.activeElement).toBe(triggerOf(el, 'inner-a'));
    });

    it('Home/End in the inner accordion stay within its own triggers', () => {
      const { el } = renderHost(NestedHost);

      triggerOf(el, 'inner-b').focus();
      pressKey(triggerOf(el, 'inner-b'), 'Home');
      expect(document.activeElement).toBe(triggerOf(el, 'inner-a'));

      pressKey(triggerOf(el, 'inner-a'), 'End');
      expect(document.activeElement).toBe(triggerOf(el, 'inner-b'));
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

    it('reflects dir to the native dir attribute for both ltr and rtl', async () => {
      const { el, fixture, flush } = renderHost(HorizontalHost);
      const root = el.querySelector('[forAccordion]')!;

      expect(root.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.dir.set('rtl');
      await flush();
      expect(root.getAttribute('dir')).toBe('rtl');
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

    it('swaps horizontal arrows in RTL', async () => {
      const { el, fixture, flush } = renderHost(HorizontalHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      triggerOf(el, 'a').focus();

      pressKey(triggerOf(el, 'a'), 'ArrowLeft');
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowRight');
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });
  });

  describe('ambient writing direction', () => {
    @Component({
      imports: [...ACCORDION_IMPORTS],
      template: `
        <div [attr.dir]="ambient()">
          <div forAccordion orientation="horizontal" [dir]="explicit()">
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
        </div>
      `,
    })
    class AmbientHost {
      readonly ambient = signal<string | null>(null);
      readonly explicit = signal<'ltr' | 'rtl' | null>(null);
    }

    it('reflects dir="rtl" from an ancestor [dir] when no explicit dir is set', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      const root = fixture.nativeElement.querySelector('[forAccordion]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('rtl');
    });

    it('lets an explicit [dir]="ltr" win over an rtl ancestor', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      fixture.componentInstance.explicit.set('ltr');
      await flush(fixture);
      const root = fixture.nativeElement.querySelector('[forAccordion]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('ltr');
    });

    it('resolves arrow-key semantics as RTL from the ambient ancestor', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      const el = fixture.nativeElement as HTMLElement;
      const trigger = (id: string) =>
        el.querySelector<HTMLButtonElement>(`[data-test-id="${id}"]`)!;
      trigger('a').focus();

      pressKey(trigger('a'), 'ArrowLeft');
      expect(document.activeElement).toBe(trigger('b'));

      pressKey(trigger('b'), 'ArrowRight');
      expect(document.activeElement).toBe(trigger('a'));
    });

    it('updates the reflected dir when the ancestor flips at runtime', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.detectChanges();
      const root = fixture.nativeElement.querySelector('[forAccordion]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('ltr');

      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      expect(root.getAttribute('dir')).toBe('rtl');
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
    it('emits the new value when a trigger toggles via click', async () => {
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
      await flush();
      triggerOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.emitted).toEqual([['a'], ['a', 'b']]);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', async () => {
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
      await flush();
      fixture.componentInstance.value.set([]);
      await flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });
  });

  describe('reactive updates', () => {
    it('reflects external value writes in aria-expanded', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      fixture.componentInstance.value.set(['b']);
      await flush();
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');

      fixture.componentInstance.value.set([]);
      await flush();
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

    it('clicking a trigger still flips aria-expanded and data-state under reduced-motion', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      triggerOf(el, 'a').click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual(['a']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('open');

      triggerOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.value()).toEqual(['b']);
      expect(triggerOf(el, 'a').getAttribute('aria-expanded')).toBe('false');
      expect(contentOf(el, 'a')!.getAttribute('data-state')).toBe('closed');
      expect(triggerOf(el, 'b').getAttribute('aria-expanded')).toBe('true');
      expect(contentOf(el, 'b')!.getAttribute('data-state')).toBe('open');
    });
  });

  describe('mounted-but-closed a11y', () => {
    it('marks closed panels aria-hidden + inert and clears both when opened', async () => {
      const { el, fixture, flush } = renderHost(AccordionHost);

      const panelA = contentOf(el, 'a')!;
      expect(panelA.getAttribute('aria-hidden')).toBe('true');
      expect(panelA.hasAttribute('inert')).toBe(true);

      fixture.componentInstance.value.set(['a']);
      await flush();

      expect(panelA.hasAttribute('aria-hidden')).toBe(false);
      expect(panelA.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.value.set([]);
      await flush();

      expect(panelA.getAttribute('aria-hidden')).toBe('true');
      expect(panelA.hasAttribute('inert')).toBe(true);
    });

    it('does not apply the native [hidden] attribute', () => {
      const { el } = renderHost(AccordionHost);
      for (const id of ['a', 'b', 'c']) {
        expect(contentOf(el, id)!.hasAttribute('hidden')).toBe(false);
      }
    });

    it('with @if-driven mounting, panels unmount on close (no host attrs to assert)', async () => {
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
      await flush();

      const mounted = el.querySelector<HTMLElement>('[data-test-content="a"]')!;
      expect(mounted.hasAttribute('aria-hidden')).toBe(false);
      expect(mounted.hasAttribute('inert')).toBe(false);

      fixture.componentInstance.value.set([]);
      await flush();

      expect(el.querySelector('[data-test-content="a"]')).toBeNull();
    });
  });
});
