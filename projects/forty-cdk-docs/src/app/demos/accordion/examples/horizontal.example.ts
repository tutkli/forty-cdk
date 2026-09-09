import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk/accordion';

interface AccordionEntry {
  readonly value: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-accordion-horizontal-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion class="acc-root" [(value)]="value" orientation="horizontal" collapsible>
      @for (item of items; track item.value) {
        <div forAccordionItem class="acc-item" [value]="item.value">
          <h3 class="acc-heading">
            <button type="button" forAccordionTrigger class="acc-trigger">
              {{ item.title }}
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
  `,
  styles: `
    :host {
      display: contents;
    }

    .acc-root {
      width: 100%;
      display: flex;
      flex-direction: row;
      align-items: start;
      gap: 0.5rem;
    }

    .acc-item {
      flex: 1;
      min-width: 0;
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
      .acc-content {
        transition: none;
      }
    }
  `,
})
export class AccordionHorizontalExample {
  protected readonly items: readonly AccordionEntry[] = [
    {
      value: 'overview',
      title: 'Overview',
      body: 'A summary of the workspace, recent activity and pending invitations.',
    },
    {
      value: 'members',
      title: 'Members',
      body: 'Everyone with access, grouped by role. Owners can change permissions here.',
    },
    {
      value: 'billing',
      title: 'Billing',
      body: 'Your current plan, payment method and a link to download past invoices.',
    },
  ];

  protected readonly value = signal<readonly string[]>(['overview']);
}
