/** Helpers shared by the server unit tests (engine and views). */
import { defaultKindForSlot, type PhotoKind, type PhotoSlot } from '../shared/protocol';
import * as g from './game';

/** Minimal PNG signature: enough for the engine, which never decodes images. */
export const PNG_BYTES = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);

/** Small deterministic PRNG for reproducible shuffles. */
export function seededRng(seed: number): g.Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function unwrap<T>(result: g.Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error}`);
  return result.value;
}

export const newPlayer = (name: string, avatar = '🐸'): g.NewPlayer => ({
  id: `id-${name}`,
  token: `token-${name}`,
  name,
  avatar,
});

export const idOf = (name: string) => `id-${name}`;

/** Room with the given players (first one hosts), everybody connected, in the lobby. */
export function makeRoom(names: string[], now = 0, timing: g.Timing = g.DEFAULT_TIMING): g.Room {
  const room = unwrap(g.createRoom('ABCD', newPlayer(names[0]), now, timing));
  names.slice(1).forEach((name, i) => unwrap(g.joinRoom(room, newPlayer(name), now + i + 1)));
  return room;
}

let photoCounter = 0;

/** A photo with an opaque id (never derived from the owner), of the theme's default kind for its slot. */
export function newPhoto(room: g.Room, slot: PhotoSlot = 0, kind?: PhotoKind): g.NewPhoto {
  photoCounter += 1;
  const id = `photo${photoCounter.toString(16).padStart(6, '0')}`;
  return { id, slot, kind: kind ?? defaultKindForSlot(room.settings.theme, slot), mime: 'image/png', data: PNG_BYTES };
}

/** Uploads a photo (see `newPhoto`). */
export function addPhoto(room: g.Room, playerId: string, slot: PhotoSlot = 0, now = 0, kind?: PhotoKind): g.Photo {
  return unwrap(g.uploadPhoto(room, playerId, newPhoto(room, slot, kind), now));
}

/** `counts[i]` photos for the i-th player. */
export function addPhotos(room: g.Room, counts: number[]): void {
  counts.forEach((count, i) => {
    for (let slot = 0; slot < count; slot++) addPhoto(room, room.players[i].id, slot as PhotoSlot);
  });
}

/** Returns the candidate `voterId` picks for `photo`, or null to abstain. */
export type Chooser = (voterId: string, photo: g.Photo, candidates: string[]) => string | null;

/**
 * Plays every voting round from `now`: each player votes what `choose` returns (null =
 * abstain), then the host skips the round. Returns the time after the last round.
 */
export function playAllRounds(room: g.Room, choose: Chooser, now: number): number {
  let t = now;
  while (room.phase === 'voting') {
    const game = g.requireGame(room);
    t = Math.max(t, game.roundStartsAt);
    const photo = g.gamePhoto(room, game.round);
    for (const p of room.players) {
      const candidate = choose(p.id, photo, game.ownerIds.filter((id) => id !== p.id));
      if (candidate) unwrap(g.castVote(room, p.id, game.round, candidate, t));
    }
    unwrap(g.skipRound(room, room.hostId, game.round, t));
    t += 1;
  }
  return t;
}

/** Owners vote for the first other candidate (decoy), everybody else for the real owner. */
export const allCorrect: Chooser = (voterId, photo, candidates) =>
  voterId === photo.ownerId ? candidates[0] : photo.ownerId;

/** Advances through every reveal as fast as allowed; returns the time at the end. */
export function revealAll(room: g.Room, now: number): number {
  let t = now;
  while (room.phase === 'reveal') {
    const reveal = g.requireGame(room).reveal!;
    t = Math.max(t, reveal.startedAt + room.timing.revealOwnerAtMs);
    unwrap(g.nextReveal(room, room.hostId, reveal.index, t));
  }
  return t;
}
