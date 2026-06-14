import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
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
        transition: opacity 250ms ease-out;
        background: #fff;
        border: 1px solid #ccc;
        padding: 8px;
      }
      [data-testid='popover-anim'].popover-leaving {
        opacity: 0;
      }
    `,
  ],
  template: `
    <div forPopover [(open)]="open" ariaLabel="Animated popover">
      <button data-testid="trigger-anim" forPopoverTrigger>Open</button>
      @if (open()) {
        <div forPopoverContent data-testid="popover-anim" animate.leave="popover-leaving">
          <button data-testid="first-anim">First</button>
          <button data-testid="close-anim" forPopoverClose>Close</button>
        </div>
      }
    </div>
  `,
})
export class PopoverAnimationFixture {
  protected readonly open = signal(false);
}
