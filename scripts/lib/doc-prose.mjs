const EM_DASH = '\u2014';
const EM_DASHES = /\u2014/g;
const SPACED_DOUBLE_HYPHENS = /(?<= )--(?= )/g;
const FRONTMATTER = '---';
const QUOTE_MARKERS = /^(?:[ \t]*>)+/;
const FENCE = /^[ \t]*(`{3,}|~{3,})(.*)$/;
const HEADING = /^[ \t]*#{1,6}(?:[ \t]|$)/;
const LIST_ITEM = /^[ \t]*(?:[-*+]|\d{1,9}[.)])(?:[ \t]|$)/;
const TABLE_ROW = /^[ \t]*\|/;
const CELL_DELIMITER = /(?<!\\)\|/;
const DELIMITER_CELL = /^[ \t]*:?-+:?[ \t]*$/;
const VALUE_SLOTS = /\*\*[A-Z][\w ]*:\*\*[ \t]*—[ \t]*(?=<br[ \t]*\/?>|$)/g;

export const PROSE_FIX = 'rewrite the sentence: split it, or use a colon, commas or parentheses';

function openingFence(content) {
  const match = FENCE.exec(content);
  if (match === null) {
    return null;
  }
  const [, marker, info] = match;
  if (marker[0] === '`' && info.includes('`')) {
    return null;
  }
  return { char: marker[0], length: marker.length };
}

function closesFence(fence, content) {
  const match = FENCE.exec(content);
  if (match === null) {
    return false;
  }
  const [, marker, rest] = match;
  return marker[0] === fence.char && marker.length >= fence.length && rest.trim() === '';
}

function frontmatterEnd(lines) {
  if (lines[0]?.trim() !== FRONTMATTER) {
    return -1;
  }
  return lines.findIndex((line, index) => index > 0 && line.trim() === FRONTMATTER);
}

function classify(lines) {
  const kinds = lines.map(() => 'exempt');
  let fence = null;
  for (let index = frontmatterEnd(lines) + 1; index < lines.length; index += 1) {
    const content = lines[index].replace(QUOTE_MARKERS, '');
    if (fence !== null) {
      if (closesFence(fence, content)) {
        fence = null;
      }
      continue;
    }
    fence = openingFence(content);
    if (fence !== null || HEADING.test(content)) {
      continue;
    }
    if (content.trim() === '') {
      kinds[index] = 'blank';
    } else if (TABLE_ROW.test(content)) {
      kinds[index] = 'row';
    } else {
      kinds[index] = 'prose';
    }
  }
  return kinds;
}

function blocksOf(lines, kinds) {
  const blocks = [];
  let current = null;
  lines.forEach((text, index) => {
    const kind = kinds[index];
    const content = text.replace(QUOTE_MARKERS, '');
    const joins =
      current !== null && current.kind === 'prose' && kind === 'prose' && !LIST_ITEM.test(content);
    if (joins) {
      current.texts.push(content);
      return;
    }
    current = kind === 'prose' || kind === 'row' ? { kind, start: index, texts: [content] } : null;
    if (current !== null) {
      blocks.push(current);
    }
  });
  return blocks;
}

function isEscaped(text, position) {
  let backslashes = 0;
  for (let cursor = position - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    backslashes += 1;
  }
  return backslashes % 2 === 1;
}

function runEnd(text, start) {
  let end = start;
  while (text[end] === '`') {
    end += 1;
  }
  return end;
}

function closingRun(text, from, length) {
  let cursor = from;
  while (cursor < text.length) {
    const start = text.indexOf('`', cursor);
    if (start === -1) {
      return -1;
    }
    const end = runEnd(text, start);
    if (end - start === length) {
      return start;
    }
    cursor = end;
  }
  return -1;
}

function withoutCodeSpans(text) {
  let result = '';
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf('`', index);
    if (open === -1) {
      break;
    }
    if (isEscaped(text, open)) {
      result += text.slice(index, open + 1);
      index = open + 1;
      continue;
    }
    const end = runEnd(text, open);
    const close = closingRun(text, end, end - open);
    if (close === -1) {
      result += text.slice(index, end);
      index = end;
      continue;
    }
    const spanEnd = close + (end - open);
    result += text.slice(index, open) + text.slice(open, spanEnd).replace(/[^\n]+/g, 'x');
    index = spanEnd;
  }
  return result + text.slice(index);
}

function cellsOf(row) {
  const cells = row.split(CELL_DELIMITER);
  return cells.slice(1, cells.length > 2 && cells.at(-1).trim() === '' ? -1 : undefined);
}

function proseOfRow(row) {
  const cells = cellsOf(row);
  if (cells.length > 0 && cells.every((cell) => DELIMITER_CELL.test(cell))) {
    return '';
  }
  return row
    .split(CELL_DELIMITER)
    .map((cell) => (cell.trim() === EM_DASH ? '' : cell.replace(VALUE_SLOTS, '')))
    .join('|');
}

function countOf(pattern, text) {
  return text.match(pattern)?.length ?? 0;
}

function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function proseProblems(markdown, { path }) {
  const text = markdown.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  const lines = text === '' ? [] : text.split('\n');
  const problems = [];

  if (lines.length === 0) {
    problems.push(
      `the scan of ${path} read no lines: a gate that reads nothing cannot report anything`,
    );
  }

  for (const block of blocksOf(lines, classify(lines))) {
    withoutCodeSpans(block.texts.join('\n'))
      .split('\n')
      .forEach((line, offset) => {
        const prose = block.kind === 'row' ? proseOfRow(line) : line;
        const number = block.start + offset + 1;
        const dashes = countOf(EM_DASHES, prose);
        if (dashes > 0) {
          problems.push(
            `${path}:${number} carries ${plural(dashes, 'em dash', 'em dashes')} in its prose; ` +
              PROSE_FIX,
          );
        }
        const hyphens = countOf(SPACED_DOUBLE_HYPHENS, prose);
        if (hyphens > 0) {
          problems.push(
            `${path}:${number} carries ` +
              `${plural(hyphens, 'spaced double hyphen', 'spaced double hyphens')} (" -- ") ` +
              `in its prose; ${PROSE_FIX}`,
          );
        }
      });
  }

  return { problems, lines: lines.length };
}
