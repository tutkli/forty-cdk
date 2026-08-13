const ABSOLUTE_HREF = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i;

export const GITHUB_REPO = 'https://github.com/tutkli/forty-cdk';

export const GITHUB_BLOB_BASE = `${GITHUB_REPO}/blob/main/`;

export function splitDocHref(href) {
  const hashAt = href.indexOf('#');
  if (hashAt < 0) {
    return { path: href, fragment: '' };
  }
  return { path: href.slice(0, hashAt), fragment: href.slice(hashAt) };
}

export function resolveRepoPath(sourcePath, relativePath) {
  const segments = sourcePath.split('/').slice(0, -1);
  for (const segment of relativePath.split('/')) {
    if (segment === '' || segment === '.') {
      continue;
    }
    if (segment === '..') {
      if (segments.length === 0) {
        return null;
      }
      segments.pop();
      continue;
    }
    segments.push(segment);
  }
  return segments.length > 0 ? segments.join('/') : null;
}

export function guideSlugOf(file) {
  return file.replace(/\.md$/, '');
}

export function buildDocRoutes({ primitiveSlugs, guideSlugs }) {
  const routes = new Map();
  for (const slug of primitiveSlugs) {
    routes.set(`projects/forty-cdk/${slug}`, `/${slug}`);
    routes.set(`projects/forty-cdk/${slug}/README.md`, `/${slug}`);
  }
  for (const slug of guideSlugs) {
    routes.set(`docs/${slug}.md`, `/guides/${slug}`);
  }
  return routes;
}

export function resolveDocLink(href, context) {
  if (href === '' || href.startsWith('#') || ABSOLUTE_HREF.test(href)) {
    return null;
  }

  const { path, fragment } = splitDocHref(href);
  if (path === '') {
    return null;
  }

  const repoPath = path.startsWith('/') ? path.slice(1) : resolveRepoPath(context.sourcePath, path);
  if (repoPath === null || repoPath === '') {
    return null;
  }

  const route = context.routes.get(repoPath);
  if (route !== undefined) {
    const target = `${route}${fragment}`;
    return {
      kind: 'route',
      repoPath,
      route: target,
      href: context.prepareUrl ? context.prepareUrl(target) : target,
    };
  }

  return {
    kind: 'source',
    repoPath,
    route: null,
    href: `${context.blobBase}${repoPath}${fragment}`,
  };
}
