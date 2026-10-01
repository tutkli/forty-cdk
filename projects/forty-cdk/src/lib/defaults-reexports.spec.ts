import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  FOR_CALENDAR_DEFAULTS as CALENDAR_ENTRY_TOKEN,
  provideForCalendarDefaults as calendarEntryProvider,
} from 'forty-cdk/calendar';
import {
  FOR_COMBOBOX_DEFAULTS as COMBOBOX_ENTRY_TOKEN,
  provideForComboboxDefaults as comboboxEntryProvider,
} from 'forty-cdk/combobox';
import {
  FOR_CALENDAR_DEFAULTS,
  FOR_COMBOBOX_DEFAULTS,
  FOR_MENU_DEFAULTS,
  FOR_TOOLTIP_DEFAULTS,
  provideForCalendarDefaults,
  provideForComboboxDefaults,
  provideForMenuDefaults,
  provideForTooltipDefaults,
} from 'forty-cdk/defaults';
import {
  FOR_MENU_DEFAULTS as MENU_ENTRY_TOKEN,
  provideForMenuDefaults as menuEntryProvider,
} from 'forty-cdk/menu';
import {
  FOR_TOOLTIP_DEFAULTS as TOOLTIP_ENTRY_TOKEN,
  provideForTooltipDefaults as tooltipEntryProvider,
} from 'forty-cdk/tooltip';

import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const DEFAULTS_SYMBOL = /^(?:FOR_[A-Z_]+_DEFAULTS|provideFor[A-Za-z]+Defaults)$/;
const EXPORT_FROM = /export\s*\{([^}]*)\}\s*from\s*'([^']+)';/g;

/**
 * Every defaults token or provider a primitive barrel exports, with the
 * specifier it is exported from.
 */
function barrelDefaultsExports(): Array<{ entry: string; name: string; from: string }> {
  const found: Array<{ entry: string; name: string; from: string }> = [];
  for (const [path, code] of LIBRARY_CODE) {
    const entry = entryPointOf(path);
    if (!path.endsWith('/src/public-api.ts') || entry === 'defaults') {
      continue;
    }
    for (const match of code.matchAll(EXPORT_FROM)) {
      for (const raw of match[1]!.split(',')) {
        const name = raw.trim().replace(/^type\s+/, '');
        if (DEFAULTS_SYMBOL.test(name)) {
          found.push({ entry, name, from: match[2]! });
        }
      }
    }
  }
  return found;
}

describe('defaults re-exported from primitive entry points', () => {
  const exported = barrelDefaultsExports();

  it('finds the defaults every primitive barrel re-exports', () => {
    expect(exported.filter((e) => e.name.startsWith('provideFor')).length).toBeGreaterThan(30);
  });

  it('re-exports every defaults token and provider from forty-cdk/defaults', () => {
    const elsewhere = exported.filter((e) => e.from !== 'forty-cdk/defaults');

    expect(elsewhere).toEqual([]);
  });

  it('declares no defaults token outside forty-cdk/defaults', () => {
    const declared = [...LIBRARY_CODE]
      .filter(([path]) => entryPointOf(path) !== 'defaults')
      .filter(([, code]) => /\bconst\s+FOR_[A-Z_]+_DEFAULTS\s*=/.test(code))
      .map(([path]) => path);

    expect(declared).toEqual([]);
  });

  it.each([
    ['calendar', CALENDAR_ENTRY_TOKEN, FOR_CALENDAR_DEFAULTS],
    ['combobox', COMBOBOX_ENTRY_TOKEN, FOR_COMBOBOX_DEFAULTS],
    ['menu', MENU_ENTRY_TOKEN, FOR_MENU_DEFAULTS],
    ['tooltip', TOOLTIP_ENTRY_TOKEN, FOR_TOOLTIP_DEFAULTS],
  ])('forty-cdk/%s re-exports the forty-cdk/defaults token itself', (_, entryToken, token) => {
    expect(entryToken).toBe(token);
  });

  it.each([
    ['calendar', calendarEntryProvider, provideForCalendarDefaults],
    ['combobox', comboboxEntryProvider, provideForComboboxDefaults],
    ['menu', menuEntryProvider, provideForMenuDefaults],
    ['tooltip', tooltipEntryProvider, provideForTooltipDefaults],
  ])(
    'forty-cdk/%s re-exports the forty-cdk/defaults provider itself',
    (_, entryProvider, provider) => {
      expect(entryProvider).toBe(provider);
    },
  );

  it('resolves an override provided through forty-cdk/defaults on the token a primitive entry exports', () => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideForComboboxDefaults({ sideOffset: 12 }),
        provideForCalendarDefaults({ firstDayOfWeek: 1 }),
      ],
    });

    expect(TestBed.inject(COMBOBOX_ENTRY_TOKEN).sideOffset).toBe(12);
    expect(TestBed.inject(CALENDAR_ENTRY_TOKEN).firstDayOfWeek).toBe(1);
  });
});
