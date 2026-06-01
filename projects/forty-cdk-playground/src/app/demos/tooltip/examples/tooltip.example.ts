import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForTooltip, ForTooltipArrow, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-tooltip-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTooltip,
    ForTooltipTrigger,
    ForTooltipContent,
    ForTooltipArrow,
    ControlSelect,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Hover & focus trigger"
      subtitle="A short label shown on hover or focus and hidden on leave, blur or Escape. It never steals focus and its content is pointer-events: none, so the pointer falls through. The bubble is portaled to <body>."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tooltip/examples/tooltip.example.ts"
    >
      <div demo class="tt-demo">
        <span
          forTooltip
          [(open)]="open"
          [side]="side()"
          [align]="align()"
          [openDelay]="openDelay()"
          [closeDelay]="closeDelay()"
          [disabled]="disabled()"
        >
          <button forTooltipTrigger type="button" class="pg-btn tt-trigger" aria-label="More info">
            <app-icon name="information-circle" />
          </button>
          @if (open()) {
            <div forTooltipContent class="pg-tooltip" animate.enter="pg-pop-in">
              Appears on hover or focus
              <span forTooltipArrow class="pg-tooltip-arrow"></span>
            </div>
          }
        </span>

        <p class="pg-hint">Hover the button, or Tab to it — focus opens the tooltip too.</p>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="side"
          hint="Which side of the trigger the bubble is anchored to. It flips to the opposite side automatically when there isn't room in the viewport."
          [options]="sideOptions"
          [(value)]="side"
        />
        <app-control-select
          label="align"
          hint="Alignment along the chosen side: start, center or end. Defaults to center."
          [options]="alignOptions"
          [(value)]="align"
        />
        <app-control-select
          label="openDelay"
          hint="Milliseconds to wait after hover or focus before the tooltip opens."
          [options]="delayOptions"
          [(value)]="openDelayValue"
        />
        <app-control-select
          label="closeDelay"
          hint="Milliseconds to wait after the pointer leaves or blurs before the tooltip closes. Pressing Escape closes it immediately, ignoring this delay."
          [options]="delayOptions"
          [(value)]="closeDelayValue"
        />
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ open() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tt-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.1rem;
    }

    .tt-trigger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.5rem;
      color: var(--pg-text);
    }

    .tt-trigger app-icon {
      width: 18px;
      height: 18px;
    }
  `,
})
export class TooltipExample {
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

  protected readonly delayOptions: readonly ControlOption<'0' | '200' | '700'>[] = [
    { value: '0', label: '0 ms' },
    { value: '200', label: '200 ms' },
    { value: '700', label: '700 ms' },
  ];

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);

  protected readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('top');
  protected readonly align = signal<'start' | 'center' | 'end'>('center');

  protected readonly openDelayValue = signal<'0' | '200' | '700'>('200');
  protected readonly openDelay = computed(() => Number(this.openDelayValue()));

  protected readonly closeDelayValue = signal<'0' | '200' | '700'>('0');
  protected readonly closeDelay = computed(() => Number(this.closeDelayValue()));
}
