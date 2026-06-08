import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  afterEachOverlayCleanup,
  flush,
  pressKey,
  renderHost,
} from '../../test-utils';
import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForContextMenu } from './context-menu';
import { ForContextMenuTrigger } from './context-menu-trigger';

const IMPORTS = [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem];

@Component({
  imports: IMPORTS,
  template: `
    <div forContextMenu [(open)]="open" [disabled]="disabled()">
      <div id="region" forContextMenuTrigger>
        Right-click here
        <button id="inner-btn" type="button">Inner</button>
      </div>
      @if (open()) {
        <div forMenuContent>
          <button id="cut" forMenuItem (select)="lastSelected.set('cut')">Cut</button>
          <button id="copy" forMenuItem (select)="lastSelected.set('copy')">Copy</button>
        </div>
      }
    </div>
  `,
})
class ContextMenuHost {
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly lastSelected = signal<string | null>(null);
}

function rightClick(el: HTMLElement, x: number, y: number): MouseEvent {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    button: 2,
    clientX: x,
    clientY: y,
  });
  el.dispatchEvent(event);
  return event;
}

describe('ForContextMenu', () => {
  afterEachOverlayCleanup();

  describe('right-click trigger', () => {
    it('opens the menu on contextmenu and prevents the native menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;

      const event = rightClick(region, 100, 200);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(event.defaultPrevented).toBe(true);
    });

    it('focuses the first menu item once mounted', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      rightClick(region, 50, 50);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('cut');
    });

    it('lets the native menu show when disabled', async () => {
      const r = renderHost(ContextMenuHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const region = r.query<HTMLElement>('#region')!;
      const event = rightClick(region, 0, 0);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(event.defaultPrevented).toBe(false);
      expect(region.getAttribute('data-disabled')).toBe('');
      expect(region.hasAttribute('aria-disabled')).toBe(false);
      expect(region.hasAttribute('disabled')).toBe(false);
    });
  });

  describe('a11y baseline', () => {
    it('mounts content with role=menu after right-click', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.getAttribute('role')).toBe('menu');
    });

    it('omits disabled-related attributes on the trigger by default', () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      // Disabled-related attributes are absent when not disabled — never
      // emitted as "false". Consumers must select on `:not([aria-disabled])`.
      expect(region.hasAttribute('data-disabled')).toBe(false);
      expect(region.hasAttribute('aria-disabled')).toBe(false);
      expect(region.hasAttribute('disabled')).toBe(false);
    });

    it('host-binds a default tabindex="-1" so return-focus works without consumer setup', () => {
      // The host template no longer declares its own `tabindex`; the
      // directive supplies the focusable default. (Real return-focus is a
      // Playwright concern — jsdom mis-models `activeElement` — but the
      // attribute that makes it possible is a DOM contract we can assert.)
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      expect(region.getAttribute('tabindex')).toBe('-1');
    });

    it('lets a consumer-provided tabindex override the default', () => {
      @Component({
        imports: [ForContextMenu, ForContextMenuTrigger],
        template: `
          <div forContextMenu>
            <div id="region" forContextMenuTrigger tabindex="0">Right-click here</div>
          </div>
        `,
      })
      class OverrideHost {}

      const r = renderHost(OverrideHost);
      const region = r.query<HTMLElement>('#region')!;
      expect(region.getAttribute('tabindex')).toBe('0');
    });
  });

  describe('keyboard activator', () => {
    // Geometry-driven assertions (anchor rect → `--for-anchor-width/-height`
    // and resolved `transform`) live in the Playwright suite — see
    // `projects/forty-cdk-harness/e2e/context-menu.e2e.ts`. The Vitest layer
    // covers the non-geometry wiring (menu opens, defaultPrevented, focused
    // descendant gets the activation) without faking layout.

    it('Shift+F10 on the focused trigger opens the menu and prevents the native menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const ev = pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('ContextMenu key opens the menu and prevents the native menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const ev = pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('a Shift+F10 on a focused descendant inside the trigger still opens the menu', async () => {
      // Wiring check for the descendant branch in
      // `ForContextMenuTrigger.onKeyDown` — when `activeElement` is inside the
      // trigger, the directive anchors at the descendant rather than the
      // trigger. The geometry effect of that decision (the `--for-anchor-*`
      // CSS vars reflect the descendant's rect, not the trigger's) is covered
      // in the Playwright suite; here we only assert the open path runs.
      const r = renderHost(ContextMenuHost);
      const inner = r.query<HTMLElement>('#inner-btn')!;
      inner.focus();

      const ev = pressKey(inner, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('falls back to the trigger when document.activeElement is outside the trigger', async () => {
      // The fallback branch — `activeElement` is not contained by the trigger,
      // so the directive uses the trigger's rect. Same split as above: this
      // assertion is wiring (menu opens via the trigger fallback); the
      // geometry consequence is covered in e2e.
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();

      const ev = pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
      outside.remove();
    });

    it('does not open or preventDefault when disabled', async () => {
      const r = renderHost(ContextMenuHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const evF10 = pressKey(region, 'F10', { shiftKey: true });
      const evCtxKey = pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(evF10.defaultPrevented).toBe(false);
      expect(evCtxKey.defaultPrevented).toBe(false);
    });

    it('plain F10 (no Shift) does not open the menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const ev = pressKey(region, 'F10');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(ev.defaultPrevented).toBe(false);
    });

    it('focuses the first menu item once mounted via keyboard', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('cut');
    });
  });

  describe('outside dismissal', () => {
    it('closes when a left-click lands on the right-click region (no exemption)', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      // Left-click on the region — should close (region is NOT exempt for ContextMenu).
      const region = r.query<HTMLElement>('#region')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: region, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [region], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('closes on pointer-down outside the region and the menu', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      outside.remove();
    });

    it('does NOT close when pointer-down lands inside the menu', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      const cut = document.querySelector<HTMLElement>('#cut')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: cut, configurable: true });
      Object.defineProperty(event, 'composedPath', { value: () => [cut], configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('Escape key', () => {
    it('closes the menu', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('item selection', () => {
    it('emits (select) and closes on click', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      document.querySelector<HTMLButtonElement>('#copy')!.click();
      await flush(r.fixture);

      expect(r.instance.lastSelected()).toBe('copy');
      expect(r.instance.open()).toBe(false);
    });
  });

  describe('two-way binding', () => {
    it('respects programmatic open writes', async () => {
      const r = renderHost(ContextMenuHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.querySelector('[forMenuContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
    });
  });

  describe('orphan errors', () => {
    it('throws when [forContextMenuTrigger] is used without [forContextMenu]', () => {
      @Component({
        imports: [ForContextMenuTrigger],
        template: `<div forContextMenuTrigger>orphan</div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      expect(() => TestBed.createComponent(Orphan)).toThrow();
    });
  });

  describe('zoneless', () => {
    it('open state stays reactive without zone.js', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
    });
  });
});
