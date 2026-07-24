import { Component, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ForHoverCard } from 'forty-cdk/hover-card';
import { ForPopover } from 'forty-cdk/popover';
import { ForTooltip } from 'forty-cdk/tooltip';

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
 * Drift guard (issues #962, #1391): the three trigger-anchored overlay roots
 * now single-source their positioning inputs by extending the shared
 * `AnchoredOverlayPositioningBase` class, rather than each declaring the block
 * inline against `ANCHORED_POSITIONING_DEFAULTS` plus this guard (the earlier
 * NG8110 workaround, before inheritance was applied). This still asserts the
 * inputs they share keep identical default values — a cheap guard against a
 * root shadowing an inherited input with a divergent default, or a future 4th
 * overlay diverging. The non-seed defaults come from the single
 * `ANCHORED_POSITIONING_DEFAULTS` source; the seeds (`side`, `align`,
 * `sideOffset`, `collisionPadding`) come from each root's defaults provider,
 * where only `side` legitimately varies (popover `'bottom'`, tooltip /
 * hover-card `'top'`).
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

@Component({
  imports: [ForTooltip],
  template: `
    <div
      forTooltip
      side="left"
      [sideOffset]="20"
      [collisionPadding]="24"
      [avoidCollisions]="false"
      [hideWhenDetached]="true"
      [clipUntilPositioned]="false"
    ></div>
  `,
})
class InheritedInputsHost {}

/**
 * Proves the positioning inputs declared on `AnchoredOverlayPositioningBase`
 * actually bind through the base on a concrete root: alias (`side` /
 * `sideOffset` / `collisionPadding`), transform (`numberAttribute` /
 * `booleanAttribute`), and inheritance all survive the compile.
 */
describe('anchored positioning inputs inherited from the base', () => {
  it('binds the inherited positioning inputs through the base on a forTooltip host', () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection()],
    });
    const fixture = TestBed.createComponent(InheritedInputsHost);
    fixture.detectChanges();
    const tooltip = fixture.debugElement.query(By.directive(ForTooltip)).injector.get(ForTooltip);

    expect(tooltip.side()).toBe('left');
    expect(tooltip.sideOffset()).toBe(20);
    expect(tooltip.collisionPadding()).toBe(24);
    expect(tooltip.avoidCollisions()).toBe(false);
    expect(tooltip.hideWhenDetached()).toBe(true);
    expect(tooltip.clipUntilPositioned()).toBe(false);
  });
});
