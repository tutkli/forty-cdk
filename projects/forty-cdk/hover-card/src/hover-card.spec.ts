import { NgTemplateOutlet } from '@angular/common';
import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { type VetoableNativeEvent } from 'forty-cdk/core';
import {
  afterEachOverlayCleanup,
  flushPositioning,
  pressKey,
  renderHost,
  withReducedMotion,
} from '../../src/test-utils';
import { ForHoverCard } from './hover-card';
import { ForHoverCardArrow } from './hover-card-arrow';
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

@Component({
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent, ForHoverCardArrow],
  template: `
    <span forHoverCard #card="forHoverCard" [(open)]="isOpen" [openDelay]="0" [closeDelay]="0">
      <a forHoverCardTrigger href="/x">Trigger</a>
      @if (card.open()) {
        <div forHoverCardContent>
          Content
          <span forHoverCardArrow></span>
        </div>
      }
    </span>
  `,
})
class HoverCardWithArrowHost {
  readonly isOpen = signal(false);
}

function pointerEvent(
  type: 'pointerenter' | 'pointerleave',
  relatedTarget: EventTarget | null = null,
): PointerEvent {
  return new PointerEvent(type, { bubbles: true, relatedTarget });
}

function pointerMoveAway(): void {
  document.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 9999,
      clientY: 9999,
      pointerType: 'mouse',
    }),
  );
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

    it('opens after the open delay on pointerenter and closes after the close delay once the pointer moves away', async () => {
      vi.useFakeTimers();
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.openDelay.set(700);
      fixture.componentInstance.closeDelay.set(300);
      await flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(699);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(299);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('is forced closed when disabled flips to true', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      // Flipping disabled true must force-close the card AND propagate
      // through (openChange) so consumer's [(open)] binding stays in sync.
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('ignores reopen attempts while disabled', async () => {
      vi.useFakeTimers();
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isDisabled.set(true);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(1000);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('honors a consumer programmatic [(open)] write while disabled', async () => {
      const { fixture, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isDisabled.set(true);
      await flush();

      // `open` is a stock `model()` (like Popover) — the consumer owns it.
      // `disabled` gates the directive's own hover/focus interaction and
      // force-closes only when it flips to true, but it never fights an
      // explicit consumer write through [(open)].
      fixture.componentInstance.isOpen.set(true);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('content interaction', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('cancels pending close when the cursor enters the content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(300);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();

      // Content is portaled to document.body.
      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      vi.advanceTimersByTime(500);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('stays open with closeDelay:0 when the pointer leaves the trigger into overlapping content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      // Overlapping content: the browser fires pointerleave on the covered
      // trigger with relatedTarget = the content element.
      trigger.dispatchEvent(pointerEvent('pointerleave', content));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('arms the grace bridge instead of closing when the pointer leaves the trigger into a gap at closeDelay:0', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(
        new PointerEvent('pointerleave', { bubbles: true, clientX: 40, clientY: 40 }),
      );
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('content pointerenter disarms the grace and holds the card open', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      trigger.dispatchEvent(
        new PointerEvent('pointerleave', { bubbles: true, clientX: 40, clientY: 40 }),
      );
      await flush();

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('closes once the pointer finally leaves the content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      trigger.dispatchEvent(
        new PointerEvent('pointerleave', { bubbles: true, clientX: 40, clientY: 40 }),
      );
      await flush();

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      content.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('closes after delay when the cursor leaves the content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(150);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      content.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      content.dispatchEvent(pointerEvent('pointerleave'));
      await flush();

      vi.advanceTimersByTime(150);
      await flush();
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

    it('opens on focus of the trigger', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.focus();
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('closes on blur of the trigger', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.focus();
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not close on pointerleave while the trigger is still focused', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new FocusEvent('focus'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not close on blur while the pointer is still over the trigger', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('touch / pointer-induced focus guard', () => {
    it('ignores a touch pointerenter so a tap never opens via the hover path', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'touch' }));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not open on a touch-induced focus (a tap focuses the trigger)', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not open on a mouse-induced focus (a click that focuses the trigger)', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('opens on a keyboard focus that follows a suppressed touch tap', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch' }));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      trigger.dispatchEvent(new FocusEvent('blur'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('escape', () => {
    it('closes immediately on Escape, ignoring closeDelay', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.closeDelay.set(1000);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      pressKey(trigger, 'Escape');
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('closes when Escape is pressed inside the portaled content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      pressKey(content, 'Escape');
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('closes when Escape is pressed while focus is on an unrelated element', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      // The card was hover-opened; focus never entered the trigger or the
      // content. Escape dispatched on an unrelated element still routes
      // through the document-level dismissable layer and closes the card.
      pressKey(document, 'Escape');
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('dismisses only once (no double-close) when Escape is pressed inside the content', async () => {
      const transitions: boolean[] = [];

      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        template: `
          <span
            forHoverCard
            #card="forHoverCard"
            [(open)]="isOpen"
            [openDelay]="0"
            [closeDelay]="0"
            (openChange)="onOpenChange($event)"
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
        onOpenChange(open: boolean): void {
          transitions.push(open);
        }
      }

      const { fixture, query, flush } = renderHost(Host);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(transitions).toEqual([true]);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      pressKey(content, 'Escape');
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      // Exactly one close transition — the content's host listener was
      // removed, so the document-level layer is the only Escape path.
      expect(transitions).toEqual([true, false]);
    });

    it('emits (escapeKeyDown) and stays open when the consumer preventDefault-s', async () => {
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
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(captured.length).toBe(1);
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      content.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
      await flush();
      expect(captured.length).toBe(2);
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });
  });

  describe('(openChange) output', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits both true AND false in the uncontrolled (observe-only) case', async () => {
      const emitted: boolean[] = [];

      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        template: `
          <span
            forHoverCard
            #card="forHoverCard"
            [openDelay]="0"
            [closeDelay]="0"
            (openChange)="emitted.push($event)"
          >
            <a forHoverCardTrigger href="/x">Trigger</a>
            @if (card.open()) {
              <div forHoverCardContent>Content</div>
            }
          </span>
        `,
      })
      class Host {
        readonly emitted = emitted;
      }

      const { query, flush } = renderHost(Host);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      // Without any [(open)] binding the closing transition must still emit —
      // the bug was that the hand-rolled bridge dropped the false emit here.
      expect(emitted).toEqual([true, false]);
    });
  });

  describe('arrow', () => {
    it('is hidden from the a11y tree and exposes the data-hover-card-arrow hook', async () => {
      const { fixture, query, flush } = renderHost(HoverCardWithArrowHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const arrow = document.body.querySelector<HTMLElement>('[data-hover-card-arrow]')!;
      expect(arrow).toBeTruthy();
      expect(arrow.getAttribute('aria-hidden')).toBe('true');
    });
  });

  describe('orphan pieces', () => {
    it('throws when [forHoverCardTrigger] is used outside [forHoverCard] on first change detection', () => {
      @Component({
        imports: [ForHoverCardTrigger],
        template: `<a forHoverCardTrigger href="/x">x</a>`,
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
      expect(message).toMatch(/\[forty-cdk\/hover-card\] ForHoverCardTrigger could not resolve/);
      expect(message).toMatch(/declaration site/);
      expect(message).toMatch(/\[forHoverCardTrigger\]="root"/);
      expect(message).toMatch(/#root="forHoverCard"/);
    });
  });

  describe('skip-delay coordinator', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('opens instantly during the skip-delay window after a peer card closed', async () => {
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
      await flush();
      const links = queryAll<HTMLAnchorElement>('a');

      // Open A
      links[0]!.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(500);
      await flush();
      // Close A (closeDelay default 300)
      links[0]!.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(300);
      await flush();

      // Open B should now be instant (within skip-delay window).
      links[1]!.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(1);
    });

    it('is callable with no arguments to establish a fresh coordinator scope', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults()],
        template: `
          <span forHoverCard #card="forHoverCard" [openDelay]="0">
            <a forHoverCardTrigger href="/x">Trigger</a>
            @if (card.open()) {
              <div forHoverCardContent>Content</div>
            }
          </span>
        `,
      })
      class NoArgsHost {}

      const { query, flush } = renderHost(NoArgsHost);
      await flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(1);
    });
  });

  describe('scroll dismiss', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('closes an open card when an ancestor scrolls', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(1);

      document.dispatchEvent(new Event('scroll'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(0);
    });

    it('suppresses a hover open while an ancestor is scrolling, even with openDelay 0', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      vi.advanceTimersByTime(200);
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('suppresses the instant re-open during scroll within the skip-delay window', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not suppress a focus open while an ancestor is scrolling', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('reflects the scroll close through data-state without Zone.js', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isOpen.set(true);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;
      expect(trigger.getAttribute('data-state')).toBe('open');

      document.dispatchEvent(new Event('scroll'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(trigger.getAttribute('data-state')).toBe('closed');
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

    it('still respects openDelay / closeDelay cadence under reduced-motion', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.openDelay.set(700);
      fixture.componentInstance.closeDelay.set(300);
      await flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(699);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      await flush();
      pointerMoveAway();
      await flush();
      vi.advanceTimersByTime(299);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      vi.advanceTimersByTime(1);
      await flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('reflects data-reduced-motion on the root and content', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isOpen.set(true);
      await flush();

      const root = query<HTMLElement>('[forHoverCard]')!;
      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(root.getAttribute('data-reduced-motion')).toBe('');
      expect(content.getAttribute('data-reduced-motion')).toBe('');
    });
  });

  describe('reduced-motion styling hook (default)', () => {
    it('omits data-reduced-motion when reduced motion is not requested', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isOpen.set(true);
      await flush();

      const root = query<HTMLElement>('[forHoverCard]')!;
      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(root.hasAttribute('data-reduced-motion')).toBe(false);
      expect(content.hasAttribute('data-reduced-motion')).toBe(false);
    });
  });

  describe('positioning defaults from provideForHoverCardDefaults', () => {
    it('positions on the scope side when the instance sets no side', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults({ side: 'bottom' })],
        template: `
          <span forHoverCard #card="forHoverCard" [(open)]="open">
            <a forHoverCardTrigger href="/x">T</a>
            @if (card.open()) {
              <div forHoverCardContent>C</div>
            }
          </span>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(content.dataset['side']).toBe('bottom');
      expect(content.dataset['placement']).toBe('bottom');
    });

    it('lets an instance-level side win over the scope default', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults({ side: 'bottom' })],
        template: `
          <span forHoverCard #card="forHoverCard" [(open)]="open" side="left">
            <a forHoverCardTrigger href="/x">T</a>
            @if (card.open()) {
              <div forHoverCardContent>C</div>
            }
          </span>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(content.dataset['side']).toBe('left');
    });

    it('aligns on the scope align when the instance sets no align', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults({ align: 'start' })],
        template: `
          <span forHoverCard #card="forHoverCard" [(open)]="open">
            <a forHoverCardTrigger href="/x">T</a>
            @if (card.open()) {
              <div forHoverCardContent>C</div>
            }
          </span>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(content.dataset['align']).toBe('start');
      expect(content.dataset['placement']).toBe('top-start');
    });

    it('lets an instance-level align win over the scope default', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideForHoverCardDefaults({ align: 'start' })],
        template: `
          <span forHoverCard #card="forHoverCard" [(open)]="open" align="end">
            <a forHoverCardTrigger href="/x">T</a>
            @if (card.open()) {
              <div forHoverCardContent>C</div>
            }
          </span>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(content.dataset['align']).toBe('end');
    });

    it('resolves sideOffset and collisionPadding from the scope when the inputs are unset', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger],
        providers: [provideForHoverCardDefaults({ sideOffset: 12, collisionPadding: 16 })],
        template: `
          <span forHoverCard>
            <a forHoverCardTrigger href="/x">T</a>
          </span>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await r.flush();

      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);
      expect(card.sideOffset()).toBe(12);
      expect(card.collisionPadding()).toBe(16);
    });

    it('lets instance-level sideOffset / collisionPadding win over the scope defaults', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger],
        providers: [provideForHoverCardDefaults({ sideOffset: 12, collisionPadding: 16 })],
        template: `
          <span forHoverCard [sideOffset]="20" [collisionPadding]="24">
            <a forHoverCardTrigger href="/x">T</a>
          </span>
        `,
      })
      class Host {}

      const r = renderHost(Host);
      await r.flush();

      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);
      expect(card.sideOffset()).toBe(20);
      expect(card.collisionPadding()).toBe(24);
    });

    it('keeps the library fallbacks (top / center / 8 / 8) when nothing is configured', async () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        template: `
          <span forHoverCard #card="forHoverCard" [(open)]="open">
            <a forHoverCardTrigger href="/x">T</a>
            @if (card.open()) {
              <div forHoverCardContent>C</div>
            }
          </span>
        `,
      })
      class Host {
        readonly open = signal(false);
      }

      const r = renderHost(Host);
      r.instance.open.set(true);
      await flushPositioning(r.fixture);

      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);
      expect(card.side()).toBe('top');
      expect(card.align()).toBe('center');
      expect(card.sideOffset()).toBe(8);
      expect(card.collisionPadding()).toBe(8);

      const content = document.querySelector<HTMLElement>('[forHoverCardContent]')!;
      expect(content.dataset['side']).toBe('top');
    });
  });

  describe('show() / hide() imperative API', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it('show() opens the card after openDelay', async () => {
      const r = renderHost(HoverCardHost);
      r.instance.openDelay.set(700);
      await r.flush();
      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);
      const trigger = r.query<HTMLAnchorElement>('a')!;

      vi.useFakeTimers();
      card.show();

      vi.advanceTimersByTime(699);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
      expect(trigger.getAttribute('data-state')).toBe('closed');

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);
      expect(trigger.getAttribute('data-state')).toBe('open');
    });

    it('hide() closes the card after closeDelay, not before', async () => {
      const r = renderHost(HoverCardHost);
      r.instance.closeDelay.set(300);
      r.instance.isOpen.set(true);
      await r.flush();
      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);

      vi.useFakeTimers();
      card.hide();

      vi.advanceTimersByTime(299);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(true);

      vi.advanceTimersByTime(1);
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('show() is a no-op while disabled', async () => {
      const r = renderHost(HoverCardHost);
      r.instance.isDisabled.set(true);
      await r.flush();
      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);

      vi.useFakeTimers();
      card.show();
      vi.advanceTimersByTime(2000);
      r.fixture.detectChanges();

      expect(r.instance.isOpen()).toBe(false);
    });

    it('show() is a no-op while an ancestor is scrolling', async () => {
      const r = renderHost(HoverCardHost);
      await r.flush();
      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);

      vi.useFakeTimers();
      document.dispatchEvent(new Event('scroll'));
      card.show();
      r.fixture.detectChanges();
      expect(r.instance.isOpen()).toBe(false);
    });

    it('reflects show() / hide() through data-state without Zone.js', async () => {
      const r = renderHost(HoverCardHost);
      await r.flush();
      const card = r.fixture.debugElement
        .query(By.directive(ForHoverCard))
        .injector.get(ForHoverCard);
      const trigger = r.query<HTMLAnchorElement>('a')!;
      expect(trigger.getAttribute('data-state')).toBe('closed');

      card.show();
      await r.flush();
      expect(trigger.getAttribute('data-state')).toBe('open');

      card.hide();
      await r.flush();
      expect(trigger.getAttribute('data-state')).toBe('closed');
    });
  });

  describe('zoneless reactivity', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('reflects open state changes after detectChanges without Zone.js', async () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      expect(trigger.getAttribute('data-state')).toBe('closed');

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      await flush();
      vi.advanceTimersByTime(0);
      await flush();

      expect(trigger.getAttribute('data-state')).toBe('open');
    });
  });

  describe('explicit root reference (stamped templates)', () => {
    @Component({
      imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent, NgTemplateOutlet],
      template: `
        <ng-template #trig let-root="root">
          <a id="trigger" [forHoverCardTrigger]="root" href="/x">Trigger</a>
        </ng-template>

        <span forHoverCard [(open)]="open" [openDelay]="0" [closeDelay]="0" #root="forHoverCard">
          <ng-container [ngTemplateOutlet]="trig" [ngTemplateOutletContext]="{ root }" />
          @if (root.open()) {
            <div forHoverCardContent>Content</div>
          }
        </span>
      `,
    })
    class StampedHost {
      readonly open = signal(false);
    }

    it('open state stays reactive without zone.js through the explicit reference', async () => {
      const { instance, query, flush } = renderHost(StampedHost);
      await flush();
      const trigger = query<HTMLAnchorElement>('#trigger')!;

      expect(trigger.getAttribute('data-state')).toBe('closed');

      instance.open.set(true);
      await flush();
      expect(trigger.getAttribute('data-state')).toBe('open');
      expect(document.querySelector('[forHoverCardContent]')).not.toBeNull();

      instance.open.set(false);
      await flush();
      expect(trigger.getAttribute('data-state')).toBe('closed');
      expect(document.querySelector('[forHoverCardContent]')).toBeNull();
    });

    describe('hover activation', () => {
      beforeEach(() => {
        vi.useFakeTimers();
      });
      afterEach(() => {
        vi.useRealTimers();
      });

      it('opens on pointerenter when the root is passed explicitly', async () => {
        const { fixture, query, flush } = renderHost(StampedHost);
        await flush();
        const trigger = query<HTMLAnchorElement>('#trigger')!;

        trigger.dispatchEvent(pointerEvent('pointerenter'));
        await flush();
        vi.advanceTimersByTime(0);
        await flush();

        expect(fixture.componentInstance.open()).toBe(true);
        expect(trigger.getAttribute('data-state')).toBe('open');
      });
    });
  });
});
