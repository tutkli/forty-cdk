import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-popover-example',
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
      title="Anchored panel & dismiss"
      subtitle="A non-modal floating panel anchored to its trigger by floating-ui. It dismisses on Escape, pointer-down outside and focus outside, then returns focus to the trigger. The surface is portaled to <body>, so its styles live in styles.css."
      sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/popover.example.ts"
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
        <app-control-select label="side" [options]="sideOptions" [(value)]="side" />
        <app-control-select label="align" [options]="alignOptions" [(value)]="align" />
        <app-control-select
          label="initialFocus"
          [options]="focusOptions"
          [(value)]="initialFocus"
        />
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
export class PopoverExample {
  protected readonly sideOptions: readonly ControlOption<'top' | 'right' | 'bottom' | 'left'>[] = [
    { value: 'top', label: 'top' },
    { value: 'right', label: 'right' },
    { value: 'bottom', label: 'bottom' },
    { value: 'left', label: 'left' },
  ];

  protected readonly alignOptions: readonly ControlOption<'start' | 'center' | 'end'>[] = [
    { value: 'start', label: 'start' },
    { value: 'center', label: 'center' },
    { value: 'end', label: 'end' },
  ];

  protected readonly focusOptions: readonly ControlOption<'first' | 'container'>[] = [
    { value: 'first', label: 'first' },
    { value: 'container', label: 'container' },
  ];

  protected readonly open = signal(false);
  protected readonly dismissible = signal(true);
  protected readonly disabled = signal(false);
  protected readonly lastDismiss = signal('—');

  protected readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('bottom');
  protected readonly align = signal<'start' | 'center' | 'end'>('center');
  protected readonly initialFocus = signal<'first' | 'container'>('first');
}
