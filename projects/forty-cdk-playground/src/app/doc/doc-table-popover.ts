import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverContent,
  ForPopoverTrigger,
} from 'forty-cdk/popover';

import { Icon } from '../ui/icon';

@Component({
  selector: 'doc-table-popover',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent, ForPopoverArrow, Icon],
  template: `
    <div
      forPopover
      #pop="forPopover"
      side="bottom"
      align="end"
      initialFocus="container"
      [class]="hostClass()"
      [ariaLabel]="ariaLabel()"
    >
      <ng-content select="[popoverTriggerContent]" />
      <button
        forPopoverTrigger
        type="button"
        class="api-info"
        [attr.data-detail]="detail()"
        [attr.aria-label]="triggerLabel()"
      >
        <app-icon name="information-circle" />
      </button>

      @if (pop.open()) {
        <div forPopoverContent class="api-pop" animate.enter="api-pop-enter">
          <ng-content select="[popoverPanel]" />
          <span forPopoverArrow class="api-pop-arrow"></span>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
})
export class DocTablePopover {
  readonly hostClass = input.required<string>();
  readonly ariaLabel = input.required<string>();
  readonly triggerLabel = input.required<string>();
  readonly detail = input<boolean | null>(null);
}
