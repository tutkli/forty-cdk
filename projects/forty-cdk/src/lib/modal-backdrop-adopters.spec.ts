import { LIBRARY_CODE } from '../test-utils/source-scan';

/**
 * Adoption guard for the modal backdrop
 * ([#2132](https://github.com/tutkli/forty-cdk/issues/2132)): a backdrop closes its surface only
 * when the surface was the topmost pointer layer as the press began, and that rule lives once, in
 * `injectModalBackdrop`. The behaviour is asserted in `modal-backdrop-stacking.spec.ts`; this guard
 * keeps every sibling on the shared path.
 *
 * Two families, both derived from source. A backdrop piece is a host declaring the static
 * `data-for-modal-peer` marker; it must call `injectModalBackdrop`, bind both of its listeners, and
 * never close its surface itself. A modal surface root is a class extending `ModalSurfaceBase`; it
 * must hand the handle its `injectModalShell` call returns to `attachModalShell`, which is what the
 * backdrop's topmost check reads.
 */
const HELPER = 'core-overlay/src/modal-shell/modal-backdrop.ts';

function filesWhere(predicate: (code: string) => boolean): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => predicate(code))
    .map(([path]) => path)
    .sort();
}

const backdrops = filesWhere((code) => code.includes("'data-for-modal-peer': ''"));
const surfaces = filesWhere((code) => /extends ModalSurfaceBase\b/.test(code));

describe('modal backdrop adoption', () => {
  it('derives both families', () => {
    expect(backdrops).toEqual(['dialog/src/dialog-backdrop.ts', 'drawer/src/drawer-backdrop.ts']);
    expect(surfaces).toEqual(['dialog/src/dialog.ts', 'drawer/src/drawer.ts']);
  });

  it.each(backdrops)('%s routes its press through injectModalBackdrop', (path) => {
    const code = LIBRARY_CODE.get(path)!;

    expect(code).toContain('injectModalBackdrop(');
    expect(code).toContain("'(pointerdown)': 'backdrop.pointerDown()'");
    expect(code).toContain("'(click)': 'backdrop.click($event)'");
    expect(code).not.toContain('requestClose(');
    expect(code).not.toContain('registerBackdrop(');
  });

  it.each(surfaces)('%s attaches the handle of its modal shell', (path) => {
    const code = LIBRARY_CODE.get(path)!;

    expect(code).toContain('this.attachModalShell(injectModalShell(this.modalShellConfig()))');
    expect(code.match(/\binjectModalShell\(/g)).toHaveLength(1);
  });

  it('closes a surface with reason "backdrop" from the helper alone', () => {
    const closers = filesWhere((code) => code.includes("requestClose('backdrop')"));

    expect(closers).toEqual([HELPER]);
  });
});
