import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk';

/**
 * Mount / unmount the panel with `@if (open())` so it leaves the DOM when
 * closed. The directive reflects `data-state` and `data-disabled` so CSS hooks
 * remain on the trigger even while the panel is gone.
 */
@Component({
  selector: 'for-example-disclosure-basic',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forDisclosure [(open)]="isOpen" class="example-root">
      <button type="button" forDisclosureTrigger class="example-trigger">
        {{ isOpen() ? 'Hide' : 'Show' }} details
      </button>
      @if (isOpen()) {
        <div forDisclosureContent class="example-panel">
          <p>This panel mounts when <code>open()</code> is true and unmounts when it flips back.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .example-root {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .example-trigger {
      align-self: flex-start;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      border: 1px solid color-mix(in oklch, currentColor 25%, transparent);
      background: color-mix(in oklch, currentColor 4%, transparent);
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    .example-trigger[data-state='open'] {
      background: color-mix(in oklch, currentColor 12%, transparent);
    }
    .example-panel {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      background: color-mix(in oklch, currentColor 6%, transparent);
    }
    .example-panel p {
      margin: 0;
    }
  `,
})
export default class ExampleDisclosureBasic {
  protected readonly isOpen = signal(false);
}
