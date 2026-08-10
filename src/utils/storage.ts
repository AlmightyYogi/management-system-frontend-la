const BACKEND_ORIGIN =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/?$/, '') ||
  'http://localhost:8080';

export function resolveStorageUrl(path?: string | null): string {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;

  const clean = path.startsWith('/') ? path : `/${path}`;
  const withStorage = clean.startsWith('/storage')
    ? clean
    : `/storage${clean}`;

  return `${BACKEND_ORIGIN}${withStorage}`;
}

export default resolveStorageUrl;