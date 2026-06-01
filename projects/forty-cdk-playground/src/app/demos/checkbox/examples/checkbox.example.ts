import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForCheckbox } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

@Component({
  selector: 'app-checkbox-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForCheckbox, ControlSwitch, Icon],
  template: `
    <playground-demo
      title="Tri-state checkbox"
      subtitle="Activating an indeterminate checkbox clears it and toggles checked, matching native inputs. Use Switch instead for immediate on/off settings."
      sourcePath="projects/forty-cdk-playground/src/app/demos/checkbox/examples/checkbox.example.ts"
    >
      <div demo>
        <button
          forCheckbox
          class="cb-row"
          [(checked)]="checked"
          [(indeterminate)]="indeterminate"
          [disabled]="disabled()"
        >
          <span class="cb">
            <app-icon class="cb-icon cb-check" name="check" [strokeWidth]="2.5" />
            <span class="cb-icon cb-dash" aria-hidden="true"></span>
          </span>
          I agree to the terms
        </button>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <button type="button" class="pg-btn" (click)="indeterminate.set(true)">
          set indeterminate
        </button>

        <p class="pg-state">
          checked: <b>{{ checked() }}</b
          ><br />
          indeterminate: <b>{{ indeterminate() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .cb-row {
      display: inline-flex;
      align-items: center;
      vertical-align: middle;
      gap: 0.6rem;
      padding: 0;
      border: 0;
      background: transparent;
      font: inherit;
      color: var(--pg-text);
      cursor: pointer;
    }

    .cb-row[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .cb {
      flex: none;
      width: 22px;
      height: 22px;
      display: grid;
      place-items: center;
      border: 2px solid var(--pg-border-strong);
      border-radius: 6px;
      background: var(--pg-surface);
      color: var(--pg-primary-contrast);
      transition:
        background 0.15s ease,
        border-color 0.15s ease;
    }

    .cb-row[data-state='checked'] .cb,
    .cb-row[data-state='indeterminate'] .cb {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
    }

    .cb .cb-icon {
      display: none;
    }

    .cb-row[data-state='checked'] .cb-check {
      display: block;
      width: 14px;
      height: 14px;
    }

    .cb-row[data-state='indeterminate'] .cb-dash {
      display: block;
      width: 12px;
      height: 2px;
      border-radius: 1px;
      background: currentColor;
    }
  `,
})
export class CheckboxExample {
  protected readonly checked = signal(false);
  protected readonly indeterminate = signal(false);
  protected readonly disabled = signal(false);
}
