import { LIBRARY_CODE } from '../test-utils/source-scan';

const STACK = 'core-overlay/src/inert-siblings/inert-siblings.ts';
const DECLARATION = 'core/src/host-attributes/modal-attributes.ts';
const CORE_BARREL = 'core/src/public-api.ts';
const FOCUS_TRAP = 'core/src/focus-trap/focus-trap.ts';

const PEER_REFERENCE = /MODAL_PEER_ATTRIBUTE|data-for-modal-peer/;
const IMPERATIVE_WRITE =
  /\.(?:setAttribute|toggleAttribute|removeAttribute)\(\s*(?:MODAL_PEER_ATTRIBUTE|['"]data-for-modal-peer['"])/;
const STATIC_HOST_WRITE = /['"](?:\[attr\.)?data-for-modal-peer\]?['"]\s*:/;

function filesWhere(predicate: (code: string) => boolean): string[] {
  return [...LIBRARY_CODE]
    .filter(([, code]) => predicate(code))
    .map(([path]) => path)
    .sort();
}

const backdrops = filesWhere(
  (code) =>
    code.includes('injectModalBackdrop(') && !code.includes('function injectModalBackdrop('),
);

describe('modal peer adoption', () => {
  it('derives the backdrop family the static marker is reserved for', () => {
    expect(backdrops).toEqual(['dialog/src/dialog-backdrop.ts', 'drawer/src/drawer-backdrop.ts']);
  });

  it('writes the peer attribute imperatively from the inert-siblings stack alone', () => {
    expect(filesWhere((code) => IMPERATIVE_WRITE.test(code))).toEqual([STACK]);
  });

  it('host-binds the peer attribute on backdrops alone', () => {
    expect(filesWhere((code) => STATIC_HOST_WRITE.test(code))).toEqual(backdrops);
  });

  it('names the peer attribute nowhere else', () => {
    const expected = [STACK, DECLARATION, CORE_BARREL, FOCUS_TRAP, ...backdrops].sort();

    expect(filesWhere((code) => PEER_REFERENCE.test(code))).toEqual(expected);
  });

  it('registers every portaled overlay through the stack', () => {
    expect(filesWhere((code) => code.includes('.registerPeer('))).toEqual([
      'core-overlay/src/modal-shell/modal-shell.ts',
      'core-overlay/src/overlay-controller/overlay-shell.ts',
      'core-overlay/src/overlay-manager/overlay-manager.ts',
    ]);
  });
});
