import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { LiveAnnouncer } from 'forty-cdk/visually-hidden';

@Component({
  selector: 'app-visually-hidden-announcer-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <div class="row">
        <button type="button" class="button" (click)="save()">Save draft</button>
        <button type="button" class="button" (click)="fail()">Save with no connection</button>
        <button type="button" class="button" (click)="clear()">Clear</button>
      </div>

      <p class="log">
        Last announcement:
        <strong>{{ spoken() ?? '—' }}</strong>
      </p>
      <p class="hint">
        Nothing above is what a screen reader reads — it reads the off-screen live region
        <code>LiveAnnouncer</code> owns. The line is only here so the demo is visible.
      </p>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .card {
      width: min(560px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .button {
      padding: 0.4rem 0.8rem;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .log {
      margin: 0;
    }

    .hint {
      margin: 0;
      color: var(--pg-text-muted);
      font-size: 0.85rem;
    }
  `,
})
export class VisuallyHiddenAnnouncerExample {
  readonly #announcer = inject(LiveAnnouncer);

  protected readonly spoken = signal<string | null>(null);

  protected save(): void {
    this.#speak('Draft saved', 'polite');
  }

  protected fail(): void {
    this.#speak('Could not save. Check your connection.', 'assertive');
  }

  protected clear(): void {
    this.#announcer.clear();
    this.spoken.set(null);
  }

  #speak(message: string, politeness: 'polite' | 'assertive'): void {
    this.#announcer.announce(message, politeness);
    this.spoken.set(`${message} (${politeness})`);
  }
}
