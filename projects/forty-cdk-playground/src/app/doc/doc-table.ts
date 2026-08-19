import type { DomSanitizer, SafeHtml } from '@angular/platform-browser';

import type { DocBase } from './doc-base';
import type { DocPageApiTable, DocPageCell, DocPagePlainTable } from './doc-model';

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
 * ([#1806](https://github.com/tutkli/forty-cdk/issues/1806)), and so was the
 * markup, which reaches here needing a base href and a trust decision and
 * nothing else ([#1807](https://github.com/tutkli/forty-cdk/issues/1807)).
 */
export function renderApiTable(
  table: DocPageApiTable,
  sanitizer: DomSanitizer,
  base: DocBase,
): RenderedApiTable {
  const cell = (value: DocPageCell | null): { html: SafeHtml; text: string } => ({
    html: sanitizer.bypassSecurityTrustHtml(base(value?.html ?? '')),
    text: value?.text ?? '',
  });
  const hasDefault = table.columns.default !== null;
  return {
    property: table.columns.property,
    type: table.columns.type,
    default: table.columns.default,
    description: table.columns.description,
    rows: table.rows.map((row) => {
      const property = cell(row.property);
      const type = cell(row.type);
      const defaultValue = cell(row.default);
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
  table: DocPagePlainTable,
  sanitizer: DomSanitizer,
  base: DocBase,
): RenderedPlainTable {
  const headers = table.columns.map((column) =>
    sanitizer.bypassSecurityTrustHtml(base(column.html)),
  );
  return {
    columns: headers,
    rows: table.rows.map((cells) => {
      const label = cells[0];
      return {
        label: sanitizer.bypassSecurityTrustHtml(base(label?.html ?? '')),
        labelText: label?.text ?? '',
        details: cells.slice(1).map((value, index) => ({
          header: headers[index + 1] ?? sanitizer.bypassSecurityTrustHtml(''),
          value: sanitizer.bypassSecurityTrustHtml(base(value.html)),
        })),
      };
    }),
  };
}
