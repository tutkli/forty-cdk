import { readdirSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import analog from '@analogjs/platform';

const projectDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

function discoverPrerenderRoutes(): string[] {
  const componentRoutes = readdirSync(
    new URL('./src/content/component-readmes/', import.meta.url),
  )
    .filter((name) => name.endsWith('.md'))
    .map((name) => `/components/${name.replace(/\.md$/, '')}`)
    .sort();
  const routes = [
    '/',
    '/docs/getting-started',
    '/components',
    ...componentRoutes,
  ];
  console.log(`[vite.config] prerender routes (${routes.length}):`, routes);
  return routes;
}

const PRERENDER_ROUTES = discoverPrerenderRoutes();

export default defineConfig({
  root: projectDir,
  publicDir: 'public',
  server: {
    port: 4500,
    strictPort: true,
  },
  preview: {
    port: 4500,
    strictPort: true,
  },
  build: {
    target: 'es2022',
    outDir: '../../dist/forty-cdk-docs',
    emptyOutDir: true,
  },
  resolve: {
    mainFields: ['module'],
    // Mirror the tsconfig paths mapping so live examples that `import {…} from 'forty-cdk'`
    // resolve to the library sources, not the (potentially stale or missing) `dist/forty-cdk`
    // build output. Same pattern as `projects/forty-cdk-harness`.
    alias: {
      'forty-cdk': resolvePath(repoRoot, 'projects/forty-cdk/src/public-api.ts'),
    },
  },
  plugins: [
    tailwindcss(),
    analog({
      static: true,
      workspaceRoot: repoRoot,
      // TODO(phase-5): the prerender pipeline currently emits only `/` even
      // when an explicit route array is passed via `nitro.prerender.routes`.
      // With `crawlLinks: true` the build aborts on a relative `href` (NG04002
      // `progress` segment) coming from one of the README-derived MDs or
      // dynamic templates. Needs targeted debug — the dev server SSR all
      // routes correctly (see screenshots), so this is a Nitro/Analog
      // prerender-only issue.
      prerender: {
        routes: PRERENDER_ROUTES,
      },
      nitro: {
        prerender: {
          crawlLinks: false,
          failOnError: false,
          routes: PRERENDER_ROUTES,
        },
      },
      content: {
        highlighter: 'prism',
      },
      vite: {
        tsconfig: fileURLToPath(new URL('./tsconfig.app.json', import.meta.url)),
        workspaceRoot: repoRoot,
      },
    }),
  ],
});
