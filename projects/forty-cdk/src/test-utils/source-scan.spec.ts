import { stripComments } from './source-scan';

describe('stripComments', () => {
  it('removes line, trailing and block comments', () => {
    const source = '// lead\nconst a = 1; // trailing\n/** doc */\nfoo(/* inline */ a);\n';

    expect(stripComments(source)).toBe('\nconst a = 1; \n\nfoo( a);\n');
  });

  it('keeps the code after a "/*" inside a string literal', () => {
    const source = "const a = '/*';\nfoo();\n/** doc */\nbar();\n";

    expect(stripComments(source)).toBe("const a = '/*';\nfoo();\n\nbar();\n");
  });

  it('keeps the code after a "/*" inside a regex literal', () => {
    const source = 'const re = /^\\[x\\/*/;\nfoo();\n/** doc */\nbar();\n';

    expect(stripComments(source)).toBe('const re = /^\\[x\\/*/;\nfoo();\n\nbar();\n');
  });

  it('keeps a "//" inside a string, a template or a regex literal', () => {
    const source = "const u = 'https://a';\nconst t = `//${b}//`;\nconst r = /\\/\\//;\n";

    expect(stripComments(source)).toBe(source);
  });

  it('strips a comment inside a template substitution and keeps the template around it', () => {
    const source = 'const t = `a ${b /* gone */ + `/*${c}*/`} d`;\nfoo();\n';

    expect(stripComments(source)).toBe('const t = `a ${b  + `/*${c}*/`} d`;\nfoo();\n');
  });

  it('reads a slash after an operand as division, not as a regex', () => {
    const source = 'const x = (a) / b / c; // half\nconst y = items[0] / 2;\n';

    expect(stripComments(source)).toBe('const x = (a) / b / c; \nconst y = items[0] / 2;\n');
  });

  it('reads a slash after a keyword as a regex', () => {
    const source = "function f() {\n  return /'/.test(x); // quote\n}\n";

    expect(stripComments(source)).toBe("function f() {\n  return /'/.test(x); \n}\n");
  });
});
