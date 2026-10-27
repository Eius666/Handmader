const PUBLIC_ROUTES = new Set(['/', '/auth/login', '/auth/register']);

export function isProtectedRoute(pathname: string): boolean {
  return !PUBLIC_ROUTES.has(normalizePathname(pathname));
}

function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  return pathname.replace(/\/+$/, '') || '/';
}
