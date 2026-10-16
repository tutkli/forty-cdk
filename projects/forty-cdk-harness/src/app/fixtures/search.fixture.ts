import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDialog, ForDialogTrigger } from 'forty-cdk/dialog';
import { ForSearch } from 'forty-cdk/search';

@Component({
  selector: 'app-search-fixture',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [
    `
      [forDialog] {
        position: fixed;
        inset: 0;
        margin: auto;
        width: 320px;
        height: 120px;
        background: white;
        border: 1px solid #ccc;
        padding: 16px;
      }
    `,
  ],
  imports: [ForDialog, ForDialogTrigger, ForSearch],
  template: `
    <input
      type="search"
      data-testid="kept"
      forSearch
      [(value)]="kept"
      [clearOnEscape]="false"
      aria-label="Kept query"
    />
    <output data-testid="kept-value">{{ kept() }}</output>

    <input
      type="search"
      data-testid="cleared"
      forSearch
      [(value)]="cleared"
      aria-label="Cleared query"
    />
    <output data-testid="cleared-value">{{ cleared() }}</output>

    <button
      data-testid="palette-trigger"
      forDialogTrigger
      [(open)]="paletteOpen"
      controls="search-palette"
    >
      Open palette
    </button>
    <output data-testid="palette-value">{{ palette() }}</output>

    @if (paletteOpen()) {
      <div
        forDialog
        id="search-palette"
        ariaLabel="Command palette"
        (dismiss)="paletteOpen.set(false)"
      >
        <input
          type="search"
          data-testid="palette"
          forSearch
          [(value)]="palette"
          [clearOnEscape]="false"
          aria-label="Search commands"
        />
      </div>
    }
  `,
})
export class SearchFixture {
  protected readonly kept = signal('');
  protected readonly cleared = signal('');
  protected readonly palette = signal('');
  protected readonly paletteOpen = signal(false);
}
