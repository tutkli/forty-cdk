import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk';
import { queryFlag } from './_query-flag';

@Component({
  selector: 'app-disclosure-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  template: `
    <input data-testid="before" placeholder="before-disclosure" />
    <div forDisclosure [(open)]="open" [disabled]="disabled">
      <button data-testid="trigger" type="button" forDisclosureTrigger>Toggle</button>
      @if (always) {
        <!--
          Always-mounted mode: the panel stays in the DOM regardless of open state.
          ForDisclosureContent reflects aria-hidden="true" + inert while closed so
          the panel is removed from the a11y tree and the focus order.
        -->
        <section data-testid="panel" forDisclosureContent>
          <button data-testid="panel-focusable" type="button">Inside</button>
        </section>
      } @else if (open()) {
        <!--
          Default mode: the consumer wraps the content piece in @if so it mounts
          and unmounts with the disclosure state. This is the idiomatic shape.
        -->
        <section data-testid="panel" forDisclosureContent>
          <button data-testid="panel-focusable" type="button">Inside</button>
        </section>
      }
    </div>
    <input data-testid="after" placeholder="after-disclosure" />
  `,
})
export class DisclosureFixture {
  protected readonly open = signal(false);

  protected readonly always = queryFlag('always');
  protected readonly disabled = queryFlag('disabled');
}
