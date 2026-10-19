import { describe, expect, it } from 'vitest';

import { LIBRARY_CODE } from '../test-utils/source-scan';

function selfHidingIndicators(): ReadonlyMap<string, string> {
  const out = new Map<string, string>();
  for (const code of LIBRARY_CODE.values()) {
    const selector = /selector:\s*'\[(for\w+Indicator)\]'/.exec(code);
    if (selector && /'\[style\.display\]':\s*'[^']*"none"/.test(code)) {
      out.set(selector[1]!, code);
    }
  }
  return out;
}

describe('self-hiding indicator surface', () => {
  const family = selfHidingIndicators();

  it('derives every option indicator into the family', () => {
    expect([...family.keys()]).toEqual(
      expect.arrayContaining([
        'forComboboxIndicator',
        'forListboxOptionIndicator',
        'forMenuItemIndicator',
        'forSelectIndicator',
      ]),
    );
  });

  it.each([...family.keys()])('%s declares no input that keeps it visible', (selector) => {
    const code = family.get(selector)!;
    expect(code).not.toMatch(/\b(?:input|model)(?:\.required)?\s*[<(]/);
    expect(code).not.toMatch(/forceMount|keepMounted/);
  });
});
