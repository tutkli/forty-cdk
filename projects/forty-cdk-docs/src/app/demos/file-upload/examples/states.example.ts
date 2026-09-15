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
      color: var(--ex-muted, #585d66);
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
      color: var(--ex-muted, #585d66);
      background: var(--ex-surface, #ffffff);
      border: 2px dashed var(--ex-border-strong, #d0c9bc);
      border-radius: var(--ex-radius, 22px);
      corner-shape: squircle;
      transition:
        border-color 0.15s ease,
        background 0.15s ease;
    }

    .zone[data-dragging] {
      border-color: var(--ex-accent, #0e7c6b);
      background: color-mix(in srgb, var(--ex-accent, #0e7c6b) 8%, var(--ex-surface, #ffffff));
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
      color: var(--ex-accent, #0e7c6b);
      background: none;
      border: 0;
      padding: 0;
      cursor: pointer;
      text-decoration: underline;
    }

    .zone-accept {
      margin: 0;
      font-size: 0.78rem;
      color: var(--ex-muted, #585d66);
    }

    @media (prefers-reduced-motion: reduce) {
      .zone {
        transition: none;
      }
    }
  `,
})
export class FileUploadStatesExample {}
