import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import type { DocApiTable, DocPlainTable } from './doc-model';
import { renderDocCell, type DocRenderContext } from './markdown';

/** One documented member, rendered once for both the table and its popover. */
export interface RenderedApiRow {
  readonly property: SafeHtml;
  readonly propertyText: string;
  /** The type up to its first type argument, which is what the column shows. */
  readonly typeKind: string;
  readonly typeFull: string;
  readonly hasDetail: boolean;
  readonly detailLabel: string;
  readonly defaultValue: SafeHtml;
  readonly hasDefaultValue: boolean;
  readonly description: SafeHtml;
  readonly hasDescription: boolean;
}

export interface RenderedApiTable {
  readonly property: string;
  readonly type: string;
  readonly default: string | null;
  readonly description: string;
  readonly rows: readonly RenderedApiRow[];
}

export interface RenderedPlainTable {
  readonly columns: readonly SafeHtml[];
  readonly rows: readonly RenderedPlainRow[];
}

export interface RenderedPlainRow {
  readonly label: SafeHtml;
  readonly labelText: string;
  readonly details: readonly RenderedPlainCell[];
}

export interface RenderedPlainCell {
  readonly header: SafeHtml;
  readonly value: SafeHtml;
}

/**
 * Render an API table for display.
 *
 * Every cell is addressed by the column the compiler resolved it under, so a
 * row that lost or gained a cell cannot shift a description into a column
 * nothing paints — the shape was settled at build time
 * ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)).
 */
export function renderApiTable(
  table: DocApiTable,
  sanitizer: DomSanitizer,
  context: DocRenderContext | null,
): RenderedApiTable {
  const cell = (markdown: string): { html: SafeHtml; text: string } => {
    const rendered = renderDocCell(markdown, context ?? undefined);
    return { html: sanitizer.bypassSecurityTrustHtml(rendered.html), text: rendered.text };
  };
  const hasDefault = table.columns.default !== null;
  return {
    property: stripMarkup(table.columns.property),
    type: stripMarkup(table.columns.type),
    default: table.columns.default === null ? null : stripMarkup(table.columns.default),
    description: stripMarkup(table.columns.description),
    rows: table.rows.map((row) => {
      const property = cell(row.property);
      const type = cell(row.type);
      const defaultValue = cell(row.default ?? '');
      const description = cell(row.description);
      const typeFull = type.text.trim();
      const typeKind = typeFull.split('<')[0]!.trim() || typeFull;
      return {
        property: property.html,
        propertyText: property.text,
        typeKind,
        typeFull,
        hasDetail: typeFull !== '' && typeKind !== typeFull,
        detailLabel: `Show full type${hasDefault ? ', default' : ''} and description for ${property.text}`,
        defaultValue: defaultValue.html,
        hasDefaultValue: defaultValue.text.trim() !== '',
        description: description.html,
        hasDescription: description.text.trim() !== '',
      };
    }),
  };
}

/** Render any other table, keeping its header row and equal-width data rows. */
export function renderPlainTable(
  table: DocPlainTable,
  sanitizer: DomSanitizer,
  context: DocRenderContext | null,
): RenderedPlainTable {
  const headers = table.columns.map((column) =>
    sanitizer.bypassSecurityTrustHtml(renderDocCell(column, context ?? undefined).html),
  );
  return {
    columns: headers,
    rows: table.rows.map((cells) => {
      const label = renderDocCell(cells[0] ?? '', context ?? undefined);
      return {
        label: sanitizer.bypassSecurityTrustHtml(label.html),
        labelText: label.text,
        details: cells.slice(1).map((value, index) => ({
          header: headers[index + 1] ?? sanitizer.bypassSecurityTrustHtml(''),
          value: sanitizer.bypassSecurityTrustHtml(renderDocCell(value, context ?? undefined).html),
        })),
      };
    }),
  };
}

function stripMarkup(markdown: string): string {
  return markdown.replace(/`/g, '').trim();
}
