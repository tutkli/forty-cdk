import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForTabs } from './tabs';
import { ForTabsContent } from './tabs-content';
import { ForTabsList } from './tabs-list';
import { ForTabsTrigger } from './tabs-trigger';

const TABS_IMPORTS = [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent] as const;

@Component({
  imports: [...TABS_IMPORTS],
  template: `
    <div
      forTabs
      [(value)]="active"
      [activationMode]="mode()"
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="rootDisabled()"
    >
      <div forTabsList>
        @for (t of tabs(); track t.value) {
          <button
            type="button"
            forTabsTrigger
            [value]="t.value"
            [disabled]="t.disabled"
            [attr.data-test-id]="t.value"
          >
            {{ t.label }}
          </button>
        }
      </div>
      @for (t of tabs(); track t.value) {
        <section forTabsContent [value]="t.value" [attr.data-test-content]="t.value">
          Panel {{ t.value }}
        </section>
      }
    </div>
  `,
})
class TabsHost {
  readonly active = signal('');
  readonly mode = signal<'automatic' | 'manual'>('automatic');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly rootDisabled = signal(false);
  readonly tabs = signal([
    { value: 'a', label: 'A', disabled: false },
    { value: 'b', label: 'B', disabled: false },
    { value: 'c', label: 'C', disabled: false },
  ]);
}

const triggerOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLButtonElement>(`button[data-test-id="${id}"]`)!;

const contentOf = (host: HTMLElement, id: string) =>
  host.querySelector<HTMLElement>(`[data-test-content="${id}"]`)!;

const tablistOf = (host: HTMLElement) => host.querySelector<HTMLElement>('[forTabsList]')!;

const keyDown = (target: HTMLElement, key: string) =>
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('ForTabs', () => {
  describe('static accessibility & wiring', () => {
    it('sets role=tablist with aria-orientation, role=tab on triggers, role=tabpanel on contents', () => {
      const { el } = renderHost(TabsHost);
      const list = tablistOf(el);
      expect(list.getAttribute('role')).toBe('tablist');
      expect(list.getAttribute('aria-orientation')).toBe('horizontal');

      for (const v of ['a', 'b', 'c']) {
        const t = triggerOf(el, v);
        const c = contentOf(el, v);
        expect(t.getAttribute('role')).toBe('tab');
        expect(t.getAttribute('type')).toBe('button');
        expect(c.getAttribute('role')).toBe('tabpanel');
        expect(c.getAttribute('tabindex')).toBe('0');
      }
    });

    it('wires aria-controls / aria-labelledby per matching value', () => {
      const { el } = renderHost(TabsHost);
      for (const v of ['a', 'b', 'c']) {
        const t = triggerOf(el, v);
        const c = contentOf(el, v);
        expect(t.getAttribute('aria-controls')).toBe(c.id);
        expect(c.getAttribute('aria-labelledby')).toBe(t.id);
      }
    });

    it('starts with all panels hidden when no value is set', () => {
      const { el } = renderHost(TabsHost);
      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-selected')).toBe('false');
        expect(contentOf(el, v).hasAttribute('hidden')).toBe(true);
      }
    });
  });

  describe('initial tabindex', () => {
    it('first enabled trigger has tabindex=0 when nothing is selected', () => {
      const { el } = renderHost(TabsHost);
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('0');
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('-1');
    });

    it('selected trigger has tabindex=0 when there is a selection', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('b');
      flush();
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('-1');
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('0');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'b').hasAttribute('hidden')).toBe(false);
    });

    it('skips disabled when picking the first-enabled tab entry', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', disabled: false },
        { value: 'c', label: 'C', disabled: false },
      ]);
      flush();
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('-1');
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('click activation', () => {
    it('selects the clicked trigger and reveals its panel', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'b').click();
      flush();

      expect(fixture.componentInstance.active()).toBe('b');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('data-state')).toBe('active');
      expect(contentOf(el, 'b').hasAttribute('hidden')).toBe(false);
      expect(contentOf(el, 'a').hasAttribute('hidden')).toBe(true);
    });

    it('two-way [(value)] reflects external writes', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('c');
      flush();
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'c').hasAttribute('hidden')).toBe(false);
    });
  });

  describe('automatic activation mode (default)', () => {
    it('arrow nav moves focus AND selects', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'a').focus();
      flush();

      keyDown(triggerOf(el, 'a'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(fixture.componentInstance.active()).toBe('b');

      keyDown(triggerOf(el, 'b'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
      expect(fixture.componentInstance.active()).toBe('c');

      keyDown(triggerOf(el, 'c'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
      expect(fixture.componentInstance.active()).toBe('a');
    });

    it('Home / End jump and select', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'b').focus();
      keyDown(triggerOf(el, 'b'), 'End');
      flush();
      expect(fixture.componentInstance.active()).toBe('c');

      keyDown(triggerOf(el, 'c'), 'Home');
      flush();
      expect(fixture.componentInstance.active()).toBe('a');
    });
  });

  describe('manual activation mode', () => {
    it('arrow nav moves focus only; value stays put', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      flush();

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(fixture.componentInstance.active()).toBe('a');
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('false');
    });

    it('Space / Enter activate via the underlying button click', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      flush();

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowRight');
      flush();
      // Now focus is on b, value still a.
      triggerOf(el, 'b').click();
      flush();
      expect(fixture.componentInstance.active()).toBe('b');
    });

    it('focused trigger gets tabindex=0 even when not selected', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      flush();

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowRight');
      flush();
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('0');
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('vertical orientation', () => {
    it('uses ArrowDown / ArrowUp and ignores left/right', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.orientation.set('vertical');
      flush();

      const list = tablistOf(el);
      expect(list.getAttribute('aria-orientation')).toBe('vertical');

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowDown');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      keyDown(triggerOf(el, 'b'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
    });

    it('propagates data-orientation to trigger and content', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.orientation.set('vertical');
      flush();

      expect(triggerOf(el, 'a').getAttribute('data-orientation')).toBe('vertical');
      expect(contentOf(el, 'a').getAttribute('data-orientation')).toBe('vertical');
    });
  });

  describe('horizontal RTL', () => {
    it('swaps ArrowLeft and ArrowRight', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.dir.set('rtl');
      flush();

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowLeft');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
    });
  });

  describe('disabled', () => {
    it('disabled trigger is skipped on arrow nav and ignores click', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: false },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C', disabled: false },
      ]);
      flush();

      const b = triggerOf(el, 'b');
      expect(b.hasAttribute('disabled')).toBe(true);

      b.click();
      flush();
      expect(fixture.componentInstance.active()).toBe('');

      triggerOf(el, 'a').focus();
      keyDown(triggerOf(el, 'a'), 'ArrowRight');
      flush();
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
    });

    it('root disabled cascades to all triggers and blocks selection', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.rootDisabled.set(true);
      flush();

      expect(triggerOf(el, 'a').hasAttribute('disabled')).toBe(true);
      triggerOf(el, 'a').click();
      flush();
      expect(fixture.componentInstance.active()).toBe('');
    });
  });

  describe('used outside [forTabs]', () => {
    beforeEach(() => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
    });

    it('throws a prefixed error from ForTabsList', () => {
      @Component({ imports: [ForTabsList], template: `<div forTabsList></div>` })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/tabs\] ForTabsList must be used inside a \[forTabs\] element\./,
      );
    });

    it('throws a prefixed error from ForTabsTrigger', () => {
      @Component({
        imports: [ForTabsTrigger],
        template: `<button type="button" forTabsTrigger value="x"></button>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/tabs\] ForTabsTrigger must be used inside a \[forTabs\] element\./,
      );
    });

    it('throws a prefixed error from ForTabsContent', () => {
      @Component({
        imports: [ForTabsContent],
        template: `<section forTabsContent value="x"></section>`,
      })
      class Orphan {}
      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/tabs\] ForTabsContent must be used inside a \[forTabs\] element\./,
      );
    });
  });

  describe('(valueChange) output', () => {
    it('emits the new value when a trigger is clicked', () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs (valueChange)="emitted.push($event)">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
              <button type="button" forTabsTrigger value="b" data-test-id="b">B</button>
            </div>
            <section forTabsContent value="a"></section>
            <section forTabsContent value="b"></section>
          </div>
        `,
      })
      class Host {
        readonly emitted: string[] = [];
      }

      const { fixture, el, flush } = renderHost(Host);
      triggerOf(el, 'b').click();
      flush();
      triggerOf(el, 'a').click();
      flush();

      expect(fixture.componentInstance.emitted).toEqual(['b', 'a']);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs [(value)]="active" (valueChange)="emitted.push($event)">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a">A</button>
            </div>
            <section forTabsContent value="a"></section>
          </div>
        `,
      })
      class Host {
        readonly active = signal('');
        readonly emitted: string[] = [];
      }

      const { fixture, flush } = renderHost(Host);
      fixture.componentInstance.active.set('a');
      flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('c');
      flush();
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('true');

      fixture.componentInstance.active.set('a');
      flush();
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('false');
    });
  });
});
