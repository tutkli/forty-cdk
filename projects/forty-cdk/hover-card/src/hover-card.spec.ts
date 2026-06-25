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

    it('honors a consumer programmatic [(open)] write while disabled', () => {
      const { fixture, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isDisabled.set(true);
      flush();

      // `open` is a stock `model()` (like Popover) — the consumer owns it.
      // `disabled` gates the directive's own hover/focus interaction and
      // force-closes only when it flips to true, but it never fights an
      // explicit consumer write through [(open)].
      fixture.componentInstance.isOpen.set(true);
      flush();
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

    it('stays open with closeDelay:0 when the pointer leaves the trigger into overlapping content', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      // Overlapping content: the browser fires pointerleave on the covered
      // trigger with relatedTarget = the content element.
      trigger.dispatchEvent(pointerEvent('pointerleave', content));
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('still closes with closeDelay:0 when the pointer leaves the trigger to an unrelated element', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
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

    it('does not close on pointerleave while the trigger is still focused', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(new FocusEvent('focus'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
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

    it('does not close on blur while the pointer is still over the trigger', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(new FocusEvent('blur'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
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

    it('closes when Escape is pressed while focus is on an unrelated element', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      // The card was hover-opened; focus never entered the trigger or the
      // content. Escape dispatched on an unrelated element still routes
      // through the document-level dismissable layer and closes the card.
      pressKey(document, 'Escape');
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('dismisses only once (no double-close) when Escape is pressed inside the content', () => {
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
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(transitions).toEqual([true]);

      const content = document.body.querySelector<HTMLElement>('[forHoverCardContent]')!;
      pressKey(content, 'Escape');
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      // Exactly one close transition — the content's host listener was
      // removed, so the document-level layer is the only Escape path.
      expect(transitions).toEqual([true, false]);
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

  describe('(openChange) output', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('emits both true AND false in the uncontrolled (observe-only) case', () => {
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
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      // Without any [(open)] binding the closing transition must still emit —
      // the bug was that the hand-rolled bridge dropped the false emit here.
      expect(emitted).toEqual([true, false]);
    });
  });

  describe('arrow', () => {
    it('is hidden from the a11y tree and exposes the data-hover-card-arrow hook', () => {
      const { fixture, query, flush } = renderHost(HoverCardWithArrowHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
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

    it('is callable with no arguments to establish a fresh coordinator scope', () => {
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
      flush();

      const trigger = query<HTMLAnchorElement>('a')!;
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

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

    it('closes an open card when an ancestor scrolls', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(1);

      document.dispatchEvent(new Event('scroll'));
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(false);
      expect(document.body.querySelectorAll('[forHoverCardContent]').length).toBe(0);
    });

    it('suppresses a hover open while an ancestor is scrolling, even with openDelay 0', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      vi.advanceTimersByTime(200);
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('suppresses the instant re-open during scroll within the skip-delay window', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      vi.advanceTimersByTime(0);
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });

    it('does not suppress a focus open while an ancestor is scrolling', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      document.dispatchEvent(new Event('scroll'));
      trigger.dispatchEvent(new FocusEvent('focus'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      expect(fixture.componentInstance.isOpen()).toBe(true);
    });

    it('reflects the scroll close through data-state without Zone.js', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      fixture.componentInstance.isOpen.set(true);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;
      expect(trigger.getAttribute('data-state')).toBe('open');

      document.dispatchEvent(new Event('scroll'));
      flush();

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

      it('opens on pointerenter when the root is passed explicitly', () => {
        const { fixture, query, flush } = renderHost(StampedHost);
        flush();
        const trigger = query<HTMLAnchorElement>('#trigger')!;

        trigger.dispatchEvent(pointerEvent('pointerenter'));
        flush();
        vi.advanceTimersByTime(0);
        flush();

        expect(fixture.componentInstance.open()).toBe(true);
        expect(trigger.getAttribute('data-state')).toBe('open');
      });
    });
  });
});
