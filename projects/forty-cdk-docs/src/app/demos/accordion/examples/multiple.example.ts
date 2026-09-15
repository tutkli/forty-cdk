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
  selector: 'app-accordion-multiple-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion class="acc-root" [(value)]="value" multiple>
      @for (item of items; track item.value) {
        <div forAccordionItem class="acc-item" [value]="item.value">
          <h3 class="acc-heading">
            <button type="button" forAccordionTrigger class="acc-trigger">
              <span>{{ item.title }}</span>
              <span class="chevron" aria-hidden="true"></span>
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
      width: min(460px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .acc-item {
      background: var(--ex-surface, #ffffff);
      border: 1px solid var(--ex-border, #e5e0d6);
      border-radius: var(--ex-radius-sm, 14px);
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
      color: var(--ex-text, #17191c);
      background: transparent;
      border: 0;
      cursor: pointer;
    }

    .acc-trigger:hover {
      background: var(--ex-surface-2, #f2eee6);
    }

    .chevron {
      flex: none;
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--ex-muted, #585d66);
      border-bottom: 2px solid var(--ex-muted, #585d66);
      transform: rotate(45deg);
      transition: transform 0.2s ease;
    }

    .acc-trigger[data-state='open'] .chevron {
      transform: rotate(-135deg);
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
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .acc-content,
      .chevron {
        transition: none;
      }
    }
  `,
})
export class AccordionMultipleExample {
  protected readonly items: readonly AccordionEntry[] = [
    {
      value: 'a',
      title: 'Standard shipping',
      body: 'Orders ship within 24 hours and arrive in three to five business days.',
    },
    {
      value: 'b',
      title: 'Express shipping',
      body: 'Guaranteed next-day delivery for orders placed before 2pm local time.',
    },
    {
      value: 'c',
      title: 'International shipping',
      body: 'Available to most countries; duties and taxes are calculated at checkout.',
    },
  ];

  protected readonly value = signal<readonly string[]>(['a', 'b']);
}
