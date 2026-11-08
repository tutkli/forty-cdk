import { LIBRARY_CODE } from '../test-utils/source-scan';

const LABEL_HELPER = 'dragAnnouncementLabel';
const ANNOUNCER_HELPER = 'DragAnnouncer';
const STEP_HELPER = 'stepDragTarget';
const LIFT_ANNOUNCEMENT = /\.(?:reorder|drag)?[aA]nnounceLift\(/;
const POSITIONAL_BUILDER_CALL = /\.(?:reorder)?[aA]nnounce(?:Lift|Move|Drop|Cancel)\(/;
const HAND_CLAMP = /Math\.max\(\s*0\s*,\s*Math\.min\(/;
const FUNCTION_DECLARATION = /function\s+(\w+)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\}/g;
const TREE_DRAG = 'tree/src/tree-node-drag.ts';
const TREE_DEFAULTS = 'defaults/src/tree-defaults.ts';

function announcers(): string[] {
  return [...LIBRARY_CODE]
    .filter(
      ([path, source]) =>
        !path.startsWith('defaults/') &&
        !path.startsWith('core/') &&
        (LIFT_ANNOUNCEMENT.test(source) || source.includes(`new ${ANNOUNCER_HELPER}(`)),
    )
    .map(([path]) => path)
    .sort();
}

function positionalAnnouncers(): string[] {
  return announcers().filter((path) => path !== TREE_DRAG);
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

  it('finds the shared announcer and step helpers in core', () => {
    const source = LIBRARY_CODE.get('core/src/drag-session/drag-announcer.ts');
    expect(source).toContain(`export class ${ANNOUNCER_HELPER} `);
    expect(source).toContain(`export function ${STEP_HELPER}(`);
  });

  it('finds every module announcing a drag lift', () => {
    expect(announcers().length).toBeGreaterThanOrEqual(5);
    expect(positionalAnnouncers().length).toBeGreaterThanOrEqual(4);
  });

  it('names the dragged item through the shared helper in every announcing module', () => {
    const helpers = [LABEL_HELPER, ...labelFunctions()];
    const missing = announcers().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      return (
        !helpers.some((name) => source.includes(`${name}(`)) &&
        !source.includes(`new ${ANNOUNCER_HELPER}(`)
      );
    });
    expect(missing).toEqual([]);
  });

  it('reads no raw textContent in any announcing module', () => {
    expect(announcers().filter((path) => LIBRARY_CODE.get(path)!.includes('.textContent'))).toEqual(
      [],
    );
  });

  it('reads no accessibleTextContent in any announcing module', () => {
    expect(
      announcers().filter((path) => LIBRARY_CODE.get(path)!.includes('accessibleTextContent(')),
    ).toEqual([]);
  });

  it('builds every positional announcement through the shared announcer', () => {
    const offenders = positionalAnnouncers().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      return POSITIONAL_BUILDER_CALL.test(source) || !source.includes(`new ${ANNOUNCER_HELPER}(`);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps the tree out of the positional family only while its builders name a parent', () => {
    expect(LIBRARY_CODE.get(TREE_DRAG)).not.toContain(`new ${ANNOUNCER_HELPER}(`);
    expect(LIBRARY_CODE.get(TREE_DEFAULTS)).toMatch(
      /dragAnnounceMove: \(\s*label: string,\s*parentLabel/,
    );
  });

  it('steps every keyboard target through the unchanged-step check, never a hand-written clamp', () => {
    const offenders = positionalAnnouncers().filter((path) => {
      const source = LIBRARY_CODE.get(path)!;
      return HAND_CLAMP.test(source) || !source.includes(`${STEP_HELPER}(`);
    });
    expect(offenders).toEqual([]);
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
