import { Component, type Provider, provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { ForCombobox, provideForComboboxDefaults } from 'forty-cdk/combobox';
import { ForContextMenu } from 'forty-cdk/context-menu';
import { ForMenuSub, provideForMenuDefaults } from 'forty-cdk/menu';

const BASE_SOURCES = import.meta.glob(
  './anchored-{overlay-positioning,form-value-control}-base.ts',
  {
    query: '?raw',
    import: 'default',
    eager: true,
  },
) as Record<string, string>;

/**
 * The positioning block a base declares: everything from the abstract seed
 * accessor to the end of the class. Both bases are expected to carry it
 * character-for-character, so the region is extracted rather than compared
 * whole — the imports and the class JSDoc above it legitimately differ.
 */
function positioningBlock(source: string): string {
  const start = source.indexOf('  protected abstract readonly positioningDefaults');
  const end = source.lastIndexOf('}\n');
  return source.slice(start, end);
}

/**
 * Drift guard for the shared anchored-positioning block ([#962](https://github.com/tutkli/forty-cdk/issues/962),
 * [#1391](https://github.com/tutkli/forty-cdk/issues/1391),
 * [#1726](https://github.com/tutkli/forty-cdk/issues/1726)).
 *
 * All thirteen trigger-anchored roots inherit their nine positioning inputs and
 * five effective computeds instead of declaring them — eight through
 * `AnchoredOverlayPositioningBase` (four of those via `MenuOverlayHost`), and
 * the five that are also form values through `AnchoredFormValueControlBase`,
 * which exists only because TypeScript has single inheritance and they must
 * extend `FormUiControlBase` too.
 *
 * That second base is the one thing here worth being suspicious of, so this case
 * pins the two declarations character-for-character. **What each root then
 * resolves is the positioning-input family's shared contract**
 * ([#1740](https://github.com/tutkli/forty-cdk/issues/1740)): the per-root table
 * that used to live here — the non-seed values coming from the one
 * `ANCHORED_POSITIONING_DEFAULTS` source, the four placement seeds coming from
 * each root's own defaults provider, and a per-instance binding beating both —
 * is now `assertAnchoredPositioningContract`, swept over the source-derived
 * registry in `src/lib/anchored-positioning-adopters.spec.ts` so a fourteenth
 * root cannot join the family uncovered.
 */
describe('anchored positioning inputs', () => {
  it('declares the positioning block identically on both bases', () => {
    const blocks = Object.entries(BASE_SOURCES)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([path, source]) => ({ path, block: positioningBlock(source) }));

    expect(blocks).toHaveLength(2);
    for (const { path, block } of blocks) {
      expect(block, `${path} has no extractable positioning block`).toContain(
        'readonly clipUntilPositioned = input(',
      );
    }
    expect(blocks[0]!.block).toBe(blocks[1]!.block);
  });
});

@Component({
  imports: [ForCombobox, ForContextMenu, ForMenuSub],
  template: `
    <div forCombobox dir="rtl"></div>
    <div forContextMenu dir="rtl">
      <div forMenuSub></div>
    </div>
  `,
})
class RtlHost {}

/**
 * Two roots resolve a placement seed from the writing direction rather than from
 * a fixed literal, which is why their defaults key is nullable: `null` means
 * "derive it". Folding them onto the shared base had to preserve both exactly —
 * the combobox listbox anchors to the input's leading edge, and a submenu opens
 * away from its parent item.
 *
 * The shared contract asserts the four seeds against each root's *settled*
 * placement, so the derivation itself — the one thing about these two that is
 * not the family's uniform behaviour — stays here.
 */
describe('writing-direction placement seeds', () => {
  function setup(providers: Provider[] = []): { combobox: ForCombobox; sub: ForMenuSub } {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), ...providers],
    });
    const fixture = TestBed.createComponent(RtlHost);
    fixture.detectChanges();
    return {
      combobox: fixture.debugElement.query(By.directive(ForCombobox)).injector.get(ForCombobox),
      sub: fixture.debugElement.query(By.directive(ForMenuSub)).injector.get(ForMenuSub),
    };
  }

  it('aligns the combobox listbox to `end` and opens the submenu to `left` under dir="rtl"', () => {
    const { combobox, sub } = setup();

    expect(combobox.align()).toBe('end');
    expect(sub.side()).toBe('left');
  });

  it('lets a scope default pin them regardless of writing direction', () => {
    const { combobox, sub } = setup([
      ...provideForComboboxDefaults({ align: 'center' }),
      ...provideForMenuDefaults({ side: 'top' }),
    ]);

    expect(combobox.align()).toBe('center');
    expect(sub.side()).toBe('top');
  });
});
