import type { DomSanitizer } from '@angular/platform-browser';

import { renderDocCell } from '../../../../../scripts/docs/doc-render.mjs';
import { renderApiTable, type RenderedApiRow } from './doc-table';

const sanitizer = { bypassSecurityTrustHtml: (html: string) => html } as unknown as DomSanitizer;

function rowFor(type: string): RenderedApiRow {
  const table = renderApiTable(
    {
      role: 'api',
      columns: { property: 'Property', type: 'Type', default: null, description: 'Description' },
      rows: [
        {
          property: renderDocCell('`member`'),
          type: renderDocCell(type),
          default: null,
          description: renderDocCell('What it does.'),
        },
      ],
    },
    sanitizer,
    (html) => html,
  );
  return table.rows[0]!;
}

describe('the type an API row shows in its column', () => {
  it('abbreviates a named generic to its name and keeps the full type behind the detail', () => {
    const row = rowFor('`input<boolean>`');

    expect(row.typeKind).toBe('input');
    expect(row.typeFull).toBe('input<boolean>');
    expect(row.hasDetail).toBe(true);
  });

  it('abbreviates a dotted generic name', () => {
    expect(rowFor('`input.required<string>`').typeKind).toBe('input.required');
  });

  it('shows a function type returning a union with a generic whole', () => {
    const row = rowFor('`() => void | Promise<unknown>`');

    expect(row.typeKind).toBe('() => void | Promise<unknown>');
    expect(row.hasDetail).toBe(false);
  });

  it('shows a union whose first member is not a generic whole', () => {
    expect(rowFor('`string | Signal<number>`').typeKind).toBe('string | Signal<number>');
  });

  it('shows a type with no type argument whole', () => {
    const row = rowFor('`Side | undefined`');

    expect(row.typeKind).toBe('Side | undefined');
    expect(row.hasDetail).toBe(false);
  });
});
