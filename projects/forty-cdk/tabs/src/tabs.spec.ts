import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { pressKey, renderHost, withReducedMotion } from '../../src/test-utils';
import { assertRovingTabindexContract } from '../../src/test-utils/contract';
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
      [loop]="loop()"
    >
      <div forTabsList [ariaLabel]="listLabel()">
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
  readonly active = signal<string | null>(null);
  readonly listLabel = signal<string | null>(null);
  readonly mode = signal<'automatic' | 'manual'>('automatic');
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly rootDisabled = signal(false);
  readonly loop = signal(true);
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

const triggers = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forTabsTrigger]'));

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

    it('labels each content by its matching trigger', () => {
      const { el } = renderHost(TabsHost);
      for (const v of ['a', 'b', 'c']) {
        const t = triggerOf(el, v);
        const c = contentOf(el, v);
        expect(c.getAttribute('aria-labelledby')).toBe(t.id);
      }
    });

    it('emits aria-controls on every trigger whose panel is registered (keep-mounted)', () => {
      const { el, instance, fixture } = renderHost(TabsHost);

      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-controls')).toBe(contentOf(el, v).id);
      }

      instance.active.set('b');
      fixture.detectChanges();

      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-controls')).toBe(contentOf(el, v).id);
      }
    });

    it('omits aria-controls when the matching panel is unmounted (@if selected pattern)', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs [(value)]="active">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
              <button type="button" forTabsTrigger value="b" data-test-id="b">B</button>
              <button type="button" forTabsTrigger value="c" data-test-id="c">C</button>
            </div>
            @if (active() === 'a') {
              <section forTabsContent value="a" data-test-content="a">A</section>
            }
            @if (active() === 'b') {
              <section forTabsContent value="b" data-test-content="b">B</section>
            }
            @if (active() === 'c') {
              <section forTabsContent value="c" data-test-content="c">C</section>
            }
          </div>
        `,
      })
      class IfHost {
        readonly active = signal<string>('a');
      }

      const { el, fixture, flush } = renderHost(IfHost);
      await flush();

      expect(triggerOf(el, 'a').getAttribute('aria-controls')).toBe(contentOf(el, 'a').id);
      expect(triggerOf(el, 'b').hasAttribute('aria-controls')).toBe(false);
      expect(triggerOf(el, 'c').hasAttribute('aria-controls')).toBe(false);

      fixture.componentInstance.active.set('b');
      await flush();

      expect(triggerOf(el, 'a').hasAttribute('aria-controls')).toBe(false);
      expect(triggerOf(el, 'b').getAttribute('aria-controls')).toBe(contentOf(el, 'b').id);
      expect(triggerOf(el, 'c').hasAttribute('aria-controls')).toBe(false);
    });

    // Issue #102 reproduction. Previously, `triggerIdFor` / `contentIdFor`
    // wrapped each handle's `value()` read in a `try/catch` because triggers
    // and contents register in their constructors — racing with their own
    // `input.required` binding step. The catch swallowed legitimate errors
    // too, and a successful lookup was indistinguishable from "still
    // bootstrapping". This test pins down two invariants the new code path
    // must guarantee:
    //
    // 1. Every trigger / content with a real pair resolves it on the first
    //    settled render — no stragglers.
    // 2. Late inserts (a tab added via `@for` after first render) wire up
    //    deterministically too, not just the initial set.
    it('resolves trigger↔content pairing deterministically, including late inserts', () => {
      const { el, instance, fixture } = renderHost(TabsHost);
      // `aria-labelledby` is emitted unconditionally and proves the
      // content→trigger lookup settled; `aria-controls` reflects the
      // registration-gated trigger→content lookup on every trigger.
      for (const v of ['a', 'b', 'c']) {
        instance.active.set(v);
        fixture.detectChanges();
        const t = triggerOf(el, v);
        const c = contentOf(el, v);
        expect(t.getAttribute('aria-controls')).not.toBeNull();
        expect(c.getAttribute('aria-labelledby')).not.toBeNull();
        expect(t.getAttribute('aria-controls')).toBe(c.id);
        expect(c.getAttribute('aria-labelledby')).toBe(t.id);
      }

      // Late insert exercises the same registration path on a fresh trigger
      // / content pair after the parent's collection signal has already
      // emitted at least once. The deferred-registration model has to
      // settle the new pair within the same CD cycle that mounts them.
      instance.tabs.update((arr) => [...arr, { value: 'd', label: 'D', disabled: false }]);
      instance.active.set('d');
      fixture.detectChanges();

      const lateTrigger = triggerOf(el, 'd');
      const lateContent = contentOf(el, 'd');
      expect(lateTrigger.getAttribute('aria-controls')).toBe(lateContent.id);
      expect(lateContent.getAttribute('aria-labelledby')).toBe(lateTrigger.id);
    });

    it('starts with all panels marked aria-hidden and inert when no value is set', () => {
      const { el } = renderHost(TabsHost);
      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-selected')).toBe('false');
        expect(contentOf(el, v).getAttribute('aria-hidden')).toBe('true');
        expect(contentOf(el, v).hasAttribute('inert')).toBe(true);
        expect(contentOf(el, v).getAttribute('data-state')).toBe('inactive');
      }
    });
  });

  describe('accessible name (ariaLabel)', () => {
    it('reflects ariaLabel on the tablist when set', () => {
      const { el, instance, fixture } = renderHost(TabsHost);
      instance.listLabel.set('Main sections');
      fixture.detectChanges();
      expect(tablistOf(el).getAttribute('aria-label')).toBe('Main sections');
    });

    it('emits no aria-label attribute when null (default)', () => {
      const { el } = renderHost(TabsHost);
      expect(tablistOf(el).hasAttribute('aria-label')).toBe(false);
    });

    it('emits no aria-label attribute for the empty string (truthy-only guard)', () => {
      const { el, instance, fixture } = renderHost(TabsHost);
      instance.listLabel.set('');
      fixture.detectChanges();
      expect(tablistOf(el).hasAttribute('aria-label')).toBe(false);
    });
  });

  describe('conditional tabpanel tabindex (APG)', () => {
    @Component({
      imports: [...TABS_IMPORTS],
      template: `
        <div forTabs [(value)]="active">
          <div forTabsList>
            <button type="button" forTabsTrigger value="empty" data-test-id="empty">E</button>
            <button type="button" forTabsTrigger value="rich" data-test-id="rich">R</button>
          </div>
          <section forTabsContent value="empty" data-test-content="empty">Just text</section>
          <section forTabsContent value="rich" data-test-content="rich">
            @if (showButton()) {
              <button type="button">Inside</button>
            }
          </section>
        </div>
      `,
    })
    class MixedHost {
      readonly active = signal<string | null>('empty');
      readonly showButton = signal(true);
    }

    it('a panel with no focusable descendants is a tab stop (tabindex=0)', async () => {
      const { el, flush } = renderHost(MixedHost);
      await flush();
      expect(contentOf(el, 'empty').getAttribute('tabindex')).toBe('0');
    });

    it('a panel with focusable descendants is not itself a tab stop', async () => {
      const { el, flush } = renderHost(MixedHost);
      await flush();
      expect(contentOf(el, 'rich').hasAttribute('tabindex')).toBe(false);
    });

    it('reacts when a panel gains / loses focusable content after first render', async () => {
      const { el, fixture, flush } = renderHost(MixedHost);
      await flush();
      expect(contentOf(el, 'rich').hasAttribute('tabindex')).toBe(false);

      fixture.componentInstance.showButton.set(false);
      await flush();
      expect(contentOf(el, 'rich').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.showButton.set(true);
      await flush();
      expect(contentOf(el, 'rich').hasAttribute('tabindex')).toBe(false);
    });

    it('[interactiveContent]=true forces no tab stop even with no focusable content', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs value="a">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
            </div>
            <section forTabsContent value="a" data-test-content="a" [interactiveContent]="true">
              Plain text
            </section>
          </div>
        `,
      })
      class ForcedHost {}

      const { el, flush } = renderHost(ForcedHost);
      await flush();
      expect(contentOf(el, 'a').hasAttribute('tabindex')).toBe(false);
    });

    it('[interactiveContent]=false forces a tab stop even with focusable content', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs value="a">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
            </div>
            <section forTabsContent value="a" data-test-content="a" [interactiveContent]="false">
              <button type="button">Inside</button>
            </section>
          </div>
        `,
      })
      class ForcedHost {}

      const { el, flush } = renderHost(ForcedHost);
      await flush();
      expect(contentOf(el, 'a').getAttribute('tabindex')).toBe('0');
    });

    it('a panel whose only focusable child is CSS-hidden is a tab stop (tabindex=0)', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs value="a">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
            </div>
            <section forTabsContent value="a" data-test-content="a">
              <button type="button" style="display: none">Hidden</button>
            </section>
          </div>
        `,
      })
      class CssHiddenHost {}

      const { el, flush } = renderHost(CssHiddenHost);
      await flush();
      expect(contentOf(el, 'a').getAttribute('tabindex')).toBe('0');
    });
  });

  describe('value contract (string | null)', () => {
    it('treats null as the unset state — no trigger selected, all panels hidden', () => {
      const { el } = renderHost(TabsHost);
      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-selected')).toBe('false');
        expect(contentOf(el, v).getAttribute('aria-hidden')).toBe('true');
      }
    });

    it('a tab with value="" is selectable and distinct from the unset state', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs [(value)]="active">
            <div forTabsList>
              <button type="button" forTabsTrigger value="" data-test-id="empty">Empty</button>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
            </div>
            <section forTabsContent value="" data-test-content="empty">Empty panel</section>
            <section forTabsContent value="a" data-test-content="a">A panel</section>
          </div>
        `,
      })
      class EmptyValueHost {
        readonly active = signal<string | null>(null);
      }

      const { el, fixture, flush } = renderHost(EmptyValueHost);

      // Unset (null): the empty-string tab is NOT selected.
      expect(triggerOf(el, 'empty').getAttribute('aria-selected')).toBe('false');
      expect(contentOf(el, 'empty').getAttribute('aria-hidden')).toBe('true');

      // Selecting the empty-string tab activates it — '' is a legal value.
      triggerOf(el, 'empty').click();
      await flush();
      expect(fixture.componentInstance.active()).toBe('');
      expect(triggerOf(el, 'empty').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'empty').hasAttribute('aria-hidden')).toBe(false);
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('false');
    });

    it('selecting then clearing back to null returns to the unset state', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('b');
      await flush();
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');

      fixture.componentInstance.active.set(null);
      await flush();
      for (const v of ['a', 'b', 'c']) {
        expect(triggerOf(el, v).getAttribute('aria-selected')).toBe('false');
        expect(contentOf(el, v).getAttribute('aria-hidden')).toBe('true');
      }
    });
  });

  assertRovingTabindexContract({
    mount: async () => {
      const r = renderHost(TabsHost);
      await r.flush();
      return { items: triggers(r.el), flush: r.flush };
    },
    mountWithDisabledFirst: async () => {
      const r = renderHost(TabsHost);
      r.fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', disabled: false },
        { value: 'c', label: 'C', disabled: false },
      ]);
      await r.flush();
      return { items: triggers(r.el), enabledIndices: [1, 2], flush: r.flush };
    },
    mountRtl: async () => {
      const r = renderHost(TabsHost);
      r.fixture.componentInstance.dir.set('rtl');
      await r.flush();
      return { items: triggers(r.el), flush: r.flush };
    },
  });

  describe('initial tabindex (selection-driven)', () => {
    it('selected trigger has tabindex=0 when there is a selection', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('b');
      await flush();
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('-1');
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('0');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'b').hasAttribute('aria-hidden')).toBe(false);
      expect(contentOf(el, 'b').hasAttribute('inert')).toBe(false);
    });
  });

  describe('roving self-heal (active item removed / disabled)', () => {
    const tabindexOf = (host: HTMLElement, id: string) =>
      triggerOf(host, id).getAttribute('tabindex');

    it('removing the focused trigger re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('b');
      await flush();

      triggerOf(el, 'b').focus();
      await flush();
      expect(tabindexOf(el, 'b')).toBe('0');

      fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: false },
        { value: 'c', label: 'C', disabled: false },
      ]);
      await flush();

      const tabbable = triggers(el).filter((t) => t.getAttribute('tabindex') === '0');
      expect(tabbable.length).toBe(1);
      expect(tabindexOf(el, 'a')).toBe('0');
    });

    it('disabling the focused trigger re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      await flush();
      expect(tabindexOf(el, 'a')).toBe('0');

      fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: true },
        { value: 'b', label: 'B', disabled: false },
        { value: 'c', label: 'C', disabled: false },
      ]);
      await flush();

      const tabbable = triggers(el).filter((t) => t.getAttribute('tabindex') === '0');
      expect(tabbable.length).toBe(1);
      expect(tabindexOf(el, 'b')).toBe('0');
    });
  });

  describe('click activation', () => {
    it('selects the clicked trigger and reveals its panel', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.active()).toBe('b');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('data-state')).toBe('active');
      expect(contentOf(el, 'b').hasAttribute('aria-hidden')).toBe(false);
      expect(contentOf(el, 'b').hasAttribute('inert')).toBe(false);
      expect(contentOf(el, 'a').getAttribute('aria-hidden')).toBe('true');
      expect(contentOf(el, 'a').hasAttribute('inert')).toBe(true);
    });

    it('two-way [(value)] reflects external writes', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('c');
      await flush();
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'c').hasAttribute('aria-hidden')).toBe(false);
      expect(contentOf(el, 'c').hasAttribute('inert')).toBe(false);
    });
  });

  describe('automatic activation mode (default)', () => {
    it('arrow nav moves focus AND selects', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'a').focus();
      await flush();

      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(fixture.componentInstance.active()).toBe('b');

      pressKey(triggerOf(el, 'b'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
      expect(fixture.componentInstance.active()).toBe('c');

      pressKey(triggerOf(el, 'c'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
      expect(fixture.componentInstance.active()).toBe('a');
    });

    it('Home / End jump and select', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      triggerOf(el, 'b').focus();
      pressKey(triggerOf(el, 'b'), 'End');
      await flush();
      expect(fixture.componentInstance.active()).toBe('c');

      pressKey(triggerOf(el, 'c'), 'Home');
      await flush();
      expect(fixture.componentInstance.active()).toBe('a');
    });

    it('does not wrap past the last enabled trigger when loop=false', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.loop.set(false);
      await flush();

      triggerOf(el, 'c').focus();
      fixture.componentInstance.active.set('c');
      await flush();

      pressKey(triggerOf(el, 'c'), 'ArrowRight');
      await flush();
      // Stays on c — no wrap.
      expect(document.activeElement).toBe(triggerOf(el, 'c'));
      expect(fixture.componentInstance.active()).toBe('c');
    });
  });

  describe('manual activation mode', () => {
    it('arrow nav moves focus only; value stays put', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(fixture.componentInstance.active()).toBe('a');
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('false');
    });

    it('Space / Enter activate via the underlying button click', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();
      // Now focus is on b, value still a.
      triggerOf(el, 'b').click();
      await flush();
      expect(fixture.componentInstance.active()).toBe('b');
    });

    it('focused trigger gets tabindex=0 even when not selected', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.mode.set('manual');
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('0');
      expect(triggerOf(el, 'a').getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('vertical orientation', () => {
    it('uses ArrowDown / ArrowUp and ignores left/right', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();

      const list = tablistOf(el);
      expect(list.getAttribute('aria-orientation')).toBe('vertical');

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));
    });

    it('propagates data-orientation to trigger and content', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();

      expect(triggerOf(el, 'a').getAttribute('data-orientation')).toBe('vertical');
      expect(contentOf(el, 'a').getAttribute('data-orientation')).toBe('vertical');
    });

    it('ArrowUp / ArrowDown stay axis-positive under dir="rtl" (dir does not flip vertical)', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.orientation.set('vertical');
      fixture.componentInstance.dir.set('rtl');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'b'));

      pressKey(triggerOf(el, 'b'), 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(triggerOf(el, 'a'));
    });
  });

  describe('disabled', () => {
    it('disabled trigger ignores click', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: false },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C', disabled: false },
      ]);
      await flush();

      const b = triggerOf(el, 'b');
      expect(b.hasAttribute('disabled')).toBe(false);
      expect(b.getAttribute('aria-disabled')).toBe('true');
      expect(b.getAttribute('data-disabled')).toBe('');

      b.click();
      await flush();
      expect(fixture.componentInstance.active()).toBeNull();
    });

    it('root disabled cascades to all triggers and blocks selection', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.rootDisabled.set(true);
      await flush();

      expect(triggerOf(el, 'a').hasAttribute('disabled')).toBe(false);
      expect(triggerOf(el, 'a').getAttribute('aria-disabled')).toBe('true');
      triggerOf(el, 'a').click();
      await flush();
      expect(fixture.componentInstance.active()).toBeNull();
    });
  });

  describe('disabled triggers stay keyboard-reachable (APG)', () => {
    const withDisabledB = async () => {
      const r = renderHost(TabsHost);
      r.fixture.componentInstance.tabs.set([
        { value: 'a', label: 'A', disabled: false },
        { value: 'b', label: 'B', disabled: true },
        { value: 'c', label: 'C', disabled: false },
      ]);
      await r.flush();
      return r;
    };

    it('a disabled middle trigger keeps tabindex="-1" and aria-disabled="true"', async () => {
      const { el } = await withDisabledB();
      expect(triggerOf(el, 'b').getAttribute('tabindex')).toBe('-1');
      expect(triggerOf(el, 'b').getAttribute('aria-disabled')).toBe('true');
    });

    it('automatic mode: ArrowRight from a reaches disabled b without activating it', async () => {
      const { el, fixture, flush } = await withDisabledB();
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();

      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('false');
    });

    it('automatic mode: ArrowRight dispatched on the disabled trigger b advances selection to c', async () => {
      const { el, fixture, flush } = await withDisabledB();
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'b').focus();
      pressKey(triggerOf(el, 'b'), 'ArrowRight');
      await flush();

      expect(document.activeElement).toBe(triggerOf(el, 'c'));
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('true');
    });

    it('zoneless: arrow-over-disabled reaches the disabled trigger without activating it', async () => {
      const { el, fixture, flush } = await withDisabledB();
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'a').focus();
      pressKey(triggerOf(el, 'a'), 'ArrowRight');
      await flush();

      expect(document.activeElement).toBe(triggerOf(el, 'b'));
      expect(fixture.componentInstance.active()).toBe('a');
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
    it('emits the new value when a trigger is clicked', async () => {
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
        readonly emitted: (string | null)[] = [];
      }

      const { fixture, el, flush } = renderHost(Host);
      triggerOf(el, 'b').click();
      await flush();
      triggerOf(el, 'a').click();
      await flush();

      expect(fixture.componentInstance.emitted).toEqual(['b', 'a']);
    });

    it('does not emit when the consumer drives `value` externally via [(value)]', async () => {
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
        readonly active = signal<string | null>(null);
        readonly emitted: (string | null)[] = [];
      }

      const { fixture, flush } = renderHost(Host);
      fixture.componentInstance.active.set('a');
      await flush();

      expect(fixture.componentInstance.emitted).toEqual([]);
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects external value writes without Zone.js', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('c');
      await flush();
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('true');

      fixture.componentInstance.active.set('a');
      await flush();
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('true');
      expect(triggerOf(el, 'c').getAttribute('aria-selected')).toBe('false');
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

    it('clicking a tab still switches aria-selected and aria-hidden under reduced-motion', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('a');
      await flush();

      triggerOf(el, 'b').click();
      await flush();

      expect(fixture.componentInstance.active()).toBe('b');
      expect(triggerOf(el, 'a').getAttribute('aria-selected')).toBe('false');
      expect(triggerOf(el, 'b').getAttribute('aria-selected')).toBe('true');
      expect(contentOf(el, 'a').getAttribute('aria-hidden')).toBe('true');
      expect(contentOf(el, 'b').hasAttribute('aria-hidden')).toBe(false);
    });
  });

  describe('mounted-but-inactive a11y', () => {
    it('marks inactive panels aria-hidden + inert and clears both when activated', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);

      fixture.componentInstance.active.set('b');
      await flush();

      expect(contentOf(el, 'b').hasAttribute('aria-hidden')).toBe(false);
      expect(contentOf(el, 'b').hasAttribute('inert')).toBe(false);
      expect(contentOf(el, 'a').getAttribute('aria-hidden')).toBe('true');
      expect(contentOf(el, 'a').hasAttribute('inert')).toBe(true);
      expect(contentOf(el, 'c').getAttribute('aria-hidden')).toBe('true');
      expect(contentOf(el, 'c').hasAttribute('inert')).toBe(true);
    });

    it('does not apply the native [hidden] attribute', async () => {
      const { el, fixture, flush } = renderHost(TabsHost);
      fixture.componentInstance.active.set('a');
      await flush();

      for (const v of ['a', 'b', 'c']) {
        expect(contentOf(el, v).hasAttribute('hidden')).toBe(false);
      }
    });

    it('with @if-driven mounting, panels unmount on inactive (no host attrs to assert)', async () => {
      @Component({
        imports: [...TABS_IMPORTS],
        template: `
          <div forTabs [(value)]="active">
            <div forTabsList>
              <button type="button" forTabsTrigger value="a" data-test-id="a">A</button>
              <button type="button" forTabsTrigger value="b" data-test-id="b">B</button>
            </div>
            @if (active() === 'a') {
              <section forTabsContent value="a" data-test-content="a"></section>
            }
            @if (active() === 'b') {
              <section forTabsContent value="b" data-test-content="b"></section>
            }
          </div>
        `,
      })
      class IfHost {
        readonly active = signal('a');
      }

      const { el, fixture, flush } = renderHost(IfHost);

      const aPanel = el.querySelector<HTMLElement>('[data-test-content="a"]')!;
      expect(aPanel.hasAttribute('aria-hidden')).toBe(false);
      expect(aPanel.hasAttribute('inert')).toBe(false);
      expect(el.querySelector('[data-test-content="b"]')).toBeNull();

      fixture.componentInstance.active.set('b');
      await flush();

      expect(el.querySelector('[data-test-content="a"]')).toBeNull();
      const bPanel = el.querySelector<HTMLElement>('[data-test-content="b"]')!;
      expect(bPanel.hasAttribute('aria-hidden')).toBe(false);
      expect(bPanel.hasAttribute('inert')).toBe(false);
    });
  });
});
