import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxChip } from './combobox-chip';
import { ForComboboxChipRemove } from './combobox-chip-remove';
import { ForComboboxChips } from './combobox-chips';
import { provideForComboboxDefaults } from './combobox-defaults';
import { ForComboboxInput } from './combobox-input';

const CHIPS_IMPORTS = [ForCombobox, ForComboboxInput, ForComboboxChips];

const CHIP_REMOVE_IMPORTS = [...CHIPS_IMPORTS, ForComboboxChip, ForComboboxChipRemove];

@Component({
  imports: CHIPS_IMPORTS,
  template: `
    <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
      <div forComboboxChips [ariaLabel]="label()">
        <input forComboboxInput />
      </div>
    </div>
  `,
})
class ChipsHost {
  readonly query = signal('');
  readonly value = signal<readonly string[]>([]);
  readonly open = signal(false);
  readonly label = signal<string | null>('Selected items');
}

describe('ForComboboxChips', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('emits the default aria-label "Selected items"', async () => {
    const r = renderHost(ChipsHost);
    await flush(r.fixture);

    const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
    expect(chipsEl.getAttribute('aria-label')).toBe('Selected items');
  });

  it('[ariaLabel] override changes the emitted aria-label', async () => {
    const r = renderHost(ChipsHost);
    r.instance.label.set('Elementos seleccionados');
    await flush(r.fixture);

    const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
    expect(chipsEl.getAttribute('aria-label')).toBe('Elementos seleccionados');
  });

  describe('scope defaults (issue #1145 item 8)', () => {
    @Component({
      imports: CHIPS_IMPORTS,
      template: `
        <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
          <div forComboboxChips>
            <input forComboboxInput />
          </div>
        </div>
      `,
    })
    class UnboundChipsHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
    }

    @Component({
      imports: CHIPS_IMPORTS,
      providers: [provideForComboboxDefaults({ chipsAriaLabel: 'Etiquetas' })],
      template: `
        <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
          <div forComboboxChips>
            <input forComboboxInput />
          </div>
        </div>
      `,
    })
    class ScopedChipsHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
    }

    @Component({
      imports: CHIPS_IMPORTS,
      providers: [provideForComboboxDefaults({ chipsAriaLabel: 'Etiquetas' })],
      template: `
        <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
          <div forComboboxChips ariaLabel="Tags">
            <input forComboboxInput />
          </div>
        </div>
      `,
    })
    class ScopedOverrideChipsHost {
      readonly query = signal('');
      readonly value = signal<readonly string[]>([]);
      readonly open = signal(false);
    }

    it('an unbound chip cluster falls back to the library default "Selected items"', async () => {
      const r = renderHost(UnboundChipsHost);
      await flush(r.fixture);

      const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
      expect(chipsEl.getAttribute('aria-label')).toBe('Selected items');
    });

    it('an unbound chip cluster uses provideForComboboxDefaults({ chipsAriaLabel })', async () => {
      const r = renderHost(ScopedChipsHost);
      await flush(r.fixture);

      const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
      expect(chipsEl.getAttribute('aria-label')).toBe('Etiquetas');
    });

    it('a per-instance [ariaLabel] beats the scope default', async () => {
      const r = renderHost(ScopedOverrideChipsHost);
      await flush(r.fixture);

      const chipsEl = r.query<HTMLElement>('[forComboboxChips]')!;
      expect(chipsEl.getAttribute('aria-label')).toBe('Tags');
    });
  });
});

describe('ForComboboxChipRemove aria-label (issue #1481)', () => {
  const CHIP_REMOVE_TEMPLATE = `
    <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
      <div forComboboxChips>
        @for (v of value(); track v) {
          <span forComboboxChip [value]="v">
            {{ v }}
            <button forComboboxChipRemove [attr.data-test-remove]="v">×</button>
          </span>
        }
        <input forComboboxInput />
      </div>
    </div>
  `;

  @Component({ imports: CHIP_REMOVE_IMPORTS, template: CHIP_REMOVE_TEMPLATE })
  class ChipRemoveHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>(['Apple']);
    readonly open = signal(false);
  }

  @Component({
    imports: CHIP_REMOVE_IMPORTS,
    providers: [provideForComboboxDefaults({ chipRemoveLabel: (label) => `Quitar ${label}` })],
    template: CHIP_REMOVE_TEMPLATE,
  })
  class ScopedChipRemoveHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>(['Apple']);
    readonly open = signal(false);
  }

  @Component({
    imports: CHIP_REMOVE_IMPORTS,
    template: `
      <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
        <div forComboboxChips>
          @for (v of value(); track v) {
            <span forComboboxChip [value]="v">
              {{ v }}
              <button forComboboxChipRemove aria-label="Static name" [attr.data-test-remove]="v">
                ×
              </button>
            </span>
          }
          <input forComboboxInput />
        </div>
      </div>
    `,
  })
  class StaticLabelChipRemoveHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>(['Apple']);
    readonly open = signal(false);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  function getRemove(): HTMLButtonElement {
    return document.querySelector<HTMLButtonElement>('[data-test-remove="Apple"]')!;
  }

  it('falls back to the library builder output "Remove <label>"', async () => {
    const r = renderHost(ChipRemoveHost);
    await flush(r.fixture);

    expect(getRemove().getAttribute('aria-label')).toBe('Remove Apple');
  });

  it('uses provideForComboboxDefaults({ chipRemoveLabel }) when the scope overrides it', async () => {
    const r = renderHost(ScopedChipRemoveHost);
    await flush(r.fixture);

    expect(getRemove().getAttribute('aria-label')).toBe('Quitar Apple');
  });

  it('does not adopt a consumer static aria-label (#1479 keep decision)', async () => {
    const r = renderHost(StaticLabelChipRemoveHost);
    await flush(r.fixture);

    expect(getRemove().getAttribute('aria-label')).toBe('Remove Apple');
  });

  it('re-derives the name when the chip label changes', async () => {
    const r = renderHost(ScopedChipRemoveHost);
    await flush(r.fixture);
    r.instance.value.set(['Banana']);
    await flush(r.fixture);

    expect(
      document
        .querySelector<HTMLButtonElement>('[data-test-remove="Banana"]')!
        .getAttribute('aria-label'),
    ).toBe('Quitar Banana');
  });
});
