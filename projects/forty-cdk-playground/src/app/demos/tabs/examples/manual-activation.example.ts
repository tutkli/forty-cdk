import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

interface TabEntry {
  readonly value: string;
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-tabs-manual-activation-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs class="tb" [(value)]="value" activationMode="manual">
      <div forTabsList class="tb-list" aria-label="Report sections">
        @for (tab of tabs; track tab.value) {
          <button type="button" forTabsTrigger class="tb-trigger" [value]="tab.value">
            {{ tab.label }}
          </button>
        }
      </div>
      @for (tab of tabs; track tab.value) {
        <div forTabsContent class="tb-content" [value]="tab.value">
          <p>{{ tab.body }}</p>
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .tb {
      width: min(520px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .tb-list {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--pg-border);
    }

    .tb-trigger {
      position: relative;
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 0.85rem;
      color: var(--pg-text-muted);
      background: transparent;
      border: 0;
      border-radius: var(--pg-radius-sm);
      cursor: pointer;
      white-space: nowrap;
    }

    .tb-trigger:hover {
      color: var(--pg-text);
      background: var(--pg-surface-2);
    }

    .tb-trigger[data-state='active'] {
      color: var(--pg-primary);
    }

    .tb-trigger[data-state='active']::after {
      content: '';
      position: absolute;
      inset-inline: 0.4rem;
      bottom: -1px;
      height: 2px;
      border-radius: 2px;
      background: var(--pg-primary);
    }

    .tb-content {
      min-height: 3rem;
      color: var(--pg-text-muted);
    }

    .tb-content[data-state='inactive'] {
      display: none;
    }

    .tb-content p {
      margin: 0;
    }
  `,
})
export class TabsManualActivationExample {
  protected readonly tabs: readonly TabEntry[] = [
    {
      value: 'traffic',
      label: 'Traffic',
      body: 'Visits, unique users and bounce rate over the selected period.',
    },
    {
      value: 'revenue',
      label: 'Revenue',
      body: 'Gross and net revenue, broken down by product line.',
    },
    {
      value: 'retention',
      label: 'Retention',
      body: 'Cohort retention curves for the last twelve weeks.',
    },
  ];

  protected readonly value = signal<string | null>('traffic');
}
