import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForTabs, ForTabsContent, ForTabsList, ForTabsTrigger } from 'forty-cdk';

import { type ControlOption, ControlSelect } from '../ui/control-select';
import { ControlSwitch } from '../ui/control-switch';
import { DemoLayout } from '../ui/demo-layout';

interface TabEntry {
  readonly value: string;
  readonly label: string;
  readonly body: string;
}

@Component({
  selector: 'app-tabs-demo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ForTabs,
    ForTabsList,
    ForTabsTrigger,
    ForTabsContent,
    ControlSwitch,
    ControlSelect,
  ],
  template: `
    <playground-demo
      title="Tabs"
      summary="A tablist with roving tabindex. Focus the tabs and move with the arrow keys, Home and End — orientation and dir change which arrows apply. In manual mode arrows only move focus; Enter or Space activates."
      apgUrl="https://www.w3.org/WAI/ARIA/apg/patterns/tabs/"
    >
      <div demo class="tb-demo">
        <div
          forTabs
          class="tb"
          [(value)]="value"
          [orientation]="orientation()"
          [dir]="dir()"
          [activationMode]="activationMode()"
          [loop]="loop()"
          [disabled]="disabled()"
        >
          <div forTabsList class="tb-list" aria-label="Account settings">
            @for (tab of tabs; track tab.value) {
              <button
                type="button"
                forTabsTrigger
                class="tb-trigger"
                [value]="tab.value"
                [disabled]="tab.value === 'billing' && disableBilling()"
              >
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
      </div>

      <div controls class="pg-controls">
        <app-control-select
          label="orientation"
          [options]="orientationOptions"
          [(value)]="orientationValue"
        />
        <app-control-select label="dir" [options]="dirOptions" [(value)]="dirValue" />
        <app-control-select
          label="activationMode"
          [options]="activationOptions"
          [(value)]="activationModeValue"
        />
        <app-control-switch label="loop" [(checked)]="loop" />
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch label="disable billing tab" [(checked)]="disableBilling" />

        <p class="pg-state">
          value: <b>{{ value() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .tb {
      width: min(520px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.85rem;
    }

    .tb[data-orientation='vertical'] {
      flex-direction: row;
    }

    .tb-list {
      display: flex;
      gap: 0.25rem;
      border-bottom: 1px solid var(--pg-border);
    }

    .tb[data-orientation='vertical'] .tb-list {
      flex-direction: column;
      gap: 0.15rem;
      border-bottom: 0;
      border-inline-end: 1px solid var(--pg-border);
      padding-inline-end: 0.5rem;
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

    .tb[data-orientation='vertical'] .tb-trigger[data-state='active']::after {
      inset-inline: auto;
      inset-block: 0.3rem;
      inset-inline-end: -0.5rem;
      width: 2px;
      height: auto;
    }

    .tb-trigger:disabled {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .tb-content {
      flex: 1;
      min-width: 0;
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
export class TabsDemo {
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
      body: 'Plan, payment method and invoices. Disable this tab to see roving-tabindex skip it.',
    },
  ];

  protected readonly orientationOptions: readonly ControlOption[] = [
    { value: 'horizontal', label: 'horizontal' },
    { value: 'vertical', label: 'vertical' },
  ];

  protected readonly dirOptions: readonly ControlOption[] = [
    { value: 'ltr', label: 'ltr' },
    { value: 'rtl', label: 'rtl' },
  ];

  protected readonly activationOptions: readonly ControlOption[] = [
    { value: 'automatic', label: 'automatic' },
    { value: 'manual', label: 'manual' },
  ];

  protected readonly value = signal('profile');
  protected readonly loop = signal(true);
  protected readonly disabled = signal(false);
  protected readonly disableBilling = signal(false);

  protected readonly orientationValue = signal('horizontal');
  protected readonly orientation = computed<'horizontal' | 'vertical'>(() =>
    this.orientationValue() === 'vertical' ? 'vertical' : 'horizontal',
  );

  protected readonly dirValue = signal('ltr');
  protected readonly dir = computed<'ltr' | 'rtl'>(() =>
    this.dirValue() === 'rtl' ? 'rtl' : 'ltr',
  );

  protected readonly activationModeValue = signal('automatic');
  protected readonly activationMode = computed<'automatic' | 'manual'>(() =>
    this.activationModeValue() === 'manual' ? 'manual' : 'automatic',
  );
}
