import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { flush, renderHost } from '../../src/test-utils';
import { ForCombobox } from './combobox';
import { ForComboboxChips } from './combobox-chips';
import { provideForComboboxDefaults } from './combobox-defaults';
import { ForComboboxInput } from './combobox-input';

const CHIPS_IMPORTS = [ForCombobox, ForComboboxInput, ForComboboxChips];

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
