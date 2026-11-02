import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ForDialogManager, ForDialogTitle } from 'forty-cdk/dialog';
import { ForFieldset } from 'forty-cdk/fieldset';
import { ForPopover, ForPopoverContent, ForPopoverTrigger } from 'forty-cdk/popover';

@Component({
  imports: [ForDialogTitle],
  template: `
    <h2 forDialogTitle>Settings</h2>
    <input data-testid="details-first" aria-label="Name" />
    <details>
      <summary data-testid="details-summary">More</summary>
      <button type="button" data-testid="details-hidden">Hidden</button>
    </details>
  `,
})
class DetailsDialog {}

@Component({
  imports: [ForDialogTitle, ForFieldset],
  template: `
    <h2 forDialogTitle>Profile</h2>
    <fieldset forFieldset [disabled]="true">
      <input data-testid="fieldset-locked" aria-label="Account" />
    </fieldset>
    <input data-testid="fieldset-name" aria-label="Name" />
    <button type="button" data-testid="fieldset-save">Save</button>
  `,
})
class FieldsetDialog {}

@Component({
  selector: 'app-focus-predicates-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForPopover, ForPopoverTrigger, ForPopoverContent],
  template: `
    <button type="button" data-testid="open-details-dialog" (click)="openDetails()">
      Details dialog
    </button>
    <button type="button" data-testid="open-fieldset-dialog" (click)="openFieldset()">
      Fieldset dialog
    </button>
    <div forPopover [(open)]="popoverOpen" ariaLabel="Settings">
      <button type="button" forPopoverTrigger data-testid="popover-trigger">Popover</button>
      @if (popoverOpen()) {
        <div forPopoverContent>
          <input data-testid="popover-first" aria-label="Name" />
          <details>
            <summary data-testid="popover-summary">More</summary>
            <button type="button" data-testid="popover-hidden">Hidden</button>
          </details>
        </div>
      }
    </div>
    <button type="button" data-testid="after-trigger">After</button>
  `,
})
export class FocusPredicatesFixture {
  readonly #dialogs = inject(ForDialogManager);
  readonly popoverOpen = signal(false);

  openDetails(): void {
    this.#dialogs.open(DetailsDialog);
  }

  openFieldset(): void {
    this.#dialogs.open(FieldsetDialog);
  }
}
