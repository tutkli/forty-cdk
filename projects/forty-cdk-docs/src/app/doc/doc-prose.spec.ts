import { PROSE_FIX, proseProblems } from '../../../../../scripts/lib/doc-prose.mjs';

const DASH = '\u2014';
const EN_DASH = '\u2013';
const PATH = 'projects/forty-cdk/tooltip/README.md';

function doc(...body: readonly string[]) {
  return ['# Tooltip', '', ...body].join('\n');
}

function scan(markdown: string) {
  return proseProblems(markdown, { path: PATH }).problems;
}

function dashesAt(line: number, count: number) {
  return `${PATH}:${line} carries ${count} ${count === 1 ? 'em dash' : 'em dashes'} in its prose; ${PROSE_FIX}`;
}

function hyphensAt(line: number) {
  return `${PATH}:${line} carries 1 spaced double hyphen (" -- ") in its prose; ${PROSE_FIX}`;
}

describe('an em dash in prose', () => {
  it('fails a paragraph em dash, naming the file, the line, the count and the fix', () => {
    expect(scan(doc(`Focus stays in the input ${DASH} arrows move the highlight.`))).toEqual([
      `${PATH}:3 carries 1 em dash in its prose; ` +
        'rewrite the sentence: split it, or use a colon, commas or parentheses',
    ]);
  });

  it('reports every em dash on one line as one problem carrying the count', () => {
    expect(scan(doc(`The trigger ${DASH} a button ${DASH} opens the panel.`))).toEqual([
      dashesAt(3, 2),
    ]);
  });

  it('fails an em dash in the prose of a table cell', () => {
    const table = [
      '| Input | Description |',
      '| --- | --- |',
      `| \`open\` | Whether the panel is shown ${DASH} two-way bound. |`,
    ];

    expect(scan(doc(...table))).toEqual([dashesAt(5, 1)]);
  });

  it('fails an em dash in a list item and in a blockquote', () => {
    expect(
      scan(
        doc(`- **Escape** ${DASH} closes the panel.`, '', `> Hover opens it ${DASH} focus too.`),
      ),
    ).toEqual([dashesAt(3, 1), dashesAt(5, 1)]);
  });

  it('names the right line of a document written with CRLF endings, and still sees its fences', () => {
    const lines = [
      '# Tooltip',
      '',
      '```ts',
      `const label = 'Open ${DASH} now';`,
      '',
      `const hint = 'Close ${DASH} later';`,
      '```',
      '',
      `A press closes it ${DASH} always.`,
      '',
    ];

    expect(scan(lines.join('\r\n'))).toEqual([dashesAt(9, 1)]);
  });

  it('passes an en dash (U+2013) in a numeric range', () => {
    expect(scan(doc(`Months run 1${EN_DASH}12 and hours 0${EN_DASH}23.`))).toEqual([]);
  });
});

describe('a spaced double hyphen', () => {
  it('fails a spaced double hyphen standing in for an em dash', () => {
    expect(scan(doc('A press closes it -- always.'))).toEqual([hyphensAt(3)]);
  });

  it('passes a CLI flag, a thematic break and a two-hyphen table delimiter row', () => {
    const body = [
      'Pass --include to run one spec, or --filter to pick a test.',
      '',
      '---',
      '',
      '| Key | Action |',
      '| -- | -- |',
      '| Enter | Opens the panel. |',
    ];

    expect(scan(doc(...body))).toEqual([]);
  });
});

describe('what is exempt by construction', () => {
  it('passes an em dash inside a backtick fence', () => {
    const fence = [
      '```ts',
      `const label = 'Open ${DASH} now';`,
      '',
      `const hint = 'Close ${DASH} later';`,
      '```',
    ];

    expect(scan(doc(...fence))).toEqual([]);
  });

  it('passes an em dash inside a tilde fence', () => {
    expect(scan(doc('~~~html', `<!-- trigger ${DASH} a button -->`, '~~~'))).toEqual([]);
  });

  it('passes an em dash inside a fence indented in a list item', () => {
    const item = [
      '- **Contract.** The consumer owns unmount.',
      '',
      '  ```html',
      `  <!-- broken ${DASH} never unmounts -->`,
      '',
      `  <!-- fixed ${DASH} unmounts on dismiss -->`,
      '  ```',
    ];

    expect(scan(doc(...item))).toEqual([]);
  });

  it('passes an em dash inside a fence nested in a blockquote', () => {
    expect(scan(doc('> ~~~html', `> <!-- trigger ${DASH} a button -->`, '> ~~~'))).toEqual([]);
  });

  it('reads prose again once a fence closes, and only a fence as long as its opener closes it', () => {
    const body = [
      '````md',
      '```',
      `Inside ${DASH} still code.`,
      '```',
      '````',
      `Outside ${DASH} prose again.`,
    ];

    expect(scan(doc(...body))).toEqual([dashesAt(8, 1)]);
  });

  it('passes an em dash inside inline code, a double-backtick span and a span that wraps', () => {
    const body = [
      `Write \`${DASH}\` for no default, or \`\`a ${DASH} \` b\`\` for a literal backtick.`,
      `A long span \`starts here ${DASH}`,
      'and ends here` in the same paragraph.',
    ];

    expect(scan(doc(...body))).toEqual([]);
  });

  it('does not let an unclosed backtick carry a code span into the next list item', () => {
    const items = [`- Open it with \`Enter ${DASH} or`, '- toggle it with Space`.'];

    expect(scan(doc(...items))).toEqual([dashesAt(3, 1)]);
  });

  it('passes an em dash in a heading of any level', () => {
    const headings = [
      `## Range selection ${DASH} \`ForDateRangePicker\``,
      '',
      `### Inputs ${DASH} focus callbacks`,
      '',
      `###### Deep ${DASH} heading`,
    ];

    expect(scan(doc(...headings))).toEqual([]);
  });

  it('passes a table cell holding an em dash alone, as a value', () => {
    const table = [
      '| Input | Default | Description |',
      '| --- | --- | --- |',
      `| \`modal\` | ${DASH} | Traps focus. |`,
    ];

    expect(scan(doc(...table))).toEqual([]);
  });

  it('still fails the prose cell of a row whose other cell is a value', () => {
    const table = [
      '| Input | Default | Description |',
      '| --- | --- | --- |',
      `| \`modal\` | ${DASH} | Traps focus ${DASH} always. |`,
    ];

    expect(scan(doc(...table))).toEqual([dashesAt(5, 1)]);
  });

  it('passes a labelled value slot holding an em dash alone, at the end of a cell or before a break', () => {
    const table = [
      '| Input | Description |',
      '| --- | --- |',
      `| \`side\` | Placement side.<br>**Default:** ${DASH} |`,
      `| \`align\` | Placement alignment.<br>**Default:** ${DASH}<br>Mirrored in RTL. |`,
    ];

    expect(scan(doc(...table))).toEqual([]);
  });

  it('still fails a labelled slot whose em dash introduces prose', () => {
    const table = [
      '| Input | Description |',
      '| --- | --- |',
      `| \`side\` | Placement side.<br>**Default:** ${DASH} the trigger's side. |`,
    ];

    expect(scan(doc(...table))).toEqual([dashesAt(5, 1)]);
  });

  it('passes an em dash in the frontmatter', () => {
    const markdown = [
      '---',
      `title: Tooltip ${DASH} hover hint`,
      'group: primitives',
      '---',
      '',
      '# Tooltip',
    ].join('\n');

    expect(scan(markdown)).toEqual([]);
  });
});

describe('the empty-scan guard', () => {
  it('fails a scan that read no lines', () => {
    expect(proseProblems('', { path: PATH })).toEqual({
      problems: [
        `the scan of ${PATH} read no lines: a gate that reads nothing cannot report anything`,
      ],
      lines: 0,
    });
  });

  it('counts the lines it read, ignoring the final newline', () => {
    expect(proseProblems(`${doc('One line.')}\n`, { path: PATH })).toEqual({
      problems: [],
      lines: 3,
    });
  });
});
