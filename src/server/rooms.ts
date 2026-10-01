/** In-memory room registry: room codes, ids / tokens, idle room cleanup. */
import { randomBytes, randomInt, randomUUID } from 'node:crypto';
import { ROOM_CODE_ALPHABET, ROOM_CODE_LENGTH, normalizeRoomCode, type RoomSetup } from '../shared/protocol';
import { DEFAULT_TIMING, createRoom, roomImageBytes, type Player, type Result, type Room, type Timing } from './game';

export const MAX_ROOMS = 2000;
/** Rooms without any connected player for this long are deleted. */
export const ROOM_IDLE_MS = 30 * 60_000;
/** Hard cap on a room's lifetime. */
export const ROOM_MAX_AGE_MS = 24 * 60 * 60_000;

const CODE_ATTEMPTS = 50;

export const newPlayerId = (): string => randomUUID();
export const newToken = (): string => randomBytes(24).toString('base64url');
/** Random and unrelated to the owner, so a photo URL gives nothing away. Also used for selfies. */
export const newPhotoId = (): string => randomBytes(16).toString('hex');
export const newReactionId = (): string => randomBytes(8).toString('hex');

export function newRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) code += ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)];
  return code;
}

export interface RegistryOptions {
  maxRooms?: number;
  timing?: Timing;
}

export class RoomRegistry {
  private readonly rooms = new Map<string, Room>();
  private readonly maxRooms: number;
  private readonly timing: Timing;

  constructor(options: RegistryOptions = {}) {
    this.maxRooms = options.maxRooms ?? MAX_ROOMS;
    this.timing = options.timing ?? DEFAULT_TIMING;
  }

  get size(): number {
    return this.rooms.size;
  }

  /** Accepts any user-typed code (normalized). */
  get(code: string): Room | undefined {
    return this.rooms.get(normalizeRoomCode(code));
  }

  values(): IterableIterator<Room> {
    return this.rooms.values();
  }

  /**
   * Creates a room with a fresh unique code, `host` joining as its host, starting with the
   * game mode in `setup` (DEFAULT_SETTINGS without one). Nothing is registered on failure.
   */
  create(host: { name: string; avatar: string }, now: number, setup?: RoomSetup): Result<{ room: Room; player: Player }> {
    if (this.rooms.size >= this.maxRooms) return { ok: false, error: 'SERVER_BUSY' };
    const code = this.freeCode();
    if (!code) return { ok: false, error: 'SERVER_BUSY' };
    const player = { id: newPlayerId(), token: newToken(), name: host.name, avatar: host.avatar };
    const created = createRoom(code, player, now, this.timing, setup);
    if (!created.ok) return created;
    const room = created.value;
    this.rooms.set(code, room);
    return { ok: true, value: { room, player: room.players[0] } };
  }

  delete(code: string): boolean {
    return this.rooms.delete(code);
  }

  /** Total bytes of every image held in memory: game photos and selfies of every room. */
  photoBytes(): number {
    let total = 0;
    for (const room of this.rooms.values()) total += roomImageBytes(room);
    return total;
  }

  /** Deletes and returns rooms that are empty, idle for ROOM_IDLE_MS, or older than ROOM_MAX_AGE_MS. */
  sweep(now: number): Room[] {
    const expired = [...this.rooms.values()].filter(
      (room) => room.players.length === 0 || now - room.createdAt >= ROOM_MAX_AGE_MS || now - lastSeenAt(room, now) >= ROOM_IDLE_MS,
    );
    for (const room of expired) this.rooms.delete(room.code);
    return expired;
  }

  private freeCode(): string | null {
    for (let i = 0; i < CODE_ATTEMPTS; i++) {
      const code = newRoomCode();
      if (!this.rooms.has(code)) return code;
    }
    return null;
  }
}

/** Last time a player was connected (now if someone still is). */
function lastSeenAt(room: Room, now: number): number {
  if (room.players.some((p) => p.connected)) return now;
  return Math.max(room.createdAt, ...room.players.map((p) => p.disconnectedAt ?? room.createdAt));
}
