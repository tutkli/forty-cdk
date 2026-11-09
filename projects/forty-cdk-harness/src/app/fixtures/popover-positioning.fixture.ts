import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';
import { queryFlag } from './_query-flag';

/**
 * Two popovers whose positioning options only a real layout can exercise: one requesting
 * `side="top"` from a trigger flush against the top of the viewport (`?noCollisions=1` turns
 * `avoidCollisions` off), and one anchored inside a scroll container its trigger can be scrolled
 * out of (`?detach=1` turns `hideWhenDetached` on).
 */
@Component({
  selector: 'app-popover-positioning-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  styles: [
    `
      :host {
        display: block;
      }
      [forPopoverContent] {
        width: 120px;
        height: 60px;
        background: white;
        border: 1px solid #ccc;
      }
    `,
  ],
  template: `
    <div
      forPopover
      [(open)]="topOpen"
      ariaLabel="Top popover"
      side="top"
      [avoidCollisions]="avoidCollisions"
    >
      <button data-testid="top-trigger" forPopoverTrigger>Open top popover</button>
      @if (topOpen()) {
        <div forPopoverContent data-testid="top-popover">Top</div>
      }
    </div>

    <div
      data-testid="scroller"
      style="height: 160px; margin-top: 240px; overflow: auto; border: 1px solid #ccc"
    >
      <div style="height: 40px"></div>
      <div
        forPopover
        [(open)]="scrolledOpen"
        ariaLabel="Scrolled popover"
        [hideWhenDetached]="hideWhenDetached"
      >
        <button data-testid="scrolled-trigger" forPopoverTrigger>Open scrolled popover</button>
        @if (scrolledOpen()) {
          <div forPopoverContent data-testid="scrolled-popover">Scrolled</div>
        }
      </div>
      <div style="height: 1200px"></div>
    </div>
  `,
})
export class PopoverPositioningFixture {
  protected readonly topOpen = signal(false);
  protected readonly scrolledOpen = signal(false);

  protected readonly avoidCollisions = !queryFlag('noCollisions');
  protected readonly hideWhenDetached = queryFlag('detach');
}
