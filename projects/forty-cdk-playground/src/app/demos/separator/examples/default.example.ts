import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForSeparator } from 'forty-cdk/separator';

@Component({
  selector: 'app-separator-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForSeparator],
  template: `
    <div class="card">
      <span class="label">Account</span>
      <hr forSeparator class="separator-h" />
      <span class="label">Workspace</span>
      <hr forSeparator class="separator-h" />
      <div class="inline">
        <span>Edit</span>
        <span forSeparator decorative orientation="vertical" class="separator-v"></span>
        <span>Share</span>
        <span forSeparator decorative orientation="vertical" class="separator-v"></span>
        <span>Delete</span>
      </div>
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
      gap: 0.7rem;
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .label {
      font-weight: 600;
    }

    .separator-h {
      width: 100%;
      height: 1px;
      margin: 0;
      border: 0;
      background: var(--pg-border);
    }

    .inline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: var(--pg-text-muted);
    }

    .separator-v {
      width: 1px;
      height: 16px;
      background: var(--pg-border-strong);
    }
  `,
})
export class SeparatorDefaultExample {}
