import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk/tabs';

interface TabEntry {
  readonly value: string;
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-tabs-vertical-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForTabs, ForTabsList, ForTabsTrigger, ForTabsContent],
  template: `
    <div forTabs class="tb" [(value)]="value" orientation="vertical">
      <div forTabsList class="tb-list" aria-label="Workspace settings">
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
      flex-direction: row;
      gap: 0.85rem;
    }

    .tb-list {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      border-inline-end: 1px solid var(--ex-border, #e5e0d6);
      padding-inline-end: 0.5rem;
    }

    .tb-trigger {
      position: relative;
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 0.85rem;
      color: var(--ex-muted, #585d66);
      background: transparent;
      border: 0;
      border-radius: var(--ex-radius-sm, 14px);
      cursor: pointer;
      white-space: nowrap;
      text-align: left;
    }

    .tb-trigger:hover {
      color: var(--ex-text, #17191c);
      background: var(--ex-surface-2, #f2eee6);
    }

    .tb-trigger[data-state='active'] {
      color: var(--ex-accent, #0e7c6b);
    }

    .tb-trigger[data-state='active']::after {
      content: '';
      position: absolute;
      inset-block: 0.3rem;
      inset-inline-end: -0.5rem;
      width: 2px;
      border-radius: 2px;
      background: var(--ex-accent, #0e7c6b);
    }

    .tb-content {
      flex: 1;
      min-width: 0;
      min-height: 3rem;
      color: var(--ex-muted, #585d66);
    }

    .tb-content[data-state='inactive'] {
      display: none;
    }

    .tb-content p {
      margin: 0;
    }
  `,
})
export class TabsVerticalExample {
  protected readonly tabs: readonly TabEntry[] = [
    {
      value: 'general',
      label: 'General',
      body: 'Workspace name, URL slug and default timezone.',
    },
    {
      value: 'members',
      label: 'Members',
      body: 'Invite teammates and manage their roles and access.',
    },
    {
      value: 'integrations',
      label: 'Integrations',
      body: 'Connect external tools and configure incoming webhooks.',
    },
  ];

  protected readonly value = signal<string | null>('general');
}
