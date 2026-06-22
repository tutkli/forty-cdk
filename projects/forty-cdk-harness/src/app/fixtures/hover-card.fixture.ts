import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';

@Component({
  selector: 'app-hover-card-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <input id="before" placeholder="before-trigger" />
    <span forHoverCard [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <a data-testid="trigger" forHoverCardTrigger href="#user">Profile</a>
      @if (open()) {
        <div forHoverCardContent data-testid="card">
          <button data-testid="card-button">Add friend</button>
        </div>
      }
    </span>
    <input id="after" placeholder="after-trigger" />
  `,
})
export class HoverCardFixture {
  protected readonly open = signal(false);
}
