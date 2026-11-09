import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import { ForCheckbox } from 'forty-cdk/checkbox';

@Component({
  selector: 'app-form-required-scroller-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  imports: [ForCheckbox],
  styles: [
    `
      body {
        margin: 0;
      }
      .required-scroller-shell {
        display: flex;
        flex-direction: column;
        height: 100dvh;
      }
      .required-scroller-header {
        flex: none;
        height: 48px;
      }
      .required-scroller-main {
        flex: 1;
        min-height: 0;
        overflow: auto;
      }
      .required-scroller-spacer {
        height: 2000px;
      }
    `,
  ],
  template: `
    <div class="required-scroller-shell">
      <header class="required-scroller-header">Shell</header>
      <main class="required-scroller-main" data-testid="scroller">
        <div class="required-scroller-spacer"></div>
        <form data-testid="form" (submit)="onSubmit($event)">
          <button
            forCheckbox
            name="terms"
            [required]="true"
            aria-label="Terms"
            data-testid="checkbox"
          >
            C
          </button>
          <output data-testid="submits">{{ submits() }}</output>
        </form>
      </main>
    </div>
  `,
})
export class FormRequiredScrollerFixture {
  protected readonly submits = signal(0);

  protected onSubmit(event: Event): void {
    event.preventDefault();
    this.submits.update((n) => n + 1);
  }
}
