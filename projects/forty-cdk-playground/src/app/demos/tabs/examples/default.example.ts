import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

interface TabEntry {
  readonly value: string;
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-tabs-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs class="tb" [(value)]="value">
      <div forTabsList class="tb-list" aria-label="Account settings">
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
export class TabsDefaultExample {
  protected readonly tabs: readonly TabEntry[] = [
    {
      value: 'profile',
      label: 'Profile',
      body: 'Your public name, avatar and bio. Anyone visiting your page can see these.',
    },
    {
      value: 'security',
      label: 'Security',
      body: 'Password, two-factor authentication and the list of active sessions.',
    },
    {
      value: 'billing',
      label: 'Billing',
      body: 'Plan, payment method and invoices, all in one place.',
    },
  ];

  protected readonly value = signal<string | null>('profile');
}
