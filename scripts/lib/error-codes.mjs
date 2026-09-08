import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

import ts from 'typescript';

import { LIBRARY_DIR } from './doc-site.mjs';
import { repoRoot } from './repo-path.mjs';

/**
 * The `FORCDK-*` roster, read off the call sites that emit it
 * ([#1736](https://github.com/tutkli/forty-cdk/issues/1736)).
 *
 * The scheme's own promise is that a code is "a stable handle to search for,
 * quote in an issue, or link a docs page to", and the third one needed a page.
 * The content of that page is already written — every emitter call declares the
 * message, and most declare the `Cause` and `Fix` too — so this reads the
 * declaration rather than asking anyone to restate it beside a route.
 *
 * Read over the **AST**, not a regex. `src/lib/error-codes.spec.ts` scans text
 * because it asks text-shaped questions (is this code well-formed, is it
 * spent twice), and it pays for that with a body window it has to pin against a
 * raw call count. A page needs the fields themselves — one of which is 20
 * concatenated string fragments — and a window that stops looking would drop a
 * code silently, which is the exact failure a generated page exists to prevent.
 * {@link readErrorCodes} therefore reports a call it could not read as a
 * problem rather than skipping it.
 */

/** Emitters whose first argument declares a code. */
const EMITTERS = new Set(['fortyError', 'fortyWarn', 'orphanContextError', 'unresolvedRootError']);

/** The two emitters that build their prose from a shape instead of declaring it. */
const SHAPES = new Set(['orphanContextError', 'unresolvedRootError']);

/** The module that owns the layout, and the one that owns the two shapes. */
const LAYOUT_MODULE = 'core/src/errors/errors.ts';
const SHAPE_MODULE = 'core/src/errors/orphan-context.ts';

const CODE_PATTERN = /^FORCDK-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3}$/;

function sourceFiles(dir, found = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      sourceFiles(full, found);
    } else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) {
      found.push(full);
    }
  }
  return found;
}

/** Every file an entry point ships, keyed `<entry-point>/src/<file>.ts`. */
function libraryFiles() {
  const files = [];
  for (const entry of readdirSync(LIBRARY_DIR, { withFileTypes: true })) {
    const src = join(LIBRARY_DIR, entry.name, 'src');
    if (!entry.isDirectory() || entry.name === 'src') {
      continue;
    }
    try {
      for (const file of sourceFiles(src)) {
        files.push({
          source: relative(LIBRARY_DIR, file).split(sep).join('/'),
          path: relative(repoRoot, file).split(sep).join('/'),
          file,
        });
      }
    } catch {
      continue;
    }
  }
  return files.sort((a, b) => a.source.localeCompare(b.source));
}

/**
 * The reader's stand-in for a value only the running library knows.
 *
 * A message interpolates what the failure is about — the piece that resolved
 * nothing, the breakpoint that was asked for — and the page is read by someone
 * matching prose they already saw in a console, so the placeholder names the
 * thing rather than hiding it: `{piece} must be used inside a [forAccordion]
 * element.` The name is the expression's last segment, which is what the field
 * is called at the call site. Anything that is not a plain reference answers
 * `{value}`: `${names.join(', ') || '(none)'}` would otherwise publish
 * JavaScript as documentation.
 */
function placeholderOf(node) {
  if (ts.isIdentifier(node)) {
    return `{${node.text}}`;
  }
  if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.name)) {
    return `{${node.name.text}}`;
  }
  if (ts.isNonNullExpression(node) || ts.isParenthesizedExpression(node)) {
    return placeholderOf(node.expression);
  }
  return '{value}';
}

/**
 * The string an initializer produces, with `resolve` deciding what a reference
 * contributes. Answers `null` for a shape the reader does not cover, which is
 * what turns an unreadable call into a reported problem.
 */
function stringOf(node, resolve = placeholderOf) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    let out = node.head.text;
    for (const span of node.templateSpans) {
      const resolved = resolve(span.expression);
      if (resolved === null) {
        return null;
      }
      out += resolved + span.literal.text;
    }
    return out;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = stringOf(node.left, resolve);
    const right = stringOf(node.right, resolve);
    return left === null || right === null ? null : left + right;
  }
  if (ts.isParenthesizedExpression(node)) {
    return stringOf(node.expression, resolve);
  }
  if (
    ts.isIdentifier(node) ||
    ts.isPropertyAccessExpression(node) ||
    ts.isCallExpression(node) ||
    ts.isConditionalExpression(node)
  ) {
    return resolve(node);
  }
  return null;
}

/** The fields of one emitter call, as strings, or `null` for a field written some other way. */
function fieldsOf(argument) {
  if (argument === undefined || !ts.isObjectLiteralExpression(argument)) {
    return null;
  }
  const fields = {};
  for (const property of argument.properties) {
    if (ts.isShorthandPropertyAssignment(property)) {
      fields[property.name.text] = `{${property.name.text}}`;
      continue;
    }
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
      return null;
    }
    const value = stringOf(property.initializer);
    if (value === null) {
      return null;
    }
    fields[property.name.text] = value;
  }
  return fields;
}

/**
 * The prose each shape helper builds, read out of the helper itself.
 *
 * `orphanContextError` and `unresolvedRootError` are where ~80 of the roster's
 * messages actually get their words: a call site declares the piece, the root
 * and the token, and the helper writes the sentence. Reading the template from
 * the module means the roster cannot drift from the library — a rewording ships
 * to every page it affects on the next generate, and no copy of the prose lives
 * here to go stale. It also keeps the ng-template `Cause` fragment, which is a
 * module-level constant, in exactly one place.
 */
function readShapeTemplates(file) {
  const parsed = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
  );
  const constants = new Map();
  const templates = new Map();

  for (const statement of parsed.statements) {
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.initializer !== undefined) {
          const value = stringOf(declaration.initializer, () => null);
          if (value !== null) {
            constants.set(declaration.name.text, value);
          }
        }
      }
      continue;
    }
    if (
      !ts.isFunctionDeclaration(statement) ||
      statement.name === undefined ||
      !SHAPES.has(statement.name.text)
    ) {
      continue;
    }
    const found = [];
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        node.expression.text === 'fortyError' &&
        node.arguments[0] !== undefined &&
        ts.isObjectLiteralExpression(node.arguments[0])
      ) {
        found.push(node.arguments[0]);
      }
      ts.forEachChild(node, visit);
    };
    visit(statement);
    if (found.length === 1) {
      templates.set(statement.name.text, found[0]);
    }
  }

  return { constants, templates };
}

/**
 * The prose a shape helper would build for one call site, with the call site's
 * own fields substituted for the ones the helper reads off its `spec`.
 *
 * `null` for a template field the fields cannot satisfy — a shape helper that
 * grew a field a call site does not pass would otherwise publish the word
 * `undefined` in a sentence.
 */
function shapeProse(template, constants, fields) {
  const resolve = (node) => {
    if (
      ts.isPropertyAccessExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'spec' &&
      ts.isIdentifier(node.name)
    ) {
      return fields[node.name.text] ?? null;
    }
    if (ts.isIdentifier(node)) {
      return constants.get(node.text) ?? null;
    }
    return null;
  };

  const prose = { message: null, cause: null, fix: null };
  for (const property of template.properties) {
    if (!ts.isPropertyAssignment(property) || !ts.isIdentifier(property.name)) {
      continue;
    }
    const name = property.name.text;
    if (name === 'message' || name === 'cause' || name === 'fix') {
      prose[name] = stringOf(property.initializer, resolve);
    }
  }
  return prose.message === null ? null : prose;
}

/** `FORCDK-DATE-PICKER-003` → `date-picker`, the entry point a consumer imported from. */
function areaOf(code) {
  return code.slice('FORCDK-'.length, code.lastIndexOf('-')).toLowerCase();
}

/**
 * The entry point the `[forty-cdk/<scope>]` prefix names.
 *
 * Derived from the code's area unless the call site overrides it, which nine
 * `FORCDK-CORE-*` checks do: a shared check reports under the primitive that ran
 * it, and reads that name from a field only the running library has. The three
 * expressions they read it from are one thing to a reader, so every override
 * resolved at runtime answers `{primitive}` rather than publishing whichever
 * field name the call site happened to use.
 */
function scopeOf(fields, code) {
  const declared = fields.scope;
  if (declared === undefined) {
    return areaOf(code);
  }
  return declared.startsWith('{') ? '{primitive}' : declared;
}

function proseOf(emitter, fields, shapes) {
  if (!SHAPES.has(emitter)) {
    return fields.message === undefined
      ? null
      : { message: fields.message, cause: fields.cause ?? null, fix: fields.fix ?? null };
  }
  const template = shapes.templates.get(emitter);
  return template === undefined ? null : shapeProse(template, shapes.constants, fields);
}

/**
 * Every code the library emits, with the message a consumer sees and where it
 * comes from — plus every call the reader could not make sense of.
 *
 * A problem is a build failure rather than an omission: the roster is what the
 * site publishes, so a call whose code or message could not be read is a code
 * with no page, which is the state this whole scan exists to end.
 */
export function readErrorCodes() {
  const codes = [];
  const problems = [];
  const files = libraryFiles();

  const shapeModule = files.find(({ source }) => source === SHAPE_MODULE);
  if (shapeModule === undefined) {
    return {
      codes,
      problems: [
        {
          path: `projects/forty-cdk/${SHAPE_MODULE}`,
          line: 1,
          message:
            'the module that owns the orphan-context and unresolved-root prose is gone, so ~80 ' +
            'of the roster would be published with no message',
        },
      ],
    };
  }
  const shapes = readShapeTemplates(shapeModule.file);

  for (const { source, path, file } of files) {
    if (source === LAYOUT_MODULE || source === SHAPE_MODULE) {
      continue;
    }
    const text = readFileSync(file, 'utf8');
    if (![...EMITTERS].some((emitter) => text.includes(emitter))) {
      continue;
    }

    const parsed = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
    const visit = (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isIdentifier(node.expression) &&
        EMITTERS.has(node.expression.text)
      ) {
        const emitter = node.expression.text;
        const line = parsed.getLineAndCharacterOfPosition(node.getStart(parsed)).line + 1;
        const fields = fieldsOf(node.arguments[0]);

        if (fields === null) {
          problems.push({
            path,
            line,
            message:
              `${emitter} is called with an argument this reader cannot resolve to fields, so ` +
              'its code would be published with no page',
          });
        } else if (typeof fields.code !== 'string' || !CODE_PATTERN.test(fields.code)) {
          problems.push({
            path,
            line,
            message:
              `${emitter} declares no literal FORCDK-<AREA>-<NNN> code, so nothing can be ` +
              'published under one',
          });
        } else {
          const prose = proseOf(emitter, fields, shapes);
          if (prose === null || !prose.message) {
            problems.push({
              path,
              line,
              message:
                `${fields.code} has no message this reader can build — ${emitter} declares ` +
                `${Object.keys(fields).join(', ')}, which does not satisfy the prose it emits`,
            });
          } else {
            codes.push({
              code: fields.code,
              area: areaOf(fields.code),
              scope: scopeOf(fields, fields.code),
              severity: emitter === 'fortyWarn' ? 'warning' : 'error',
              message: prose.message,
              cause: prose.cause,
              fix: prose.fix,
              source: path,
              line,
            });
          }
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(parsed);
  }

  codes.sort((a, b) => a.code.localeCompare(b.code));
  return { codes, problems };
}
