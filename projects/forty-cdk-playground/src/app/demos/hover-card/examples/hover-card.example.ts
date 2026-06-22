import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForHoverCard,
  ForHoverCardArrow,
  ForHoverCardContent,
  ForHoverCardTrigger,
} from 'forty-cdk/hover-card';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-hover-card-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForHoverCard,
    ForHoverCardTrigger,
    ForHoverCardContent,
    ForHoverCardArrow,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Interactive preview card"
      subtitle="A rich preview that opens when the pointer rests on the trigger and stays open while the pointer is inside the card, so its content can be interactive. Keyboard focus opens it too and Escape closes it. The card is portaled to <body>."
      sourcePath="projects/forty-cdk-playground/src/app/demos/hover-card/examples/hover-card.example.ts"
    >
      <div demo class="hc-demo">
        <p class="hc-lead">
          Article by
          <span
            forHoverCard
            [(open)]="open"
            [side]="side()"
            [align]="align()"
            [openDelay]="openDelay()"
            [closeDelay]="closeDelay()"
            [disabled]="disabled()"
          >
            <a forHoverCardTrigger class="hc-trigger" href="#ada">&#64;ada</a>
            @if (open()) {
              <div forHoverCardContent class="pg-hovercard" animate.enter="pg-pop-in">
                <div class="pg-hovercard-head">
                  <span class="pg-hovercard-avatar" aria-hidden="true">AL</span>
                  <div class="pg-hovercard-id">
                    <strong>Ada Lovelace</strong>
                    <span class="pg-hovercard-handle">&#64;ada</span>
                  </div>
                </div>
                <p class="pg-hovercard-bio">
                  Mathematician and writer — wrote the first algorithm intended for a machine.
                </p>
                <div class="pg-hovercard-stats">
                  <span><b>128</b> notes</span>
                  <span><b>1.8k</b> followers</span>
                </div>
                <button class="pg-btn pg-btn--primary pg-hovercard-follow" type="button">
                  Follow
                </button>
                <span forHoverCardArrow class="pg-float-arrow"></span>
              </div>
            }
          </span>
          on the analytical engine.
        </p>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="side"
          hint="Which side of the trigger the card is anchored to. It flips to the opposite side automatically when there isn't room in the viewport."
          [options]="sideOptions"
          [(value)]="side"
        />
        <app-control-select
          label="align"
          hint="How the card aligns along the chosen side: start, center, or end of the trigger's edge."
          [options]="alignOptions"
          [(value)]="align"
        />
        <app-control-select
          label="openDelay"
          hint="Milliseconds to wait after hover or focus before the card opens."
          [options]="delayOptions"
          [(value)]="openDelayValue"
        />
        <app-control-select
          label="closeDelay"
          hint="Milliseconds to wait after the pointer leaves or blurs before the card closes. Pressing Escape closes it immediately, ignoring this delay."
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
    .hc-demo {
      max-width: 32ch;
      text-align: center;
    }

    .hc-lead {
      margin: 0;
      font-size: 1.05rem;
      line-height: 1.7;
      color: var(--pg-text-muted);
    }

    .hc-trigger {
      font-weight: 600;
      color: var(--pg-primary);
      text-decoration: none;
    }

    .hc-trigger:hover {
      text-decoration: underline;
    }
  `,
})
export class HoverCardExample {
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

  protected readonly delayOptions: readonly ControlOption<'0' | '300' | '700'>[] = [
    { value: '0', label: '0 ms' },
    { value: '300', label: '300 ms' },
    { value: '700', label: '700 ms' },
  ];

  protected readonly open = signal(false);
  protected readonly disabled = signal(false);

  protected readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('top');
  protected readonly align = signal<'start' | 'center' | 'end'>('center');

  protected readonly openDelayValue = signal<'0' | '300' | '700'>('300');
  protected readonly openDelay = computed(() => Number(this.openDelayValue()));

  protected readonly closeDelayValue = signal<'0' | '300' | '700'>('300');
  protected readonly closeDelay = computed(() => Number(this.closeDelayValue()));
}
