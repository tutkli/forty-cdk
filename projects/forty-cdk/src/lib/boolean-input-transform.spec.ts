import { describe, expect, it } from 'vitest';

import { LIBRARY_CODE } from '../test-utils/source-scan';

const BOOLEAN_INPUT = /\breadonly (\w+) = input(?:<boolean>)?\(\s*(?:true|false)\s*(,[^;]*)?\);/g;

function booleanInputs(): { transformed: string[]; bare: string[] } {
  const transformed: string[] = [];
  const bare: string[] = [];
  for (const [path, code] of LIBRARY_CODE) {
    for (const match of code.matchAll(BOOLEAN_INPUT)) {
      const id = `${path}::${match[1]}`;
      (/transform:\s*booleanAttribute\b/.test(match[2] ?? '') ? transformed : bare).push(id);
    }
  }
  return { transformed, bare };
}

describe('boolean inputs accept the bare attribute', () => {
  const { transformed, bare } = booleanInputs();

  it('finds the boolean inputs it scans', () => {
    expect(transformed.length).toBeGreaterThan(100);
  });

  it('declares every boolean input with transform: booleanAttribute', () => {
    expect(bare).toEqual([]);
  });
});
