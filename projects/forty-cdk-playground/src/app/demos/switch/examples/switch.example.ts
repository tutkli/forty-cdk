import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForSwitch } from 'forty-cdk/switch';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-switch-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForSwitch, ControlSwitch],
  template: `
    <playground-demo
      title="Anatomy & options"
      subtitle="Toggle it with click, Enter or Space. readonly keeps it focusable; disabled removes it from the tab order."
      sourcePath="projects/forty-cdk-playground/src/app/demos/switch/examples/switch.example.ts"
    >
      <div demo class="sw-row">
        <button
          forSwitch
          class="sw-btn"
          [(checked)]="checked"
          [disabled]="disabled()"
          [readonly]="readonly()"
        >
          <span class="sw-thumb"></span>
        </button>
        <span class="sw-text">Notifications {{ checked() ? 'on' : 'off' }}</span>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch label="readonly" [(checked)]="readonly" />

        <p class="pg-state">
          checked: <b>{{ checked() }}</b
          ><br />
          data-state: <b>{{ checked() ? 'checked' : 'unchecked' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .sw-row {
      display: inline-flex;
      align-items: center;
      gap: 0.8rem;
    }

    .sw-text {
      font-weight: 500;
    }

    .sw-btn {
      position: relative;
      width: 46px;
      height: 26px;
      padding: 0;
      border: 0;
      border-radius: 999px;
      background: var(--pg-border-strong);
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .sw-btn[data-state='checked'] {
      background: var(--pg-primary);
    }

    .sw-btn[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .sw-btn[data-readonly] {
      cursor: default;
    }

    .sw-thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.35);
      transition: transform 0.2s ease;
    }

    .sw-btn[data-state='checked'] .sw-thumb {
      transform: translateX(20px);
    }

    @media (prefers-reduced-motion: reduce) {
      .sw-btn,
      .sw-thumb {
        transition: none;
      }
    }
  `,
})
export class SwitchExample {
  protected readonly checked = signal(false);
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
}
