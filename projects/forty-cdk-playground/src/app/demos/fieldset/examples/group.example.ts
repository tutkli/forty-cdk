import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForField, ForLabel } from 'forty-cdk/field';
import { ForFieldset, ForFieldsetLegend } from 'forty-cdk/fieldset';
import { ForInput } from 'forty-cdk/input';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-fieldset-group-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    ControlSwitch,
    ForFieldset,
    ForFieldsetLegend,
    ForField,
    ForLabel,
    ForInput,
  ],
  template: `
    <playground-demo
      title="Disable a group"
      subtitle="On a native <fieldset>, forFieldset leans on the browser's implicit grouping and emits the native disabled attribute — which disables every control inside in one move. The data-disabled hook flows to the fieldset and to each forField for styling. Flip the switch to lock the whole block."
      sourcePath="projects/forty-cdk-playground/src/app/demos/fieldset/examples/group.example.ts"
    >
      <div demo>
        <fieldset forFieldset #fs="forFieldset" class="set" [disabled]="locked()">
          <legend forFieldsetLegend class="legend">Shipping address</legend>

          <div forField class="field">
            <label forLabel class="lbl">
              <span class="lbl-text">Street</span>
              <input forInput class="pg-input" placeholder="221B Baker Street" />
            </label>
          </div>
          <div forField class="field">
            <label forLabel class="lbl">
              <span class="lbl-text">City</span>
              <input forInput class="pg-input" placeholder="London" />
            </label>
          </div>
        </fieldset>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="locked" />
        <p class="pg-state">
          group data-disabled: <b>{{ fs.disabled() }}</b
          ><br />
          host: <b>&lt;fieldset&gt;</b><br />
          native inputs: <b>{{ locked() ? 'disabled' : 'editable' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .set {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      margin: 0;
      padding: 1.1rem 1.2rem 1.3rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      transition: opacity 0.15s ease;
    }

    .set[data-disabled] {
      opacity: 0.55;
    }

    .legend {
      padding: 0 0.4rem;
      font-size: 0.95rem;
      font-weight: 700;
      color: var(--pg-text);
    }

    .lbl {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .lbl-text {
      font-size: 0.85rem;
      font-weight: 600;
      color: var(--pg-text);
    }

    @media (prefers-reduced-motion: reduce) {
      .set {
        transition: none;
      }
    }
  `,
})
export class FieldsetGroupExample {
  protected readonly locked = signal(false);
}
