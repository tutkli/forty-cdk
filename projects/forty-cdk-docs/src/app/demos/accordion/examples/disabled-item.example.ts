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
  readonly disabled: boolean;
}

@Component({
  selector: 'app-accordion-disabled-item-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  template: `
    <div forAccordion class="acc-root" [(value)]="value" collapsible>
      @for (item of items; track item.value) {
        <div forAccordionItem class="acc-item" [value]="item.value" [disabled]="item.disabled">
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
      width: 10px;
      height: 10px;
      border-right: 2px solid var(--pg-text-muted);
      border-bottom: 2px solid var(--pg-text-muted);
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
export class AccordionDisabledItemExample {
  protected readonly items: readonly AccordionEntry[] = [
    {
      value: 'a',
      title: 'Account',
      body: 'Update your display name, email address and avatar.',
      disabled: false,
    },
    {
      value: 'b',
      title: 'Notifications (coming soon)',
      body: 'This section is disabled, so its trigger is skipped by the arrow keys.',
      disabled: true,
    },
    {
      value: 'c',
      title: 'Privacy',
      body: 'Choose who can see your activity and manage connected applications.',
      disabled: false,
    },
  ];

  protected readonly value = signal<readonly string[]>(['a']);
}
