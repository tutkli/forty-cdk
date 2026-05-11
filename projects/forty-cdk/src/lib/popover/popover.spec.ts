import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type {
  VetoableEvent,
  VetoableNativeEvent,
} from '../_internal/vetoable-event/vetoable-event';
import { flush, pressKey, renderHost } from '../../test-utils';
import { assertDismissableLayerContract } from '../../test-utils/contract';
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

@Component({
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <div
      forPopover
      [(open)]="open"
      [dismissible]="dismissible()"
      (escapeKeyDown)="onEscape($event)"
      (pointerDownOutside)="onPointer($event)"
      (focusOutside)="onFocus($event)"
      (interactOutside)="onInteract($event)"
      ariaLabel="t"
    >
      <button forPopoverTrigger>Open</button>
      @if (open()) {
        <div forPopoverContent></div>
      }
    </div>
  `,
})
class DismissableContractHost {
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

describe('ForPopover', () => {
  describe('portal cleanup', () => {
    it('removes the portaled content from document.body on close', async () => {
      // Issue #89 reproduction.
      const r = renderHost(PopoverHost);

      r.instance.open.set(true);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forPopoverContent]')).toHaveLength(1);

      r.instance.open.set(false);
      await flush(r.fixture);
      expect(document.querySelectorAll('[forPopoverContent]')).toHaveLength(0);
    });
  });

  describe('a11y baseline', () => {
    it('wires aria-haspopup, aria-expanded, aria-controls on the trigger', async () => {
      const r = renderHost(PopoverHost);
      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;

      expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
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
      expect(trigger.getAttribute('aria-controls')).toBeTruthy();

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    });

    it('sets role=dialog and omits aria-modal on the non-modal content', async () => {
      const r = renderHost(PopoverHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(content.getAttribute('role')).toBe('dialog');
      // Per the library-wide ARIA emission rule, `aria-modal` is truthy-only:
      // absent on non-modal dialogs (popover, hover-card), `"true"` on modal ones.
      expect(content.hasAttribute('aria-modal')).toBe(false);
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
      expect(trigger.getAttribute('aria-disabled')).toBe('true');
      expect(trigger.getAttribute('disabled')).toBe('');
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
      pressKey(document, 'Escape');
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

  assertDismissableLayerContract({
    mount: async (options = {}) => {
      const r = renderHost(DismissableContractHost);
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

  describe('outside dismissal (popover-specific exemptions)', () => {
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
        readonly captured: VetoableEvent[] = [];
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.instance.captured).toHaveLength(1);
      expect(typeof r.instance.captured[0]?.preventDefault).toBe('function');
      expect(r.instance.captured[0]?.defaultPrevented).toBe(false);
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
        readonly captured: VetoableEvent[] = [];
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
      expect(typeof r.instance.captured[0]?.preventDefault).toBe('function');
      expect(r.instance.captured[0]?.defaultPrevented).toBe(true);
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

    it('still mounts the popover when [forPopoverAnchor] is registered alongside the trigger', async () => {
      // The DOM-observable contract for "anchor is wired": both elements
      // coexist, opening works, and the popover content paints.
      // (Which element drives positioning is asserted via dismissal
      // semantics in the trigger-exempt / anchor-outside tests below.)
      const r = renderHost(AnchorHost);
      r.instance.open.set(true);
      await flush(r.fixture);

      expect(r.query<HTMLElement>('#anchor')).not.toBeNull();
      expect(r.query<HTMLButtonElement>('[forPopoverTrigger]')).not.toBeNull();
      expect(document.querySelector<HTMLElement>('[forPopoverContent]')).not.toBeNull();
    });

    it('falls back to the trigger when no anchor is registered', async () => {
      // Without an anchor, only the trigger participates in positioning /
      // dismissal exemption — observable via aria-controls flowing from the
      // trigger and the trigger remaining the only exempt element.
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
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(trigger.getAttribute('aria-expanded')).toBe('true');
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);

      // The trigger stays exempt from the dismissable layer (no double-close
      // race when the consumer clicks it to toggle).
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: trigger, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(true);
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

    it('keeps trigger-driven aria + dismissal after the anchor is unregistered', async () => {
      // After the consumer tears down the anchor at runtime, the popover
      // must continue to dismiss + drive aria from the trigger. We can only
      // observe this contract through the DOM (aria-controls, trigger
      // exempt from outside-pointerdown, outside-pointerdown still closes).
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
      r.instance.open.set(true);
      await flush(r.fixture);

      const trigger = r.query<HTMLButtonElement>('[forPopoverTrigger]')!;
      const content = document.querySelector<HTMLElement>('[forPopoverContent]')!;
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);

      // Tear down the anchor while open.
      r.instance.showAnchor.set(false);
      await flush(r.fixture);
      expect(r.query<HTMLElement>('#anchor')).toBeNull();
      // aria-controls still flows from the trigger (which never participated
      // in positioning swap — see ForPopoverContext.reference contract).
      expect(trigger.getAttribute('aria-controls')).toBe(content.id);
      expect(trigger.getAttribute('aria-expanded')).toBe('true');

      // Outside pointerdown still dismisses (no stale anchor exemption).
      const outside = document.createElement('button');
      document.body.appendChild(outside);
      const event = new PointerEvent('pointerdown', { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'target', { value: outside, configurable: true });
      document.dispatchEvent(event);
      await flush(r.fixture);
      expect(r.instance.open()).toBe(false);
      outside.remove();
    });
  });
});
