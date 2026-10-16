import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { isUnset } from 'forty-cdk/core';
import { pressKey } from 'forty-cdk/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxChip } from './combobox-chip';
import { ForComboboxChipRemove } from './combobox-chip-remove';
import { ForComboboxChips } from './combobox-chips';
import { provideForComboboxDefaults } from 'forty-cdk/defaults';
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
      host: { 'data-fixture': 'unbound-chips-host' },
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
      host: { 'data-fixture': 'scoped-chips-host' },
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

describe('string-valued chip labels before the option renders', () => {
  @Component({
    host: { 'data-fixture': 'string-id-chip-host' },
    imports: CHIP_REMOVE_IMPORTS,
    template: `
      <div forCombobox multiple #cb="forCombobox" [(value)]="value" [itemToStringLabel]="toName">
        <div forComboboxChips>
          @for (c of cb.selected(); track c.value) {
            <span forComboboxChip [value]="c.value" [attr.data-chip]="c.value">
              {{ c.label }}
              <button forComboboxChipRemove [attr.data-test-remove]="c.value">×</button>
            </span>
          }
          <input forComboboxInput />
        </div>
      </div>
    `,
  })
  class StringIdChipHost {
    readonly value = signal<readonly string[]>(['p1']);
    readonly toName = (id: string) => (id === 'p1' ? 'Paris' : id);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('labels a seeded string id through [itemToStringLabel]', async () => {
    const r = renderHost(StringIdChipHost);
    await flush(r.fixture);

    expect(r.query<HTMLElement>('[data-chip="p1"]')!.textContent).toContain('Paris');
    expect(r.query<HTMLButtonElement>('[data-test-remove="p1"]')!.getAttribute('aria-label')).toBe(
      'Remove Paris',
    );
  });
});

describe('ForComboboxChipRemove aria-label (issue #1481)', () => {
  const CHIP_REMOVE_TEMPLATE = `
    <div forCombobox multiple [(query)]="query" [(value)]="value" [(open)]="open">
      <div forComboboxChips>
        @for (v of value(); track $index) {
          <span forComboboxChip [value]="v">
            {{ v }}
            <button forComboboxChipRemove [attr.data-test-remove]="v">×</button>
          </span>
        }
        <input forComboboxInput />
      </div>
    </div>
  `;

  @Component({
    host: { 'data-fixture': 'chip-remove-host' },
    imports: CHIP_REMOVE_IMPORTS,
    template: CHIP_REMOVE_TEMPLATE,
  })
  class ChipRemoveHost {
    readonly query = signal('');
    readonly value = signal<readonly string[]>(['Apple']);
    readonly open = signal(false);
  }

  @Component({
    host: { 'data-fixture': 'scoped-chip-remove-host' },
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
          @for (v of value(); track $index) {
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
    const before = getRemove();
    r.instance.value.set(['Banana']);
    await flush(r.fixture);

    const after = document.querySelector<HTMLButtonElement>('[data-test-remove="Banana"]')!;
    expect(after).toBe(before);
    expect(after.getAttribute('aria-label')).toBe('Quitar Banana');
  });
});

describe('ForComboboxChip with no value binding', () => {
  interface Fruit {
    readonly id: string;
  }

  @Component({
    host: { 'data-fixture': 'unbound-chip-host' },
    imports: [...CHIPS_IMPORTS, ForComboboxChip],
    template: `
      <div
        forCombobox
        multiple
        [(value)]="value"
        [compareWith]="compareWith"
        [itemToStringLabel]="itemToStringLabel"
        [itemToFormValue]="itemToFormValue"
      >
        <div forComboboxChips>
          <span forComboboxChip [value]="value()[0]!" data-test-id="apple">apple</span>
          <span forComboboxChip data-test-id="unbound">unbound</span>
          <input forComboboxInput />
        </div>
      </div>
    `,
  })
  class UnboundChipHost {
    readonly value = signal<readonly Fruit[]>([{ id: 'apple' }]);
    readonly compareWith = vi.fn((a: Fruit, b: Fruit) => a.id === b.id);
    readonly itemToStringLabel = vi.fn((item: Fruit) => item.id);
    readonly itemToFormValue = vi.fn((item: Fruit) => item.id);
  }

  const sentinelCalls = (host: UnboundChipHost): boolean =>
    [host.compareWith, host.itemToStringLabel, host.itemToFormValue].some((spy) =>
      spy.mock.calls.flat().some(isUnset),
    );

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  });

  it('fails loudly in dev mode', () => {
    expect(() => renderHost(UnboundChipHost)).toThrowError(
      /\[forty-cdk\/combobox\] FORCDK-CORE-010: \[forComboboxChip\] has no \[value\] binding/,
    );
  });

  it('never hands the sentinel to a consumer callback in a production build', async () => {
    vi.stubGlobal('ngDevMode', false);
    const r = renderHost(UnboundChipHost);
    await flush(r.fixture);

    expect(r.instance.itemToFormValue).toHaveBeenCalled();
    expect(sentinelCalls(r.instance)).toBe(false);
    expect(r.query('[data-test-id="unbound"]')!.hasAttribute('data-value')).toBe(false);
  });

  it('removes nothing when Backspace is pressed on an unbound chip in a production build', async () => {
    vi.stubGlobal('ngDevMode', false);
    const r = renderHost(UnboundChipHost);
    await flush(r.fixture);
    const chip = r.query<HTMLElement>('[data-test-id="unbound"]')!;

    chip.focus();
    pressKey(chip, 'Backspace');
    await flush(r.fixture);

    expect(r.instance.value()).toEqual([{ id: 'apple' }]);
    expect(sentinelCalls(r.instance)).toBe(false);
  });
});
