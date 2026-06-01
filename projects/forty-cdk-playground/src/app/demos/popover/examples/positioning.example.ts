import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  ForPopover,
  ForPopoverArrow,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

type StickyOption = 'partial' | 'always';

@Component({
  selector: 'app-popover-positioning-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverArrow,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Positioning & collisions"
      subtitle="floating-ui keeps the surface in view. sideOffset and alignOffset nudge it along the two axes; collisionPadding reserves a margin from the viewport edge before flip / shift kick in. The trigger sits in a tight, scrollable frame so the popover has to react — turn off avoidCollisions to let it overflow, or set sticky to always to pin the requested side even off-screen."
      sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/positioning.example.ts"
    >
      <div demo class="positioning-demo">
        <div class="positioning-frame">
          <div
            forPopover
            [(open)]="open"
            [side]="side()"
            [align]="align()"
            [sideOffset]="sideOffset()"
            [alignOffset]="alignOffset()"
            [collisionPadding]="collisionPadding()"
            [avoidCollisions]="avoidCollisions()"
            [sticky]="sticky()"
          >
            <button forPopoverTrigger class="pg-btn pg-btn--primary">Anchor</button>
            @if (open()) {
              <div forPopoverContent class="pg-popover" animate.enter="pg-pop-in">
                <h3 forPopoverTitle class="pg-popover-title">Positioned surface</h3>
                <p forPopoverDescription class="pg-popover-desc">
                  Scroll the frame or change the side to see flip and shift respond.
                </p>
                <span forPopoverArrow class="pg-float-arrow"></span>
              </div>
            }
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-select label="side" [options]="sideOptions" [(value)]="side" />
        <app-control-select label="align" [options]="alignOptions" [(value)]="align" />
        <app-control-select
          label="sideOffset"
          hint="Gap in pixels between the trigger and the surface along the side axis (perpendicular to the chosen side)."
          [options]="offsetOptions"
          [(value)]="sideOffsetValue"
        />
        <app-control-select
          label="alignOffset"
          hint="Shift in pixels along the cross axis (parallel to the chosen side), letting the surface slide toward start or end."
          [options]="alignOffsetOptions"
          [(value)]="alignOffsetValue"
        />
        <app-control-select
          label="collisionPadding"
          hint="Minimum gap in pixels the surface keeps from the viewport edge before flip and shift reposition it."
          [options]="paddingOptions"
          [(value)]="collisionPaddingValue"
        />
        <app-control-select
          label="sticky"
          hint="partial lets shift slide the surface to stay visible; always disables shift so it keeps the requested side even when it goes off-screen."
          [options]="stickyOptions"
          [(value)]="sticky"
        />
        <app-control-switch
          label="avoidCollisions"
          hint="When on, flip and shift keep the surface inside the viewport. Turn off for strict placement where overflow is acceptable."
          [(checked)]="avoidCollisions"
        />

        <p class="pg-state">
          open: <b>{{ open() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .positioning-demo {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0;
    }

    .positioning-frame {
      display: flex;
      align-items: center;
      justify-content: center;
      width: min(220px, 100%);
      height: 160px;
      overflow: auto;
      border: 1px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
    }
  `,
})
export class PopoverPositioningExample {
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

  protected readonly offsetOptions: readonly ControlOption[] = [
    { value: '0', label: '0 px' },
    { value: '8', label: '8 px' },
    { value: '16', label: '16 px' },
    { value: '24', label: '24 px' },
  ];

  protected readonly alignOffsetOptions: readonly ControlOption[] = [
    { value: '0', label: '0 px' },
    { value: '12', label: '12 px' },
    { value: '24', label: '24 px' },
  ];

  protected readonly paddingOptions: readonly ControlOption[] = [
    { value: '0', label: '0 px' },
    { value: '8', label: '8 px' },
    { value: '24', label: '24 px' },
  ];

  protected readonly stickyOptions: readonly ControlOption<StickyOption>[] = [
    { value: 'partial', label: 'partial' },
    { value: 'always', label: 'always' },
  ];

  protected readonly open = signal(false);
  protected readonly side = signal<'top' | 'right' | 'bottom' | 'left'>('bottom');
  protected readonly align = signal<'start' | 'center' | 'end'>('center');
  protected readonly avoidCollisions = signal(true);
  protected readonly sticky = signal<StickyOption>('partial');

  protected readonly sideOffsetValue = signal('8');
  protected readonly sideOffset = computed(() => Number(this.sideOffsetValue()));

  protected readonly alignOffsetValue = signal('0');
  protected readonly alignOffset = computed(() => Number(this.alignOffsetValue()));

  protected readonly collisionPaddingValue = signal('8');
  protected readonly collisionPadding = computed(() => Number(this.collisionPaddingValue()));
}
