import { LIBRARY_CODE } from '../test-utils/source-scan';

const GREGORIAN = /\bcalendar:\s*'gregory'/;
const LATIN_DIGITS = /\bString\(|\.padStart\(|\.toString\(/;

/** The text between the bracket at `open` and the one closing it. */
function balanced(code: string, open: number): string {
  const opener = code[open]!;
  const closer = opener === '(' ? ')' : '}';
  let depth = 0;
  for (let i = open; i < code.length; i++) {
    if (code[i] === opener) {
      depth++;
    } else if (code[i] === closer && --depth === 0) {
      return code.slice(open + 1, i);
    }
  }
  throw new Error(`Unbalanced ${opener} at offset ${open}.`);
}

interface Construction {
  readonly site: string;
  readonly pinned: boolean;
}

/**
 * Every `new Intl.DateTimeFormat(…)` in library code, pinned when its options
 * set the Gregorian calendar inline or through an options literal declared in
 * the same file.
 */
function dateTimeFormatConstructions(
  sources: ReadonlyMap<string, string> = LIBRARY_CODE,
): Construction[] {
  const out: Construction[] = [];
  for (const [path, code] of sources) {
    for (const match of code.matchAll(/new Intl\.DateTimeFormat\(/g)) {
      const args = balanced(code, match.index + match[0].length - 1);
      const line = code.slice(0, match.index).split('\n').length;
      const optionsName = /,\s*(\w+)\s*$/.exec(args)?.[1];
      let pinned = GREGORIAN.test(args);
      if (!pinned && optionsName !== undefined) {
        const declaration = new RegExp(`\\b(?:const|let)\\s+${optionsName}\\b[^=]*=\\s*\\{`).exec(
          code,
        );
        pinned =
          declaration !== null &&
          GREGORIAN.test(balanced(code, declaration.index + declaration[0].length - 1));
      }
      out.push({ site: `${path}:${line}`, pinned });
    }
  }
  return out;
}

const VISIBLE_TEXT_FILES = [...LIBRARY_CODE].filter(
  ([path]) => path.startsWith('calendar/src/') || path === 'core/src/datetime/segment-editor.ts',
);

/** The expressions and method bodies that produce a date part's visible text. */
function visibleNumericText(): { readonly site: string; readonly text: string }[] {
  const out: { site: string; text: string }[] = [];
  for (const [path, code] of VISIBLE_TEXT_FILES) {
    for (const match of code.matchAll(/\blabel:\s*([^,\n]+)/g)) {
      out.push({ site: `${path} label`, text: match[1]! });
    }
    for (const match of code.matchAll(
      /\b(triggerLabel|segmentDisplayText|formatYear)\([^)]*\)[^{]*\{/g,
    )) {
      out.push({
        site: `${path} ${match[1]}()`,
        text: balanced(code, match.index + match[0].length - 1),
      });
    }
  }
  return out;
}

describe('locale formatting adoption (meta-guard)', () => {
  it('pins the Gregorian calendar on every Intl.DateTimeFormat the library constructs', () => {
    const constructions = dateTimeFormatConstructions();

    expect(constructions.length).toBeGreaterThanOrEqual(8);
    expect(constructions.filter((c) => !c.pinned).map((c) => c.site)).toEqual([]);
  });

  it('detects an unpinned construction, through an inline literal and an options variable', () => {
    const code = `
      const a = new Intl.DateTimeFormat(locale, { month: 'long' });
      const options: Intl.DateTimeFormatOptions = { hour: '2-digit' };
      const b = new Intl.DateTimeFormat(locale, options);
      const pinnedOptions = { calendar: 'gregory', hour: '2-digit' };
      const c = new Intl.DateTimeFormat(locale, pinnedOptions);
    `;
    const probe = new Map([['probe/src/probe.ts', code]]);

    expect(dateTimeFormatConstructions(probe).map((c) => c.pinned)).toEqual([false, false, true]);
  });

  it('renders every visible calendar and segment number through the locale-digits helper', () => {
    const sites = visibleNumericText();

    expect(sites.map((site) => site.site)).toEqual(
      expect.arrayContaining([
        'calendar/src/calendar-day-navigator.ts label',
        'calendar/src/calendar-year-navigator.ts label',
        'calendar/src/calendar-year-select.ts label',
        'calendar/src/calendar-month-navigator.ts triggerLabel()',
        'calendar/src/calendar-year-navigator.ts triggerLabel()',
        'calendar/src/calendar.ts formatYear()',
        'core/src/datetime/segment-editor.ts segmentDisplayText()',
      ]),
    );
    expect(sites.filter((site) => LATIN_DIGITS.test(site.text)).map((site) => site.site)).toEqual(
      [],
    );
  });
});
