import { Component, type Type, signal } from '@angular/core';

import { type DateRange, provideNativeDateAdapter } from 'forty-cdk/shared';
import {
  ForDateRangeField,
  ForDateRangeFieldEnd,
  ForDateRangeFieldSegment,
  ForDateRangeFieldStart,
} from 'forty-cdk/date-field';
import { pressKey } from 'forty-cdk/testing';
import {
  ForTimeRangeField,
  ForTimeRangeFieldEnd,
  ForTimeRangeFieldSegment,
  ForTimeRangeFieldStart,
} from 'forty-cdk/time-field';

import { flush, renderHost } from '../test-utils';
import { LIBRARY_CODE } from '../test-utils/source-scan';

const COMPOSER_PATH = 'core/src/datetime/range-field-composer.ts';

const CONSTRUCTS_COMPOSER = /\bnew\s+RangeFieldComposer\s*</;

const ENGINE_CONSTRUCTION = /\bthis\.(#?\w+)\s*=\s*new\s+\w+FieldEngine\s*<[^>]*>\s*\(\s*\{/g;

const ON_COMMIT = /\bonCommit\s*:/g;

@Component({
  imports: [
    ForTimeRangeField,
    ForTimeRangeFieldStart,
    ForTimeRangeFieldEnd,
    ForTimeRangeFieldSegment,
  ],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'time-range-clamp' },
  template: `
    <div
      forTimeRangeField
      [(value)]="value"
      [minTime]="minTime"
      [hourCycle]="24"
      granularity="minute"
      locale="en-US"
      ariaLabel="Opening hours"
    >
      <div forTimeRangeFieldStart #start="forTimeRangeFieldStart">
        @for (s of start.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span
              forTimeRangeFieldSegment
              [segment]="s.type!"
              [attr.data-testid]="'start-' + s.type"
            ></span>
          }
        }
      </div>
      <div forTimeRangeFieldEnd #end="forTimeRangeFieldEnd">
        @for (s of end.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span
              forTimeRangeFieldSegment
              [segment]="s.type!"
              [attr.data-testid]="'end-' + s.type"
            ></span>
          }
        }
      </div>
    </div>
  `,
})
class TimeRangeClampHost {
  readonly value = signal<DateRange<Date> | null>(null);
  readonly minTime = new Date(2000, 0, 1, 8, 0);
}

@Component({
  imports: [
    ForDateRangeField,
    ForDateRangeFieldStart,
    ForDateRangeFieldEnd,
    ForDateRangeFieldSegment,
  ],
  providers: [...provideNativeDateAdapter()],
  host: { 'data-fixture': 'date-range-clamp' },
  template: `
    <div forDateRangeField [(value)]="value" [minDate]="minDate" locale="en-US" ariaLabel="Stay">
      <div forDateRangeFieldStart #start="forDateRangeFieldStart">
        @for (s of start.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span
              forDateRangeFieldSegment
              [segment]="s.type!"
              [attr.data-testid]="'start-' + s.type"
            ></span>
          }
        }
      </div>
      <div forDateRangeFieldEnd #end="forDateRangeFieldEnd">
        @for (s of end.segments(); track s.id) {
          @if (!s.isLiteral) {
            <span
              forDateRangeFieldSegment
              [segment]="s.type!"
              [attr.data-testid]="'end-' + s.type"
            ></span>
          }
        }
      </div>
    </div>
  `,
})
class DateRangeClampHost {
  readonly value = signal<DateRange<Date> | null>(null);
  readonly minDate = new Date(2026, 5, 10);
}

/**
 * One behavioural case per range root: the start entry typed below the lower
 * bound, the segment it is left from, the segment that must read the clamped
 * value once focus moves to the end endpoint, and that value.
 */
interface ClampCase {
  readonly host: Type<unknown>;
  readonly entry: readonly (readonly [segment: string, digits: string])[];
  readonly leaveFrom: string;
  readonly endEntry: string;
  readonly clampedSegment: string;
  readonly typed: string;
  readonly clamped: string;
}

const CLAMP_CASES: Readonly<Record<string, ClampCase>> = {
  'date-field/src/date-range-field.ts': {
    host: DateRangeClampHost,
    entry: [
      ['month', '06'],
      ['day', '05'],
      ['year', '2026'],
    ],
    leaveFrom: 'year',
    endEntry: 'month',
    clampedSegment: 'day',
    typed: '5',
    clamped: '10',
  },
  'time-field/src/time-range-field.ts': {
    host: TimeRangeClampHost,
    entry: [
      ['hour', '07'],
      ['minute', '00'],
    ],
    leaveFrom: 'minute',
    endEntry: 'hour',
    clampedSegment: 'hour',
    typed: '7',
    clamped: '8',
  },
};

function balancedBody(source: string, open: number): string {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') {
      depth++;
    } else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(open, i + 1);
      }
    }
  }
  return source.slice(open);
}

function composerRoots(): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, code]) => path !== COMPOSER_PATH && CONSTRUCTS_COMPOSER.test(code))
    .map(([path]) => path)
    .sort();
}

interface EngineWiring {
  readonly field: string;
  readonly config: string;
}

function engineWirings(code: string): EngineWiring[] {
  return [...code.matchAll(ENGINE_CONSTRUCTION)].map((match) => ({
    field: match[1]!,
    config: balancedBody(code, match.index + match[0].length - 1),
  }));
}

function routesThroughCommitEndpoint({ field, config }: EngineWiring): boolean {
  const escaped = field.replace('#', '\\#');
  return new RegExp(
    `\\bonCommit\\s*:\\s*\\((\\w+)\\)\\s*=>\\s*this\\.#?\\w+\\.commitEndpoint\\(\\s*this\\.${escaped}\\s*,\\s*\\1\\s*\\)`,
  ).test(config);
}

describe('range-field clamp display adoption (meta-guard, #2750)', () => {
  it('derives every RangeFieldComposer root and pairs each with a behavioural case', () => {
    expect(composerRoots()).toEqual(Object.keys(CLAMP_CASES).sort());
  });

  it('routes every endpoint engine commit through the composer commitEndpoint', () => {
    for (const path of composerRoots()) {
      const code = LIBRARY_CODE.get(path)!;
      const wirings = engineWirings(code);
      expect(wirings, `${path} constructs its two endpoint engines`).toHaveLength(2);
      expect(code.match(ON_COMMIT), `${path} wires onCommit only on its engines`).toHaveLength(
        wirings.length,
      );
      const bypassing = wirings.filter((wiring) => !routesThroughCommitEndpoint(wiring));
      expect(
        bypassing.map(({ field }) => field),
        `${path} endpoint engines committing around commitEndpoint`,
      ).toEqual([]);
    }
  });

  for (const [path, testCase] of Object.entries(CLAMP_CASES)) {
    it(`shows a start clamped to the lower bound once focus leaves it while the end is empty (${path})`, async () => {
      const r = renderHost(testCase.host);
      await flush(r.fixture);
      const seg = (which: 'start' | 'end', type: string) =>
        r.query(`[data-testid="${which}-${type}"]`)!;

      for (const [type, digits] of testCase.entry) {
        for (const digit of digits) {
          pressKey(seg('start', type), digit);
        }
        await flush(r.fixture);
      }
      expect(seg('start', testCase.clampedSegment).getAttribute('aria-valuenow')).toBe(
        testCase.typed,
      );

      seg('start', testCase.leaveFrom).dispatchEvent(
        new FocusEvent('blur', { relatedTarget: seg('end', testCase.endEntry) }),
      );
      await flush(r.fixture);
      expect(seg('start', testCase.clampedSegment).getAttribute('aria-valuenow')).toBe(
        testCase.clamped,
      );
    });
  }
});
