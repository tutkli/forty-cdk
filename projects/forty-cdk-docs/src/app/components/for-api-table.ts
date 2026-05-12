import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  linkedSignal,
} from '@angular/core';
import {
  ForAccordion,
  ForAccordionContent,
  ForAccordionItem,
  ForAccordionTrigger,
} from 'forty-cdk';

import type { PrimitiveMetadata } from '../tokens/api-metadata-types';

/**
 * Renders the JSON emitted by `scripts/generate-api-metadata.ts` as the
 * "API reference" section of a primitive page — one collapsible block per
 * directive / component piece, with separate tables for inputs, outputs,
 * models, methods, and host bindings.
 *
 * Each piece is wrapped in `[forAccordionItem]` so the user can collapse
 * pieces they're not studying (Dialog has 6, Tabs has 4). All items start
 * open — the accordion is "browse aid", not the primary navigation.
 *
 * The contract is the JSON shape (see `api-metadata-types.ts`), not the
 * primitive's internal API: changing the library's signal shape regenerates
 * the JSON via `pnpm docs:prebuild`, the component itself never needs to
 * touch the library source.
 */
@Component({
  selector: 'for-api-table',
  imports: [ForAccordion, ForAccordionItem, ForAccordionTrigger, ForAccordionContent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div forAccordion multiple [(value)]="expanded" class="api-accordion">
      @for (piece of pieces(); track piece.class) {
        <section forAccordionItem [value]="piece.class" class="api-piece">
          <h3 class="api-piece__heading">
            <button forAccordionTrigger class="api-piece__trigger">
              <span class="api-piece__title">
                <code>{{ piece.class }}</code>
                @if (piece.selector) {
                  <span class="api-piece__selector">{{ piece.selector }}</span>
                }
              </span>
              <span class="api-piece__chevron" aria-hidden="true">▾</span>
            </button>
          </h3>
          <div forAccordionContent class="api-piece__body">
            @if (piece.doc) {
              <p class="api-piece__doc">{{ piece.doc }}</p>
            }

            @if (piece.inputs.length) {
              <h4 class="api-section__title">Inputs</h4>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (input of piece.inputs; track input.name) {
                    <tr>
                      <td>
                        <code>{{ input.name }}</code>
                        @if (input.kind === 'inputRequired') {
                          <span class="api-required">required</span>
                        }
                      </td>
                      <td><code>{{ input.type }}</code></td>
                      <td>
                        @if (input.defaultValue !== null) {
                          <code>{{ input.defaultValue }}</code>
                        } @else {
                          <span class="api-empty">—</span>
                        }
                      </td>
                      <td>{{ input.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.models.length) {
              <h4 class="api-section__title">Models (two-way bindable)</h4>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Default</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (model of piece.models; track model.name) {
                    <tr>
                      <td>
                        <code>{{ model.name }}</code>
                        @if (model.kind === 'modelRequired') {
                          <span class="api-required">required</span>
                        }
                      </td>
                      <td><code>{{ model.type }}</code></td>
                      <td>
                        @if (model.defaultValue !== null) {
                          <code>{{ model.defaultValue }}</code>
                        } @else {
                          <span class="api-empty">—</span>
                        }
                      </td>
                      <td>{{ model.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.outputs.length) {
              <h4 class="api-section__title">Outputs</h4>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Payload</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (output of piece.outputs; track output.name) {
                    <tr>
                      <td><code>{{ output.name }}</code></td>
                      <td><code>{{ output.type }}</code></td>
                      <td>{{ output.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.methods.length) {
              <h4 class="api-section__title">Methods</h4>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>Signature</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (method of piece.methods; track method.name) {
                    <tr>
                      <td><code>{{ method.signature }}</code></td>
                      <td>{{ method.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (hostKeys(piece).length) {
              <h4 class="api-section__title">Host bindings</h4>
              <table class="api-table">
                <thead>
                  <tr>
                    <th>Binding</th>
                    <th>Expression</th>
                  </tr>
                </thead>
                <tbody>
                  @for (key of hostKeys(piece); track key) {
                    <tr>
                      <td><code>{{ key }}</code></td>
                      <td><code>{{ piece.host[key] }}</code></td>
                    </tr>
                  }
                </tbody>
              </table>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
      font-size: 0.95rem;
    }
    .api-piece {
      border-top: 1px solid var(--for-border);
    }
    .api-piece:last-of-type {
      border-bottom: 1px solid var(--for-border);
    }
    .api-piece__heading {
      margin: 0;
    }
    .api-piece__trigger {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 0;
      background: transparent;
      border: none;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;
    }
    .api-piece__trigger:focus-visible {
      outline: 2px solid var(--for-accent);
      outline-offset: 2px;
      border-radius: 4px;
    }
    .api-piece__title {
      display: flex;
      flex-wrap: wrap;
      gap: 0.75rem;
      align-items: baseline;
      font-size: 1.25rem;
      font-weight: 600;
    }
    .api-piece__title code {
      background: transparent;
      padding: 0;
    }
    .api-piece__selector {
      font-family: var(--for-font-mono);
      font-size: 0.85rem;
      opacity: 0.65;
      font-weight: 400;
    }
    .api-piece__chevron {
      font-size: 0.9rem;
      opacity: 0.65;
      transition: transform 160ms ease;
    }
    .api-piece__trigger[data-state='open'] .api-piece__chevron {
      transform: rotate(180deg);
    }
    .api-piece__body[data-state='closed'] {
      display: none;
    }
    .api-piece__body {
      padding: 0 0 1.5rem;
    }
    .api-piece__doc {
      margin: 0 0 1rem;
      opacity: 0.85;
    }
    .api-section__title {
      margin: 1.25rem 0 0.5rem;
      font-size: 0.85rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.65;
    }
    .api-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.9rem;
    }
    .api-table th,
    .api-table td {
      padding: 0.5rem 0.75rem;
      text-align: left;
      vertical-align: top;
      border-bottom: 1px solid var(--for-border);
    }
    .api-table th {
      font-weight: 600;
      opacity: 0.75;
    }
    .api-table code {
      background: var(--for-surface-muted);
      padding: 0.05rem 0.3rem;
      border-radius: 3px;
      font-size: 0.85em;
    }
    .api-required {
      display: inline-block;
      margin-left: 0.4rem;
      padding: 0 0.4rem;
      border-radius: 3px;
      background: var(--for-surface-muted);
      font-size: 0.7em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .api-empty {
      opacity: 0.4;
    }
  `,
})
export class ForApiTable {
  readonly metadata = input.required<PrimitiveMetadata>();

  protected readonly pieces = computed(() => this.metadata().pieces);

  /**
   * Tracks the list of expanded piece names. Reset whenever the metadata
   * changes (so navigating between primitives starts everything open), but
   * remains user-mutable between transitions.
   */
  protected readonly expanded = linkedSignal<readonly string[]>(() =>
    this.pieces().map((p) => p.class),
  );

  protected hostKeys(piece: PrimitiveMetadata['pieces'][number]): string[] {
    return Object.keys(piece.host);
  }
}
