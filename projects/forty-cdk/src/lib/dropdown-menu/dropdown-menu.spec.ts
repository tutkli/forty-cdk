import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, pressKey, renderHost } from '../../test-utils';
import { ForMenuContent } from '../menu/menu-content';
import { ForMenuItem } from '../menu/menu-item';
import { ForDropdownMenu } from './dropdown-menu';
import { ForDropdownMenuTrigger } from './dropdown-menu-trigger';

const IMPORTS = [ForDropdownMenu, ForDropdownMenuTrigger, ForMenuContent, ForMenuItem];

@Component({
  imports: IMPORTS,
  template: `
    <div forDropdownMenu [(open)]="open" [disabled]="disabled()" [dismissible]="dismissible()">
      <button forDropdownMenuTrigger>Options</button>
      @if (open()) {
        <div forMenuContent>
          <button id="a" forMenuItem>A</button>
          <button id="b" forMenuItem>B</button>
          <button id="c" forMenuItem>C</button>
        </div>
      }
    </div>
  `,
})
class DropdownHost {
  readonly open = signal(false);
  readonly disabled = signal(false);
  readonly dismissible = signal(true);
}


describe('ForDropdownMenu', () => {
  describe('a11y baseline', () => {
    it('wires aria-haspopup, aria-expanded, aria-controls on the trigger', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('reflects data-state on root, trigger, and content', async () => {
      const r = renderHost(DropdownHost);
      const root = r.query<HTMLElement>('[forDropdownMenu]')!;
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      expect(root.getAttribute('data-state')).toBe('closed');
      expect(trigger.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(root.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(content.getAttribute('data-state')).toBe('open');
    });
  });

  describe('trigger interaction', () => {
    it('opens on click and focuses the first item', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement?.id).toBe('a');
    });

    it('closes on a second click', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.click();
      await flush(r.fixture);
      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('opens on ArrowDown and focuses the first item', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement?.id).toBe('a');
    });

    it('opens on ArrowUp and focuses the last item', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      pressKey(trigger, 'ArrowUp');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement?.id).toBe('c');
    });

    it('does nothing when disabled', async () => {
      const r = renderHost(DropdownHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      expect(trigger.getAttribute('data-disabled')).toBe('');
    });
  });

  describe('Escape key', () => {
    it('closes the menu and returns focus to the trigger', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
      expect(document.activeElement).toBe(trigger);
    });

    it('does not close when dismissible=false', async () => {
      const r = renderHost(DropdownHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('keeps open when (escapeKeyDown) is preventDefault-ed', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" (escapeKeyDown)="$event.preventDefault()">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <button id="a" forMenuItem>A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      pressKey(document, 'Escape');
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('outside dismissal', () => {
    it('closes on pointer-down outside both content and trigger', async () => {
      const r = renderHost(DropdownHost);
      r.instance.open.set(true);
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

    it('does NOT close when pointer-down lands on the trigger (exempt)', async () => {
      const r = renderHost(DropdownHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('keeps open when (interactOutside) is preventDefault-ed', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" (interactOutside)="$event.preventDefault()">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <button id="a" forMenuItem>A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      outside.remove();
    });
  });

  describe('mount / portal', () => {
    it('does not render content while closed', () => {
      renderHost(DropdownHost);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
    });

    it('portals content to document.body once open', async () => {
      const r = renderHost(DropdownHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.parentElement).toBe(document.body);
    });

    it('removes content when open flips false', async () => {
      const r = renderHost(DropdownHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
    });
  });

  describe('(openChange) contract', () => {
    it('honors consumer writes via [(open)] without re-emitting (openChange)', async () => {
      let internalEmits = 0;

      @Component({
        imports: IMPORTS,
        template: `
          <div forDropdownMenu [(open)]="open" (openChange)="onChange($event)">
            <button forDropdownMenuTrigger>x</button>
            @if (open()) {
              <div forMenuContent>
                <button id="a" forMenuItem>A</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        onChange(_: boolean): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(internalEmits).toBe(0);

      // Internal transition (Escape) — should fire once.
      pressKey(document, 'Escape');
      await flush(r.fixture);
      expect(internalEmits).toBe(1);
    });
  });

  describe('zoneless', () => {
    it('open / aria-expanded stay reactive without zone.js', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
    });
  });
});
