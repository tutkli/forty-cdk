const DELIMITER = '---';
const FIELD = /^([a-zA-Z][a-zA-Z0-9]*):(.*)$/;

/**
 * A document's frontmatter block read off the top of its source, and the body
 * with that block blanked out rather than removed.
 *
 * Blanking is what keeps every line number downstream true: the compiler counts
 * lines from the string it hands the lexer, and `marked` reports leading blank
 * lines as one `space` token whose `raw` carries them all — so an offset
 * computed over the body resolves to the line the file actually holds.
 *
 * The format is a deliberate subset of YAML, not YAML: one `key: value` per
 * line, values either a scalar or a `[a, b]` list, no nesting, no quoting, no
 * comments, no blank lines. Anything else is reported rather than guessed at,
 * because a documentation registry that silently reads a field wrong is the
 * failure this block exists to end.
 *
 * @param source Raw markdown, already normalised to `\n` line endings.
 * @returns `fields` is `null` when the document opens with no block at all,
 * which is the caller's to accept or refuse.
 */
export function splitFrontmatter(source) {
  const lines = source.split('\n');
  if (lines[0]?.trim() !== DELIMITER) {
    return { fields: null, body: source, problems: [] };
  }

  const end = lines.findIndex((line, index) => index > 0 && line.trim() === DELIMITER);
  if (end === -1) {
    return {
      fields: null,
      body: source,
      problems: [
        { line: 1, message: `the frontmatter block opens with ${DELIMITER} and never closes` },
      ],
    };
  }

  const problems = [];
  const fields = new Map();
  for (let index = 1; index < end; index += 1) {
    const line = lines[index];
    const number = index + 1;
    if (line.trim() === '') {
      problems.push({
        line: number,
        message: 'a blank line inside frontmatter — write one field per line',
      });
      continue;
    }
    const match = FIELD.exec(line);
    if (match === null) {
      problems.push({
        line: number,
        message: `${JSON.stringify(line.trim())} is not a frontmatter field — write it as "key: value"`,
      });
      continue;
    }
    const [, key, rest] = match;
    if (fields.has(key)) {
      problems.push({ line: number, message: `${key} is declared twice` });
      continue;
    }
    const parsed = valueOf(rest.trim(), number);
    problems.push(...parsed.problems);
    fields.set(key, { value: parsed.value, line: number });
  }

  const body = [...lines.slice(0, end + 1).map(() => ''), ...lines.slice(end + 1)].join('\n');
  return { fields, body, problems };
}

function valueOf(raw, line) {
  if (raw === '') {
    return { value: '', problems: [{ line, message: 'this field has no value' }] };
  }
  if (!raw.startsWith('[')) {
    return { value: raw, problems: [] };
  }
  if (!raw.endsWith(']')) {
    return {
      value: raw,
      problems: [{ line, message: `the list ${JSON.stringify(raw)} never closes` }],
    };
  }
  const inner = raw.slice(1, -1).trim();
  if (inner === '') {
    return { value: [], problems: [] };
  }
  return { value: inner.split(',').map((item) => item.trim()), problems: [] };
}
