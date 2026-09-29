import { useSyncExternalStore } from 'react';
import type {
  AckResult,
  ClientToServerEvents,
  ErrorCode,
  MyPhoto,
  ParentKind,
  PhotoSlot,
  PublicPlayer,
  Reaction,
  ReactionEmoji,
  RoomView,
  Session,
  Settings,
} from '../../shared/protocol';
import { forgetSession, loadSession, saveSession } from './session';
import { socket } from './socket';
import { recordServerTime } from './time';

/** Errors a call can end with: server error codes plus client-side network failure. */
export type ClientError = ErrorCode | 'NETWORK';
export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: ClientError };

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

/** Why the player was pushed out of the room (drives a dedicated message on the room page). */
export type ExitReason = 'kicked' | 'replaced' | 'room-gone' | null;

export interface StoreState {
  status: ConnectionStatus;
  session: Session | null;
  view: RoomView | null;
  exitReason: ExitReason;
}

let state: StoreState = {
  status: socket.connected ? 'connected' : 'connecting',
  session: null,
  view: null,
  exitReason: null,
};

const listeners = new Set<() => void>();
const reactionListeners = new Set<(r: Reaction) => void>();

function setState(patch: Partial<StoreState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export function getState(): StoreState {
  return state;
}

export function useStore<T>(selector: (s: StoreState) => T): T {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => selector(state),
  );
}

export const useRoom = () => useStore((s) => s.view);
export const useConnection = () => useStore((s) => s.status);

/** Map of player id -> player for the current room. */
export function playersById(view: RoomView | null): Map<string, PublicPlayer> {
  return new Map((view?.players ?? []).map((p) => [p.id, p]));
}

export function onReaction(cb: (r: Reaction) => void): () => void {
  reactionListeners.add(cb);
  return () => reactionListeners.delete(cb);
}

// ---------------------------------------------------------------------------
// Socket wiring
// ---------------------------------------------------------------------------

type EventName = keyof ClientToServerEvents;

const ACK_TIMEOUT_MS = 12_000;

/**
 * Emits an event that takes an ack as its last argument and resolves with the ack payload.
 * Resolves `{ ok: false, error: 'NETWORK' }` on timeout or when offline.
 */
function call<T extends object = object>(event: EventName, ...args: unknown[]): Promise<Result<T>> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: 'NETWORK' });
      return;
    }
    // The typed emit signature cannot express "any event with an ack", hence the cast.
    const emitter = socket.timeout(ACK_TIMEOUT_MS) as unknown as {
      emit: (ev: string, ...rest: unknown[]) => void;
    };
    emitter.emit(event, ...args, (err: Error | null, res: AckResult<T>) => {
      if (err || !res) resolve({ ok: false, error: 'NETWORK' });
      else resolve(res as Result<T>);
    });
  });
}

/**
 * The server may push the first `room:state` before the ack that hands us the session
 * arrives; keep it around so it can be applied as soon as the session is adopted.
 */
let pendingView: RoomView | null = null;

function adoptSession(session: Session) {
  saveSession(session);
  const early = pendingView && pendingView.code === session.code && pendingView.meId === session.playerId ? pendingView : null;
  pendingView = null;
  const keepView = state.view && state.view.code === session.code && state.view.meId === session.playerId ? state.view : null;
  setState({ session, exitReason: null, view: early ?? keepView });
}

function dropSession(reason: ExitReason, opts: { forget: boolean }) {
  const code = state.session?.code;
  if (code && opts.forget) forgetSession(code);
  pendingView = null;
  setState({ session: null, view: null, exitReason: reason });
}

socket.on('connect', () => {
  setState({ status: 'connected' });
  // Resume our seat after a network drop. This tab owns the session, so take it over.
  const s = state.session;
  if (s) {
    void call<{ session: Session }>('room:rejoin', { code: s.code, token: s.token, takeover: true }).then((res) => {
      if (res.ok) adoptSession(res.session);
      else if (res.error !== 'NETWORK') dropSession('room-gone', { forget: true });
    });
  }
});

socket.on('disconnect', () => setState({ status: 'disconnected' }));
socket.io.on('reconnect_attempt', () => {
  if (state.status !== 'connected') setState({ status: 'connecting' });
});

socket.on('room:state', (view) => {
  recordServerTime(view.serverNow);
  if (!state.session || state.session.code !== view.code || state.session.playerId !== view.meId) {
    pendingView = view;
    return;
  }
  setState({ view });
});

socket.on('room:reaction', (r) => reactionListeners.forEach((l) => l(r)));

socket.on('room:kicked', () => dropSession('kicked', { forget: true }));

// Another tab resumed our seat: keep the stored session (it is theirs now too).
socket.on('session:replaced', () => dropSession('replaced', { forget: false }));

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export const api = {
  async createRoom(name: string, avatar: string): Promise<Result<{ session: Session }>> {
    const res = await call<{ session: Session }>('room:create', { name, avatar });
    if (res.ok) adoptSession(res.session);
    return res;
  },

  async joinRoom(code: string, name: string, avatar: string): Promise<Result<{ session: Session }>> {
    const res = await call<{ session: Session }>('room:join', { code, name, avatar });
    if (res.ok) adoptSession(res.session);
    return res;
  },

  /**
   * Tries to resume a stored session for `code`. Returns null when nothing is stored.
   * A session stored only on the device (not this tab) never steals the seat from a live tab.
   */
  async resume(code: string): Promise<Result<{ session: Session }> | null> {
    const stored = loadSession(code);
    if (!stored) return null;
    const res = await call<{ session: Session }>('room:rejoin', {
      code,
      token: stored.session.token,
      takeover: stored.source === 'tab',
    });
    if (res.ok) adoptSession(res.session);
    else if (res.error === 'ROOM_NOT_FOUND' || res.error === 'NOT_IN_ROOM') forgetSession(code);
    return res;
  },

  /** Explicitly take the seat back after `session:replaced`. */
  async takeBack(code: string): Promise<Result<{ session: Session }>> {
    const stored = loadSession(code);
    if (!stored) return { ok: false, error: 'NOT_IN_ROOM' };
    const res = await call<{ session: Session }>('room:rejoin', { code, token: stored.session.token, takeover: true });
    if (res.ok) adoptSession(res.session);
    return res;
  },

  async leave(): Promise<void> {
    if (state.session) await call('room:leave');
    dropSession(null, { forget: true });
  },

  /** Clears a displayed exit reason (e.g. after the player acknowledged "you were kicked"). */
  clearExitReason() {
    setState({ exitReason: null });
  },

  updatePlayer: (patch: { name?: string; avatar?: string }) => call('player:update', patch),

  async uploadPhoto(slot: PhotoSlot, kind: ParentKind, blob: Blob): Promise<Result<{ photo: MyPhoto }>> {
    const data = await blob.arrayBuffer();
    return call<{ photo: MyPhoto }>('photo:upload', { slot, kind, mime: blob.type || 'image/jpeg', data });
  },

  removePhoto: (slot: PhotoSlot) => call('photo:remove', { slot }),
  setPhotoKind: (slot: PhotoSlot, kind: ParentKind) => call('photo:setKind', { slot, kind }),

  updateSettings: (patch: Partial<Settings>) => call('host:settings', patch),
  kick: (playerId: string) => call('host:kick', { playerId }),
  start: () => call('host:start'),
  skipRound: (round: number) => call('host:skipRound', { round }),
  nextReveal: (index: number) => call('host:nextReveal', { index }),
  playAgain: () => call('host:playAgain'),

  vote: (round: number, candidateId: string) => call('vote:cast', { round, candidateId }),

  react(emoji: ReactionEmoji) {
    if (socket.connected && state.session) socket.emit('react', { emoji });
  },
};

/** Dev-only: lets the /__preview pages inject a fake room without a server. */
export function __devSetState(patch: Partial<StoreState>) {
  setState(patch);
}
