import { LIBRARY_CODE } from '../test-utils/source-scan';

const LABEL_HELPER = 'dragAnnouncementLabel';
const LIFT_ANNOUNCEMENT = /\.(?:reorder|drag)?[aA]nnounceLift\(/;
const FUNCTION_DECLARATION = /function\s+(\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g;

function announcers(): string[] {
  return [...LIBRARY_CODE]
    .filter(([path, source]) => !path.startsWith('defaults/') && LIFT_ANNOUNCEMENT.test(source))
    .map(([path]) => path)
    .sort();
}

function labelFunctions(): string[] {
  const names: string[] = [];
  for (const [path, source] of LIBRARY_CODE) {
    if (path.startsWith('core/')) {
      continue;
    }
    for (const match of source.matchAll(FUNCTION_DECLARATION)) {
      if (match[2]!.includes(`${LABEL_HELPER}(`)) {
        names.push(match[1]!);
      }
    }
  }
  return names;
}

function coordinators(): string[] {
  return [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        !path.startsWith('drag-drop/') && source.includes('.beginCoordinatorLift('),
    )
    .map(([path]) => path)
    .sort();
}

describe('drag announcement label and windowed coordinator seam (meta-guard)', () => {
  it('finds the library sources through the glob', () => {
    expect(LIBRARY_CODE.size).toBeGreaterThan(100);
  });

  it('finds the shared label helper in core', () => {
    expect(LIBRARY_CODE.get('core/src/drag-session/drag-announcement-label.ts')).toContain(
      `export function ${LABEL_HELPER}(`,
    );
  });

  it('finds every module announcing a drag lift', () => {
    expect(announcers().length).toBeGreaterThanOrEqual(5);
  });

  it('names the dragged item through the shared helper in every announcing module', () => {
    const helpers = [LABEL_HELPER, ...labelFunctions()];
    const missing = announcers().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      return !helpers.some((name) => source.includes(`${name}(`));
    });
    expect(missing).toEqual([]);
  });

  it('reads no raw textContent in any announcing module', () => {
    expect(announcers().filter((path) => LIBRARY_CODE.get(path)!.includes('.textContent'))).toEqual(
      [],
    );
  });

  it('finds every coordinator driving a drag lift a composed drop list does not own', () => {
    expect(coordinators().length).toBeGreaterThanOrEqual(2);
  });

  it('has every such coordinator provide the drop-list seam and resolve through the shared resolver', () => {
    const missing = coordinators().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      return !(
        source.includes('provide: FOR_DROP_LIST_COORDINATOR') &&
        source.includes('resolveWindowedReorder(')
      );
    });
    expect(missing).toEqual([]);
  });
});
