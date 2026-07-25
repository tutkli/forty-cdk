import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../src/test-utils';
import { assertRovingTabindexContract } from '../../src/test-utils/contract';
import { ForToggleGroup, ForToggleGroupItem } from 'forty-cdk/toggle';
import { ForToolbar } from './toolbar';
import { ForToolbarButton } from './toolbar-button';
import { ForToolbarLink } from './toolbar-link';
import { ForToolbarSeparator } from './toolbar-separator';

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToolbarLink, ForToolbarSeparator],
  template: `
    <div
      forToolbar
      [orientation]="orientation()"
      [dir]="dir()"
      [disabled]="disabled()"
      [ariaLabel]="ariaLabel()"
    >
      <button forToolbarButton>One</button>
      <button forToolbarButton [disabled]="middleDisabled()">Two</button>
      <span forToolbarSeparator></span>
      <a forToolbarLink href="/x" [disabled]="linkDisabled()">Three</a>
    </div>
  `,
})
class ToolbarHost {
  readonly orientation = signal<'horizontal' | 'vertical'>('horizontal');
  readonly dir = signal<'ltr' | 'rtl'>('ltr');
  readonly disabled = signal(false);
  readonly middleDisabled = signal(false);
  readonly linkDisabled = signal(false);
  readonly ariaLabel = signal<string | null>(null);
}

@Component({
  imports: [ForToolbar, ForToolbarButton, ForToggleGroup, ForToggleGroupItem],
  template: `
    <div forToolbar>
      <button forToolbarButton>Undo</button>
      <div forToggleGroup multiple>
        <button forToggleGroupItem value="bold">B</button>
        <button forToggleGroupItem value="italic">I</button>
      </div>
      <button forToolbarButton>Redo</button>
    </div>
  `,
})
class ToolbarWithGroupHost {}

const collectFocusables = (host: HTMLElement): HTMLElement[] =>
  Array.from(host.querySelectorAll<HTMLElement>('[forToolbarButton], [forToolbarLink]'));

describe('ForToolbar', () => {
  describe('roles + reflection', () => {
    it('exposes role="toolbar" and reflects orientation', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      const root = query<HTMLElement>('[forToolbar]')!;

      expect(root.getAttribute('role')).toBe('toolbar');
      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(root.getAttribute('data-orientation')).toBe('horizontal');

      fixture.componentInstance.orientation.set('vertical');
      await flush();
      expect(root.getAttribute('aria-orientation')).toBe('vertical');
    });

    it('reflects ariaLabel truthy-only as aria-label', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      const root = query<HTMLElement>('[forToolbar]')!;

      expect(root.hasAttribute('aria-label')).toBe(false);

      fixture.componentInstance.ariaLabel.set('Formatting');
      await flush();
      expect(root.getAttribute('aria-label')).toBe('Formatting');

      fixture.componentInstance.ariaLabel.set('');
      await flush();
      expect(root.hasAttribute('aria-label')).toBe(false);
    });

    it('reflects dir="rtl" on the host when set', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.dir.set('rtl');
      await flush();
      expect(query<HTMLElement>('[forToolbar]')!.getAttribute('dir')).toBe('rtl');
    });

    it('propagates data-orientation to button and link', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.orientation.set('vertical');
      await flush();

      const button = query<HTMLButtonElement>('[forToolbarButton]')!;
      const link = query<HTMLAnchorElement>('[forToolbarLink]')!;
      expect(button.getAttribute('data-orientation')).toBe('vertical');
      expect(link.getAttribute('data-orientation')).toBe('vertical');
    });
  });

  assertRovingTabindexContract({
    mount: async () => {
      const r = renderHost(ToolbarHost);
      await r.flush();
      return { items: collectFocusables(r.el), flush: r.flush };
    },
    mountWithDisabledMiddle: async () => {
      const r = renderHost(ToolbarHost);
      r.fixture.componentInstance.middleDisabled.set(true);
      await r.flush();
      // [One, Two(disabled), Three]
      return {
        items: collectFocusables(r.el),
        enabledIndices: [0, 2],
        flush: r.flush,
      };
    },
    mountWithDisabledFirst: async () => {
      @Component({
        imports: [ForToolbar, ForToolbarButton],
        template: `
          <div forToolbar>
            <button forToolbarButton disabled>One</button>
            <button forToolbarButton>Two</button>
          </div>
        `,
      })
      class Host {}
      const r = renderHost(Host);
      await r.flush();
      return {
        items: collectFocusables(r.el),
        enabledIndices: [1],
        flush: r.flush,
      };
    },
    mountRtl: async () => {
      const r = renderHost(ToolbarHost);
      r.fixture.componentInstance.dir.set('rtl');
      await r.flush();
      return { items: collectFocusables(r.el), flush: r.flush };
    },
  });

  describe('arrow-key navigation (toolbar-specific)', () => {
    it('moves focus right with ArrowRight to the link past the separator', async () => {
      const { queryAll, flush } = renderHost(ToolbarHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      const link = document.querySelector<HTMLAnchorElement>('a')!;

      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);

      pressKey(buttons[1]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(link);
    });

    it('ArrowDown / ArrowUp stay axis-positive in vertical orientation under dir="rtl"', async () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.orientation.set('vertical');
      fixture.componentInstance.dir.set('rtl');
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowDown');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);

      pressKey(buttons[1]!, 'ArrowUp');
      await flush();
      expect(document.activeElement).toBe(buttons[0]);
    });
  });

  describe('roving tab stop follows focus', () => {
    it('moves tabindex=0 to the focused item so re-entry restores it', async () => {
      const { queryAll, flush } = renderHost(ToolbarHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      const link = document.querySelector<HTMLAnchorElement>('a')!;

      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);

      pressKey(buttons[1]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(link);

      expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('-1');
      expect(link.getAttribute('tabindex')).toBe('0');
    });

    it('keeps the active tab stop after focus leaves the toolbar', async () => {
      const { queryAll, flush } = renderHost(ToolbarHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);

      buttons[1]!.blur();
      await flush();

      expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
    });

    it('follows focus across nested toggle-group items sharing the toolbar roving', async () => {
      const { queryAll, flush } = renderHost(ToolbarWithGroupHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      // [Undo, B, I, Redo]
      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);

      expect(buttons[0]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('0');
      expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[3]!.getAttribute('tabindex')).toBe('-1');
    });
  });

  describe('roving self-heal (active item removed / disabled)', () => {
    @Component({
      imports: [ForToolbar, ForToolbarButton],
      template: `
        <div forToolbar>
          @for (item of items(); track item.id) {
            <button forToolbarButton [disabled]="item.disabled" [attr.data-id]="item.id">
              {{ item.id }}
            </button>
          }
        </div>
      `,
    })
    class DynamicToolbarHost {
      readonly items = signal([
        { id: 'one', disabled: false },
        { id: 'two', disabled: false },
        { id: 'three', disabled: false },
      ]);
    }

    const btn = (host: HTMLElement, id: string) =>
      host.querySelector<HTMLButtonElement>(`button[data-id="${id}"]`)!;
    const zeros = (host: HTMLElement) =>
      Array.from(host.querySelectorAll<HTMLButtonElement>('button'))
        .filter((b) => b.getAttribute('tabindex') === '0')
        .map((b) => b.getAttribute('data-id'));

    it('removing the focused item re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(DynamicToolbarHost);
      btn(el, 'one').focus();
      await flush();
      expect(btn(el, 'one').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.items.set([
        { id: 'two', disabled: false },
        { id: 'three', disabled: false },
      ]);
      await flush();

      expect(zeros(el)).toEqual(['two']);
    });

    it('disabling the focused item re-engages the first-enabled fallback', async () => {
      const { el, fixture, flush } = renderHost(DynamicToolbarHost);
      btn(el, 'one').focus();
      await flush();
      expect(btn(el, 'one').getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.items.set([
        { id: 'one', disabled: true },
        { id: 'two', disabled: false },
        { id: 'three', disabled: false },
      ]);
      await flush();

      expect(btn(el, 'one').getAttribute('tabindex')).toBe('-1');
      expect(zeros(el)).toEqual(['two']);
    });
  });

  describe('toggle-group composition', () => {
    it('toggle items participate in the toolbar roving', async () => {
      const { queryAll, flush } = renderHost(ToolbarWithGroupHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      // [Undo, B, I, Redo]
      expect(buttons[0]!.getAttribute('tabindex')).toBe('0');
      expect(buttons[1]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[2]!.getAttribute('tabindex')).toBe('-1');
      expect(buttons[3]!.getAttribute('tabindex')).toBe('-1');

      buttons[0]!.focus();
      pressKey(buttons[0]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[1]);
      pressKey(buttons[1]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[2]);
      pressKey(buttons[2]!, 'ArrowRight');
      await flush();
      expect(document.activeElement).toBe(buttons[3]);
    });

    it('toggle items keep their selection semantics inside a toolbar', async () => {
      const { queryAll, flush } = renderHost(ToolbarWithGroupHost);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');

      buttons[1]!.click(); // bold
      await flush();
      expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
      buttons[2]!.click(); // italic
      await flush();
      expect(buttons[2]!.getAttribute('aria-pressed')).toBe('true');
      // multiple — both still pressed
      expect(buttons[1]!.getAttribute('aria-pressed')).toBe('true');
    });
  });

  describe('disabled toolbar', () => {
    it('disables every item when the toolbar is disabled', async () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      expect(buttons[0]!.getAttribute('aria-disabled')).toBe('true');
      expect(buttons[0]!.hasAttribute('disabled')).toBe(false);
      expect(buttons[1]!.getAttribute('aria-disabled')).toBe('true');
      expect(buttons[1]!.hasAttribute('disabled')).toBe(false);
    });

    it('disabled button keeps aria-disabled (no native disabled) and stays focusable', async () => {
      const { fixture, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.middleDisabled.set(true);
      await flush();
      const buttons = queryAll<HTMLButtonElement>('button');
      expect(buttons[1]!.getAttribute('aria-disabled')).toBe('true');
      expect(buttons[1]!.hasAttribute('disabled')).toBe(false);
      buttons[1]!.focus();
      expect(document.activeElement).toBe(buttons[1]);
    });

    it('disabled link keeps aria-disabled (no native disabled on <a>)', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.linkDisabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;
      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.hasAttribute('disabled')).toBe(false);
    });

    it('disabled toolbar announces the link disabled and drops its tab stop', async () => {
      const { fixture, query, queryAll, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;

      expect(link.getAttribute('aria-disabled')).toBe('true');
      expect(link.getAttribute('data-disabled')).toBe('');
      expect(link.hasAttribute('disabled')).toBe(false);
      expect(link.getAttribute('tabindex')).toBe('-1');

      const stops = [...queryAll<HTMLElement>('[forToolbarButton]'), link].filter(
        (item) => item.getAttribute('tabindex') === '0',
      );
      expect(stops).toEqual([]);
    });

    it('disabled toolbar keeps the link out of the roving active slot', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;

      link.focus();
      await flush();
      expect(link.getAttribute('tabindex')).toBe('-1');
    });

    it('disabled toolbar suppresses link activation and stops later click listeners', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;

      const spy = vi.fn();
      link.addEventListener('click', spy);
      try {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        link.removeEventListener('click', spy);
      }
    });

    it('per-item disabled link suppresses activation with stopImmediatePropagation', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.linkDisabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;

      const spy = vi.fn();
      link.addEventListener('click', spy);
      try {
        const event = new MouseEvent('click', { bubbles: true, cancelable: true });
        link.dispatchEvent(event);
        expect(event.defaultPrevented).toBe(true);
        expect(spy).not.toHaveBeenCalled();
      } finally {
        link.removeEventListener('click', spy);
      }
    });

    it('disabled toolbar leaves arrow keys on the link unconsumed', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      fixture.componentInstance.disabled.set(true);
      await flush();
      const link = query<HTMLAnchorElement>('a')!;

      const event = pressKey(link, 'ArrowRight');
      expect(event.defaultPrevented).toBe(false);
    });
  });

  describe('separator', () => {
    it('inherits cross-axis orientation by default', async () => {
      const { fixture, query, flush } = renderHost(ToolbarHost);
      await flush();

      const sep = query<HTMLElement>('[forToolbarSeparator]')!;
      // Horizontal toolbar → vertical separator (cross-axis).
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('data-orientation')).toBe('vertical');
      expect(sep.getAttribute('aria-orientation')).toBe('vertical');

      // Vertical toolbar → horizontal separator (cross-axis). aria-orientation
      // is only emitted for 'vertical' (horizontal is the ARIA default).
      fixture.componentInstance.orientation.set('vertical');
      await flush();
      expect(sep.getAttribute('role')).toBe('separator');
      expect(sep.getAttribute('data-orientation')).toBe('horizontal');
      expect(sep.getAttribute('aria-orientation')).toBeNull();
    });
  });

  describe('orphan usage', () => {
    it('throws a prefixed error when ForToolbarButton is used outside a toolbar', () => {
      @Component({
        imports: [ForToolbarButton],
        template: `<button forToolbarButton>x</button>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrowError(
        /\[forty-cdk\/toolbar\] ForToolbarButton must be used inside a \[forToolbar\] element\./,
      );
    });

    it('throws a prefixed error when ForToolbarLink is used outside a toolbar', () => {
      @Component({
        imports: [ForToolbarLink],
        template: `<a forToolbarLink href="/x">x</a>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrowError(
        /\[forty-cdk\/toolbar\] ForToolbarLink must be used inside a \[forToolbar\] element\./,
      );
    });

    it('throws a prefixed error when ForToolbarSeparator is used outside a toolbar', () => {
      @Component({
        imports: [ForToolbarSeparator],
        template: `<span forToolbarSeparator></span>`,
      })
      class Orphan {}

      expect(() => renderHost(Orphan)).toThrowError(
        /\[forty-cdk\/toolbar\] ForToolbarSeparator must be used inside a \[forToolbar\] element\./,
      );
    });
  });

  describe('zoneless reactivity', () => {
    it('reflects state changes after detectChanges without Zone.js', async () => {
      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(ToolbarHost);
      await flush(fixture);

      const host = fixture.nativeElement as HTMLElement;
      const root = host.querySelector('[forToolbar]') as HTMLElement;
      const buttons = host.querySelectorAll<HTMLButtonElement>('button');

      expect(root.getAttribute('aria-orientation')).toBe('horizontal');
      expect(buttons[0]!.getAttribute('tabindex')).toBe('0');

      fixture.componentInstance.orientation.set('vertical');
      await flush(fixture);
      expect(root.getAttribute('aria-orientation')).toBe('vertical');
    });
  });
});
