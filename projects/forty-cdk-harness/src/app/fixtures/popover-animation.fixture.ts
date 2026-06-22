import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ForPopover, ForPopoverClose, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk';

@Component({
  selector: 'app-popover-animation-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverClose],
  styles: [
    `
      [data-testid='popover-anim'] {
        opacity: 1;
        transition:
          opacity 250ms ease-out,
          scale 250ms ease-out;
        transform-origin: var(--for-content-transform-origin, center);
        background: #fff;
        border: 1px solid #ccc;
        padding: 8px;
      }
      [data-testid='popover-anim'].popover-leaving {
        opacity: 0;
      }
      [data-testid='popover-anim'].leave-scale.popover-leaving {
        scale: 0.5;
      }
    `,
  ],
  template: `
    <div forPopover [(open)]="open" ariaLabel="Animated popover">
      <button data-testid="trigger-anim" forPopoverTrigger>Open</button>
      @if (open()) {
        <div
          forPopoverContent
          data-testid="popover-anim"
          animate.leave="popover-leaving"
          [class.leave-scale]="leaveScale"
        >
          <button data-testid="first-anim">First</button>
          <button data-testid="close-anim" forPopoverClose>Close</button>
        </div>
      }
    </div>
  `,
})
export class PopoverAnimationFixture {
  readonly #route = inject(ActivatedRoute);
  protected readonly open = signal(false);
  protected readonly leaveScale = this.#route.snapshot.queryParamMap.get('leave') === 'scale';
}
