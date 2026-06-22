import { Component, signal } from '@angular/core';

import { flush, renderHost } from '../../src/test-utils';
import { ForTree } from './tree';
import { ForTreeGroup } from './tree-group';
import { ForTreeItem } from './tree-item';
import { ForTreeItemLabel } from './tree-item-label';
import { ForTreeItemToggle } from './tree-item-toggle';
import { expandToReveal } from './tree-filter';

const ANCESTORS = new Map<string, readonly string[]>([
  ['documents', []],
  ['report', ['documents']],
  ['photos', ['documents']],
  ['vacation', ['photos', 'documents']],
  ['work', ['photos', 'documents']],
]);
const ancestorsOf = (value: string): readonly string[] => ANCESTORS.get(value) ?? [];

@Component({
  imports: [ForTree, ForTreeItem, ForTreeItemLabel, ForTreeItemToggle, ForTreeGroup],
  template: `
    <ul forTree [(expanded)]="open" aria-label="Files">
      <li forTreeItem value="documents" data-test-id="documents">
        <div forTreeItemLabel><span forTreeItemToggle>▸</span><span>Documents</span></div>
        @if (open().includes('documents')) {
          <ul forTreeGroup>
            <li forTreeItem value="report" data-test-id="report">
              <div forTreeItemLabel><span>Report</span></div>
            </li>
            <li forTreeItem value="photos" data-test-id="photos">
              <div forTreeItemLabel><span forTreeItemToggle>▸</span><span>Photos</span></div>
              @if (open().includes('photos')) {
                <ul forTreeGroup>
                  <li forTreeItem value="work" data-test-id="work">
                    <div forTreeItemLabel><span>Work</span></div>
                  </li>
                </ul>
              }
            </li>
          </ul>
        }
      </li>
    </ul>
  `,
})
class RevealHost {
  readonly open = signal<readonly string[]>([]);
}

describe('expandToReveal', () => {
  it('returns the full ancestor chain for a deep match', () => {
    const result = expandToReveal(['work'], ancestorsOf);
    expect(result).toHaveLength(2);
    expect(result).toContain('photos');
    expect(result).toContain('documents');
  });

  it('de-duplicates ancestors shared by two matches', () => {
    const result = expandToReveal(['vacation', 'work'], ancestorsOf);
    expect(result).toHaveLength(2);
    expect(result).toContain('photos');
    expect(result).toContain('documents');
  });

  it('returns empty array for empty input', () => {
    expect(expandToReveal([], ancestorsOf)).toEqual([]);
  });

  it('returns empty array when every match is a root', () => {
    expect(expandToReveal(['documents'], ancestorsOf)).toEqual([]);
  });

  it('accepts any Iterable (e.g. a Set)', () => {
    const result = expandToReveal(new Set(['work']), ancestorsOf);
    expect(result).toHaveLength(2);
    expect(result).toContain('photos');
    expect(result).toContain('documents');
  });
});

describe('expandToReveal integration (zoneless)', () => {
  it('reveals a deep node by expanding its ancestors via [(expanded)]', async () => {
    const { el, fixture, instance } = renderHost(RevealHost);
    await flush(fixture);

    expect(el.querySelector('[data-test-id="work"]')).toBeNull();

    instance.open.set([...expandToReveal(['work'], ancestorsOf)]);
    await flush(fixture);

    expect(el.querySelector('[data-test-id="work"]')).not.toBeNull();
    expect(el.querySelector('[data-test-id="documents"]')?.getAttribute('aria-expanded')).toBe(
      'true',
    );
    expect(el.querySelector('[data-test-id="photos"]')?.getAttribute('aria-expanded')).toBe('true');
  });
});
