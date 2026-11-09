/** One row of a README API table naming members by identifier. */
export interface ReadmeApiRow {
  /** The members the row's first cell names, in order (`disabled` / `readonly` names two). */
  readonly members: readonly string[];
  /** The Type cell with its backticks removed and `\|` unescaped. */
  readonly type: string;
  /** What follows `**Default:**` with its backticks removed, or `null` when the row states none. */
  readonly defaultValue: string | null;
  /** 1-based line of the row in the README. */
  readonly line: number;
}

const MEMBER_CELL = /^`\w+`(?:\s*\/\s*`\w+`)*$/;

const SECTION_BOUNDARY = /^#{1,3}\s/;

const DEFAULT_LABEL = /\*\*Default:\*\*\s*(.*?)\s*$/;

function cellsOf(row: string): string[] {
  const cells: string[] = [];
  let current = '';
  for (let i = 1; i < row.length; i++) {
    const char = row[i]!;
    if (char === '\\' && row[i + 1] === '|') {
      current += '|';
      i++;
    } else if (char === '|') {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  return cells;
}

function unquote(cell: string): string {
  return cell.replace(/`/g, '').trim();
}

/**
 * The API rows documented under the `### \`<heading>\`` section of a README,
 * up to the next heading of level three or above. A row counts when its first
 * cell holds nothing but backticked identifiers, so a table header, a
 * `data-*` attribute row or a prose row is skipped.
 */
export function readmeApiRows(readme: string, heading: string): readonly ReadmeApiRow[] {
  const lines = readme.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((line) => line.trim() === `### \`${heading}\``);
  if (start === -1) {
    return [];
  }
  const rows: ReadmeApiRow[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i]!;
    if (SECTION_BOUNDARY.test(line)) {
      break;
    }
    if (!line.startsWith('|')) {
      continue;
    }
    const cells = cellsOf(line);
    if (cells.length < 3 || !MEMBER_CELL.test(cells[0]!)) {
      continue;
    }
    const members = cells[0]!.split('/').map(unquote);
    const described = cells.slice(2).find((cell) => DEFAULT_LABEL.test(cell));
    const defaultValue = described ? unquote(DEFAULT_LABEL.exec(described)![1]!) : null;
    rows.push({ members, type: unquote(cells[1]!), defaultValue, line: i + 1 });
  }
  return rows;
}
