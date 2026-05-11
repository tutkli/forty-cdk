import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { VetoableNativeEvent } from '../_internal/vetoable-event/vetoable-event';
import { afterEachOverlayCleanup, pressKey, renderHost, withReducedMotion } from '../../test-utils';
import { ForHoverCard } from './hover-card';
import { ForHoverCardContent } from './hover-card-content';
import { ForHoverCardTrigger } from './hover-card-trigger';
import { provideForHoverCardDefaults } from './hover-card-defaults';

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <span
      forHoverCard
      #card="forHoverCard"
      [(open)]="isOpen"
      [disabled]="isDisabled()"
      [openDelay]="openDelay()"
      [closeDelay]="closeDelay()"
    >
      <a forHoverCardTrigger href="/x">Trigger</a>
      @if (card.open()) {
        <div forHoverCardContent>Content</div>
      }
    </span>
  `,
})
class HoverCardHost {
  readonly isOpen = signal(false);
  readonly isDisabled = signal(false);
  readonly openDelay = signal<number | undefined>(0);
  readonly closeDelay = signal<number | undefined>(0);
}

function pointerEvent(type: 'pointerenter' | 'pointerleave'): PointerEvent {
  return new PointerEvent(type, { bubbles: true });
}

describe('ForHoverCard', () => {
  afterEachOverlayCleanup();

  describe('open / close lifecycle', () => {
    // Scoped fake timers: only the delay-driven cases install them, so a
    // future `await flush(r.fixture)` here doesn't hang on a frozen
    // macrotask queue.
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens after the open delay on pointerenter and closes after the close delay on pointerleave', () => {
      vi.useFakeTimers();
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.openDelay.set(700);
      fixture.componentInstance.closeDelay.set(300);
      flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(699);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(299);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('is forced closed when disabled flips to true', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      // Flipping disabled true must force-close the card AND propagate
      // through (openChange) so consumer's [(open)] binding stays in sync.
      fixture.componentInstance.isDisabled.set(true);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('ignores reopen attempts while disabled', () => {
      vi.useFakeTimers();
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(1000);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('rejects consumer writes to [(open)] while disabled', () => {
      const { fixture, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();

      fixture.componentInstance.isOpen.set(true);
      flush();
      // The directive must override the attempt: open stays false and the
      // consumer's signal is reset.
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('content interaction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('cancels pending close when the cursor enters the content', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(300);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();

      // Content is portaled to document.body.
      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      vi.advanceTimersByTime(500);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('closes after delay when the cursor leaves the content', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(150);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      content.dispatchEvent(pointerEvent('pointerleave'));
      flush();

      vi.advanceTimersByTime(150);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('focus / blur', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens on focus of the trigger', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.focus();
      trigger.dispatchEvent(new FocusEvent('focus'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('closes on blur of the trigger', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.focus();
      trigger.dispatchEvent(new FocusEvent('focus'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('escape', () => {
    it('closes immediately on Escape, ignoring closeDelay', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(1000);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      pressKey(trigger, 'Escape');
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('closes when Escape is pressed inside the portaled content', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      pressKey(content, 'Escape');
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('emits (escapeKeyDown) and stays open when the consumer preventDefault-s', () => {
      const captured: VetoableNativeEvent<KeyboardEvent>[] = [];

      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        template: `
          <span
            forHoverCard
            #card="forHoverCard"
            [(open)]="isOpen"
            [openDelay]="0"
            [closeDelay]="0"
            (escapeKeyDown)="onEscape($event)"
          >
            <a forHoverCardTrigger href="/x">Trigger</a>
            @if (card.open()) {
              <div forHoverCardContent>Content</div>
            }
          </span>
        `,
      })
      class Host {
        readonly isOpen = signal(false);
        onEscape(event: VetoableNativeEvent<KeyboardEvent>): void {
          captured.push(event);
          event.preventDefault();
        }
      }

      const { fixture, query, flush } = renderHost(Host);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      flush();
      expect(captured.length).toBe(1);
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      flush();
      expect(captured.length).toBe(2);
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('orphan pieces', () => {
    it('throws when [forHoverCardTrigger] is used outside [forHoverCard]', () => {
      @Component({
        imports: [ForHoverCardTrigger],
        template: `<a forHoverCardTrigger href="/x">x</a>`,
      })
      class Orphan {}

      TestBed.configureTestingModule({
        providers: [provideZonelessChangeDetection()],
      });

      expect(() => TestBed.createComponent(Orphan)).toThrow(
        /\[forty-cdk\/hover-card\] ForHoverCardTrigger must be used inside a \[forHoverCard\] element\./,
      );
    });
  });

  describe('skip-delay coordinator', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens instantly during the skip-delay window after a peer card closed', () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults({ openDelay: 500, skipDelayDuration: 500 })],
        template: `
          <span forHoverCard #a="forHoverCard">
            <a forHoverCardTrigger href="/a">A</a>
            @if (a.open()) {
              <div forHoverCardContent>A</div>
            }
          </span>
          <span forHoverCard #b="forHoverCard">
            <a forHoverCardTrigger href="/b">B</a>
            @if (b.open()) {
              <div forHoverCardContent>B</div>
            }
          </span>
        `,
      })
      class TwoCards {}

      const { queryAll, flush } = renderHost(TwoCards);
      flush();
      const links = queryAll<HTMLAnchorElement>('a');

      // Open A
      links[0]!.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(500);
      flush();
      // Close A (closeDelay default 300)
      links[0]!.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(300);
      flush();

      // Open B should now be instant (within skip-delay window).
      links[1]!.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(1);
    });
  });

  describe('prefers-reduced-motion: reduce', () => {
    let restoreReducedMotion: () => void;
    beforeEach(() => {
      restoreReducedMotion = withReducedMotion();
      vi.useFakeTimers();
    });
    afterEach(() => {
      restoreReducedMotion();
      vi.useRealTimers();
    });

    it('still respects openDelay / closeDelay cadence under reduced-motion', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.openDelay.set(700);
      fixture.componentInstance.closeDelay.set(300);
      flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(699);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(299);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      vi.advanceTimersByTime(1);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('zoneless reactivity', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('reflects open state changes after detectChanges without Zone.js', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      expect(trigger.getAttribute('data-state')).toBe('closed');

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      expect(trigger.getAttribute('data-state')).toBe('open');
    });
  });
});
