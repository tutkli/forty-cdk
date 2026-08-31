import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ForVisuallyHidden } from 'forty-cdk/visually-hidden';

@Component({
  selector: 'app-visually-hidden-default-example',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ForVisuallyHidden],
  template: `
    <div class="card">
      <a forVisuallyHidden focusable href="#vh-main" class="skip">Skip to content</a>

      <p class="hint">Tab into the card: the skip link is the first stop and un-clips on focus.</p>

      <div class="toolbar">
        <button type="button" class="icon-button">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
            <path
              d="M6 2h4v1h3v1H3V3h3V2Zm-2 3h8l-.7 8.2a1 1 0 0 1-1 .8H5.7a1 1 0 0 1-1-.8L4 5Z"
              fill="currentColor"
            />
          </svg>
          <span forVisuallyHidden>Delete invoice</span>
        </button>

        <button type="button" class="icon-button">
          <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
            <path
              d="M12.1 2.5 13.5 3.9 5.4 12H4v-1.4l8.1-8.1ZM2 14h12v1H2v-1Z"
              fill="currentColor"
            />
          </svg>
          <span forVisuallyHidden>Rename invoice</span>
        </button>
      </div>

      <table id="vh-main" class="invoices">
        <caption forVisuallyHidden>
          Invoices, sorted by due date, ascending
        </caption>
        <thead>
          <tr>
            <th scope="col">Invoice</th>
            <th scope="col">Due</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>#4021</td>
            <td>12 Mar</td>
          </tr>
          <tr>
            <td>#4022</td>
            <td>19 Mar</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
  styles: `
    :host {
      display: contents;
    }

    .card {
      width: min(460px, 100%);
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 1rem 1.1rem;
      background: var(--pg-surface);
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
    }

    .skip:focus {
      align-self: flex-start;
      padding: 0.35rem 0.7rem;
      border-radius: var(--pg-radius);
      background: var(--pg-primary);
      color: var(--pg-surface);
      text-decoration: none;
    }

    .hint {
      margin: 0;
      color: var(--pg-text-muted);
      font-size: 0.85rem;
    }

    .toolbar {
      display: flex;
      gap: 0.5rem;
    }

    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 2rem;
      height: 2rem;
      padding: 0;
      border: 1px solid var(--pg-border);
      border-radius: var(--pg-radius);
      background: transparent;
      color: inherit;
      cursor: pointer;
    }

    .invoices {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 0.9rem;
    }

    .invoices th,
    .invoices td {
      padding: 0.4rem 0.5rem;
      border-bottom: 1px solid var(--pg-border);
    }
  `,
})
export class VisuallyHiddenDefaultExample {}
