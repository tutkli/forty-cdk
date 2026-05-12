/**
 * AST-based API metadata extractor.
 *
 * Walks the library source under `projects/forty-cdk/src/lib/` and emits one
 * JSON per primitive at `projects/forty-cdk-docs/src/api-metadata/<primitive>.json`.
 * Each JSON describes every `@Directive` / `@Component` exported by the
 * primitive, with its selector, host bindings, and the signal-based public
 * surface (`input()`, `input.required()`, `output()`, `model()`,
 * `model.required()`).
 *
 * Pure walker — no type-checking, no Angular compiler integration. Runs as
 * `pnpm docs:prebuild` before `vite build`, and the JSON output is committed
 * to the repo so PR diffs surface API changes.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  type ClassDeclaration,
  type Decorator,
  type JSDoc,
  type MethodDeclaration,
  Node,
  type ObjectLiteralExpression,
  type PropertyDeclaration,
  Project,
  type PropertyAssignment,
  type SourceFile,
  SyntaxKind,
} from 'ts-morph';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DOCS_ROOT = resolve(SCRIPT_DIR, '..');
const REPO_ROOT = resolve(DOCS_ROOT, '..', '..');
const LIB_TSCONFIG = join(REPO_ROOT, 'projects', 'forty-cdk', 'tsconfig.lib.json');
const LIB_ROOT = join(REPO_ROOT, 'projects', 'forty-cdk', 'src', 'lib');
const OUTPUT_DIR = join(DOCS_ROOT, 'src', 'api-metadata');

const SKIP_FOLDERS = new Set(['_internal', 'test-utils']);

interface ApiMember {
  /** Member name as written in the source (e.g. `open`, `disabled`). */
  name: string;
  /**
   * Kind of binding. `model` / `modelRequired` round-trip via `[(name)]`;
   * `output` is emit-only; `input` / `inputRequired` are read-only.
   */
  kind: 'input' | 'inputRequired' | 'output' | 'model' | 'modelRequired';
  /** Type as written (or inferred from the default). */
  type: string;
  /** Source-literal default value when statically inferrable, else null. */
  defaultValue: string | null;
  /** First non-empty JSDoc paragraph, trimmed. */
  doc: string;
}

interface ApiMethod {
  name: string;
  signature: string;
  doc: string;
}

interface ApiPiece {
  /** Public class name (e.g. `ForDisclosure`). */
  class: string;
  /** `@Directive` vs `@Component`. */
  kind: 'directive' | 'component';
  /** Selector string from the decorator (e.g. `[forDisclosure]`). */
  selector: string | null;
  /** `exportAs` from the decorator, when present. */
  exportAs: string | null;
  /** Host-binding entries from the `host: { ... }` block (key → expression). */
  host: Record<string, string>;
  /** Class-level JSDoc, trimmed. */
  doc: string;
  /** Path relative to the library source root (e.g. `disclosure/disclosure.ts`). */
  source: string;
  inputs: ApiMember[];
  outputs: ApiMember[];
  models: ApiMember[];
  methods: ApiMethod[];
}

interface PrimitiveMetadata {
  primitive: string;
  pieces: ApiPiece[];
}

function findDecorator(cls: ClassDeclaration): { decorator: Decorator; kind: 'directive' | 'component' } | null {
  for (const decorator of cls.getDecorators()) {
    const name = decorator.getName();
    if (name === 'Directive') return { decorator, kind: 'directive' };
    if (name === 'Component') return { decorator, kind: 'component' };
  }
  return null;
}

function decoratorOptions(decorator: Decorator): ObjectLiteralExpression | null {
  const expression = decorator.getCallExpression();
  if (!expression) return null;
  const [arg] = expression.getArguments();
  if (!arg || !Node.isObjectLiteralExpression(arg)) return null;
  return arg;
}

function stringLiteralValue(node: Node | undefined): string | null {
  if (!node) return null;
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) {
    return node.getLiteralValue();
  }
  return null;
}

function getProperty(obj: ObjectLiteralExpression, name: string): PropertyAssignment | null {
  const prop = obj.getProperty(name);
  return prop && Node.isPropertyAssignment(prop) ? prop : null;
}

function readHost(obj: ObjectLiteralExpression): Record<string, string> {
  const hostProp = getProperty(obj, 'host');
  if (!hostProp) return {};
  const value = hostProp.getInitializer();
  if (!value || !Node.isObjectLiteralExpression(value)) return {};

  const host: Record<string, string> = {};
  for (const prop of value.getProperties()) {
    if (!Node.isPropertyAssignment(prop)) continue;
    const nameNode = prop.getNameNode();
    const key = Node.isStringLiteral(nameNode)
      ? nameNode.getLiteralValue()
      : nameNode.getText().replace(/^['"]|['"]$/g, '');
    const initializer = prop.getInitializer();
    if (!initializer) continue;
    host[key] = stringLiteralValue(initializer) ?? initializer.getText();
  }
  return host;
}

function firstJsDocParagraph(jsDocs: JSDoc[]): string {
  for (const doc of jsDocs) {
    const description = doc.getDescription().trim();
    if (description) {
      const firstParagraph = description.split(/\n\s*\n/)[0] ?? '';
      return firstParagraph.replace(/\s+/g, ' ').trim();
    }
  }
  return '';
}

function readMember(prop: PropertyDeclaration): ApiMember | null {
  const initializer = prop.getInitializer();
  if (!initializer || !Node.isCallExpression(initializer)) return null;

  const callee = initializer.getExpression();
  let kind: ApiMember['kind'] | null = null;
  if (Node.isIdentifier(callee)) {
    const name = callee.getText();
    if (name === 'input') kind = 'input';
    else if (name === 'output') kind = 'output';
    else if (name === 'model') kind = 'model';
  } else if (Node.isPropertyAccessExpression(callee)) {
    const root = callee.getExpression().getText();
    const member = callee.getName();
    if (root === 'input' && member === 'required') kind = 'inputRequired';
    else if (root === 'model' && member === 'required') kind = 'modelRequired';
  }
  if (!kind) return null;

  // Type argument: explicit type-parameter on the call (e.g. `input<string>(...)`)
  const typeArgs = initializer.getTypeArguments();
  let typeText: string;
  if (typeArgs.length > 0) {
    typeText = typeArgs.map((t) => t.getText()).join(', ');
  } else {
    // Fallback: read the property's declared type annotation, then the type-checker.
    const typeNode = prop.getTypeNode();
    if (typeNode) {
      typeText = typeNode.getText();
    } else {
      // Use ts-morph's getType() which walks back to InputSignal<T> etc. and
      // we strip the wrapper to expose T.
      const fullType = prop.getType().getText();
      typeText = stripSignalWrapper(fullType);
    }
  }

  // Default value: first call argument for non-required variants.
  let defaultValue: string | null = null;
  if (kind !== 'inputRequired' && kind !== 'modelRequired' && kind !== 'output') {
    const [firstArg] = initializer.getArguments();
    if (firstArg) defaultValue = firstArg.getText();
  }

  const doc = firstJsDocParagraph(prop.getJsDocs());

  return {
    name: prop.getName(),
    kind,
    type: typeText,
    defaultValue,
    doc,
  };
}

const SIGNAL_WRAPPERS = new Set([
  'InputSignal',
  'InputSignalWithTransform',
  'OutputEmitterRef',
  'OutputRef',
  'ModelSignal',
]);

/**
 * Reduces a fully-qualified Angular signal type back to the public-facing
 * argument the consumer sees. Handles four shapes ts-morph produces:
 *
 *   `import("…").InputSignal<boolean>` → `boolean`
 *   `import("…").InputSignalWithTransform<boolean, unknown>` → `boolean`
 *   `InputSignal<readonly string[]>` → `readonly string[]`
 *   `ModelSignal<'horizontal' | 'vertical'>` → `'horizontal' | 'vertical'`
 *
 * Returns the input unchanged when no wrapper is recognised — keeps callers
 * resilient to future Angular type names.
 */
function stripSignalWrapper(text: string): string {
  // Strip leading `import("…").` qualifier(s).
  const withoutImport = text.replace(/^import\([^)]+\)\./, '');
  // Find the wrapper name + the matched `<` …
  const ltIdx = withoutImport.indexOf('<');
  if (ltIdx === -1) return withoutImport;
  const wrapper = withoutImport.slice(0, ltIdx);
  if (!SIGNAL_WRAPPERS.has(wrapper)) return withoutImport;
  // Capture balanced angle-bracket content and split by commas at depth 0.
  const inner = withoutImport.slice(ltIdx + 1, withoutImport.lastIndexOf('>'));
  return firstTopLevelTypeArg(inner).trim();
}

function firstTopLevelTypeArg(args: string): string {
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const ch = args[i];
    if (ch === '<' || ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === '>' || ch === ')' || ch === ']' || ch === '}') depth--;
    else if (ch === ',' && depth === 0) return args.slice(0, i);
  }
  return args;
}

function readMethod(method: MethodDeclaration): ApiMethod | null {
  // Public methods only. ts-morph treats `#name` as private automatically.
  // Skip explicit `private`/`protected`/`readonly`-prefix conventions.
  const name = method.getName();
  if (name.startsWith('#') || name.startsWith('_')) return null;
  if (method.hasModifier(SyntaxKind.PrivateKeyword)) return null;
  if (method.hasModifier(SyntaxKind.ProtectedKeyword)) return null;
  // Skip @internal-marked methods.
  const jsDocs = method.getJsDocs();
  if (jsDocs.some((d) => d.getTags().some((t) => t.getTagName() === 'internal'))) {
    return null;
  }
  return {
    name,
    signature: methodSignature(method),
    doc: firstJsDocParagraph(jsDocs),
  };
}

function methodSignature(method: MethodDeclaration): string {
  const params = method
    .getParameters()
    .map((p) => p.getText())
    .join(', ');
  const returnTypeNode = method.getReturnTypeNode();
  const returnType = returnTypeNode ? returnTypeNode.getText() : method.getReturnType().getText();
  return `${method.getName()}(${params}): ${returnType}`;
}

function extractPiece(cls: ClassDeclaration, sourceRelative: string): ApiPiece | null {
  const decorated = findDecorator(cls);
  if (!decorated) return null;
  const options = decoratorOptions(decorated.decorator);

  const selector = options ? stringLiteralValue(getProperty(options, 'selector')?.getInitializer()) : null;
  const exportAs = options ? stringLiteralValue(getProperty(options, 'exportAs')?.getInitializer()) : null;
  const host = options ? readHost(options) : {};

  const inputs: ApiMember[] = [];
  const outputs: ApiMember[] = [];
  const models: ApiMember[] = [];
  for (const prop of cls.getProperties()) {
    const member = readMember(prop);
    if (!member) continue;
    if (member.kind === 'input' || member.kind === 'inputRequired') inputs.push(member);
    else if (member.kind === 'output') outputs.push(member);
    else models.push(member);
  }

  const methods: ApiMethod[] = [];
  for (const method of cls.getMethods()) {
    const m = readMethod(method);
    if (m) methods.push(m);
  }

  return {
    class: cls.getName() ?? '<anonymous>',
    kind: decorated.kind,
    selector,
    exportAs,
    host,
    doc: firstJsDocParagraph(cls.getJsDocs()),
    source: sourceRelative.replace(/\\/g, '/'),
    inputs,
    outputs,
    models,
    methods,
  };
}

function walkPrimitive(folder: string, project: Project): PrimitiveMetadata | null {
  const sourceFiles = project.addSourceFilesAtPaths([
    join(LIB_ROOT, folder, '*.ts'),
    `!${join(LIB_ROOT, folder, '*.spec.ts')}`,
  ]);

  const pieces: ApiPiece[] = [];
  for (const file of sourceFiles) {
    for (const cls of file.getClasses()) {
      if (!cls.isExported() && !cls.isDefaultExport()) continue;
      const piece = extractPiece(cls, relative(LIB_ROOT, file.getFilePath()));
      if (piece) pieces.push(piece);
    }
  }

  if (pieces.length === 0) return null;
  return { primitive: folder, pieces };
}

function listPrimitiveFolders(project: Project): string[] {
  const publicApiPath = join(REPO_ROOT, 'projects', 'forty-cdk', 'src', 'public-api.ts');
  const publicApi: SourceFile | undefined = project.addSourceFileAtPathIfExists(publicApiPath);
  if (!publicApi) {
    throw new Error(`[forty-cdk-docs/generate-api-metadata] cannot find ${publicApiPath}`);
  }
  const folders = new Set<string>();
  for (const decl of publicApi.getExportDeclarations()) {
    const spec = decl.getModuleSpecifierValue();
    if (!spec) continue;
    const match = spec.match(/^\.\/lib\/([^/]+)$/);
    if (!match) continue;
    const folder = match[1]!;
    if (SKIP_FOLDERS.has(folder)) continue;
    folders.add(folder);
  }
  return [...folders].sort();
}

function main(): void {
  console.log('[forty-cdk-docs/generate-api-metadata] starting…');
  const project = new Project({
    tsConfigFilePath: LIB_TSCONFIG,
    skipAddingFilesFromTsConfig: true,
  });

  const folders = listPrimitiveFolders(project);
  console.log(`[forty-cdk-docs/generate-api-metadata] found ${folders.length} primitives`);

  mkdirSync(OUTPUT_DIR, { recursive: true });
  let written = 0;
  let empty = 0;
  for (const folder of folders) {
    const meta = walkPrimitive(folder, project);
    if (!meta) {
      empty++;
      console.warn(`  skip ${folder} (no decorated classes found)`);
      continue;
    }
    const outPath = join(OUTPUT_DIR, `${folder}.json`);
    writeFileSync(outPath, JSON.stringify(meta, null, 2) + '\n', 'utf8');
    written++;
    console.log(`  wrote ${folder}.json (${meta.pieces.length} pieces)`);
  }
  console.log(
    `[forty-cdk-docs/generate-api-metadata] done — wrote ${written}, skipped ${empty}`,
  );
}

main();
