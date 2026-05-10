import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { flush, pressKey, renderHost } from '../../test-utils';
import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForContextMenu } from './context-menu';
import { ForContextMenuTrigger } from './context-menu-trigger';

const IMPORTS = [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem];

@Component({
  imports: IMPORTS,
  template: `
    <div forContextMenu [(open)]="open" [disabled]="disabled()">
      <div id="region" forContextMenuTrigger tabindex="-1">
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

function getMenuDirective<T>(fixture: ComponentFixture<T>): ForContextMenu {
  return fixture.debugElement.query(By.directive(ForContextMenu)).injector.get(ForContextMenu);
}

function stubRect(
  el: HTMLElement,
  rect: { left?: number; top?: number; width?: number; height?: number } = {},
): DOMRect {
  const left = rect.left ?? 0;
  const top = rect.top ?? 0;
  const width = rect.width ?? 100;
  const height = rect.height ?? 24;
  const stubbed = {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {
      return this;
    },
  } as DOMRect;
  el.getBoundingClientRect = () => stubbed;
  return stubbed;
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
      expect(region.getAttribute('aria-disabled')).toBe('true');
      expect(region.getAttribute('disabled')).toBe('');
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
  });

  describe('keyboard activator', () => {
    it('Shift+F10 on the focused trigger opens the menu and prevents the native menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      stubRect(region, { left: 30, top: 50, width: 200, height: 80 });
      region.focus();

      const ev = pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('Shift+F10 anchors the menu at the focused element rect, not at (0,0)', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      stubRect(region, { left: 30, top: 50, width: 200, height: 80 });
      region.focus();

      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      const anchor = getMenuDirective(r.fixture).anchor();
      expect(anchor).not.toBeNull();
      const rect = anchor!.getBoundingClientRect();
      expect(rect.left).toBe(30);
      expect(rect.top).toBe(50);
      expect(rect.width).toBe(200);
      expect(rect.height).toBe(80);
    });

    it('ContextMenu key opens the menu and prevents the native menu', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      stubRect(region, { left: 10, top: 10, width: 50, height: 50 });
      region.focus();

      const ev = pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
    });

    it('ContextMenu key anchors at the focused element rect', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      stubRect(region, { left: 10, top: 10, width: 50, height: 50 });
      region.focus();

      pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      const rect = getMenuDirective(r.fixture).anchor()!.getBoundingClientRect();
      expect(rect.left).toBe(10);
      expect(rect.top).toBe(10);
      expect(rect.width).toBe(50);
      expect(rect.height).toBe(50);
    });

    it('anchors at a focused descendant rather than the trigger when focus is inside', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      const inner = r.query<HTMLElement>('#inner-btn')!;
      stubRect(region, { left: 0, top: 0, width: 300, height: 200 });
      stubRect(inner, { left: 110, top: 90, width: 60, height: 24 });
      inner.focus();

      pressKey(inner, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      const rect = getMenuDirective(r.fixture).anchor()!.getBoundingClientRect();
      expect(rect.left).toBe(110);
      expect(rect.top).toBe(90);
      expect(rect.width).toBe(60);
      expect(rect.height).toBe(24);
    });

    it('falls back to the trigger rect when document.activeElement is outside the trigger', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      stubRect(region, { left: 5, top: 7, width: 11, height: 13 });

      // Focus an element outside the trigger, then dispatch the key on the trigger
      // (simulating a programmatic dispatch where activeElement isn't the source).
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      outside.focus();

      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      const rect = getMenuDirective(r.fixture).anchor()!.getBoundingClientRect();
      expect(rect.left).toBe(5);
      expect(rect.top).toBe(7);
      expect(rect.width).toBe(11);
      expect(rect.height).toBe(13);
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
