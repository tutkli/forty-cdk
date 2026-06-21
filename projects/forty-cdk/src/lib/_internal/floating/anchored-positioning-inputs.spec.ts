import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ForHoverCard } from '../../hover-card/hover-card';
import { ForPopover } from '../../popover/popover';
import { ForTooltip } from '../../tooltip/tooltip';
import { ANCHORED_POSITIONING_DEFAULTS } from './anchored-positioning-inputs';

@Component({
  imports: [ForPopover, ForTooltip, ForHoverCard],
  template: `
    <div forPopover></div>
    <div forTooltip></div>
    <div forHoverCard></div>
  `,
})
class PositioningHost {}

/**
 * Drift guard (issue #962): NG8110 stops the three trigger-anchored overlay
 * roots from declaring their positioning inputs through a shared factory, so
 * each declares them inline. This asserts the inputs they share keep identical
 * default values — the place the audit found copy-paste drift. The non-seed
 * defaults come from the single `ANCHORED_POSITIONING_DEFAULTS` source; the
 * seeds (`side`, `align`, `sideOffset`, `collisionPadding`) come from each
 * root's defaults provider, where only `side` legitimately varies (popover
 * `'bottom'`, tooltip / hover-card `'top'`).
 */
describe('anchored positioning inputs drift guard', () => {
  function setup(): { popover: ForPopover; tooltip: ForTooltip; hoverCard: ForHoverCard } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(PositioningHost);
    fixture.detectChanges();
    const popover = fixture.debugElement.query(By.directive(ForPopover)).injector.get(ForPopover);
    const tooltip = fixture.debugElement.query(By.directive(ForTooltip)).injector.get(ForTooltip);
    const hoverCard = fixture.debugElement
      .query(By.directive(ForHoverCard))
      .injector.get(ForHoverCard);
    return { popover, tooltip, hoverCard };
  }

  it('keeps the non-seed positioning defaults identical across the three roots', () => {
    const { popover, tooltip, hoverCard } = setup();

    for (const root of [popover, tooltip, hoverCard]) {
      expect(root.alignOffset()).toBe(ANCHORED_POSITIONING_DEFAULTS.alignOffset);
      expect(root.avoidCollisions()).toBe(ANCHORED_POSITIONING_DEFAULTS.avoidCollisions);
      expect(root.arrowPadding()).toBe(ANCHORED_POSITIONING_DEFAULTS.arrowPadding);
      expect(root.sticky()).toBe(ANCHORED_POSITIONING_DEFAULTS.sticky);
      expect(root.hideWhenDetached()).toBe(ANCHORED_POSITIONING_DEFAULTS.hideWhenDetached);
      expect(root.clipUntilPositioned()).toBe(ANCHORED_POSITIONING_DEFAULTS.clipUntilPositioned);
    }
  });

  it('shares the seed `align` / `sideOffset` / `collisionPadding` defaults, with only `side` varying', () => {
    const { popover, tooltip, hoverCard } = setup();

    for (const root of [popover, tooltip, hoverCard]) {
      expect(root.align()).toBe('center');
      expect(root.sideOffset()).toBe(8);
      expect(root.collisionPadding()).toBe(8);
    }

    expect(popover.side()).toBe('bottom');
    expect(tooltip.side()).toBe('top');
    expect(hoverCard.side()).toBe('top');
  });
});
