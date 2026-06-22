import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  ForStepper,
  ForStepperCompletedContent,
  ForStepperContent,
  ForStepperIndicator,
  ForStepperItem,
  ForStepperList,
  ForStepperNext,
  ForStepperPrevious,
  ForStepperSeparator,
  ForStepperTrigger,
} from 'forty-cdk/stepper';

/**
 * Stepper harness fixture — exercises focus, keyboard navigation, linear
 * gating, and both accessibility modes on real browsers.
 *
 * Renders 4 steps with `data-testid="trigger-0..3"`,
 * `data-testid="content-0..3"`, `data-testid="next"` / `data-testid="prev"`,
 * a `data-testid="before"` input for Tab-into tests,
 * `data-testid="complete-0..3"` buttons to flip each step's `completed` flag
 * so linear-unblock paths can be exercised,
 * `data-testid="completed"` for the terminal completed panel, and
 * `data-testid="complete-count"` showing how many times `(complete)` fired.
 *
 * Query params:
 *  - `?mode=progress` — switches to progress mode (default `interactive`).
 *  - `?linear=1` — enables linear progression.
 *  - `?orientation=vertical` — switches to vertical layout.
 *  - `?activation=automatic` — switches to automatic activation (default `manual`).
 *  - `?dir=rtl` — flips ArrowLeft / ArrowRight horizontally.
 */
@Component({
  selector: 'app-stepper-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ForStepper,
    ForStepperList,
    ForStepperItem,
    ForStepperTrigger,
    ForStepperIndicator,
    ForStepperSeparator,
    ForStepperContent,
    ForStepperCompletedContent,
    ForStepperNext,
    ForStepperPrevious,
  ],
  template: `
    <input data-testid="before" placeholder="before-stepper" />

    <div
      forStepper
      [(selectedIndex)]="selectedIndex"
      [mode]="mode"
      [linear]="linear"
      [orientation]="orientation"
      [activationMode]="activationMode"
      [dir]="dir"
      (complete)="onComplete()"
    >
      <ol forStepperList ariaLabel="Checkout steps">
        @for (step of steps; track step.index) {
          <li forStepperItem [completed]="completed()[step.index]">
            <button forStepperTrigger [attr.data-testid]="'trigger-' + step.index">
              <span forStepperIndicator></span>
              {{ step.label }}
            </button>
            @if (step.index < steps.length - 1) {
              <span forStepperSeparator></span>
            }
          </li>
        }
      </ol>

      @for (step of steps; track step.index) {
        <section forStepperContent [attr.data-testid]="'content-' + step.index">
          {{ step.label }} content
        </section>
      }

      <section forStepperCompletedContent data-testid="completed">All steps complete</section>
      <button forStepperPrevious data-testid="prev">Back</button>
      <button forStepperNext data-testid="next">Next</button>
    </div>

    <output data-testid="complete-count">{{ completeCount() }}</output>

    <div>
      @for (step of steps; track step.index) {
        <button
          type="button"
          [attr.data-testid]="'complete-' + step.index"
          (click)="toggleCompleted(step.index)"
        >
          Toggle completed {{ step.index }}
        </button>
      }
    </div>
  `,
})
export class StepperFixture {
  readonly #route = inject(ActivatedRoute);

  protected readonly mode: 'interactive' | 'progress' =
    this.#route.snapshot.queryParamMap.get('mode') === 'progress' ? 'progress' : 'interactive';

  protected readonly linear: boolean = this.#route.snapshot.queryParamMap.get('linear') === '1';

  protected readonly orientation: 'horizontal' | 'vertical' =
    this.#route.snapshot.queryParamMap.get('orientation') === 'vertical'
      ? 'vertical'
      : 'horizontal';

  protected readonly activationMode: 'manual' | 'automatic' =
    this.#route.snapshot.queryParamMap.get('activation') === 'automatic' ? 'automatic' : 'manual';

  protected readonly dir: 'ltr' | 'rtl' =
    this.#route.snapshot.queryParamMap.get('dir') === 'rtl' ? 'rtl' : 'ltr';

  protected readonly selectedIndex = signal(0);

  protected readonly completed = signal<readonly boolean[]>([false, false, false, false]);

  protected readonly steps = [
    { index: 0, label: 'Step One' },
    { index: 1, label: 'Step Two' },
    { index: 2, label: 'Step Three' },
    { index: 3, label: 'Step Four' },
  ];

  protected readonly completeCount = signal(0);

  protected toggleCompleted(index: number): void {
    this.completed.update((arr) => {
      const next = [...arr];
      next[index] = !next[index];
      return next;
    });
  }

  protected onComplete(): void {
    this.completeCount.update((n) => n + 1);
  }
}
