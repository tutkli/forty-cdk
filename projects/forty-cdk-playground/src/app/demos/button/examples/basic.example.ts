import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForButton } from 'forty-cdk';

import { ControlSwitch } from '../../../ui/control-switch';
import { DemoLayout } from '../../../ui/demo-layout';

@Component({
  selector: 'app-button-basic-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [DemoLayout, ForButton, ControlSwitch],
  template: `
    <playground-demo
      title="Native and custom hosts"
      subtitle="forButton turns any element into an accessible button. On a native <button> the platform owns Enter / Space; on a <span> the directive adds role='button', tabindex='0' and keyboard activation. Both fire a single (activate) output. Tab to a button and press Space / Enter to see the count rise."
      sourcePath="projects/forty-cdk-playground/src/app/demos/button/examples/basic.example.ts"
    >
      <div demo class="stage">
        <button
          forButton
          class="btn btn--primary"
          [disabled]="disabled()"
          (activate)="bump('button')"
        >
          Native &lt;button&gt;
        </button>

        <span forButton class="btn" [disabled]="disabled()" (activate)="bump('span')">
          Custom &lt;span&gt;
        </span>
      </div>

      <div controls class="pg-controls">
        <app-control-switch label="disabled" [(checked)]="disabled" />

        <p class="pg-state">
          activations: <b>{{ count() }}</b
          ><br />
          last host: <b>{{ lastHost() }}</b>
        </p>
      </div>
    </playground-demo>
  `,
  styles: `
    .stage {
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: center;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font: inherit;
      font-weight: 600;
      padding: 0.55rem 1.1rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
      user-select: none;
      outline: none;
      transition:
        transform 0.12s ease,
        box-shadow 0.15s ease,
        background 0.15s ease;
    }

    .btn--primary {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-primary-contrast);
    }

    .btn[data-hovered] {
      background: var(--pg-surface-2);
    }

    .btn--primary[data-hovered] {
      background: var(--pg-primary-hover);
      border-color: var(--pg-primary-hover);
    }

    .btn[data-pressed] {
      transform: scale(0.95);
    }

    .btn[data-focus-visible] {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--pg-primary) 45%, transparent);
    }

    .btn[data-disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (prefers-reduced-motion: reduce) {
      .btn {
        transition: box-shadow 0.15s ease;
      }

      .btn[data-pressed] {
        transform: none;
      }
    }
  `,
})
export class ButtonBasicExample {
  protected readonly disabled = signal(false);
  protected readonly count = signal(0);
  protected readonly lastHost = signal('—');

  protected bump(host: string): void {
    this.count.update((n) => n + 1);
    this.lastHost.set(host);
  }
}
