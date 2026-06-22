import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

import { DemoLayout } from '../../../ui/demo-layout';
import { Icon } from '../../../ui/icon';

interface Profile {
  readonly plan: readonly string[];
}

@Component({
  selector: 'app-select-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DemoLayout,
    FormField,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
    Icon,
  ],
  template: `
    <playground-demo
      title="Signal Forms"
      subtitle="forSelect implements FormValueControl<readonly T[]> from @angular/forms/signals, so a single [formField] binding wires the value, validation status, and touched flag in both directions — no ControlValueAccessor, no provider glue. The field below is required; the trigger reflects data-invalid / data-touched after the user blurs it without a choice, and the live state below mirrors exactly what the form sees."
      sourcePath="projects/forty-cdk-playground/src/app/demos/select/examples/form-field.example.ts"
    >
      <div demo class="select-demo">
        <div
          forSelect
          #select="forSelect"
          class="select-field"
          [formField]="profileForm.plan"
          placeholder="Choose a plan"
          ariaLabel="Subscription plan"
        >
          <button forSelectTrigger type="button" class="pg-select-trigger">
            <span forSelectValue></span>
            <app-icon class="pg-select-chevron" name="chevron-down" />
          </button>
          @if (select.open()) {
            <div forSelectContent class="pg-select-content" animate.enter="pg-pop-in">
              @for (plan of plans; track plan) {
                <button forSelectOption type="button" class="pg-select-option" [value]="plan">
                  <span forSelectIndicator class="pg-select-indicator">
                    <app-icon name="check" />
                  </span>
                  {{ plan }}
                </button>
              }
            </div>
          }
        </div>
      </div>

      <div controls class="pg-controls">
        <p class="pg-state">
          value: <b>{{ profileForm.plan().value().join(', ') || '—' }}</b
          ><br />
          valid: <b>{{ profileForm.plan().valid() }}</b
          ><br />
          touched: <b>{{ profileForm.plan().touched() }}</b
          ><br />
          errors: <b>{{ errorKinds() || '—' }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .select-demo {
      display: flex;
      justify-content: center;
      padding: 2.5rem 0;
      width: 100%;
    }

    .select-field {
      display: block;
      width: min(260px, 100%);
    }
  `,
})
export class SelectFormFieldExample {
  protected readonly plans: readonly string[] = ['Free', 'Pro', 'Team', 'Enterprise'];

  protected readonly model = signal<Profile>({ plan: [] });
  protected readonly profileForm = form(this.model, (path) => {
    validate(path.plan, (ctx) =>
      ctx.value().length === 0 ? requiredError({ message: 'Pick a plan to continue' }) : undefined,
    );
  });

  protected errorKinds(): string {
    return this.profileForm
      .plan()
      .errors()
      .map((error) => error.kind)
      .join(', ');
  }
}
