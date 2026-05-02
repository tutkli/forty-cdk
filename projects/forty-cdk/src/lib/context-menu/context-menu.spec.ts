import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForContextMenu } from './context-menu';
import { ForContextMenuTrigger } from './context-menu-trigger';

const IMPORTS = [ForContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem];

@Component({
  imports: IMPORTS,
  template: `
    <div forContextMenu [(open)]="open" [disabled]="disabled()">
      <div id="region" forContextMenuTrigger tabindex="-1">Right-click here</div>
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

async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
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
  afterEach(() => {
    document.querySelectorAll('[forMenuContent]').forEach((n) => n.remove());
  });

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

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
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
