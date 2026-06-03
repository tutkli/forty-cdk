import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ForInput, ForTextarea } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-input-text-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ControlSwitch, ForInput, ForTextarea],
  template: `
    <playground-demo
      title="Text & textarea"
      subtitle="forInput and forTextarea are plain attribute directives that own a string value() and reflect every form state as aria-* / data-*. They take no styles — the data-empty / data-disabled / data-readonly / data-invalid hooks drive the look. Toggle the controls to watch the reflected attributes change."
      sourcePath="projects/forty-cdk-playground/src/app/demos/input/examples/text.example.ts"
    >
      <div demo class="stack">
        <input
          forInput
          class="pg-input"
          type="email"
          aria-label="Email address"
          placeholder="jane@example.com"
          [(value)]="email"
          [disabled]="disabled()"
          [readonly]="readonly()"
          [required]="required()"
          [invalid]="invalid()"
        />
        <textarea
          forTextarea
          class="pg-input area"
          rows="3"
          aria-label="Short bio"
          placeholder="A short bio…"
          [(value)]="bio"
          [disabled]="disabled()"
          [readonly]="readonly()"
        ></textarea>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />
        <app-control-switch
          label="readonly"
          hint="The field stays focusable but ignores edits, reflecting aria-readonly."
          [(checked)]="readonly"
        />
        <app-control-switch label="required" [(checked)]="required" />
        <app-control-switch
          label="invalid"
          hint="Sets aria-invalid and the data-invalid styling hook."
          [(checked)]="invalid"
        />
        <p class="pg-state">
          email: <b>{{ email() || '∅' }}</b
          ><br />
          bio length: <b>{{ bio().length }}</b
          ><br />
          data-empty: <b>{{ emptyLabel() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stack {
      width: min(360px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .area {
      resize: vertical;
      min-height: 4.5rem;
    }

    .pg-input[data-invalid] {
      border-color: var(--pg-danger);
      box-shadow: 0 0 0 1px var(--pg-danger);
    }

    .pg-input[data-disabled] {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .pg-input[data-readonly] {
      background: var(--pg-surface-2);
    }
  `,
})
export class InputTextExample {
  protected readonly email = signal('');
  protected readonly bio = signal('');
  protected readonly disabled = signal(false);
  protected readonly readonly = signal(false);
  protected readonly required = signal(false);
  protected readonly invalid = signal(false);

  protected readonly emptyLabel = computed(() => (this.email() === '' ? 'true' : 'false'));
}
