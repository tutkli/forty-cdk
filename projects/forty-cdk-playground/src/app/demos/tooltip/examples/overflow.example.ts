import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForTooltip, ForTooltipArrow, ForTooltipContent, ForTooltipTrigger } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-tooltip-overflow-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTooltip,
    ForTooltipTrigger,
    ForTooltipContent,
    ForTooltipArrow,
    ControlSelect,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Overflow-only & hoverable content"
      subtitle="With showOnOverflow the tooltip opens only when the trigger's own text is actually truncated — perfect for table cells that may or may not fit. With hoverableContent the bubble keeps pointer-events, so the pointer can rest on it (to read or select long text) without dismissing. The root also reflects data-reduced-motion for animation opt-outs."
      sourcePath="projects/forty-cdk-playground/src/app/demos/tooltip/examples/overflow.example.ts"
    >
      <div demo class="tt-demo">
        <span
          forTooltip
          [(open)]="open"
          [showOnOverflow]="true"
          [hoverableContent]="hoverable()"
          side="top"
        >
          <button forTooltipTrigger type="button" class="trunc">{{ label() }}</button>
          @if (open()) {
            <div forTooltipContent class="pg-tooltip" animate.enter="pg-pop-in">
              {{ label() }}
              <span forTooltipArrow class="pg-tooltip-arrow"></span>
            </div>
          }
        </span>

        <p class="pg-hint">
          Hover the chip. The short label fits, so no tooltip opens; the long one is clipped, so the
          full text appears.
        </p>
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="Label"
          hint="Switch between a label that fits the chip and one that overflows it."
          [options]="labelOptions"
          [(value)]="length"
        />
        <app-control-switch
          label="hoverableContent"
          hint="Keep the bubble interactive so the pointer can move onto it without closing the tooltip."
          [(checked)]="hoverable"
        />

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

    .trunc {
      display: block;
      max-width: 170px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font: inherit;
      font-weight: 600;
      padding: 0.5rem 0.9rem;
      color: var(--pg-text);
      background: var(--pg-surface);
      border: 1px solid var(--pg-border-strong);
      border-radius: var(--pg-radius-sm);
      cursor: default;
    }
  `,
})
export class TooltipOverflowExample {
  protected readonly open = signal(false);
  protected readonly hoverable = signal(false);
  protected readonly length = signal<'short' | 'long'>('long');

  protected readonly labelOptions: readonly ControlOption<'short' | 'long'>[] = [
    { value: 'short', label: 'Short (fits)' },
    { value: 'long', label: 'Long (overflows)' },
  ];

  protected readonly label = computed(() =>
    this.length() === 'short'
      ? 'README.md'
      : 'projects/forty-cdk/src/lib/file-upload/file-upload-trigger.ts',
  );
}
