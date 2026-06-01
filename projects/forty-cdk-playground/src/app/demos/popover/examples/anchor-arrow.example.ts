import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForPopover,
  ForPopoverAnchor,
  ForPopoverArrow,
  ForPopoverClose,
  ForPopoverContent,
  ForPopoverDescription,
  ForPopoverTitle,
  ForPopoverTrigger,
} from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-popover-anchor-arrow-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForPopover,
    ForPopoverTrigger,
    ForPopoverAnchor,
    ForPopoverContent,
    ForPopoverTitle,
    ForPopoverDescription,
    ForPopoverClose,
    ForPopoverArrow,
    ControlSwitch,
  ],
  template: `
    <playground-demo
      title="Anchor & arrow"
      subtitle="What opens the popover and where it appears can be different elements. The button is the trigger (it owns aria-controls / aria-expanded and gets focus back on close), but [forPopoverAnchor] on the highlighted phrase is what floating-ui positions against. A [forPopoverArrow] points the surface back at the anchor — toggle the anchor off to watch positioning fall back to the trigger."
      sourcePath="projects/forty-cdk-playground/src/app/demos/popover/examples/anchor-arrow.example.ts"
    >
      <div demo class="anchor-demo">
        <div forPopover [(open)]="open" side="bottom" align="center">
          <p class="anchor-copy">
            Your plan renews on the
            @if (useAnchor()) {
              <mark forPopoverAnchor class="anchor-phrase">1st of next month</mark>
            } @else {
              <mark class="anchor-phrase">1st of next month</mark>
            }
            and you can change it anytime.
          </p>

          <button forPopoverTrigger class="pg-btn pg-btn--primary">Billing details</button>

          @if (open()) {
            <div forPopoverContent class="pg-popover" animate.enter="pg-pop-in">
              <h3 forPopoverTitle class="pg-popover-title">Next invoice</h3>
              <p forPopoverDescription class="pg-popover-desc">
                Positioned against the highlighted phrase, not the button that opened it.
              </p>
              <div class="pg-popover-actions">
                <button class="pg-btn" type="button" forPopoverClose>Got it</button>
              </div>
              <span forPopoverArrow class="pg-float-arrow"></span>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch
          label="anchor on phrase"
          hint="When on, [forPopoverAnchor] sits on the highlighted phrase so the popover paints there. Turn it off and positioning falls back to the trigger button."
          [(checked)]="useAnchor"
        />

        <p class="pg-state">
          open: <b>{{ open() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .anchor-demo {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.25rem;
      padding: 1.5rem 0;
      text-align: center;
    }

    .anchor-copy {
      max-width: 340px;
      margin: 0;
      line-height: 1.6;
      color: var(--pg-text-muted);
    }

    .anchor-phrase {
      padding: 0.05rem 0.25rem;
      border-radius: var(--pg-radius-sm);
      background: var(--pg-primary);
      color: var(--pg-primary-contrast);
      font-weight: 600;
    }
  `,
})
export class PopoverAnchorArrowExample {
  protected readonly open = signal(false);
  protected readonly useAnchor = signal(true);
}
