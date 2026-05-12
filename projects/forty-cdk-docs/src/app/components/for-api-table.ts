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
                focus-visible:rounded focus-visible:outline focus-visible:outline-2
                focus-visible:outline-offset-2 focus-visible:outline-accent
              "
            >
              <span class="flex flex-wrap items-baseline gap-3 text-xl font-semibold">
                <code class="bg-transparent p-0">{{ piece.class }}</code>
                @if (piece.selector) {
                  <span class="font-mono text-[0.85rem] font-normal opacity-65">
                    {{ piece.selector }}
                  </span>
                }
              </span>
              <span
                aria-hidden="true"
                class="
                  text-[0.9rem] opacity-65 transition-transform duration-200 ease-out
                  group-data-[state=open]:rotate-180
                "
              >
                ▾
              </span>
            </button>
          </h3>
          <div forAccordionContent class="pb-6 data-[state=closed]:hidden">
            @if (piece.doc) {
              <p class="m-0 mb-4 opacity-85">{{ piece.doc }}</p>
            }

            @if (piece.inputs.length) {
              <h4 class="mb-2 mt-5 text-[0.85rem] uppercase tracking-wider opacity-65">
                Inputs
              </h4>
              <table class="w-full border-collapse text-[0.9rem]">
                <thead>
                  <tr>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Name</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Type</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Default</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (input of piece.inputs; track input.name) {
                    <tr>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ input.name }}</code>
                        @if (input.kind === 'inputRequired') {
                          <span class="
                              ml-1.5 inline-block rounded-[3px] bg-surface-muted
                              px-1.5 text-[0.7em] uppercase tracking-[0.04em]
                            ">required</span>
                        }
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ input.type }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        @if (input.defaultValue !== null) {
                          <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ input.defaultValue }}</code>
                        } @else {
                          <span class="opacity-40">—</span>
                        }
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">{{ input.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.models.length) {
              <h4 class="mb-2 mt-5 text-[0.85rem] uppercase tracking-wider opacity-65">
                Models (two-way bindable)
              </h4>
              <table class="w-full border-collapse text-[0.9rem]">
                <thead>
                  <tr>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Name</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Type</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Default</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (model of piece.models; track model.name) {
                    <tr>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ model.name }}</code>
                        @if (model.kind === 'modelRequired') {
                          <span class="
                              ml-1.5 inline-block rounded-[3px] bg-surface-muted
                              px-1.5 text-[0.7em] uppercase tracking-[0.04em]
                            ">required</span>
                        }
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ model.type }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        @if (model.defaultValue !== null) {
                          <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ model.defaultValue }}</code>
                        } @else {
                          <span class="opacity-40">—</span>
                        }
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">{{ model.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.outputs.length) {
              <h4 class="mb-2 mt-5 text-[0.85rem] uppercase tracking-wider opacity-65">
                Outputs
              </h4>
              <table class="w-full border-collapse text-[0.9rem]">
                <thead>
                  <tr>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Name</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Payload</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (output of piece.outputs; track output.name) {
                    <tr>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ output.name }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ output.type }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">{{ output.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (piece.methods.length) {
              <h4 class="mb-2 mt-5 text-[0.85rem] uppercase tracking-wider opacity-65">
                Methods
              </h4>
              <table class="w-full border-collapse text-[0.9rem]">
                <thead>
                  <tr>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Signature</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Description</th>
                  </tr>
                </thead>
                <tbody>
                  @for (method of piece.methods; track method.name) {
                    <tr>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ method.signature }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">{{ method.doc || '—' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            }

            @if (hostKeys(piece).length) {
              <h4 class="mb-2 mt-5 text-[0.85rem] uppercase tracking-wider opacity-65">
                Host bindings
              </h4>
              <table class="w-full border-collapse text-[0.9rem]">
                <thead>
                  <tr>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Binding</th>
                    <th class="border-b border-border-soft px-3 py-2 text-left align-top font-semibold opacity-75">Expression</th>
                  </tr>
                </thead>
                <tbody>
                  @for (key of hostKeys(piece); track key) {
                    <tr>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ key }}</code>
                      </td>
                      <td class="border-b border-border-soft px-3 py-2 align-top">
                        <code class="rounded-[3px] bg-surface-muted px-1.5 py-0.5 text-[0.85em]">{{ piece.host[key] }}</code>
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
