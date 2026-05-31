import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForTooltip, ForTooltipArrow, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';
import { Icon } from '../ui/icon';

@Component({
  selector: 'app-tooltip-demo',
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
      title="Tooltip"
      summary="A short label shown on hover or focus and hidden on leave, blur or Escape. It never steals focus and its content is pointer-events: none, so the pointer falls through. The bubble is portaled to <body>."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/"
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
        <app-control-select label="side" [options]="sideOptions" [(value)]="sideValue" />
        <app-control-select label="align" [options]="alignOptions" [(value)]="alignValue" />
        <app-control-select label="openDelay" [options]="delayOptions" [(value)]="openDelayValue" />
        <app-control-select
          label="closeDelay"
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
export class TooltipDemo {
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

  protected readonly delayOptions: readonly ControlOption[] = [
    { value: '0', label: '0 ms' },
    { value: '200', label: '200 ms' },
    { value: '700', label: '700 ms' },
  ];

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);

  protected readonly sideValue = signal('top');
  protected readonly side = computed<'top' | 'right' | 'bottom' | 'left'>(() => {
    const value = this.sideValue();
    return value === 'right' || value === 'bottom' || value === 'left' ? value : 'top';
  });

  protected readonly alignValue = signal('center');
  protected readonly align = computed<'start' | 'center' | 'end'>(() => {
    const value = this.alignValue();
    return value === 'start' || value === 'end' ? value : 'center';
  });

  protected readonly openDelayValue = signal('200');
  protected readonly openDelay = computed(() => Number(this.openDelayValue()));

  protected readonly closeDelayValue = signal('0');
  protected readonly closeDelay = computed(() => Number(this.closeDelayValue()));
}
