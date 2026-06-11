import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../test-utils';
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
  afterEachOverlayCleanup();

  describe('a11y baseline', () => {
    it('wires aria-haspopup, aria-expanded, aria-controls on the trigger', async () => {
      const r = renderHost(DropdownHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);
      // Disabled-related attributes are absent when not disabled — never
      // emitted as "false". Consumers must select on `:not([aria-disabled])`.
      expect(trigger.hasAttribute('data-disabled')).toBe(false);
      expect(trigger.hasAttribute('aria-disabled')).toBe(false);
      expect(trigger.hasAttribute('disabled')).toBe(false);

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

  describe('ambient writing direction', () => {
    @Component({
      imports: IMPORTS,
      template: `
        <div [attr.dir]="ambient()">
          <div forDropdownMenu [(open)]="open" [dir]="explicit()">
            <button forDropdownMenuTrigger>Options</button>
            @if (open()) {
              <div forMenuContent>
                <button id="a" forMenuItem>A</button>
              </div>
            }
          </div>
        </div>
      `,
    })
    class AmbientHost {
      readonly open = signal(false);
      readonly ambient = signal<string | null>(null);
      readonly explicit = signal<'ltr' | 'rtl' | null>(null);
    }

    it('reflects dir="rtl" on the root from an ancestor [dir] when none is set', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      await flush(fixture);
      const root = fixture.nativeElement.querySelector('[forDropdownMenu]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('rtl');
    });

    it('lets an explicit [dir]="ltr" win over an rtl ancestor', async () => {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      const fixture = TestBed.createComponent(AmbientHost);
      fixture.componentInstance.ambient.set('rtl');
      fixture.componentInstance.explicit.set('ltr');
      await flush(fixture);
      const root = fixture.nativeElement.querySelector('[forDropdownMenu]') as HTMLElement;
      expect(root.getAttribute('dir')).toBe('ltr');
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
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');
    });
  });

  describe('trigger disabled hygiene', () => {
    @Component({
      imports: IMPORTS,
      template: `
        <div forDropdownMenu [(open)]="open" [disabled]="rootDisabled()">
          <button forDropdownMenuTrigger [disabled]="triggerDisabled()">Options</button>
          @if (open()) {
            <div forMenuContent>
              <button id="a" forMenuItem>A</button>
            </div>
          }
        </div>
      `,
    })
    class TriggerDisabledHost {
      readonly open = signal(false);
      readonly rootDisabled = signal(false);
      readonly triggerDisabled = signal(false);
    }

    @Component({
      imports: IMPORTS,
      template: `
        <div forDropdownMenu [(open)]="open" [disabled]="rootDisabled()">
          <button forDropdownMenuTrigger disabled>Options</button>
          @if (open()) {
            <div forMenuContent>
              <button id="a" forMenuItem>A</button>
            </div>
          }
        </div>
      `,
    })
    class StaticDisabledHost {
      readonly open = signal(false);
      readonly rootDisabled = signal(false);
    }

    it('disables via the trigger-only input while the root stays enabled', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.triggerDisabled.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      pressKey(trigger, 'ArrowDown');
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      expect(trigger.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');
    });

    it('removes the disabled attribute it set once the trigger is re-enabled', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.triggerDisabled.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      expect(trigger.getAttribute('disabled')).toBe('');

      r.instance.triggerDisabled.set(false);
      await flush(r.fixture);

      expect(trigger.hasAttribute('disabled')).toBe(false);
      expect(trigger.hasAttribute('data-disabled')).toBe(false);
      expect(trigger.hasAttribute('aria-disabled')).toBe(false);

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('keeps reflecting root-only disabling on the effective state', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.rootDisabled.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      expect(trigger.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');

      r.instance.rootDisabled.set(false);
      await flush(r.fixture);
      expect(trigger.hasAttribute('disabled')).toBe(false);
    });

    it('preserves a consumer-set static disabled while the context is enabled', async () => {
      const r = renderHost(StaticDisabledHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      expect(trigger.hasAttribute('disabled')).toBe(true);

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('never removes a consumer-set static disabled across a root disabled cycle', async () => {
      const r = renderHost(StaticDisabledHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;

      r.instance.rootDisabled.set(true);
      await flush(r.fixture);
      expect(trigger.hasAttribute('disabled')).toBe(true);

      r.instance.rootDisabled.set(false);
      await flush(r.fixture);
      expect(trigger.hasAttribute('disabled')).toBe(true);
    });

    it('preserves a consumer-set disabled attribute that bypasses the input', async () => {
      const r = renderHost(TriggerDisabledHost);
      const trigger = r.query<HTMLButtonElement>('[forDropdownMenuTrigger]')!;
      trigger.setAttribute('disabled', '');

      r.instance.rootDisabled.set(true);
      await flush(r.fixture);
      r.instance.rootDisabled.set(false);
      await flush(r.fixture);

      expect(trigger.hasAttribute('disabled')).toBe(true);
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
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [trigger], configurable: true });
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
      Object.defineProperty(event, 'composedPath', { value: () => [outside], configurable: true });
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
