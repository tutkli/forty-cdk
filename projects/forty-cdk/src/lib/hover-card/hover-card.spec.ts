import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { renderHost } from '../../test-utils/render';
import { ForHoverCard } from './hover-card';
import { ForHoverCardContent } from './hover-card-content';
import { ForHoverCardTrigger } from './hover-card-trigger';
import { provideHoverCardDefaults } from './hover-card-defaults';

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
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('open / close lifecycle', () => {
    it('opens after the open delay on pointerenter and closes after the close delay on pointerleave', () => {
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

    it('is forced closed when disabled', () => {
      const { fixture, query, flush } = renderHost(HoverCardHost);
      flush();
      const trigger = query<HTMLAnchorElement>('a')!;

      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(true);

      fixture.componentInstance.isDisabled.set(true);
      flush();
      // disabled does not auto-close — but a subsequent enter is ignored.
      trigger.dispatchEvent(pointerEvent('pointerleave'));
      flush();
      vi.advanceTimersByTime(0);
      flush();

      // Reopen attempt while disabled is no-op.
      trigger.dispatchEvent(pointerEvent('pointerenter'));
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
    });
  });

  describe('content interaction', () => {
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

      trigger.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
      flush();
      expect(fixture.componentInstance.isOpen()).toBe(false);
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
    it('opens instantly during the skip-delay window after a peer card closed', () => {
      @Component({
        imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
        providers: [provideHoverCardDefaults({ openDelay: 500, skipDelayDuration: 500 })],
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

  describe('zoneless reactivity', () => {
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
