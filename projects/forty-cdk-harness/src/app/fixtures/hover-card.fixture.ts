import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForHoverCard, ForHoverCardContent, ForHoverCardTrigger } from 'forty-cdk/hover-card';

@Component({
  selector: 'app-hover-card-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForHoverCard, ForHoverCardTrigger, ForHoverCardContent],
  template: `
    <input id="before" placeholder="before-trigger" />
    <span forHoverCard #card="forHoverCard" [(open)]="open" [openDelay]="0" [closeDelay]="0">
      <a data-testid="trigger" forHoverCardTrigger href="#user">Profile</a>
      @if (open()) {
        <div forHoverCardContent data-testid="card" style="padding:24px;">
          <button data-testid="card-button">Add friend</button>
        </div>
      }
    </span>
    <input id="after" placeholder="after-trigger" />

    <button data-testid="imp-show" type="button" (click)="card.show()">show</button>
    <button data-testid="imp-hide" type="button" (click)="card.hide()">hide</button>

    <div
      data-testid="scroll-list"
      style="height:96px;width:220px;overflow-y:auto;border:1px solid #ccc;"
    >
      @for (row of rows; track row) {
        <div
          forHoverCard
          #card="forHoverCard"
          [openDelay]="0"
          [closeDelay]="0"
          style="padding:8px;"
        >
          <a [attr.data-testid]="'row-trigger-' + row" forHoverCardTrigger href="#row"
            >Row {{ row }}</a
          >
          @if (card.open()) {
            <div forHoverCardContent [attr.data-testid]="'row-card-' + row">Card {{ row }}</div>
          }
        </div>
      }
    </div>
  `,
})
export class HoverCardFixture {
  protected readonly open = signal(false);
  protected readonly rows = Array.from({ length: 20 }, (_, i) => i);
}
