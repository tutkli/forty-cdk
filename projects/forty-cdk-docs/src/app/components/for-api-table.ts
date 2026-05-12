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
  styles: `
    :host {
      display: block;
      font-size: 0.95rem;
    }
  `,
  template: `
    <div forAccordion multiple [(value)]="expanded">
      @for (piece of pieces(); track piece.class) {
        <section
          forAccordionItem
          [value]="piece.class"
          class="border-t border-border-soft last:border-b last:border-b-border-soft"
        >
          <h3 class="m-0">
            <button
              forAccordionTrigger
              class="
                group flex w-full cursor-pointer items-center justify-between gap-4
                border-0 bg-transparent px-0 py-4 text-left
                font-[inherit] text-inherit
                focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-accent
              "
            >
              <span class="flex flex-wrap items-baseline gap-3 text-xl font-semibold">
                <code class="bg-transparent p-0">{{ piece.class }}</code>
                @if (piece.selector) {
                  <span class="font-mono text-sm font-normal text-on-surface-muted">
                    {{ piece.selector }}
                  </span>
                }
              </span>
              <span
                aria-hidden="true"
                class="
                  text-sm text-on-surface-subtle transition-transform duration-200 ease-out
                  group-data-[state=open]:rotate-180
                "
              >
                ▾
              </span>
            </button>
          </h3>
          <div forAccordionContent class="pb-6 data-[state=closed]:hidden">
            @if (piece.doc) {
              <p class="m-0 mb-4 text-on-surface-muted">{{ piece.doc }}</p>
            }

            @if (piece.inputs.length) {
              <h4 class="docs-eyebrow mt-5 mb-2">Inputs</h4>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="docs-api-th">Name</th>
                    <th class="docs-api-th">Type</th>
                    <th class="docs-api-th">Default</th>
                    <th class="docs-api-th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (input of piece.inputs; track input.name) {
                    <tr>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ input.name }}</code>
                        @if (input.kind === 'inputRequired') {
                          <span class="docs-badge ml-1.5">required</span>
                        }
                      </td>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ input.type }}</code>
                      </td>
                      <td class="docs-api-td">
                        @if (input.defaultValue !== null) {
                          <code class="docs-inline-code">{{ input.defaultValue }}</code>
                        } @else {
                          <span class="text-on-surface-subtle">—</span>
                        }
                      </td>
                      <td class="docs-api-td">{{ input.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.models.length) {
              <h4 class="docs-eyebrow mt-5 mb-2">Models (two-way bindable)</h4>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="docs-api-th">Name</th>
                    <th class="docs-api-th">Type</th>
                    <th class="docs-api-th">Default</th>
                    <th class="docs-api-th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (model of piece.models; track model.name) {
                    <tr>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ model.name }}</code>
                        @if (model.kind === 'modelRequired') {
                          <span class="docs-badge ml-1.5">required</span>
                        }
                      </td>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ model.type }}</code>
                      </td>
                      <td class="docs-api-td">
                        @if (model.defaultValue !== null) {
                          <code class="docs-inline-code">{{ model.defaultValue }}</code>
                        } @else {
                          <span class="text-on-surface-subtle">—</span>
                        }
                      </td>
                      <td class="docs-api-td">{{ model.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.outputs.length) {
              <h4 class="docs-eyebrow mt-5 mb-2">Outputs</h4>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="docs-api-th">Name</th>
                    <th class="docs-api-th">Payload</th>
                    <th class="docs-api-th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (output of piece.outputs; track output.name) {
                    <tr>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ output.name }}</code>
                      </td>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ output.type }}</code>
                      </td>
                      <td class="docs-api-td">{{ output.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.methods.length) {
              <h4 class="docs-eyebrow mt-5 mb-2">Methods</h4>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="docs-api-th">Signature</th>
                    <th class="docs-api-th">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (method of piece.methods; track method.name) {
                    <tr>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ method.signature }}</code>
                      </td>
                      <td class="docs-api-td">{{ method.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (hostKeys(piece).length) {
              <h4 class="docs-eyebrow mt-5 mb-2">Host bindings</h4>
              <table class="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th class="docs-api-th">Binding</th>
                    <th class="docs-api-th">Expression</th>
                  </tr>
                </thead>
                <tbody>
                  @for (key of hostKeys(piece); track key) {
                    <tr>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ key }}</code>
                      </td>
                      <td class="docs-api-td">
                        <code class="docs-inline-code">{{ piece.host[key] }}</code>
                      </td>
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
