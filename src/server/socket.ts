/**
 * Socket.IO wiring: validates intents (zod), applies them to the engine, acks, then pushes
 * every connected player of the touched rooms their own view. Also owns one wake-up timer
 * per room, driven by the engine's `nextWakeAt` / `tick`.
 */
import { randomInt } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import {
  MAX_PHOTO_BYTES,
  REACTION_EMOJIS,
  type AckResult,
  type ClientToServerEvents,
  type ErrorCode,
  type Reaction,
  type ServerToClientEvents,
  type Session,
} from '../shared/protocol';
import {
  castVote,
  disconnectPlayer,
  findPlayer,
  findPlayerByToken,
  isRoomEmpty,
  joinRoom,
  kickPlayer,
  leaveRoom,
  nextReveal,
  nextWakeAt,
  playAgain,
  reconnectPlayer,
  removePhoto,
  setPhotoKind,
  skipRound,
  startGame,
  tick,
  updatePlayer,
  updateSettings,
  uploadPhoto,
  type Player,
  type Result,
  type Rng,
  type Room,
} from './game';
import { inspectImage, normalizeMime, toBuffer } from './image';
import { KeyedRateLimiter, TokenBucket, clientIp } from './rateLimit';
import { newPhotoId, newPlayerId, newReactionId, newToken, type RoomRegistry } from './rooms';
import { buildView, toMyPhoto } from './views';

export interface SocketData {
  code: string | null;
  playerId: string | null;
}
export type InterServerEvents = Record<string, never>;
export type IoServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;
type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>;

export interface RateLimits {
  /** Generic per-socket bucket for every intent. */
  eventBurst: number;
  eventsPerSecond: number;
  /** Reactions have their own bucket; extra ones are dropped silently. */
  reactionBurst: number;
  reactionsPerSecond: number;
  /** Per client IP. */
  roomCreatesPerMinute: number;
  /** Per client IP: GET /api/rooms/:code (burst and refill per minute). */
  roomPeeksPerMinute: number;
  /** Per client IP: room:join / room:rejoin naming a room that does not exist (code guessing). */
  roomMissesPerMinute: number;
  /** Per socket: photo uploads (burst, then refill). */
  uploadBurst: number;
  uploadsPerSecond: number;
  /** Per client IP: uploaded bytes (burst), refilled over 30 minutes. */
  uploadBytesPerIp: number;
  /** Per client IP: concurrent connections. */
  connectionsPerIp: number;
}

const MIB = 1024 * 1024;

export const DEFAULT_RATE_LIMITS: RateLimits = {
  eventBurst: 30,
  eventsPerSecond: 10,
  reactionBurst: 4,
  reactionsPerSecond: 4,
  roomCreatesPerMinute: 10,
  roomPeeksPerMinute: 60,
  roomMissesPerMinute: 20,
  uploadBurst: 8,
  uploadsPerSecond: 0.1,
  uploadBytesPerIp: 64 * MIB,
  // Generous: a party shares one Wi-Fi IP, and some proxies collapse clients onto one address.
  connectionsPerIp: 100,
};

/** Every photo of every room is kept in memory: refuse uploads past this (all rooms together). */
export const DEFAULT_MAX_TOTAL_PHOTO_BYTES = 256 * MIB;
/** Per room. Real clients send JPEGs of at most 1280 px, well under 1 MiB each (12 players x 2 slots). */
export const DEFAULT_MAX_ROOM_PHOTO_BYTES = 24 * MIB;
const UPLOAD_BYTES_REFILL_SECONDS = 30 * 60;
/** setTimeout overflows past ~24.8 days; waking up early is harmless (tick is a no-op). */
const MAX_TIMER_DELAY_MS = 60 * 60_000;

export interface Logger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
}

export interface GameServerOptions {
  registry: RoomRegistry;
  now?: () => number;
  /** Shuffle RNG (defaults to crypto). */
  rng?: Rng;
  rateLimits?: Partial<RateLimits>;
  /** Read the client IP from X-Forwarded-For. Only behind a trusted reverse proxy. */
  trustProxy?: boolean;
  maxTotalPhotoBytes?: number;
  maxRoomPhotoBytes?: number;
  logger?: Logger;
}

export interface GameServer {
  /** Deletes expired rooms and forgets idle rate-limit entries. */
  sweep(): void;
  /** Clears every room timer. */
  dispose(): void;
}

const cryptoRng: Rng = () => randomInt(2 ** 32) / 2 ** 32;

/** The engine.io connection behind a socket (only what is used here). */
interface EngineConnection {
  request: { headers: Record<string, string | string[] | undefined> };
  remoteAddress: string;
  once(event: 'close', listener: () => void): void;
  close(): void;
}

/**
 * Caps concurrent connections per client IP, at the engine.io level: every connection can
 * hold a partly received packet in memory, even before it joins a Socket.IO namespace.
 */
function limitConnectionsPerIp(io: IoServer, max: number, trustProxy: boolean): void {
  const counts = new Map<string, number>();
  io.engine.on('connection', (conn: EngineConnection) => {
    const ip = clientIp(conn.request.headers['x-forwarded-for'], conn.remoteAddress, trustProxy);
    const count = (counts.get(ip) ?? 0) + 1;
    counts.set(ip, count);
    conn.once('close', () => {
      const left = (counts.get(ip) ?? 1) - 1;
      if (left > 0) counts.set(ip, left);
      else counts.delete(ip);
    });
    if (count > max) conn.close();
  });
}

export function attachGameServer(io: IoServer, options: GameServerOptions): GameServer {
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  const limits = { ...DEFAULT_RATE_LIMITS, ...options.rateLimits };
  const hub = new RoomHub(io, options.registry, now, logger);
  const trustProxy = options.trustProxy ?? false;
  const deps: Deps = {
    hub,
    registry: options.registry,
    now,
    rng: options.rng ?? cryptoRng,
    logger,
    limits,
    createLimiter: new KeyedRateLimiter(limits.roomCreatesPerMinute, limits.roomCreatesPerMinute / 60),
    missLimiter: new KeyedRateLimiter(limits.roomMissesPerMinute, limits.roomMissesPerMinute / 60),
    uploadBytesLimiter: new KeyedRateLimiter(limits.uploadBytesPerIp, limits.uploadBytesPerIp / UPLOAD_BYTES_REFILL_SECONDS),
    trustProxy,
    maxTotalPhotoBytes: options.maxTotalPhotoBytes ?? DEFAULT_MAX_TOTAL_PHOTO_BYTES,
    maxRoomPhotoBytes: options.maxRoomPhotoBytes ?? DEFAULT_MAX_ROOM_PHOTO_BYTES,
  };
  limitConnectionsPerIp(io, limits.connectionsPerIp, trustProxy);
  io.on('connection', (socket) => {
    socket.data.code = null;
    socket.data.playerId = null;
    registerHandlers(socket, deps);
  });
  return {
    sweep() {
      hub.sweep();
      for (const limiter of [deps.createLimiter, deps.missLimiter, deps.uploadBytesLimiter]) limiter.sweep(now());
    },
    dispose() {
      hub.dispose();
    },
  };
}

// ---------------------------------------------------------------------------
// Sessions, timers and broadcasting
// ---------------------------------------------------------------------------

interface Seat {
  room: Room;
  player: Player;
}

const sessionKey = (code: string, playerId: string) => `${code}/${playerId}`;

class RoomHub {
  /** Current socket of each player, by sessionKey. */
  private readonly sessions = new Map<string, IoSocket>();
  private readonly timers = new Map<string, NodeJS.Timeout>();

  constructor(
    private readonly io: IoServer,
    private readonly registry: RoomRegistry,
    private readonly now: () => number,
    private readonly logger: Logger,
  ) {}

  socketOf(code: string, playerId: string): IoSocket | undefined {
    return this.sessions.get(sessionKey(code, playerId));
  }

  /** The room / player this socket currently holds, if it is still their current socket. */
  current(socket: IoSocket): Seat | null {
    const { code, playerId } = socket.data;
    if (!code || !playerId || this.socketOf(code, playerId) !== socket) return null;
    const room = this.registry.get(code);
    const player = room && findPlayer(room, playerId);
    return room && player ? { room, player } : null;
  }

  attach(socket: IoSocket, room: Room, playerId: string): void {
    socket.data.code = room.code;
    socket.data.playerId = playerId;
    this.sessions.set(sessionKey(room.code, playerId), socket);
    void socket.join(room.code);
  }

  detach(socket: IoSocket): void {
    const { code, playerId } = socket.data;
    if (code && playerId && this.socketOf(code, playerId) === socket) this.sessions.delete(sessionKey(code, playerId));
    if (code) void socket.leave(code);
    socket.data.code = null;
    socket.data.playerId = null;
  }

  emitReaction(room: Room, reaction: Reaction): void {
    this.io.to(room.code).emit('room:reaction', reaction);
  }

  /** After a change: deletes the room if nobody is left, else sends views and reschedules. */
  commit(room: Room): void {
    try {
      if (this.registry.get(room.code) !== room) return;
      if (isRoomEmpty(room)) {
        this.registry.delete(room.code);
        this.forget(room);
        return;
      }
      this.broadcast(room);
      this.schedule(room);
    } catch (err) {
      this.logger.error(`[room ${room.code}] commit failed`, err);
    }
  }

  sweep(): void {
    for (const room of this.registry.sweep(this.now())) this.forget(room);
  }

  dispose(): void {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  /** Each player gets their own view: never a shared broadcast. */
  private broadcast(room: Room): void {
    const now = this.now();
    for (const player of room.players) this.socketOf(room.code, player.id)?.emit('room:state', buildView(room, player.id, now));
  }

  private schedule(room: Room): void {
    this.clearTimer(room.code);
    const wakeAt = nextWakeAt(room);
    if (wakeAt === null) return;
    const delay = Math.min(MAX_TIMER_DELAY_MS, Math.max(0, wakeAt - this.now()));
    const timer = setTimeout(() => this.wake(room), delay);
    timer.unref();
    this.timers.set(room.code, timer);
  }

  private wake(room: Room): void {
    this.timers.delete(room.code);
    if (this.registry.get(room.code) !== room) return;
    try {
      if (tick(room, this.now())) this.commit(room);
      else this.schedule(room);
    } catch (err) {
      this.logger.error(`[room ${room.code}] tick failed`, err);
    }
  }

  private clearTimer(code: string): void {
    const timer = this.timers.get(code);
    if (timer) clearTimeout(timer);
    this.timers.delete(code);
  }

  /**
   * Drops timer and sockets of a room that left the registry. Sockets still attached (a room
   * swept for its age while a tab is open) are told, like kicked players, so they go home.
   */
  private forget(room: Room): void {
    this.clearTimer(room.code);
    for (const player of room.players) {
      const socket = this.socketOf(room.code, player.id);
      if (!socket) continue;
      socket.emit('room:kicked');
      this.detach(socket);
    }
  }
}

// ---------------------------------------------------------------------------
// Payload schemas
// ---------------------------------------------------------------------------

const text = (max: number) => z.string().max(max);
const slot = z.union([z.literal(0), z.literal(1)]);
const kind = z.enum(['daron', 'daronne']);
const index = z.number().int().min(0).max(10_000);
const binary = z.custom<ArrayBuffer | Uint8Array>((v) => v instanceof ArrayBuffer || v instanceof Uint8Array);

const schemas = {
  none: z.unknown(),
  create: z.object({ name: text(200), avatar: text(32) }),
  join: z.object({ code: text(32), name: text(200), avatar: text(32) }),
  rejoin: z.object({ code: text(32), token: text(200), takeover: z.boolean() }),
  update: z.object({ name: text(200).optional(), avatar: text(32).optional() }),
  upload: z.object({ slot, kind, mime: text(100), data: binary }),
  remove: z.object({ slot }),
  setKind: z.object({ slot, kind }),
  settings: z.object({ voteSeconds: z.number().optional(), anonymousVotes: z.boolean().optional() }),
  kick: z.object({ playerId: text(100) }),
  skip: z.object({ round: index }),
  nextReveal: z.object({ index }),
  vote: z.object({ round: index, candidateId: text(100) }),
  react: z.object({ emoji: z.enum(REACTION_EMOJIS) }),
};

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

interface Deps {
  hub: RoomHub;
  registry: RoomRegistry;
  now: () => number;
  rng: Rng;
  logger: Logger;
  limits: RateLimits;
  createLimiter: KeyedRateLimiter;
  /** Per IP: joins / rejoins naming an unknown room. */
  missLimiter: KeyedRateLimiter;
  /** Per IP: uploaded bytes. */
  uploadBytesLimiter: KeyedRateLimiter;
  trustProxy: boolean;
  maxTotalPhotoBytes: number;
  maxRoomPhotoBytes: number;
}

type IntentEvent = Exclude<keyof ClientToServerEvents, 'react'>;
type Reply = AckResult<object>;
type AckFn = (res: Reply) => void;

const OK: Reply = { ok: true };
const failure = (error: ErrorCode): Reply => ({ ok: false, error });

function registerHandlers(socket: IoSocket, deps: Deps): void {
  const { hub, registry, now, logger, limits } = deps;
  const events = new TokenBucket(limits.eventBurst, limits.eventsPerSecond, now());
  const reactions = new TokenBucket(limits.reactionBurst, limits.reactionsPerSecond, now());
  const uploads = new TokenBucket(limits.uploadBurst, limits.uploadsPerSecond, now());
  const ip = clientIp(socket.handshake.headers['x-forwarded-for'], socket.handshake.address, deps.trustProxy);

  /** Looks up a room by code; unknown codes count against the IP (they are how codes get guessed). */
  const findRoom = (code: string): Room | Reply => {
    if (!deps.missLimiter.has(ip, now())) return failure('RATE_LIMITED');
    const room = registry.get(code);
    if (room) return room;
    deps.missLimiter.take(ip, now());
    return failure('ROOM_NOT_FOUND');
  };
  const isReply = (v: Room | Reply): v is Reply => 'ok' in v;

  /**
   * Payloads are untrusted: the listener takes raw args, validates them, always acks when
   * an ack function was given, then pushes views of the rooms the handler touched.
   */
  function bind<T>(event: IntentEvent, schema: z.ZodType<T>, run: (payload: T, dirty: Set<Room>) => Reply): void {
    const listener = (...args: unknown[]) => {
      const last = args[args.length - 1];
      const ack = typeof last === 'function' ? (last as AckFn) : undefined;
      const dirty = new Set<Room>();
      let res: Reply;
      try {
        if (!events.take(now())) {
          res = failure('RATE_LIMITED');
        } else {
          const parsed = schema.safeParse(args[0]);
          res = parsed.success ? run(parsed.data, dirty) : failure('BAD_REQUEST');
        }
      } catch (err) {
        logger.error(`[socket] ${event} failed`, err);
        res = failure('SERVER_ERROR');
      }
      try {
        ack?.(res);
      } catch (err) {
        logger.error(`[socket] ${event} ack failed`, err);
      }
      for (const room of dirty) hub.commit(room);
    };
    socket.on(event, listener as never);
  }

  /** Runs `fn` with the socket's current seat, or fails with NOT_IN_ROOM. */
  const seated = (fn: (room: Room, player: Player) => Reply): Reply => {
    const seat = hub.current(socket);
    return seat ? fn(seat.room, seat.player) : failure('NOT_IN_ROOM');
  };

  const applied = (result: Result<unknown>, room: Room, dirty: Set<Room>): Reply => {
    if (!result.ok) return result;
    dirty.add(room);
    return OK;
  };

  /** Seats the socket as `player`, releasing whatever seat it held before. */
  const enter = (room: Room, player: Player, dirty: Set<Room>) => {
    const previous = hub.current(socket);
    hub.detach(socket);
    if (previous && disconnectPlayer(previous.room, previous.player.id, now())) dirty.add(previous.room);
    hub.attach(socket, room, player.id);
    dirty.add(room);
  };

  const session = (room: Room, player: Player): Session => ({ code: room.code, playerId: player.id, token: player.token });

  bind('room:create', schemas.create, (p, dirty) => {
    if (!deps.createLimiter.take(ip, now())) return failure('RATE_LIMITED');
    const created = registry.create(p, now());
    if (!created.ok) return created;
    const { room, player } = created.value;
    enter(room, player, dirty);
    return { ok: true, session: session(room, player) };
  });

  bind('room:join', schemas.join, (p, dirty) => {
    const room = findRoom(p.code);
    if (isReply(room)) return room;
    const joined = joinRoom(room, { id: newPlayerId(), token: newToken(), name: p.name, avatar: p.avatar }, now());
    if (!joined.ok) return joined;
    enter(room, joined.value, dirty);
    return { ok: true, session: session(room, joined.value) };
  });

  bind('room:rejoin', schemas.rejoin, (p, dirty) => {
    const room = findRoom(p.code);
    if (isReply(room)) return room;
    const player = findPlayerByToken(room, p.token);
    if (!player) return failure('NOT_IN_ROOM');
    const holder = hub.socketOf(room.code, player.id);
    if (holder !== socket) {
      if (holder?.connected) {
        if (!p.takeover) return failure('SESSION_ACTIVE');
        holder.emit('session:replaced');
      }
      if (holder) hub.detach(holder);
      enter(room, player, dirty);
    }
    reconnectPlayer(room, player.id, now());
    dirty.add(room);
    return { ok: true, session: session(room, player) };
  });

  bind('room:leave', schemas.none, (_p, dirty) =>
    seated((room, player) => {
      const left = leaveRoom(room, player.id, now());
      if (!left.ok) return left;
      hub.detach(socket);
      dirty.add(room);
      return OK;
    }),
  );

  bind('player:update', schemas.update, (p, dirty) =>
    seated((room, player) => applied(updatePlayer(room, player.id, p), room, dirty)),
  );

  bind('photo:upload', schemas.upload, (p, dirty) =>
    seated((room, player) => {
      if (!uploads.take(now())) return failure('RATE_LIMITED');
      const size = p.data.byteLength;
      if (size > MAX_PHOTO_BYTES) return failure('PHOTO_TOO_LARGE');
      const info = inspectImage(p.data instanceof ArrayBuffer ? new Uint8Array(p.data) : p.data);
      if (!info || info.mime !== normalizeMime(p.mime)) return failure('INVALID_PHOTO');
      // Room quota; the photo this one replaces (same slot) is freed.
      const kept = room.photos.filter((ph) => !(ph.ownerId === player.id && ph.slot === p.slot));
      if (kept.reduce((sum, ph) => sum + ph.data.byteLength, 0) + size > deps.maxRoomPhotoBytes) return failure('PHOTO_TOO_LARGE');
      if (registry.photoBytes() + size > deps.maxTotalPhotoBytes) return failure('SERVER_BUSY');
      if (!deps.uploadBytesLimiter.has(ip, now(), size)) return failure('RATE_LIMITED');
      const data = toBuffer(p.data);
      const uploaded = uploadPhoto(room, player.id, { id: newPhotoId(), slot: p.slot, kind: p.kind, mime: info.mime, data }, now());
      if (!uploaded.ok) return uploaded;
      deps.uploadBytesLimiter.take(ip, now(), size);
      dirty.add(room);
      return { ok: true, photo: toMyPhoto(room.code, uploaded.value) };
    }),
  );

  bind('photo:remove', schemas.remove, (p, dirty) =>
    seated((room, player) => applied(removePhoto(room, player.id, p.slot), room, dirty)),
  );

  bind('photo:setKind', schemas.setKind, (p, dirty) =>
    seated((room, player) => applied(setPhotoKind(room, player.id, p.slot, p.kind), room, dirty)),
  );

  bind('host:settings', schemas.settings, (p, dirty) =>
    seated((room, player) => applied(updateSettings(room, player.id, p), room, dirty)),
  );

  bind('host:kick', schemas.kick, (p, dirty) =>
    seated((room, player) => {
      const kicked = kickPlayer(room, player.id, p.playerId, now());
      if (!kicked.ok) return kicked;
      const target = hub.socketOf(room.code, p.playerId);
      if (target) {
        target.emit('room:kicked');
        hub.detach(target);
      }
      dirty.add(room);
      return OK;
    }),
  );

  bind('host:start', schemas.none, (_p, dirty) =>
    seated((room, player) => applied(startGame(room, player.id, now(), deps.rng), room, dirty)),
  );

  bind('host:skipRound', schemas.skip, (p, dirty) =>
    seated((room, player) => applied(skipRound(room, player.id, p.round, now()), room, dirty)),
  );

  bind('host:nextReveal', schemas.nextReveal, (p, dirty) =>
    seated((room, player) => applied(nextReveal(room, player.id, p.index, now()), room, dirty)),
  );

  bind('host:playAgain', schemas.none, (_p, dirty) =>
    seated((room, player) => applied(playAgain(room, player.id, now()), room, dirty)),
  );

  bind('vote:cast', schemas.vote, (p, dirty) =>
    seated((room, player) => applied(castVote(room, player.id, p.round, p.candidateId, now()), room, dirty)),
  );

  // Fire and forget: no ack, invalid or excess reactions are dropped silently.
  const onReact = (...args: unknown[]) => {
    try {
      if (!reactions.take(now())) return;
      const parsed = schemas.react.safeParse(args[0]);
      const seat = hub.current(socket);
      if (!parsed.success || !seat) return;
      hub.emitReaction(seat.room, { id: newReactionId(), playerId: seat.player.id, emoji: parsed.data.emoji });
    } catch (err) {
      logger.error('[socket] react failed', err);
    }
  };
  socket.on('react', onReact as never);

  socket.on('disconnect', () => {
    try {
      const seat = hub.current(socket);
      hub.detach(socket);
      if (seat && disconnectPlayer(seat.room, seat.player.id, now())) hub.commit(seat.room);
    } catch (err) {
      logger.error('[socket] disconnect failed', err);
    }
  });
}
