import { entryPointOf, LIBRARY_CODE } from '../test-utils/source-scan';

const OWN_TAB_HANDLING: Readonly<Record<string, string>> = {
  menu: 'every menu item and sub-trigger closes the whole menu chain on Tab through handleMenuTabOut',
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
        'combobox/src/combobox-content.ts',
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

const UNTABBABLE_SURFACE_TAB_COMMITS: Readonly<Record<string, string>> = {
  'combobox/src/combobox-input.ts': 'combobox/src/combobox-content.ts',
};

const TAB_CLOSE = /closeOverlay\('tab'\)/g;
const SHELL_TAB_CLOSE = /close: \(\) => [\w.#]+\.closeOverlay\('tab'\)/g;
const ROUTED_TAB_CLOSE =
  /\.commitTabToTrigger\(event\);\s+this\.#controller\.closeOverlay\('tab'\)/g;
const TABBABLE_TABINDEX_BINDING = /'\[attr\.tabindex\]': '[^']*"0"/;

const count = (code: string, pattern: RegExp): number => code.match(pattern)?.length ?? 0;

describe('hand-written Tab commits keep the closing surface out of the browser advance', () => {
  const commits = [...LIBRARY_CODE].filter(
    ([, code]) => count(code, TAB_CLOSE) > count(code, SHELL_TAB_CLOSE),
  );

  it('finds the hand-written Tab commits', () => {
    expect(commits.map(([path]) => path)).toEqual(
      expect.arrayContaining(['select/src/select.ts', 'time-picker/src/time-picker.ts']),
    );
  });

  for (const [path, code] of commits) {
    const surface = UNTABBABLE_SURFACE_TAB_COMMITS[path];

    if (surface === undefined) {
      it(`${path} hands every Tab commit to commitTabToTrigger before closing`, () => {
        expect(count(code, ROUTED_TAB_CLOSE)).toBe(count(code, TAB_CLOSE));
      });
    } else {
      it(`${path} is excluded because ${surface} never binds a tabbable tabindex`, () => {
        expect(LIBRARY_CODE.get(surface)).not.toMatch(TABBABLE_TABINDEX_BINDING);
      });
    }
  }

  it('marks the content inert from commitTabToTrigger through the shell helper', () => {
    const controller = LIBRARY_CODE.get(
      'core-anchored/src/listbox-overlay/listbox-overlay-controller.ts',
    )!;
    const body = controller.slice(controller.indexOf('commitTabToTrigger(event: KeyboardEvent)'));

    expect(body).toMatch(
      /^commitTabToTrigger\(event: KeyboardEvent\): void \{[\s\S]*?skipTabDefaultAction\(content\);/,
    );
  });

  it('names only exclusions that are still hand-written Tab commits', () => {
    const paths = new Set(commits.map(([path]) => path));
    for (const path of Object.keys(UNTABBABLE_SURFACE_TAB_COMMITS)) {
      expect(paths).toContain(path);
    }
  });
});
