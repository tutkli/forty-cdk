import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';

import { type ControlOption, ControlSelect } from '../../../ui/control-select';
import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface AccordionEntry {
  readonly value: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-accordion-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForAccordion,
    ForAccordionItem,
    ForAccordionTrigger,
    ForAccordionContent,
    ControlSwitch,
    ControlSelect,
    Icon,
  ],
  template: `
    <playground-demo
      title="Collapsible sections"
      subtitle="A stack of collapsible sections. Try moving between headers with the arrow keys, Home and End — that is what changes with orientation and direction."
      sourcePath="projects/forty-cdk-playground/src/app/demos/accordion/examples/accordion.example.ts"
    >
      <div demo>
        <div
          forAccordion
          class="acc-root"
          [(value)]="value"
          [multiple]="multiple()"
          [collapsible]="collapsible()"
          [orientation]="orientation()"
          [dir]="dir()"
        >
          @for (item of items; track item.value) {
            <div
              forAccordionItem
              class="acc-item"
              [value]="item.value"
              [disabled]="item.value === 'c' && disableThird()"
            >
              <h3 class="acc-heading">
                <button type="button" forAccordionTrigger class="acc-trigger">
                  <span>{{ item.title }}</span>
                  <app-icon class="chevron" name="chevron-down" />
                </button>
              </h3>
              <section forAccordionContent class="acc-content">
                <div class="acc-inner">
                  <p>{{ item.body }}</p>
                </div>
              </section>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="multiple" [(checked)]="multiple" />
        <app-control-switch
          label="collapsible"
          hint="Single mode only: when on, clicking the open item's trigger collapses it, leaving nothing open. When off, exactly one item stays open at all times once any has been opened."
          [(checked)]="collapsible"
        />
        <app-control-switch label="disable 3rd item" [(checked)]="disableThird" />
        <app-control-select
          label="orientation"
          hint="Which axis the arrow keys follow when moving between triggers: vertical uses ArrowUp/Down, horizontal uses ArrowLeft/Right. The directive reflects it as data-orientation for styling."
          [options]="orientationOptions"
          [(value)]="orientation"
        />
        <app-control-select
          label="dir"
          hint="Writing direction. Only matters with horizontal orientation, where rtl swaps the ArrowLeft/Right meaning. It is reflected to the host dir attribute."
          [options]="dirOptions"
          [(value)]="dir"
        />

        <p class="pg-state">
          open: <b>{{ value().length ? value().join(', ') : 'none' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .acc-root {
      width: min(460px, 100%);
      margin-inline: auto;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .acc-root[data-orientation='horizontal'] {
      width: 100%;
      flex-direction: row;
      align-items: start;
    }

    .acc-root[data-orientation='horizontal'] .acc-item {
      flex: 1;
      min-width: 0;
    }

    .acc-item {
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      overflow: hidden;
    }

    .acc-heading {
      margin: 0;
    }

    .acc-trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.8rem 1rem;
      font: inherit;
      font-weight: 600;
      text-align: left;
      color: var(--pg-text);
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .acc-trigger:hover {
      background: var(--pg-surface-2);
    }

    .acc-trigger:disabled {
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

    .acc-trigger[data-state='open'] .chevron {
      transform: rotate(180deg);
    }

    .acc-content {
      display: grid;
      grid-template-rows: 0fr;
      transition: grid-template-rows 0.25s ease;
    }

    .acc-content[data-state='open'] {
      grid-template-rows: 1fr;
    }

    .acc-inner {
      overflow: hidden;
    }

    .acc-inner p {
      margin: 0;
      padding: 0 1rem 0.9rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .acc-content,
      .chevron {
        transition: none;
      }
    }
  `,
})
export class AccordionExample {
  protected readonly items: readonly AccordionEntry[] = [
    {
      value: 'a',
      title: 'What is forty-cdk?',
      body: 'A library of headless UI primitives with built-in WAI-ARIA accessibility.',
    },
    {
      value: 'b',
      title: 'Does it ship styles?',
      body: 'No. It exposes state, behavior, focus and ARIA; you apply the styles yourself.',
    },
    {
      value: 'c',
      title: 'Does it work without Zone.js?',
      body: 'Yes, it is designed to run under provideZonelessChangeDetection().',
    },
    {
      value: 'd',
      title: 'How do the pieces compose?',
      body: 'As a set of standalone directives you coordinate in your own template.',
    },
  ];

  protected readonly orientationOptions: readonly ControlOption<'vertical' | 'horizontal'>[] = [
    { value: 'vertical', label: 'vertical' },
    { value: 'horizontal', label: 'horizontal' },
  ];

  protected readonly dirOptions: readonly ControlOption<'ltr' | 'rtl'>[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];

  protected readonly value = signal<readonly string[]>(['a']);
  protected readonly multiple = signal(false);
  protected readonly collapsible = signal(true);
  protected readonly disableThird = signal(false);
  protected readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');
}
