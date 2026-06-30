import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { form, FormField, requiredError, validate } from '@angular/forms/signals';
import {
  ForSelect,
  ForSelectContent,
  ForSelectIndicator,
  ForSelectOption,
  ForSelectTrigger,
  ForSelectValue,
} from 'forty-cdk/select';

interface Profile {
  readonly plan: readonly string[];
}

@Component({
  selector: 'app-select-form-field-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [
    FormField,
    ForSelect,
    ForSelectTrigger,
    ForSelectValue,
    ForSelectContent,
    ForSelectOption,
    ForSelectIndicator,
  ],
  template: `
    <div class="form-select-wrap">
      <div
        forSelect
        #select="forSelect"
        class="form-select-field"
        [formField]="profileForm.plan"
        placeholder="Choose a plan"
        ariaLabel="Subscription plan"
      >
        <button forSelectTrigger type="button" class="form-select-trigger">
          <span forSelectValue></span>
          <svg class="form-select-chevron" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="m19.5 8.25-7.5 7.5-7.5-7.5"
              fill="none"
              stroke="currentColor"
              stroke-width="1.75"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>
        @if (select.open()) {
          <div forSelectContent class="form-select-content" animate.enter="form-select-pop-in">
            @for (plan of plans; track plan) {
              <button forSelectOption type="button" class="form-select-option" [value]="plan">
                <span forSelectIndicator class="form-select-indicator">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="m4.5 12.75 6 6 9-13.5"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="1.75"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                </span>
                {{ plan }}
              </button>
            }
          </div>
        }
      </div>

      @if (profileForm.plan().touched() && !profileForm.plan().valid()) {
        <p class="form-select-error">Pick a plan to continue.</p>
      }
    </div>
  `,
  styles: `
    app-select-form-field-example {
      display: contents;
    }

    .form-select-wrap {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      width: min(260px, 100%);
    }

    .form-select-field {
      display: block;
      width: 100%;
    }

    .form-select-trigger {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      padding: 0.4rem 0.6rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .form-select-trigger:hover {
      background: var(--pg-surface-2);
    }

    .form-select-field[data-touched][data-invalid] .form-select-trigger {
      border-color: var(--pg-danger);
      box-shadow: 0 0 0 1px var(--pg-danger);
    }

    .form-select-chevron {
      flex: none;
      width: 14px;
      height: 14px;
      color: var(--pg-text-muted);
      transition: transform 0.15s ease;
    }

    .form-select-trigger[aria-expanded='true'] .form-select-chevron {
      transform: rotate(180deg);
    }

    .form-select-content {
      z-index: 60;
      display: flex;
      flex-direction: column;
      gap: 2px;
      width: var(--for-anchor-width);
      max-height: 260px;
      overflow-y: auto;
      padding: 4px;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius-sm);
      box-shadow: var(--pg-shadow);
    }

    .form-select-option {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      font: inherit;
      font-size: 0.875rem;
      text-align: left;
      padding: 0.4rem 0.6rem;
      border: 0;
      border-radius: var(--pg-radius-sm);
      background: transparent;
      color: var(--pg-text);
      cursor: pointer;
    }

    .form-select-option[data-highlighted],
    .form-select-option:not([data-disabled]):hover {
      background: var(--pg-surface-2);
    }

    .form-select-option[data-state='checked'] {
      color: var(--pg-primary);
      font-weight: 600;
    }

    .form-select-indicator {
      flex: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 1.1em;
      height: 1.1em;
      color: var(--pg-primary);
    }

    .form-select-indicator[hidden] {
      display: none;
    }

    .form-select-indicator svg {
      width: 100%;
      height: 100%;
    }

    .form-select-error {
      margin: 0;
      font-size: 0.8rem;
      color: var(--pg-danger);
    }

    .form-select-pop-in {
      transform-origin: var(--for-content-transform-origin, center);
      animation: form-select-pop-in 0.2s var(--pg-ease-spring) both;
    }

    @keyframes form-select-pop-in {
      from {
        opacity: 0;
        scale: 0.9;
      }
    }

    @media (prefers-reduced-motion: reduce) {
      .form-select-pop-in {
        animation-duration: 0.01ms;
      }
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
}
