import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const OWN_TAB_HANDLING: Readonly<Record<string, string>> = {
  combobox:
    'focus stays on [forComboboxInput], whose keydown commits or closes on Tab before the browser moves focus',
  menu: 'every menu item and sub-trigger closes the whole menu chain on Tab through handleMenuTabOut',
  select:
    'the root and its options commit the highlighted option on Tab before the browser moves focus',
  'time-picker': 'its options commit the highlighted slot on Tab before the browser moves focus',
};

const TAB_KEY_HANDLER = /key\s*===\s*'Tab'|case\s+'Tab'\s*:/;

function overlayShellCallSites(): Array<readonly [string, string]> {
  return [...LIBRARY_CODE].filter(
    ([, code]) =>
      !code.includes('export function injectOverlayShell(') &&
      /[^A-Za-z]injectOverlayShell\(/.test(code),
  );
}

function takesFocus(code: string): boolean {
  return /\binitialFocus\s*:/.test(code) || /'\(focusin\)'\s*:/.test(code);
}

function ownsTabHandling(entryPoint: string, shellSite: string): boolean {
  return [...LIBRARY_CODE].some(
    ([path, code]) =>
      path !== shellSite && entryPointOf(path) === entryPoint && TAB_KEY_HANDLER.test(code),
  );
}

describe('focus-taking overlay surfaces route Tab out through the overlay shell', () => {
  const sites = overlayShellCallSites();
  const focusTaking = sites.filter(([, code]) => takesFocus(code));

  it('finds the overlay shell call sites and the focus-taking subset among them', () => {
    expect(sites.length).toBeGreaterThan(focusTaking.length);
    expect(focusTaking.map(([path]) => path)).toEqual(
      expect.arrayContaining([
        'popover/src/popover-content.ts',
        'date-picker/src/date-picker-content.ts',
        'hover-card/src/hover-card-content.ts',
      ]),
    );
  });

  for (const [path, code] of focusTaking) {
    const entryPoint = entryPointOf(path);
    const reason = OWN_TAB_HANDLING[entryPoint];

    if (reason === undefined) {
      it(`${path} passes a tabOut bundle to injectOverlayShell`, () => {
        expect(code).toMatch(/\btabOut\s*:/);
      });
    } else {
      it(`${path} is excluded because ${reason}`, () => {
        expect(code).not.toMatch(/\btabOut\s*:/);
        expect(ownsTabHandling(entryPoint, path)).toBe(true);
      });
    }
  }

  it('names only exclusions that are still focus-taking overlay shell call sites', () => {
    const excluded = new Set(focusTaking.map(([path]) => entryPointOf(path)));
    for (const entryPoint of Object.keys(OWN_TAB_HANDLING)) {
      expect(excluded).toContain(entryPoint);
    }
  });
});
