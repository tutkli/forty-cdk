import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

@Component({
  selector: 'app-popover-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Popover"
      summary="A non-modal floating panel anchored to its trigger by floating-ui. It dismisses on Escape, pointer-down outside and focus outside, then returns focus to the trigger. The surface is portaled to <body>, so its styles live in styles.css."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/"
    >
      <div demo class="pop-demo">
        <div
          forPopover
          [(open)]="open"
          [side]="side()"
          [align]="align()"
          [initialFocus]="initialFocus()"
          [dismissible]="dismissible()"
          [disabled]="disabled()"
          (escapeKeyDown)="lastDismiss.set('escape')"
          (pointerDownOutside)="lastDismiss.set('pointer-outside')"
          (focusOutside)="lastDismiss.set('focus-outside')"
        >
          <button forPopoverTrigger class="pg-btn pg-btn--primary">Display settings</button>
          @if (open()) {
            <div forPopoverContent class="pg-popover" animate.enter="pg-pop-in">
              <h3 forPopoverTitle class="pg-popover-title">Display</h3>
              <p forPopoverDescription class="pg-popover-desc">
                Pointer-down outside, focus outside or Escape closes it — unless you turn off
                dismissible.
              </p>
              <div class="pg-popover-actions">
                <button class="pg-btn" type="button" forPopoverClose>Done</button>
              </div>
              <span forPopoverArrow class="pg-float-arrow"></span>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="side" [options]="sideOptions" [(value)]="sideValue" />
        <app-control-select label="align" [options]="alignOptions" [(value)]="alignValue" />
        <app-control-select label="initialFocus" [options]="focusOptions" [(value)]="focusValue" />
        <app-control-switch label="dismissible" [(checked)]="dismissible" />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ open() }}</b
          ><br />
          last dismiss: <b>{{ lastDismiss() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .pop-demo {
      text-align: center;
    }
  `,
})
export class PopoverDemo {
  protected readonly sideOptions: readonly ControlOption[] = [
    { value: 'top', label: 'top' },
    { value: 'right', label: 'right' },
    { value: 'bottom', label: 'bottom' },
    { value: 'left', label: 'left' },
  ];

  protected readonly alignOptions: readonly ControlOption[] = [
    { value: 'start', label: 'start' },
    { value: 'center', label: 'center' },
    { value: 'end', label: 'end' },
  ];

  protected readonly focusOptions: readonly ControlOption[] = [
    { value: 'first', label: 'first' },
    { value: 'container', label: 'container' },
  ];

  protected readonly open = signal(false);
  protected readonly dismissible = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastDismiss = signal('—');

  protected readonly sideValue = signal('bottom');
  protected readonly side = computed<'top' | 'right' | 'bottom' | 'left'>(() => {
    const value = this.sideValue();
    return value === 'top' || value === 'right' || value === 'left' ? value : 'bottom';
  });

  protected readonly alignValue = signal('center');
  protected readonly align = computed<'start' | 'center' | 'end'>(() => {
    const value = this.alignValue();
    return value === 'start' || value === 'end' ? value : 'center';
  });

  protected readonly focusValue = signal('first');
  protected readonly initialFocus = computed<'first' | 'container'>(() =>
    this.focusValue() === 'container' ? 'container' : 'first',
  );
}
