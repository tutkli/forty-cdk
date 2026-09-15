import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForFileUpload, ForFileUploadInput, ForFileUploadTrigger } from 'forty-cdk/file-upload';

@Component({
  selector: 'app-file-upload-states-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForFileUpload, ForFileUploadInput, ForFileUploadTrigger],
  template: `
    <div class="states">
      <div class="state">
        <span class="state-label">Default</span>
        <div forFileUpload class="zone">
          <input forFileUploadInput class="sr-only" aria-label="Upload files" />
          <p class="zone-text">
            <button forFileUploadTrigger class="zone-btn">Choose a file</button>
            or drag and drop
          </p>
          <p class="zone-accept">Any file type</p>
        </div>
      </div>

      <div class="state">
        <span class="state-label">Disabled</span>
        <div forFileUpload disabled class="zone">
          <input forFileUploadInput class="sr-only" aria-label="Upload files" />
          <p class="zone-text">
            <button forFileUploadTrigger class="zone-btn">Choose a file</button>
            or drag and drop
          </p>
          <p class="zone-accept">Uploads are paused</p>
        </div>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .states {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-start;
      gap: 1.6rem;
    }

    .state {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    .state-label {
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--pg-text-muted);
    }

    .sr-only {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    }

    .zone {
      width: min(300px, 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 1.6rem 1.2rem;
      text-align: center;
      color: var(--pg-text-muted);
      background: var(--pg-surface);
      border: 2px dashed var(--pg-border-strong);
      border-radius: var(--pg-radius);
      corner-shape: squircle;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }

    .zone[data-dragging] {
      border-color: var(--pg-primary);
      background: color-mix(in srgb, var(--pg-primary) 8%, var(--pg-surface));
    }

    .zone[data-disabled] {
      opacity: 0.5;
      pointer-events: none;
    }

    .zone-text {
      margin: 0;
      font-size: 0.92rem;
    }

    .zone-btn {
      font: inherit;
      font-weight: 700;
      color: var(--pg-primary);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .zone-accept {
      margin: 0;
      font-size: 0.78rem;
      color: var(--pg-text-muted);
    }

    @media (prefers-reduced-motion: reduce) {
      .zone {
        transition: none;
      }
    }
  `,
})
export class FileUploadStatesExample {}
