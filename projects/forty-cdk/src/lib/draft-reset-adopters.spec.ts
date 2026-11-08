import { LIBRARY_CODE } from '../test-utils/source-scan';

const FORM_VALUE_CONTROL = /\bexport\s+class\s+\w+[^{]*\bimplements\b[^{]*\bFormValueControl\b/;

const DRAFT_HOLDER =
  /\bnew\s+(?:DateFieldEngine|TimeFieldEngine|RangeFieldComposer)\b|\bprovide:\s*FOR_(?:DATE|TIME)_FIELD_HOST\b/;

const RESET_IMPLEMENTATION = /\boverride\s+reset\(\):\s*void\s*\{/;

const TIME_SOURCE_QUERY = /\b(\w+)\s*=\s*contentChild\(\s*FOR_TIME_VALUE_SOURCE\b/;

function draftHoldingControls(): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => FORM_VALUE_CONTROL.test(code) && DRAFT_HOLDER.test(code))
    .map(([path]) => path)
    .sort();
}

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

function bodyAfter(code: string, pattern: RegExp): string | null {
  const match = pattern.exec(code);
  if (!match) {
    return null;
  }
  return balancedBody(code, code.indexOf('{', match.index + match[0].length - 1));
}

interface TimeSourceQuery {
  readonly path: string;
  readonly code: string;
  readonly field: string;
}

function timeSourceQueries(): TimeSourceQuery[] {
  return [...LIBRARY_CODE]
    .flatMap(([path, code]) => {
      const field = TIME_SOURCE_QUERY.exec(code)?.[1];
      return field ? [{ path, code, field }] : [];
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}

function timeSourceSubscriptions({ code, field }: TimeSourceQuery): string[] {
  const reads = new RegExp(`\\b(?:const|let)\\s+(\\w+)\\s*=\\s*this\\.${field}\\(\\)`, 'g');
  const subscriptions: string[] = [];
  for (const [, local] of code.matchAll(reads)) {
    if (!local) {
      continue;
    }
    const body = bodyAfter(code, new RegExp(`\\b${local}\\.value\\.subscribe\\([^{]*\\{`));
    if (body !== null) {
      subscriptions.push(body);
    }
  }
  return subscriptions;
}

describe('draft reset adoption (meta-guard, #2232)', () => {
  it('finds every form control that can hold a draft its value cannot represent', () => {
    expect(draftHoldingControls().length).toBeGreaterThanOrEqual(6);
  });

  it('implements FormUiControl.reset on every one of them', () => {
    const missing = draftHoldingControls().filter(
      (path) => !RESET_IMPLEMENTATION.test(LIBRARY_CODE.get(path)!),
    );
    expect(missing).toEqual([]);
  });
});

describe('time-source bridge adoption (meta-guard, #2729)', () => {
  it('finds every picker that queries FOR_TIME_VALUE_SOURCE', () => {
    expect(timeSourceQueries().map(({ path }) => path)).toContain('date-picker/src/date-picker.ts');
  });

  it('forwards FormUiControl.reset to the queried time source', () => {
    const missing = timeSourceQueries()
      .filter(({ code, field }) => {
        const reset = bodyAfter(code, RESET_IMPLEMENTATION);
        return (
          reset === null || !new RegExp(`\\bthis\\.${field}\\(\\)\\??\\.reset\\(\\)`).test(reset)
        );
      })
      .map(({ path }) => path);
    expect(missing).toEqual([]);
  });

  it('grafts a time committed before any day onto timeGraftBaseDay', () => {
    const queries = timeSourceQueries();
    for (const query of queries) {
      expect(
        timeSourceSubscriptions(query),
        `${query.path} subscribes to its time source`,
      ).not.toHaveLength(0);
    }
    const missing = queries
      .filter((query) =>
        timeSourceSubscriptions(query).some((body) => !/\btimeGraftBaseDay\(/.test(body)),
      )
      .map(({ path }) => path);
    expect(missing).toEqual([]);
  });
});
