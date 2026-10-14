import { LIBRARY_CODE } from '../test-utils/source-scan';

const PIECE_DECORATOR = /@(?:Directive|Component)\(/g;

const DEFERRED_CALL = /\b(?:afterNextRender|afterEveryRender|effect)\(/g;

const SYNC_REGISTRATION = /\bregisterHandle\(|(?<!\bthis)\.register[A-Z]\w*\(/;

const REQUIRED_INPUT = /\breadonly\s+(\w+)\s*=\s*input\.required\b/g;

const KNOWN_REQUIRED_INPUTS: Readonly<Record<string, string>> = {
  'calendar/src/calendar-cell.ts::ForCalendarCell': 'date',
  'calendar/src/calendar-month-cell.ts::ForCalendarMonthCell': 'month',
  'calendar/src/calendar-year-cell.ts::ForCalendarYearCell': 'year',
  'combobox/src/combobox-chip.ts::ForComboboxChip': 'value',
  'drag-drop/src/draggable.ts::ForDraggable': 'dragData',
  'menubar/src/menubar-trigger.ts::ForMenubarTrigger': 'value',
  'slider/src/slider-thumb.ts::ForSliderThumb': 'index',
  'table/src/table-body.ts::ForTableBody': 'rows',
  'table/src/table-cell.ts::ForTableCell': 'name',
  'table/src/table-header-cell.ts::ForTableHeaderCell': 'name',
  'table/src/table-sort-header.ts::ForTableSortHeader': 'column',
  'time-picker/src/time-picker-option.ts::ForTimePickerOption': 'value',
  'virtualization/src/virtual-for.ts::ForVirtualFor': 'forVirtualForOf',
};

interface Piece {
  readonly key: string;
  readonly body: string;
  readonly constructorBody: string | null;
}

function blockAt(code: string, open: number): string {
  let depth = 0;
  let at = open;
  do {
    if (code[at] === '{') {
      depth++;
    } else if (code[at] === '}') {
      depth--;
    }
    at++;
  } while (depth > 0 && at < code.length);
  return code.slice(open, at);
}

function withoutDeferredCalls(code: string): string {
  let out = '';
  let at = 0;
  for (const match of code.matchAll(DEFERRED_CALL)) {
    if (match.index < at) {
      continue;
    }
    let depth = 1;
    let end = match.index + match[0].length;
    while (end < code.length && depth > 0) {
      if (code[end] === '(') {
        depth++;
      } else if (code[end] === ')') {
        depth--;
      }
      end++;
    }
    out += code.slice(at, match.index);
    at = end;
  }
  return out + code.slice(at);
}

function piecesIn(path: string, code: string): Piece[] {
  const pieces: Piece[] = [];
  for (const decorator of code.matchAll(PIECE_DECORATOR)) {
    const heading = /\bclass\s+(\w+)[^{]*\{/g;
    heading.lastIndex = decorator.index;
    const declaration = heading.exec(code);
    if (!declaration) {
      continue;
    }
    const body = blockAt(code, declaration.index + declaration[0].length - 1);
    const constructorAt = body.indexOf('constructor(');
    pieces.push({
      key: `${path}::${declaration[1]}`,
      body,
      constructorBody: constructorAt < 0 ? null : blockAt(body, body.indexOf('{', constructorAt)),
    });
  }
  return pieces;
}

const PIECES: readonly Piece[] = [...LIBRARY_CODE].flatMap(([path, code]) => piecesIn(path, code));

const REGISTERED: readonly Piece[] = PIECES.filter(
  (piece) =>
    piece.constructorBody !== null &&
    SYNC_REGISTRATION.test(withoutDeferredCalls(piece.constructorBody)),
);

function requiredInputsOf(piece: Piece): string[] {
  return [...piece.body.matchAll(REQUIRED_INPUT)].map((match) => match[1]!);
}

describe('a piece registering from its constructor seeds unsetInput, never input.required', () => {
  it('derives a live roster of pieces and of synchronous registrations', () => {
    expect(PIECES.length).toBeGreaterThan(250);
    expect(REGISTERED.length).toBeGreaterThan(60);
  });

  it('keys every declared input.required to the piece declaring it', () => {
    const declared = [...LIBRARY_CODE.values()].reduce(
      (total, code) => total + (code.match(REQUIRED_INPUT)?.length ?? 0),
      0,
    );
    const keyed = PIECES.reduce((total, piece) => total + requiredInputsOf(piece).length, 0);

    expect(keyed).toBe(declared);
  });

  it('finds no registered piece with an input.required beyond the known baseline', () => {
    const offenders = REGISTERED.filter((piece) => requiredInputsOf(piece).length > 0)
      .map((piece) => piece.key)
      .sort();

    expect(offenders).toEqual(Object.keys(KNOWN_REQUIRED_INPUTS).sort());
  });

  it('names the input.required each baseline entry still declares', () => {
    const byKey = new Map(REGISTERED.map((piece) => [piece.key, piece] as const));

    for (const [key, input] of Object.entries(KNOWN_REQUIRED_INPUTS)) {
      expect(requiredInputsOf(byKey.get(key)!), key).toEqual([input]);
    }
  });
});
