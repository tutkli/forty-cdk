import { NgTemplateOutlet } from '@angular/common';
import { Component, Directive, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { afterEachOverlayCleanup, flush, pressKey, renderHost } from '../../src/test-utils';
import { assertDismissibleLayerContract } from '../../src/test-utils/contract';
import { FOR_MENU_CONTEXT, type VetoableEvent, type VetoableNativeEvent } from 'forty-cdk/core';
import { ForMenuContent, ForMenuItem, ForMenuSub, ForMenuSubTrigger } from 'forty-cdk/menu';

import { ForContextMenu } from './context-menu';
import { FOR_CONTEXT_MENU_CONTEXT } from './context-menu-context';
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
          <button id="cut" forMenuItem (activate)="lastSelected.set('cut')">Cut</button>
          <button id="copy" forMenuItem (activate)="lastSelected.set('copy')">Copy</button>
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

@Component({
  imports: IMPORTS,
  template: `
    <div
      forContextMenu
      [(open)]="open"
      [dismissible]="dismissible()"
      (escapeKeyDown)="onEscape($event)"
      (pointerDownOutside)="onPointer($event)"
      (focusOutside)="onFocus($event)"
      (interactOutside)="onInteract($event)"
    >
      <div forContextMenuTrigger>Right-click here</div>
      @if (open()) {
        <div forMenuContent>
          <button forMenuItem>Cut</button>
        </div>
      }
    </div>
  `,
})
class ContextMenuDismissContractHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  escapeVeto = false;
  pointerVeto = false;
  eCount = 0;
  pCount = 0;
  fCount = 0;
  iCount = 0;
  onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
    this.eCount += 1;
    if (this.escapeVeto) event.preventDefault();
  }
  onPointer(event: VetoableNativeEvent<PointerEvent>): void {
    this.pCount += 1;
    if (this.pointerVeto) event.preventDefault();
  }
  onFocus(_event: VetoableNativeEvent<FocusEvent>): void {
    this.fCount += 1;
  }
  onInteract(_event: VetoableNativeEvent<PointerEvent | FocusEvent>): void {
    this.iCount += 1;
  }
}

function rightClick(el: HTMLElement, x: number, y: number): MouseEvent {
  el.dispatchEvent(
    new PointerEvent('pointerdown', { bubbles: true, button: 2, clientX: x, clientY: y }),
  );
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

  afterEach(() => {
    vi.useRealTimers();
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

    it('does not highlight the focused first item on a pointer (contextmenu) open', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      rightClick(region, 50, 50);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('cut');
      expect(document.querySelector('[data-highlighted]')).toBeNull();
    });

    it('highlights the first item on a keyboard open (Shift+F10)', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(document.querySelector('#cut')!.getAttribute('data-highlighted')).toBe('');
    });

    it('highlights the first item on a keyboard open (ContextMenu key)', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      expect(document.querySelector('#cut')!.getAttribute('data-highlighted')).toBe('');
    });

    it('swallows the browser-synthesized contextmenu that trails a keyboard open', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'ContextMenu');
      await flush(r.fixture);

      const synthesized = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 0,
        clientY: 0,
      });
      region.dispatchEvent(synthesized);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(synthesized.defaultPrevented).toBe(true);
      expect(document.querySelector('#cut')!.getAttribute('data-highlighted')).toBe('');
    });

    it('treats a contextmenu without a preceding pointerdown as a keyboard activation', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      region.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(document.querySelector('#cut')!.getAttribute('data-highlighted')).toBe('');
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

  describe('touch long-press', () => {
    function touchPointerDown(el: HTMLElement, x: number, y: number): void {
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'touch',
          clientX: x,
          clientY: y,
        }),
      );
    }

    it('opens the menu after a sustained touch press', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(true);
      expect(document.querySelector('[forMenuContent]')).not.toBeNull();
    });

    it('does not open on a short tap (pointerup before the delay)', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      vi.advanceTimersByTime(200);
      region.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerType: 'touch' }));
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(false);
    });

    it('cancels the press when the pointer moves beyond the tolerance (scroll)', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      region.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'touch',
          clientX: 30,
          clientY: 90,
        }),
      );
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(false);
    });

    it('opens despite a sub-tolerance finger jitter', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      region.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerType: 'touch',
          clientX: 33,
          clientY: 44,
        }),
      );
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(true);
    });

    it('cancels the press on pointercancel', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      region.dispatchEvent(
        new PointerEvent('pointercancel', { bubbles: true, pointerType: 'touch' }),
      );
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(false);
    });

    it('does not arm the timer for a mouse pointer', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      region.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: 30,
          clientY: 40,
        }),
      );
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(false);
    });

    it('does not open on long-press when disabled', async () => {
      const r = renderHost(ContextMenuHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(false);
    });

    it('suppresses the trailing synthesized contextmenu after a long-press open', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();
      expect(r.instance.open()).toBe(true);

      const trailing = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 30,
        clientY: 40,
      });
      region.dispatchEvent(trailing);
      r.fixture.detectChanges();

      expect(trailing.defaultPrevented).toBe(true);
      expect(r.instance.open()).toBe(true);
    });

    it('does not re-open via the timer when contextmenu already opened it', async () => {
      const r = renderHost(ContextMenuHost);
      await flush(r.fixture);
      const region = r.query<HTMLElement>('#region')!;

      vi.useFakeTimers();
      touchPointerDown(region, 30, 40);
      region.dispatchEvent(
        new MouseEvent('contextmenu', {
          bubbles: true,
          cancelable: true,
          clientX: 30,
          clientY: 40,
        }),
      );
      r.fixture.detectChanges();
      expect(r.instance.open()).toBe(true);

      vi.advanceTimersByTime(500);
      r.fixture.detectChanges();

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('trigger-only disabled', () => {
    @Component({
      imports: IMPORTS,
      template: `
        <div forContextMenu [(open)]="open" [disabled]="rootDisabled()">
          <div id="region" forContextMenuTrigger [disabled]="triggerDisabled()">Right-click</div>
          @if (open()) {
            <div forMenuContent>
              <button id="cut" forMenuItem>Cut</button>
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

    it('gates pointer and keyboard activation while the root stays enabled', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.triggerDisabled.set(true);
      await flush(r.fixture);

      const region = r.query<HTMLElement>('#region')!;
      const event = rightClick(region, 0, 0);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(event.defaultPrevented).toBe(false);

      region.focus();
      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('reflects only data-disabled from the effective state', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.triggerDisabled.set(true);
      await flush(r.fixture);

      const region = r.query<HTMLElement>('#region')!;
      expect(region.getAttribute('data-disabled')).toBe('');
      expect(region.hasAttribute('aria-disabled')).toBe(false);
      expect(region.hasAttribute('disabled')).toBe(false);

      r.instance.triggerDisabled.set(false);
      await flush(r.fixture);
      expect(region.hasAttribute('data-disabled')).toBe(false);

      rightClick(region, 10, 10);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
    });

    it('keeps root-only disabling effective on the trigger', async () => {
      const r = renderHost(TriggerDisabledHost);
      r.instance.rootDisabled.set(true);
      await flush(r.fixture);

      const region = r.query<HTMLElement>('#region')!;
      rightClick(region, 0, 0);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      expect(region.getAttribute('data-disabled')).toBe('');
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

  describe('accessible name (no labelledby fallback to the trigger region)', () => {
    it('exposes no aria-labelledby on the content when no ariaLabel is set', async () => {
      const r = renderHost(ContextMenuHost);
      rightClick(r.query<HTMLElement>('#region')!, 0, 0);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.hasAttribute('aria-labelledby')).toBe(false);
      expect(content.hasAttribute('aria-label')).toBe(false);
    });

    it('never points the menu name at the right-click region', async () => {
      const r = renderHost(ContextMenuHost);
      const region = r.query<HTMLElement>('#region')!;
      rightClick(region, 0, 0);
      await flush(r.fixture);

      expect(region.id).toBe('region');
      expect(document.querySelector('[aria-labelledby="region"]')).toBeNull();
    });

    it('preserves a consumer-set static aria-labelledby on the content', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <h2 id="heading">Row actions</h2>
          <div forContextMenu [(open)]="open">
            <div forContextMenuTrigger>Right-click here</div>
            @if (open()) {
              <div forMenuContent aria-labelledby="heading">
                <button forMenuItem>Cut</button>
              </div>
            }
          </div>
        `,
      })
      class StaticLabelledByHost {
        readonly open = signal(false);
      }

      const r = renderHost(StaticLabelledByHost);
      rightClick(r.query<HTMLElement>('[forContextMenuTrigger]')!, 0, 0);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.getAttribute('aria-labelledby')).toBe('heading');
    });

    it('still labels a nested submenu by its sub-trigger', async () => {
      @Component({
        imports: [...IMPORTS, ForMenuSub, ForMenuSubTrigger],
        template: `
          <div forContextMenu [(open)]="open">
            <div forContextMenuTrigger>Right-click here</div>
            @if (open()) {
              <div forMenuContent>
                <div forMenuSub [(open)]="subOpen">
                  <button id="more" forMenuSubTrigger>More</button>
                  @if (subOpen()) {
                    <div id="sub-content" forMenuSubContent>
                      <button forMenuItem>Leaf</button>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        `,
      })
      class NestedSubHost {
        readonly open = signal(false);
        readonly subOpen = signal(false);
      }

      const r = renderHost(NestedSubHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      r.instance.subOpen.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.hasAttribute('aria-labelledby')).toBe(false);

      const subTrigger = document.querySelector<HTMLElement>('#more')!;
      const subContent = document.querySelector<HTMLElement>('#sub-content')!;
      expect(subTrigger.id).toBeTruthy();
      expect(subContent.getAttribute('aria-labelledby')).toBe(subTrigger.id);
    });

    it('generates and mirrors a trigger id when the consumer sets none', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forContextMenu [(open)]="open">
            <div forContextMenuTrigger>Right-click here</div>
            @if (open()) {
              <div forMenuContent>
                <button forMenuItem>Cut</button>
              </div>
            }
          </div>
        `,
      })
      class NoIdHost {
        readonly open = signal(false);
      }

      const r = renderHost(NoIdHost);
      const trigger = r.query<HTMLElement>('[forContextMenuTrigger]')!;
      expect(trigger.id).toBeTruthy();

      rightClick(trigger, 0, 0);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.hasAttribute('aria-labelledby')).toBe(false);
      expect(document.getElementById(trigger.id)).toBe(trigger);
    });

    it('exposes the explicit ariaLabel as the menu name', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forContextMenu [(open)]="open" ariaLabel="Actions">
            <div forContextMenuTrigger>Right-click here</div>
            @if (open()) {
              <div forMenuContent>
                <button forMenuItem>Cut</button>
              </div>
            }
          </div>
        `,
      })
      class LabelHost {
        readonly open = signal(false);
      }

      const r = renderHost(LabelHost);
      rightClick(r.query<HTMLElement>('[forContextMenuTrigger]')!, 0, 0);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.hasAttribute('aria-labelledby')).toBe(false);
      expect(content.getAttribute('aria-label')).toBe('Actions');
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

    it('a second Shift+F10 moves focus into a menu whose mount focus was vetoed', async () => {
      @Component({
        imports: IMPORTS,
        template: `
          <div forContextMenu [(open)]="open" (autoFocusOnOpen)="onAutoOpen($event)">
            <div id="region" forContextMenuTrigger>Right-click here</div>
            @if (open()) {
              <div forMenuContent>
                <button id="cut" forMenuItem>Cut</button>
                <button id="copy" forMenuItem>Copy</button>
              </div>
            }
          </div>
        `,
      })
      class VetoedFocusHost {
        readonly open = signal(false);
        onAutoOpen(event: VetoableEvent): void {
          event.preventDefault();
        }
      }

      const r = renderHost(VetoedFocusHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.activeElement).toBe(region);

      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
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

  assertDismissibleLayerContract({
    mount: async (options = {}) => {
      const r = renderHost(ContextMenuDismissContractHost);
      r.instance.dismissible.set(options.dismissible ?? true);
      r.instance.escapeVeto = options.escapeVeto ?? false;
      r.instance.pointerVeto = options.pointerVeto ?? false;
      r.instance.open.set(true);
      await flush(r.fixture);
      return {
        flush: () => flush(r.fixture),
        isOpen: () => r.instance.open(),
        escapeCount: () => r.instance.eCount,
        pointerOutsideCount: () => r.instance.pCount,
        focusOutsideCount: () => r.instance.fCount,
        interactOutsideCount: () => r.instance.iCount,
      };
    },
  });

  describe('item selection', () => {
    it('emits (activate) and closes on click', async () => {
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
      const fixture = TestBed.createComponent(Orphan);
      expect(() => fixture.detectChanges()).toThrow(/\[forty-cdk\/context-menu\]/);
    });

    it('mentions the declaration-site rule and the explicit-reference escape hatch', () => {
      @Component({
        imports: [ForContextMenuTrigger],
        template: `<div forContextMenuTrigger>orphan</div>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });
      const fixture = TestBed.createComponent(Orphan);
      let error: unknown;
      try {
        fixture.detectChanges();
      } catch (e) {
        error = e;
      }
      expect(error).toBeInstanceOf(Error);
      const message = (error as Error).message;
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forContextMenuTrigger\]="root"/);
      expect(message).toMatch(/#root="forContextMenu"/);
    });
  });

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [...IMPORTS, NgTemplateOutlet],
      template: `
        <ng-template #chip let-root="root">
          <div id="region" [forContextMenuTrigger]="root">Right-click here</div>
        </ng-template>

        <div forContextMenu [(open)]="open" #root="forContextMenu">
          <ng-container [ngTemplateOutlet]="chip" [ngTemplateOutletContext]="{ root }" />
          @if (open()) {
            <div forMenuContent>
              <button id="cut" forMenuItem>Cut</button>
              <button id="copy" forMenuItem>Copy</button>
            </div>
          }
        </div>
      `,
    })
    class StampedHost {
      readonly open = signal(false);
    }

    it('opens on right-click when the root is passed explicitly', async () => {
      const r = renderHost(StampedHost);
      const region = r.query<HTMLElement>('#region')!;

      const event = rightClick(region, 100, 200);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(region.getAttribute('data-state')).toBe('open');
    });

    it('opens on Shift+F10 and focuses the first item', async () => {
      const r = renderHost(StampedHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();

      const ev = pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(ev.defaultPrevented).toBe(true);
      expect(document.activeElement?.id).toBe('cut');
    });

    it('open state stays reactive without zone.js through the explicit reference', async () => {
      const r = renderHost(StampedHost);
      const region = r.query<HTMLElement>('#region')!;

      rightClick(region, 10, 10);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
      expect(region.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('subclassed root', () => {
    @Directive({
      selector: '[testContextMenu]',
      providers: [
        { provide: FOR_MENU_CONTEXT, useExisting: TestContextMenu },
        { provide: FOR_CONTEXT_MENU_CONTEXT, useExisting: TestContextMenu },
      ],
    })
    class TestContextMenu extends ForContextMenu {}

    @Component({
      imports: [TestContextMenu, ForContextMenuTrigger, ForMenuContent, ForMenuItem],
      template: `
        <div testContextMenu [(open)]="open">
          <div id="region" forContextMenuTrigger>Right-click here</div>
          @if (open()) {
            <div forMenuContent>
              <button id="cut" forMenuItem>Cut</button>
              <button id="copy" forMenuItem>Copy</button>
            </div>
          }
        </div>
      `,
    })
    class SubclassedHost {
      readonly open = signal(false);
    }

    it('a root re-providing only tokens gets a working trigger', async () => {
      const r = renderHost(SubclassedHost);
      const region = r.query<HTMLElement>('#region')!;

      const event = rightClick(region, 100, 200);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(event.defaultPrevented).toBe(true);
      expect(region.getAttribute('data-state')).toBe('open');
    });

    it('content and items resolve the re-provided menu context', async () => {
      const r = renderHost(SubclassedHost);
      rightClick(r.query<HTMLElement>('#region')!, 50, 50);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forMenuContent]')!;
      expect(content.getAttribute('role')).toBe('menu');
      expect(document.activeElement?.id).toBe('cut');
    });

    it('open state stays reactive without zone.js in a subclassed root', async () => {
      const r = renderHost(SubclassedHost);
      const region = r.query<HTMLElement>('#region')!;
      region.focus();
      pressKey(region, 'F10', { shiftKey: true });
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(document.querySelector('[forMenuContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forMenuContent]')).toBeNull();
      expect(region.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('reactive updates', () => {
    it('a right-click opens and a close write unmounts the content', async () => {
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
