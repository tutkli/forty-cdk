import { LIBRARY_CODE } from '../test-utils/source-scan';

const PIECE_DECORATOR = /@(?:Directive|Component)\(/g;

const DEFERRED_CALL = /\b(?:afterNextRender|afterEveryRender|effect)\(/g;

const SYNC_REGISTRATION = /\bregisterHandle\(|(?<!\bthis)\.register[A-Z]\w*\(/;

const REQUIRED_INPUT = /\breadonly\s+(\w+)\s*=\s*input\.required\b/g;

const MEMBER_START = /\n(?= {2}[^\s}])/;

const MEMBER_NAME =
  /^\s*(?:(?:private|protected|public|readonly|static|override|async|get|set)\s+)*(#?\w+)/;

const MEMBER_REFERENCE = /\bthis\.(#?\w+)/g;

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

function isRegistered(piece: Piece): boolean {
  return (
    piece.constructorBody !== null &&
    SYNC_REGISTRATION.test(withoutDeferredCalls(piece.constructorBody))
  );
}

function requiredInputsOf(piece: Piece): string[] {
  return [...piece.body.matchAll(REQUIRED_INPUT)].map((match) => match[1]!);
}

function membersOf(piece: Piece): Map<string, string> {
  const members = new Map<string, string>();
  for (const chunk of piece.body.slice(1, -1).split(MEMBER_START)) {
    const name = MEMBER_NAME.exec(chunk)?.[1];
    if (name !== undefined && name !== 'constructor') {
      members.set(name, (members.get(name) ?? '') + chunk);
    }
  }
  return members;
}

function membersReachedByRegistration(piece: Piece): Set<string> {
  const members = membersOf(piece);
  const reached = new Set<string>();
  const pending = [withoutDeferredCalls(piece.constructorBody ?? '')];
  while (pending.length > 0) {
    for (const match of pending.pop()!.matchAll(MEMBER_REFERENCE)) {
      const name = match[1]!;
      if (reached.has(name)) {
        continue;
      }
      reached.add(name);
      const member = members.get(name);
      if (member !== undefined) {
        pending.push(member);
      }
    }
  }
  return reached;
}

function requiredInputsReachedByRegistration(piece: Piece): string[] {
  const reached = membersReachedByRegistration(piece);
  return requiredInputsOf(piece).filter((input) => reached.has(input));
}

const PIECES: readonly Piece[] = [...LIBRARY_CODE].flatMap(([path, code]) => piecesIn(path, code));

const REGISTERED: readonly Piece[] = PIECES.filter(isRegistered);

const DETECTOR_FIXTURES = `
@Directive({ selector: '[handleShape]' })
export class HandleShape {
  readonly value = input.required<string>();

  constructor() {
    registerHandle({ host: this.#host, value: this.value }, (h) => this.ctx.registerItem(h), () => {});
  }
}

@Directive({ selector: '[signalShape]' })
export class SignalShape {
  readonly items = input.required<readonly string[]>();

  constructor() {
    this.ctx.registerData(this.items);
  }
}

@Directive({ selector: '[derivedShape]' })
export class DerivedShape {
  readonly rows = input.required<readonly string[]>();

  readonly #count = computed(() => this.#visible().length);

  readonly #visible = computed(() => this.rows().filter(Boolean));

  constructor() {
    this.ctx.registerCount(this.#count);
  }
}

@Directive({ selector: '[privateShape]' })
export class PrivateShape {
  readonly name = input.required<string>();

  readonly #disabled = signal(false);

  constructor() {
    registerHandle({ host: this.#host, disabled: this.#disabled }, (h) => this.ctx.registerCell(h), () => {});
    injectPointerMove(() => this.#onPointerMove());
  }

  #onPointerMove(): void {
    this.ctx.highlight(this.#host);
  }

  private onKeyDown(event: KeyboardEvent): void {
    this.ctx.handleKeydown(event, this.name());
  }
}
`;

describe('a piece whose registration reaches an input seeds unsetInput, never input.required', () => {
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

  it('follows an input into a handle, a registered signal and a registered derivation', () => {
    const reached = Object.fromEntries(
      piecesIn('fixture.ts', DETECTOR_FIXTURES).map((piece) => [
        piece.key,
        isRegistered(piece) ? requiredInputsReachedByRegistration(piece) : null,
      ]),
    );

    expect(reached).toEqual({
      'fixture.ts::HandleShape': ['value'],
      'fixture.ts::SignalShape': ['items'],
      'fixture.ts::DerivedShape': ['rows'],
      'fixture.ts::PrivateShape': [],
    });
  });

  it('finds no registered piece whose registration reaches an input.required', () => {
    const offenders = REGISTERED.flatMap((piece) =>
      requiredInputsReachedByRegistration(piece).map((input) => `${piece.key} → ${input}`),
    );

    expect(offenders).toEqual([]);
  });
});
