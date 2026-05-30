import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk';

import { DemoLayout } from '../ui/demo-layout';

interface AccordionEntry {
  readonly value: string;
  readonly title: string;
  readonly body: string;
}

@Component({
  selector: 'app-accordion-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForAccordion,
    ForAccordionItem,
    ForAccordionTrigger,
    ForAccordionContent,
  ],
  template: `
    <playground-demo
      title="Accordion"
      summary="A stack of collapsible sections. Try moving between headers with the arrow keys, Home and End — that is what changes with orientation and direction."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/accordion/"
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
          [attr.dir]="dir()"
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
                  <svg
                    class="chevron"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </button>
              </h3>
              <section forAccordionContent class="acc-content">
                <div class="acc-inner"><p>{{ item.body }}</p></div>
              </section>
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <label class="pg-check">
          <input type="checkbox" [checked]="multiple()" (change)="multiple.set(isChecked($event))" />
          multiple
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="collapsible()"
            (change)="collapsible.set(isChecked($event))"
          />
          collapsible
        </label>
        <label class="pg-check">
          <input
            type="checkbox"
            [checked]="disableThird()"
            (change)="disableThird.set(isChecked($event))"
          />
          disable 3rd item
        </label>

        <div class="pg-field">
          <span class="pg-label">orientation</span>
          <select class="pg-select" [value]="orientation()" (change)="setOrientation($event)">
            <option value="vertical">vertical</option>
            <option value="horizontal">horizontal</option>
          </select>
        </div>

        <div class="pg-field">
          <span class="pg-label">dir</span>
          <select class="pg-select" [value]="dir()" (change)="setDir($event)">
            <option value="ltr">ltr</option>
            <option value="rtl">rtl</option>
          </select>
        </div>

        <p class="pg-state">open: <b>{{ value().length ? value().join(', ') : 'none' }}</b></p>
      </div>
    </playground-demo>
  `,
  styles: `
    .acc-root {
      width: min(460px, 100%);
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
export class AccordionDemo {
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

  protected readonly value = signal<readonly string[]>(['a']);
  protected readonly multiple = signal(false);
  protected readonly collapsible = signal(true);
  protected readonly disableThird = signal(false);
  protected readonly orientation = signal<'horizontal' | 'vertical'>('vertical');
  protected readonly dir = signal<'ltr' | 'rtl'>('ltr');

  protected isChecked(event: Event): boolean {
    return (event.target as HTMLInputElement).checked;
  }

  protected setOrientation(event: Event): void {
    this.orientation.set(
      (event.target as HTMLSelectElement).value === 'horizontal' ? 'horizontal' : 'vertical',
    );
  }

  protected setDir(event: Event): void {
    this.dir.set((event.target as HTMLSelectElement).value === 'rtl' ? 'rtl' : 'ltr');
  }
}
