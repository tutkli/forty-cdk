import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { renderHost } from '../../test-utils/render';
import { ForPopover } from './popover';
import { ForPopoverAnchor } from './popover-anchor';
import { ForPopoverArrow } from './popover-arrow';
import { ForPopoverClose } from './popover-close';
import { ForPopoverContent } from './popover-content';
import { ForPopoverDescription } from './popover-description';
import { ForPopoverTitle } from './popover-title';
import { ForPopoverTrigger } from './popover-trigger';

@Component({
  imports: [
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
  ],
  template: `
    <div forPopover [(open)]="open" [dismissible]="dismissible()" [disabled]="disabled()">
      <button forPopoverTrigger>Open</button>
      @if (open()) {
        <div forPopoverContent>
          <h2 forPopoverTitle>Settings</h2>
          <p forPopoverDescription>Tweak preferences.</p>
          <button id="ok" type="button">OK</button>
          <button id="close-btn" forPopoverClose>Close</button>
          <span forPopoverArrow></span>
        </div>
      }
    </div>
  `,
})
class PopoverHost {
  readonly open = signal(false);
  readonly dismissible = signal(true);
  readonly disabled = signal(false);
}

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div forPopover [(open)]="open" ariaLabel="Quick action">
      <button forPopoverTrigger>Open</button>
      @if (open()) {
        <div forPopoverContent></div>
      }
    </div>
  `,
})
class AriaLabelHost {
  readonly open = signal(false);
}

async function flush<T>(fixture: ComponentFixture<T>): Promise<void> {
  fixture.detectChanges();
  await fixture.whenStable();
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  fixture.detectChanges();
}

describe('ForPopover', () => {
  afterEach(() => {
    document.querySelectorAll('[forPopoverContent]').forEach((n) => n.remove());
  });

  describe('a11y baseline', () => {
    it('wires aria-haspopup, aria-expanded, aria-controls on the trigger', async () => {
      const r = renderHost(PopoverHost);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');
      expect(trigger.hasAttribute('aria-controls')).toBe(false);

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBeTruthy();

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('sets role=dialog and aria-modal="false" on content', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(content.getAttribute('role')).toBe('dialog');
      expect(content.getAttribute('aria-modal')).toBe('false');
    });

    it('ties aria-labelledby/describedby on content to title/description ids', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      const title = content.querySelector<HTMLElement>('[forPopoverTitle]')!;
      const desc = content.querySelector<HTMLElement>('[forPopoverDescription]')!;

      expect(content.getAttribute('aria-labelledby')).toBe(title.id);
      expect(content.getAttribute('aria-describedby')).toBe(desc.id);
    });

    it('honors a manual ariaLabel when no title is rendered', async () => {
      const r = renderHost(AriaLabelHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(content.getAttribute('aria-label')).toBe('Quick action');
      expect(content.hasAttribute('aria-labelledby')).toBe(false);
    });

    it('reflects data-state on root, trigger, and content', async () => {
      const r = renderHost(PopoverHost);
      const root = r.query<HTMLElement>('[forPopover]')!;
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      expect(root.getAttribute('data-state')).toBe('closed');
      expect(trigger.getAttribute('data-state')).toBe('closed');

      r.instance.open.set(true);
      await flush(r.fixture);

      expect(root.getAttribute('data-state')).toBe('open');
      expect(trigger.getAttribute('data-state')).toBe('open');
      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(content.getAttribute('data-state')).toBe('open');
    });
  });

  describe('trigger toggle', () => {
    it('opens on first click and closes on second', async () => {
      const r = renderHost(PopoverHost);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
    });

    it('does not toggle when disabled', async () => {
      const r = renderHost(PopoverHost);
      r.instance.disabled.set(true);
      await flush(r.fixture);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      trigger.click();
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);

      const root = r.query<HTMLElement>('[forPopover]')!;
      expect(root.getAttribute('data-disabled')).toBe('');
      expect(trigger.getAttribute('data-disabled')).toBe('');
    });

    it('honors consumer writes via [(open)] without re-emitting (openChange)', async () => {
      // (openChange) on a model() fires only on internal transitions, never
      // on consumer writes via [(open)] — this is the documented contract.
      let internalEmits = 0;

      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" (openChange)="onOpenChange($event)">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        onOpenChange(_: boolean): void {
          internalEmits++;
        }
      }

      const r = renderHost(Host);

      // Consumer write — should NOT fire openChange.
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(internalEmits).toBe(0);

      // Internal transition (Escape) — should fire once.
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);
      expect(internalEmits).toBe(1);
    });
  });

  describe('mount + portal', () => {
    it('does not render content while open is false', async () => {
      renderHost(PopoverHost);
      expect(document.querySelector('[forPopoverContent]')).toBeNull();
    });

    it('portals content to document.body once open', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(content.parentElement).toBe(document.body);
    });

    it('removes content from the DOM when open flips false', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelector('[forPopoverContent]')).not.toBeNull();

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelector('[forPopoverContent]')).toBeNull();
    });
  });

  describe('focus management', () => {
    it('moves focus to the first focusable inside content on mount', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('ok');
    });

    it('focuses the content host itself when initialFocus="container"', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" initialFocus="container" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent>
                <button id="inside">in</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(document.activeElement).toBe(content);
    });

    it('returns focus to the trigger on unmount', async () => {
      const r = renderHost(PopoverHost);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      // Focus is now inside the popover — close it.
      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.activeElement).toBe(trigger);
    });

    it('keeps focus where it is when returnFocus=false', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" [returnFocus]="false" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent>
                <button id="inside">in</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(document.activeElement).not.toBe(trigger);
    });
  });

  describe('Escape key', () => {
    it('closes the popover when dismissible', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('does not close when dismissible=false', async () => {
      const r = renderHost(PopoverHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });
  });

  describe('outside dismissal', () => {
    it('closes on pointer down outside both content and trigger', async () => {
      const r = renderHost(PopoverHost);
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

    it('does NOT close when the pointer-down lands on the trigger (exempt)', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      // No spurious close from the layer; the trigger's own click then toggles.
      expect(r.instance.open()).toBe(true);
    });

    it('does NOT close when pointer-down lands inside the content', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const ok = document.querySelector<HTMLElement>('#ok')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: ok, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('does not close when dismissible=false even if pointer is outside', async () => {
      const r = renderHost(PopoverHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
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

  describe('close button', () => {
    it('sets open=false when clicked', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const closeBtn = document.querySelector<HTMLButtonElement>('#close-btn')!;
      closeBtn.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('closes regardless of dismissible (close button is non-dismiss)', async () => {
      const r = renderHost(PopoverHost);
      r.instance.dismissible.set(false);
      r.instance.open.set(true);
      await flush(r.fixture);

      const closeBtn = document.querySelector<HTMLButtonElement>('#close-btn')!;
      closeBtn.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });
  });

  describe('vetoable dismiss outputs', () => {
    it('emits (escapeKeyDown) and closes when not prevented', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" (escapeKeyDown)="captured.push($event)" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        readonly captured: KeyboardEvent[] = [];
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(r.instance.open()).toBe(false);
    });

    it('keeps open when (escapeKeyDown) is preventDefault-ed', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" (escapeKeyDown)="$event.preventDefault()" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
      }

      const r = renderHost(Host);
      await flush(r.fixture);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }));
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('emits (pointerDownOutside) and (interactOutside), then closes', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div
            forPopover
            [(open)]="open"
            (pointerDownOutside)="pointerCount = pointerCount + 1"
            (interactOutside)="interactCount = interactCount + 1"
            ariaLabel="t"
          >
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        pointerCount = 0;
        interactCount = 0;
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.pointerCount).toBe(1);
      expect(r.instance.interactCount).toBe(1);
      expect(r.instance.open()).toBe(false);
      outside.remove();
    });

    it('keeps open when (pointerDownOutside) is preventDefault-ed', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div
            forPopover
            [(open)]="open"
            (pointerDownOutside)="$event.preventDefault()"
            ariaLabel="t"
          >
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
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

    it('emits (focusOutside) and (interactOutside) when focus moves outside', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div
            forPopover
            [(open)]="open"
            (focusOutside)="focusCount = focusCount + 1"
            (interactOutside)="interactCount = interactCount + 1"
            ariaLabel="t"
          >
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(true);
        focusCount = 0;
        interactCount = 0;
      }

      const r = renderHost(Host);
      await flush(r.fixture);

      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new FocusEvent('focusin', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.focusCount).toBe(1);
      expect(r.instance.interactCount).toBe(1);
      outside.remove();
    });
  });

  describe('autoFocusOnOpen / autoFocusOnClose', () => {
    it('emits (autoFocusOnOpen) before moving focus into content', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" (autoFocusOnOpen)="captured.push($event)" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent>
                <button id="inside">in</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly captured: CustomEvent[] = [];
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(r.instance.captured[0]?.type).toBe('autoFocusOnOpen');
      expect(document.activeElement?.id).toBe('inside');
    });

    it('skips the imperative focus move when (autoFocusOnOpen) calls preventDefault', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <input id="anchor" type="search" />
          <div forPopover [(open)]="open" (autoFocusOnOpen)="$event.preventDefault()" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent>
                <button id="inside">in</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      const anchor = (r.fixture.nativeElement as HTMLElement).querySelector(
        '#anchor',
      ) as HTMLInputElement;
      anchor.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(document.activeElement?.id).toBe('anchor');
    });

    it('skips the trigger return-focus when (autoFocusOnClose) calls preventDefault', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div
            forPopover
            [(open)]="open"
            (autoFocusOnClose)="captured.push($event); $event.preventDefault()"
            ariaLabel="t"
          >
            <button forPopoverTrigger id="trigger">Open</button>
            @if (open()) {
              <div forPopoverContent>
                <button id="inside">in</button>
              </div>
            }
          </div>
        `,
      })
      class Host {
        readonly open = signal(false);
        readonly captured: CustomEvent[] = [];
      }

      const r = renderHost(Host);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      trigger.focus();
      r.instance.open.set(true);
      await flush(r.fixture);

      const sentinel = document.createElement('button');
      sentinel.id = 'sentinel';
      document.body.appendChild(sentinel);
      sentinel.focus();

      r.instance.open.set(false);
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(r.instance.captured[0]?.type).toBe('autoFocusOnClose');
      // Return-focus vetoed — focus did not move back to the trigger.
      expect(document.activeElement?.id).toBe('sentinel');
      sentinel.remove();
    });
  });

  describe('used outside [forPopover]', () => {
    function expectThrows(host: new (...args: unknown[]) => unknown, regex: RegExp): void {
      TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
      expect(() => TestBed.createComponent(host as never)).toThrow(regex);
    }

    it('throws from ForPopoverTrigger', () => {
      @Component({
        imports: [ForPopoverTrigger],
        template: `<button forPopoverTrigger></button>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverTrigger/);
    });

    it('throws from ForPopoverContent', () => {
      @Component({
        imports: [ForPopoverContent],
        template: `<div forPopoverContent></div>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverContent/);
    });

    it('throws from ForPopoverTitle', () => {
      @Component({
        imports: [ForPopoverTitle],
        template: `<h2 forPopoverTitle></h2>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverTitle/);
    });

    it('throws from ForPopoverDescription', () => {
      @Component({
        imports: [ForPopoverDescription],
        template: `<p forPopoverDescription></p>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverDescription/);
    });

    it('throws from ForPopoverClose', () => {
      @Component({
        imports: [ForPopoverClose],
        template: `<button forPopoverClose></button>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverClose/);
    });

    it('throws from ForPopoverArrow', () => {
      @Component({
        imports: [ForPopoverArrow],
        template: `<span forPopoverArrow></span>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverArrow/);
    });

    it('throws from ForPopoverAnchor', () => {
      @Component({
        imports: [ForPopoverAnchor],
        template: `<span forPopoverAnchor></span>`,
      })
      class Orphan {}
      expectThrows(Orphan, /\[forty-cdk\/popover\] ForPopoverAnchor/);
    });
  });

  describe('anchor (separate positioning element)', () => {
    @Component({
      imports: [ForPopover, ForPopoverTrigger, ForPopoverAnchor, ForPopoverContent],
      template: `
        <div forPopover [(open)]="open" ariaLabel="t">
          <button forPopoverTrigger>Open</button>
          <span id="anchor" forPopoverAnchor>Anchored phrase</span>
          @if (open()) {
            <div forPopoverContent></div>
          }
        </div>
      `,
    })
    class AnchorHost {
      readonly open = signal(false);
    }

    it('uses [forPopoverAnchor] as the positioning reference when registered', async () => {
      const r = renderHost(AnchorHost);
      const directive = r.fixture.debugElement
        .query(By.directive(ForPopover))
        .injector.get(ForPopover);

      const anchor = r.query<HTMLElement>('#anchor')!;
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      expect(directive.anchor()).toBe(anchor);
      expect(directive.trigger()).toBe(trigger);
      expect(directive.reference()).toBe(anchor);
    });

    it('falls back to the trigger when no anchor is registered', () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class NoAnchorHost {
        readonly open = signal(false);
      }

      const r = renderHost(NoAnchorHost);
      const directive = r.fixture.debugElement
        .query(By.directive(ForPopover))
        .injector.get(ForPopover);

      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      expect(directive.anchor()).toBeNull();
      expect(directive.reference()).toBe(trigger);
    });

    it('lets the trigger keep driving aria-controls and the toggle', async () => {
      const r = renderHost(AnchorHost);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      // aria-controls / aria-expanded still come from the trigger, not the anchor.
      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
      expect(trigger.getAttribute('aria-expanded')).toBe('false');

      trigger.click();
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('keeps the trigger exempt from outside dismissal even when an anchor exists', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(true);
    });

    it('treats the anchor as outside for dismissal (only the trigger is exempt)', async () => {
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const anchor = r.query<HTMLElement>('#anchor')!;
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: anchor, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);

      expect(r.instance.open()).toBe(false);
    });

    it('switches reference back to the trigger after the anchor is unregistered', async () => {
      @Component({
        imports: [ForPopover, ForPopoverTrigger, ForPopoverAnchor, ForPopoverContent],
        template: `
          <div forPopover [(open)]="open" ariaLabel="t">
            <button forPopoverTrigger>Open</button>
            @if (showAnchor()) {
              <span id="anchor" forPopoverAnchor>X</span>
            }
            @if (open()) {
              <div forPopoverContent></div>
            }
          </div>
        `,
      })
      class ToggleAnchorHost {
        readonly open = signal(false);
        readonly showAnchor = signal(true);
      }

      const r = renderHost(ToggleAnchorHost);
      const directive = r.fixture.debugElement
        .query(By.directive(ForPopover))
        .injector.get(ForPopover);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      expect(directive.anchor()).not.toBeNull();
      expect(directive.reference()).not.toBe(trigger);

      r.instance.showAnchor.set(false);
      await flush(r.fixture);

      expect(directive.anchor()).toBeNull();
      expect(directive.reference()).toBe(trigger);
    });
  });
});
