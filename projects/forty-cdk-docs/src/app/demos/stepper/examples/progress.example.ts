import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import {
  ForStepper,
  ForStepperIndicator,
  ForStepperItem,
  ForStepperList,
  ForStepperNext,
  ForStepperPrevious,
  ForStepperProgress,
  ForStepperSeparator,
  ForStepperTrigger,
} from 'forty-cdk/stepper';

interface Stage {
  readonly label: string;
}

@Component({
  selector: 'app-stepper-progress-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperProgress,
    ForStepperNext,
    ForStepperPrevious,
  ],
  template: `
    <div class="stp-demo">
      <div forStepper class="stp" [(selectedIndex)]="step" mode="progress">
        <div forStepperProgress class="stp-progress" ariaLabel="Order progress"></div>

        <ol forStepperList class="stp-list" ariaLabel="Order status">
          @for (stage of stages; track stage.label; let i = $index; let last = $last) {
            <li forStepperItem #item="forStepperItem" class="stp-item" [completed]="step() > i">
              <span forStepperTrigger class="stp-trigger">
                <span forStepperIndicator class="stp-indicator">
                  @if (item.resolvedState() === 'completed') {
                    ✓
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="stp-label">{{ stage.label }}</span>
              </span>
              @if (!last) {
                <span forStepperSeparator class="stp-sep"></span>
              }
            </li>
          }
        </ol>

        <div class="stp-nav">
          <button forStepperPrevious type="button" class="btn">Previous</button>
          <button forStepperNext type="button" class="btn btn-next">Advance</button>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .stp-demo {
      width: min(520px, 100%);
    }

    .stp {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .stp-progress {
      position: relative;
      height: 8px;
      border-radius: 999px;
      background: var(--pg-surface-2);
      overflow: hidden;
    }

    .stp-progress::after {
      content: '';
      position: absolute;
      inset: 0 auto 0 0;
      width: calc(var(--for-stepper-progress, 0) * 100%);
      background: var(--pg-primary);
      transition: width 0.3s ease;
    }

    @media (prefers-reduced-motion: reduce) {
      .stp-progress::after {
        transition: none;
      }
    }

    .stp-list {
      display: flex;
      align-items: center;
      gap: 0.6rem;
      list-style: none;
      margin: 0;
      padding: 0;
    }

    .stp-item {
      display: flex;
      align-items: center;
      gap: 0.6rem;
    }

    .stp-item:not(:last-child) {
      flex: 1;
    }

    .stp-trigger {
      display: inline-flex;
      align-items: center;
      gap: 0.55rem;
      color: var(--pg-text-muted);
      white-space: nowrap;
    }

    .stp-trigger[aria-current='step'] {
      color: var(--pg-text);
    }

    .stp-indicator {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex: none;
      width: 1.9rem;
      height: 1.9rem;
      border-radius: 50%;
      border: 2px solid var(--pg-border-strong);
      background: var(--pg-surface);
      font-size: 0.8rem;
      font-weight: 700;
      color: var(--pg-text-muted);
    }

    .stp-indicator[data-state='active'] {
      border-color: var(--pg-primary);
      color: var(--pg-primary);
    }

    .stp-indicator[data-state='completed'] {
      border-color: var(--pg-primary);
      background: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }

    .stp-label {
      font-size: 0.92rem;
      font-weight: 600;
    }

    .stp-sep {
      flex: 1;
      height: 2px;
      min-width: 1rem;
      border-radius: 2px;
      background: var(--pg-border);
    }

    .stp-sep[data-state='completed'] {
      background: var(--pg-primary);
    }

    .stp-nav {
      display: flex;
      gap: 0.6rem;
    }

    .btn {
      appearance: none;
      font: inherit;
      font-weight: 600;
      font-size: 0.9rem;
      padding: 0.5rem 0.9rem;
      border-radius: var(--pg-radius-sm);
      border: 1px solid var(--pg-border-strong);
      background: var(--pg-surface);
      color: var(--pg-text);
      cursor: pointer;
    }

    .btn:hover {
      background: var(--pg-surface-2);
    }

    .btn[aria-disabled='true'] {
      opacity: 0.45;
      cursor: not-allowed;
    }

    .btn-next {
      background: var(--pg-primary);
      border-color: var(--pg-primary);
      color: var(--pg-on-primary, #fff);
    }
  `,
})
export class StepperProgressExample {
  protected readonly stages: readonly Stage[] = [
    { label: 'Placed' },
    { label: 'Processing' },
    { label: 'Shipped' },
    { label: 'Delivered' },
  ];

  protected readonly step = signal(1);
}
