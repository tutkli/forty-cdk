import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ForDisclosure, ForDisclosureContent, ForDisclosureTrigger } from 'forty-cdk';

/**
 * Drive the open state from outside the directive and observe transitions
 * via `(openChange)`. The model() emitter only fires for *internal* toggles
 * (trigger click) — consumer writes through `[(open)]` stay silent.
 */
@Component({
  selector: 'for-example-disclosure-controlled',
  imports: [ForDisclosure, ForDisclosureTrigger, ForDisclosureContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="example-controls">
      <button type="button" (click)="toggleExternal()">External toggle ({{ counter() }})</button>
      <span aria-live="polite">Last transition emitted: {{ lastReason() }}</span>
    </div>

    <div forDisclosure [(open)]="isOpen" (openChange)="onOpenChange($event)" class="example-root">
      <button type="button" forDisclosureTrigger class="example-trigger">
        Trigger ({{ isOpen() ? 'open' : 'closed' }})
      </button>
      @if (isOpen()) {
        <div forDisclosureContent class="example-panel">
          <p>Use the external button to set the signal — note that (openChange) stays silent.</p>
        </div>
      }
    </div>
  `,
  styles: `
    .example-controls {
      display: flex;
      gap: 1rem;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .example-controls button {
      padding: 0.4rem 0.8rem;
      font: inherit;
      cursor: pointer;
    }
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
    .example-panel {
      padding: 0.75rem 1rem;
      border-radius: 6px;
      background: color-mix(in oklch, currentColor 6%, transparent);
    }
  `,
})
export default class ExampleDisclosureControlled {
  protected readonly isOpen = signal(false);
  protected readonly counter = signal(0);
  protected readonly lastReason = signal<'internal toggle' | '—'>('—');

  protected toggleExternal(): void {
    this.isOpen.update((v) => !v);
    this.counter.update((c) => c + 1);
  }

  protected onOpenChange(value: boolean): void {
    this.lastReason.set('internal toggle');
    // value is the new state; the example just records that the emitter fired.
    void value;
  }
}
