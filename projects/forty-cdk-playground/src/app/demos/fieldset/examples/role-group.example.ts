import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForField, ForFieldset, ForFieldsetLegend, ForInput, ForLabel } from 'forty-cdk';

import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-fieldset-role-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForFieldset, ForFieldsetLegend, ForField, ForLabel, ForInput],
  template: `
    <playground-demo
      title="Group on any element"
      subtitle="On non-fieldset markup forFieldset detects the tag and synthesizes the grouping: it emits role=group and points aria-labelledby at the [forFieldsetLegend]'s generated id, so a plain <div> + <span> reads to assistive tech exactly like a native fieldset / legend — useful when your layout can't use the rigid <fieldset> box."
      sourcePath="projects/forty-cdk-playground/src/app/demos/fieldset/examples/role-group.example.ts"
    >
      <div demo>
        <div forFieldset #fs="forFieldset" class="group">
          <span forFieldsetLegend class="legend">Billing contact</span>

          <div forField class="field">
            <label forLabel class="lbl">
              <span class="lbl-text">Full name</span>
              <input forInput class="pg-input" placeholder="Ada Lovelace" />
            </label>
          </div>
          <div forField class="field">
            <label forLabel class="lbl">
              <span class="lbl-text">Email</span>
              <input forInput class="pg-input" type="email" placeholder="ada@example.com" />
            </label>
          </div>
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          host: <b>&lt;div&gt;</b><br />
          role: <b>group</b><br />
          aria-labelledby: <b>{{ fs.legendId() }}</b>
        </p>
        <p class="pg-hint">
          The same wiring on a native &lt;fieldset&gt; emits no role — the browser groups it
          implicitly.
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .group {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1.1rem 1.2rem 1.3rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .legend {
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
  `,
})
export class FieldsetRoleExample {}
