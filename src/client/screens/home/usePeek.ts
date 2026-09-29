import { useCallback, useEffect, useRef, useState } from 'react';
import type { RoomPeek } from '../../../shared/protocol';

export type PeekState = { status: 'loading' } | { status: 'ok'; peek: RoomPeek } | { status: 'offline' };

function isPeek(v: unknown): v is RoomPeek {
  return typeof v === 'object' && v !== null && typeof (v as RoomPeek).exists === 'boolean';
}

/** Re-check a non-joinable room this often (a new round may start, a seat may free up). */
const RECHECK_MS = 6000;

/**
 * GET /api/rooms/:code — what the join screen shows before asking for a name.
 * `refresh()` re-checks without flashing the loading state (`checking` is true meanwhile).
 */
export function usePeek(code: string) {
  const [state, setState] = useState<PeekState>({ status: 'loading' });
  const [checking, setChecking] = useState(false);
  const [nonce, setNonce] = useState(0);
  const inflight = useRef(false);

  useEffect(() => {
    const ctrl = new AbortController();
    inflight.current = true;
    fetch(`/api/rooms/${encodeURIComponent(code)}`, { signal: ctrl.signal, headers: { accept: 'application/json' } })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body: unknown = await r.json();
        if (!isPeek(body)) throw new Error('bad peek');
        setState({ status: 'ok', peek: body });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setState({ status: 'offline' });
      })
      .finally(() => {
        if (!ctrl.signal.aborted) {
          inflight.current = false;
          setChecking(false);
        }
      });
    return () => ctrl.abort();
  }, [code, nonce]);

  const refresh = useCallback((opts: { silent?: boolean } = {}) => {
    if (inflight.current) return;
    if (!opts.silent) setChecking(true);
    setNonce((n) => n + 1);
  }, []);

  // Rooms that cannot be joined right now are re-checked quietly in the background.
  const waiting = state.status === 'ok' && state.peek.exists && state.peek.joinable === false;
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh({ silent: true });
    }, RECHECK_MS);
    return () => window.clearInterval(id);
  }, [waiting, refresh]);

  return { state, checking, refresh };
}
