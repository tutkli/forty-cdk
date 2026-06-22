import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk/disclosure';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-disclosure-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForDisclosure,
    ForDisclosureTrigger,
    ForDisclosureContent,
    ControlSwitch,
    Icon,
  ],
  template: `
    <playground-demo
      title="Show / hide a section"
      subtitle="A single show/hide section — the building block behind Accordion. The panel stays mounted while closed (the directive marks it aria-hidden + inert), so it can animate open with pure CSS instead of being unmounted."
      sourcePath="projects/forty-cdk-playground/src/app/demos/disclosure/examples/disclosure.example.ts"
    >
      <div demo>
        <div forDisclosure class="dis" [(open)]="open" [disabled]="disabled()">
          <button type="button" forDisclosureTrigger class="dis-trigger">
            <span>What is inside the box?</span>
            <app-icon class="chevron" name="chevron-down" />
          </button>
          <div forDisclosureContent class="dis-content">
            <div class="dis-inner">
              <p>
                One headless primitive, a styleless trigger, and the panel you are reading.
                Behavior, ARIA and focus are handled for you; the styling is entirely yours.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          open: <b>{{ open() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .dis {
      width: min(440px, 100%);
      margin-inline: auto;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      overflow: hidden;
    }

    .dis-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      font: inherit;
      font-weight: 600;
      text-align: left;
      color: var(--pg-text);
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .dis-trigger:hover {
      background: var(--pg-surface-2);
    }

    .dis-trigger:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .chevron {
      flex: none;
      width: 16px;
      height: 16px;
      color: var(--pg-text-muted);
      transition: transform 0.2s ease;
    }

    .dis-trigger[data-state='open'] .chevron {
      transform: rotate(180deg);
    }

    .dis-content {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.25s ease;
    }

    .dis-content[data-state='open'] {
      grid-template-rows: 1fr;
    }

    .dis-inner {
      overflow: hidden;
    }

    .dis-inner p {
      margin: 0;
      padding: 0 1rem 0.95rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .dis-content,
      .chevron {
        transition: none;
      }
    }
  `,
})
export class DisclosureExample {
  protected readonly open = signal(true);
  protected readonly disabled = signal(false);
}
