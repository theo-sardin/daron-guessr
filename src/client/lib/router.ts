import { useSyncExternalStore } from 'react';
import { isValidRoomCode, normalizeRoomCode } from '../../shared/protocol';

export type Route = { name: 'home'; prefillCode?: string } | { name: 'room'; code: string };

const listeners = new Set<() => void>();
let current = parse(typeof window === 'undefined' ? '/' : window.location.pathname);

function parse(pathname: string): Route {
  const segment = pathname.replace(/^\/+|\/+$/g, '');
  if (!segment) return { name: 'home' };
  const code = normalizeRoomCode(segment);
  if (isValidRoomCode(code) && segment.length === code.length) return { name: 'room', code };
  return { name: 'home' };
}

function emit() {
  current = parse(window.location.pathname);
  listeners.forEach((l) => l());
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', emit);
}

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  if (path === window.location.pathname) return;
  if (opts.replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  emit();
}

export function roomPath(code: string) {
  return `/${code}`;
}

export function roomLink(code: string) {
  return `${window.location.origin}${roomPath(code)}`;
}

export function useRoute(): Route {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
