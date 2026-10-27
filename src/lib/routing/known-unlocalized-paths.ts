const EXACT_PATHS = new Set(['/', '/canvas']);

export function isKnownUnlocalizedPath(pathname: string): boolean {
  return EXACT_PATHS.has(normalizePathname(pathname));
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') {
    return '/';
  }

  return pathname.replace(/\/+$/, '');
}
