/**
 * Pure Daron Guessr game engine: the room state machine.
 *
 * No I/O, no timers, no ambient randomness or clock: callers inject `now` (ms) and an RNG,
 * and generate ids / tokens themselves. Every client intent returns a `Result` that carries
 * an `ErrorCode` on failure. Time-based transitions happen in `tick()`, and `nextWakeAt()`
 * tells the caller when `tick()` needs to run next.
 */
import {
  ACCEPTED_PHOTO_MIME,
  ALL_VOTED_GRACE_MS,
  AVATARS,
  DEFAULT_SETTINGS,
  GAME_INTRO_MS,
  HOST_GRACE_MS,
  MAX_PHOTO_BYTES,
  MAX_PLAYERS,
  MIN_PHOTO_OWNERS,
  PHOTO_KINDS,
  PHOTO_SLOTS,
  PHOTOS_PER_PLAYER_OPTIONS,
  PLAYER_COLORS,
  POINTS_PER_CORRECT,
  REVEAL_INTRO_MS,
  REVEAL_OWNER_AT_MS,
  ROUND_GAP_MS,
  THEMES,
  THEME_DEFAULT_PHOTOS,
  VOTE_SECONDS_OPTIONS,
  defaultKindForSlot,
  isKindAllowed,
  sanitizeName,
  type Award,
  type ErrorCode,
  type Phase,
  type PhotoKind,
  type PhotoSlot,
  type RankingEntry,
  type Settings,
  type Theme,
} from '../shared/protocol';

// ---------------------------------------------------------------------------
// State model
// ---------------------------------------------------------------------------

export type PhotoMime = (typeof ACCEPTED_PHOTO_MIME)[number];
/** Returns a float in [0, 1). */
export type Rng = () => number;

/** Engine timing knobs. Defaults come from protocol.ts; tests may shrink them. */
export interface Timing {
  gameIntroMs: number;
  roundGapMs: number;
  allVotedGraceMs: number;
  revealIntroMs: number;
  revealOwnerAtMs: number;
  hostGraceMs: number;
  /** Lobby only: players disconnected for this long are removed. */
  lobbyDropMs: number;
  /** Votes are accepted this long before `startsAt` to absorb client clock skew. */
  earlyVoteToleranceMs: number;
}

export const DEFAULT_TIMING: Timing = {
  gameIntroMs: GAME_INTRO_MS,
  roundGapMs: ROUND_GAP_MS,
  allVotedGraceMs: ALL_VOTED_GRACE_MS,
  revealIntroMs: REVEAL_INTRO_MS,
  revealOwnerAtMs: REVEAL_OWNER_AT_MS,
  hostGraceMs: HOST_GRACE_MS,
  lobbyDropMs: 5 * 60_000,
  earlyVoteToleranceMs: 300,
};

export interface Player {
  id: string;
  /** Secret used to resume the session. */
  token: string;
  name: string;
  avatar: string;
  color: string;
  connected: boolean;
  joinedAt: number;
  disconnectedAt: number | null;
}

export interface Photo {
  /** Random, unrelated to the owner. */
  id: string;
  ownerId: string;
  slot: PhotoSlot;
  kind: PhotoKind;
  mime: PhotoMime;
  data: Buffer;
  uploadedAt: number;
}

export interface Vote {
  candidateId: string;
  /** Cast by the photo owner to blend in; never counted. */
  decoy: boolean;
}

export interface RevealState {
  index: number;
  startedAt: number;
}

export interface GameState {
  startedAt: number;
  /** Photo ids in play order (voting and reveal): active-slot photos only. */
  order: string[];
  /** Players that had >= 1 active-slot photo when the game started, in join order: the vote candidates. */
  ownerIds: string[];
  /** Per round: voter id -> vote (decoys included). */
  votes: Map<string, Vote>[];
  /** Current voting round. */
  round: number;
  roundStartsAt: number;
  /** Effective close time of the current round, null while nothing closes it (no timer). */
  roundCloseAt: number | null;
  reveal: RevealState | null;
}

export interface Room {
  code: string;
  createdAt: number;
  phase: Phase;
  /** In join order. */
  players: Player[];
  photos: Photo[];
  settings: Settings;
  hostId: string;
  /** Set while the host is disconnected; the crown moves after `timing.hostGraceMs`. */
  hostDisconnectedSince: number | null;
  game: GameState | null;
  timing: Timing;
}

export type Result<T = void> = { ok: true; value: T } | { ok: false; error: ErrorCode };
export type Failure = Extract<Result, { ok: false }>;

export interface NewPlayer {
  id: string;
  token: string;
  name: string;
  avatar: string;
}

export interface NewPhoto {
  id: string;
  slot: PhotoSlot;
  kind: PhotoKind;
  mime: PhotoMime;
  data: Buffer;
}

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const DONE: Result = { ok: true, value: undefined };
const fail = (error: ErrorCode): Failure => ({ ok: false, error });

// ---------------------------------------------------------------------------
// Lookups and validation helpers
// ---------------------------------------------------------------------------

export function findPlayer(room: Room, playerId: string): Player | undefined {
  return room.players.find((p) => p.id === playerId);
}

export function findPlayerByToken(room: Room, token: string): Player | undefined {
  return token ? room.players.find((p) => p.token === token) : undefined;
}

/** Every photo of a player, inactive slots included, by slot. */
export function playerPhotos(room: Room, playerId: string): Photo[] {
  return room.photos.filter((ph) => ph.ownerId === playerId).sort((a, b) => a.slot - b.slot);
}

export function hasPhotos(room: Room, playerId: string): boolean {
  return room.photos.some((ph) => ph.ownerId === playerId);
}

/** Only the first `settings.photosPerPlayer` slots are played; photos in the others are kept but ignored. */
export function isActiveSlot(room: Room, slot: number): boolean {
  return slot < room.settings.photosPerPlayer;
}

/** A player's photos that take part in the game (active slots), by slot. */
export function activePhotos(room: Room, playerId: string): Photo[] {
  return playerPhotos(room, playerId).filter((ph) => isActiveSlot(room, ph.slot));
}

/** Lobby readiness: at least one photo in an active slot. */
export function hasActivePhotos(room: Room, playerId: string): boolean {
  return room.photos.some((ph) => ph.ownerId === playerId && isActiveSlot(room, ph.slot));
}

export function isRoomEmpty(room: Room): boolean {
  return room.players.length === 0;
}

export function requireGame(room: Room): GameState {
  if (!room.game) throw new Error(`room ${room.code} has no game`);
  return room.game;
}

/** Photo shown in round `index`. */
export function gamePhoto(room: Room, index: number): Photo {
  const id = requireGame(room).order[index];
  const photo = room.photos.find((ph) => ph.id === id);
  if (!photo) throw new Error(`room ${room.code}: photo of round ${index} is missing`);
  return photo;
}

const isSlot = (slot: number): slot is PhotoSlot => (PHOTO_SLOTS as readonly number[]).includes(slot);
const isKind = (kind: unknown): kind is PhotoKind => (PHOTO_KINDS as readonly unknown[]).includes(kind);
const isTheme = (theme: unknown): theme is Theme => (THEMES as readonly unknown[]).includes(theme);
const isPhotosPerPlayer = (n: unknown): n is number => (PHOTOS_PER_PLAYER_OPTIONS as readonly unknown[]).includes(n);
const isAvatar = (avatar: string) => (AVATARS as readonly string[]).includes(avatar);
/** Comparison key for names: case-insensitive, ignoring emoji variation selectors. */
const nameKey = (name: string) => name.normalize('NFC').replace(/[\ufe0e\ufe0f]/g, '').toLowerCase();

/**
 * Whether a photo of `kind` may go in `slot` under the current settings: an active slot, and
 * a kind the theme allows. Checked on upload and relabel (BAD_REQUEST otherwise).
 */
export function canPlacePhoto(room: Room, slot: number, kind: string): boolean {
  return isSlot(slot) && isActiveSlot(room, slot) && isKind(kind) && isKindAllowed(room.settings.theme, kind);
}

/** Validates a name / avatar pair; returns the sanitized name. */
function checkIdentity(room: Room | null, rawName: string, avatar: string, selfId?: string): Result<string> {
  const name = sanitizeName(rawName);
  if (!name) return fail('INVALID_NAME');
  if (!isAvatar(avatar)) return fail('BAD_REQUEST');
  const taken = room?.players.some((p) => p.id !== selfId && nameKey(p.name) === nameKey(name));
  return taken ? fail('NAME_TAKEN') : ok(name);
}

/** The acting player, optionally restricted to a phase. */
function member(room: Room, playerId: string, phase?: Phase): Result<Player> {
  const player = findPlayer(room, playerId);
  if (!player) return fail('NOT_IN_ROOM');
  if (phase && room.phase !== phase) return fail('WRONG_PHASE');
  return ok(player);
}

function host(room: Room, playerId: string, phase?: Phase): Result<Player> {
  const player = findPlayer(room, playerId);
  if (!player) return fail('NOT_IN_ROOM');
  if (room.hostId !== playerId) return fail('NOT_HOST');
  if (phase && room.phase !== phase) return fail('WRONG_PHASE');
  return ok(player);
}

function firstUnusedColor(room: Room): string {
  const used = new Set(room.players.map((p) => p.color));
  return PLAYER_COLORS.find((c) => !used.has(c)) ?? PLAYER_COLORS[room.players.length % PLAYER_COLORS.length];
}

function addPlayer(room: Room, input: NewPlayer, name: string, now: number): Player {
  const player: Player = {
    id: input.id,
    token: input.token,
    name,
    avatar: input.avatar,
    color: firstUnusedColor(room),
    connected: true,
    joinedAt: now,
    disconnectedAt: null,
  };
  room.players.push(player);
  return player;
}

// ---------------------------------------------------------------------------
// Membership
// ---------------------------------------------------------------------------

export function createRoom(code: string, hostInput: NewPlayer, now: number, timing: Timing = DEFAULT_TIMING): Result<Room> {
  const name = checkIdentity(null, hostInput.name, hostInput.avatar);
  if (!name.ok) return name;
  const room: Room = {
    code,
    createdAt: now,
    phase: 'lobby',
    players: [],
    photos: [],
    settings: { ...DEFAULT_SETTINGS },
    hostId: hostInput.id,
    hostDisconnectedSince: null,
    game: null,
    timing,
  };
  addPlayer(room, hostInput, name.value, now);
  return ok(room);
}

export function joinRoom(room: Room, input: NewPlayer, now: number): Result<Player> {
  if (room.phase !== 'lobby') return fail('GAME_IN_PROGRESS');
  if (room.players.length >= MAX_PLAYERS) return fail('ROOM_FULL');
  const name = checkIdentity(room, input.name, input.avatar);
  if (!name.ok) return name;
  const player = addPlayer(room, input, name.value, now);
  if (room.players.length === 1) room.hostId = player.id;
  return ok(player);
}

/** Marks a player connected again (session resumed). */
export function reconnectPlayer(room: Room, playerId: string, now: number): Result<Player> {
  const player = findPlayer(room, playerId);
  if (!player) return fail('NOT_IN_ROOM');
  player.connected = true;
  player.disconnectedAt = null;
  if (room.hostId === playerId) room.hostDisconnectedSince = null;
  // The connected set changed: if everybody connected has now voted, the round can close
  // (e.g. voters coming back to a timer-less round that stalled while nobody was connected).
  applyAllVoted(room, now);
  return ok(player);
}

/** Socket gone. Returns whether anything changed. */
export function disconnectPlayer(room: Room, playerId: string, now: number): boolean {
  const player = findPlayer(room, playerId);
  if (!player || !player.connected) return false;
  player.connected = false;
  player.disconnectedAt = now;
  if (room.hostId === playerId) room.hostDisconnectedSince = now;
  // The player no longer blocks the "everybody voted" rule.
  applyAllVoted(room, now);
  return true;
}

/** Lobby: removes the player and their photos. In game: disconnects them. Hands the crown over at once. */
export function leaveRoom(room: Room, playerId: string, now: number): Result {
  const player = member(room, playerId);
  if (!player.ok) return player;
  if (room.phase === 'lobby') {
    removePlayer(room, playerId, now);
    return DONE;
  }
  disconnectPlayer(room, playerId, now);
  if (room.hostId === playerId) transferHost(room, playerId, now);
  return DONE;
}

export function kickPlayer(room: Room, byId: string, targetId: string, now: number): Result {
  const auth = host(room, byId, 'lobby');
  if (!auth.ok) return auth;
  if (targetId === byId || !findPlayer(room, targetId)) return fail('BAD_REQUEST');
  removePlayer(room, targetId, now);
  return DONE;
}

export function updatePlayer(room: Room, playerId: string, patch: { name?: string; avatar?: string }): Result {
  const player = member(room, playerId, 'lobby');
  if (!player.ok) return player;
  const p = player.value;
  const name = checkIdentity(room, patch.name ?? p.name, patch.avatar ?? p.avatar, p.id);
  if (!name.ok) return name;
  p.name = name.value;
  p.avatar = patch.avatar ?? p.avatar;
  return DONE;
}

function removePlayer(room: Room, playerId: string, now: number): void {
  room.players = room.players.filter((p) => p.id !== playerId);
  room.photos = room.photos.filter((ph) => ph.ownerId !== playerId);
  if (room.hostId === playerId) transferHost(room, playerId, now);
}

/** Crown goes to the earliest-joined connected player, else the earliest-joined one. */
function transferHost(room: Room, fromId: string, now: number): boolean {
  const others = room.players.filter((p) => p.id !== fromId);
  const next = others.find((p) => p.connected) ?? others[0];
  if (!next) return false;
  room.hostId = next.id;
  room.hostDisconnectedSince = next.connected ? null : (next.disconnectedAt ?? now);
  return true;
}

// ---------------------------------------------------------------------------
// Lobby: photos and settings
// ---------------------------------------------------------------------------

export function uploadPhoto(room: Room, playerId: string, input: NewPhoto, now: number): Result<Photo> {
  const player = member(room, playerId, 'lobby');
  if (!player.ok) return player;
  if (!canPlacePhoto(room, input.slot, input.kind)) return fail('BAD_REQUEST');
  if (!(ACCEPTED_PHOTO_MIME as readonly string[]).includes(input.mime) || input.data.byteLength === 0) {
    return fail('INVALID_PHOTO');
  }
  if (input.data.byteLength > MAX_PHOTO_BYTES) return fail('PHOTO_TOO_LARGE');
  room.photos = room.photos.filter((ph) => !(ph.ownerId === playerId && ph.slot === input.slot));
  const photo: Photo = { ...input, ownerId: playerId, uploadedAt: now };
  room.photos.push(photo);
  return ok(photo);
}

export function removePhoto(room: Room, playerId: string, slot: PhotoSlot): Result {
  const player = member(room, playerId, 'lobby');
  if (!player.ok) return player;
  if (!isSlot(slot)) return fail('BAD_REQUEST');
  room.photos = room.photos.filter((ph) => !(ph.ownerId === playerId && ph.slot === slot));
  return DONE;
}

/** Relabels an uploaded photo; the slot must be active and the kind allowed by the theme. */
export function setPhotoKind(room: Room, playerId: string, slot: PhotoSlot, kind: PhotoKind): Result {
  const player = member(room, playerId, 'lobby');
  if (!player.ok) return player;
  const photo = room.photos.find((ph) => ph.ownerId === playerId && ph.slot === slot);
  if (!photo || !canPlacePhoto(room, slot, kind)) return fail('BAD_REQUEST');
  photo.kind = kind;
  return DONE;
}

/**
 * Host, lobby. All-or-nothing: an invalid field rejects the whole update. Switching to
 * another theme relabels every uploaded photo whose kind it does not allow (inactive slots
 * included) to `defaultKindForSlot`, and resets `photosPerPlayer` to the theme's default
 * unless the same update sets it. Sending the current theme again changes nothing.
 */
export function updateSettings(room: Room, playerId: string, patch: Partial<Settings>): Result {
  const auth = host(room, playerId, 'lobby');
  if (!auth.ok) return auth;
  const { voteSeconds, anonymousVotes, theme, photosPerPlayer } = patch;
  if (voteSeconds !== undefined && !(VOTE_SECONDS_OPTIONS as readonly number[]).includes(voteSeconds)) {
    return fail('BAD_REQUEST');
  }
  if (anonymousVotes !== undefined && typeof anonymousVotes !== 'boolean') return fail('BAD_REQUEST');
  if (theme !== undefined && !isTheme(theme)) return fail('BAD_REQUEST');
  if (photosPerPlayer !== undefined && !isPhotosPerPlayer(photosPerPlayer)) return fail('BAD_REQUEST');
  const settings = room.settings;
  if (voteSeconds !== undefined) settings.voteSeconds = voteSeconds;
  if (anonymousVotes !== undefined) settings.anonymousVotes = anonymousVotes;
  if (theme !== undefined && theme !== settings.theme) {
    settings.theme = theme;
    settings.photosPerPlayer = THEME_DEFAULT_PHOTOS[theme];
    for (const ph of room.photos) if (!isKindAllowed(theme, ph.kind)) ph.kind = defaultKindForSlot(theme, ph.slot);
  }
  if (photosPerPlayer !== undefined) settings.photosPerPlayer = photosPerPlayer;
  return DONE;
}

// ---------------------------------------------------------------------------
// Game
// ---------------------------------------------------------------------------

export function startGame(room: Room, playerId: string, now: number, rng: Rng): Result {
  const auth = host(room, playerId, 'lobby');
  if (!auth.ok) return auth;
  // Only active slots play: photos in the others stay in the room, unused.
  const ownerIds = room.players.filter((p) => hasActivePhotos(room, p.id)).map((p) => p.id);
  if (ownerIds.length < MIN_PHOTO_OWNERS) return fail('NOT_ENOUGH_PLAYERS');
  // Deterministic input order so that a seeded RNG gives a reproducible shuffle.
  const photos = ownerIds.flatMap((id) => activePhotos(room, id));
  const order = arrangeAvoidingRepeats(photos, (ph) => ph.ownerId, rng).map((ph) => ph.id);
  const startsAt = now + room.timing.gameIntroMs;
  room.game = {
    startedAt: now,
    order,
    ownerIds,
    votes: order.map(() => new Map<string, Vote>()),
    round: 0,
    roundStartsAt: startsAt,
    roundCloseAt: timedClose(room, startsAt),
    reveal: null,
  };
  room.phase = 'voting';
  return DONE;
}

function timedClose(room: Room, startsAt: number): number | null {
  const seconds = room.settings.voteSeconds;
  return seconds > 0 ? startsAt + seconds * 1000 : null;
}

/**
 * Random order in which no owner appears twice in a row whenever that is possible.
 * At each step it picks uniformly among the items that keep the rest arrangeable.
 */
export function arrangeAvoidingRepeats<T>(items: readonly T[], ownerOf: (item: T) => string, rng: Rng): T[] {
  const pool = [...items];
  const result: T[] = [];
  let last: string | null = null;
  while (pool.length > 0) {
    const counts = countBy(pool, ownerOf);
    const notLast = pool.filter((it) => ownerOf(it) !== last);
    const safe = notLast.filter((it) => canArrangeAfter(counts, ownerOf(it), pool.length - 1));
    const choices = safe.length > 0 ? safe : fallbackChoices(notLast.length > 0 ? notLast : pool, counts, ownerOf);
    const pick = choices[Math.min(choices.length - 1, Math.floor(rng() * choices.length))];
    pool.splice(pool.indexOf(pick), 1);
    result.push(pick);
    last = ownerOf(pick);
  }
  return result;
}

function countBy<T>(items: readonly T[], key: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const it of items) counts.set(key(it), (counts.get(key(it)) ?? 0) + 1);
  return counts;
}

/**
 * After taking one item of `picked`, can the `rest` remaining items be ordered with no owner
 * twice in a row and without starting with `picked` again?
 */
function canArrangeAfter(counts: Map<string, number>, picked: string, rest: number): boolean {
  for (const [owner, count] of counts) {
    const left = owner === picked ? count - 1 : count;
    const limit = owner === picked ? Math.floor(rest / 2) : Math.ceil(rest / 2);
    if (left > limit) return false;
  }
  return true;
}

/** Unavoidable repeats: spend the most represented owner first to keep repeats rare. */
function fallbackChoices<T>(items: T[], counts: Map<string, number>, ownerOf: (item: T) => string): T[] {
  const max = Math.max(...items.map((it) => counts.get(ownerOf(it)) ?? 0));
  return items.filter((it) => counts.get(ownerOf(it)) === max);
}

export function castVote(room: Room, voterId: string, round: number, candidateId: string, now: number): Result {
  const voter = member(room, voterId, 'voting');
  if (!voter.ok) return voter;
  const game = requireGame(room);
  if (!isRoundOpen(room, round, now)) return fail('WRONG_PHASE');
  if (candidateId === voterId || !game.ownerIds.includes(candidateId)) return fail('INVALID_VOTE');
  const decoy = gamePhoto(room, round).ownerId === voterId;
  game.votes[round].set(voterId, { candidateId, decoy });
  applyAllVoted(room, now);
  return DONE;
}

function isRoundOpen(room: Room, round: number, now: number): boolean {
  const game = requireGame(room);
  if (round !== game.round) return false;
  if (now < game.roundStartsAt - room.timing.earlyVoteToleranceMs) return false;
  return game.roundCloseAt === null || now < game.roundCloseAt;
}

/** When every connected player has voted, the round closes `allVotedGraceMs` later (never later than planned). */
function applyAllVoted(room: Room, now: number): boolean {
  if (room.phase !== 'voting' || !room.game) return false;
  const game = room.game;
  const connected = room.players.filter((p) => p.connected);
  const votes = game.votes[game.round];
  if (connected.length === 0 || !connected.every((p) => votes.has(p.id))) return false;
  const closeAt = now + room.timing.allVotedGraceMs;
  if (game.roundCloseAt !== null && game.roundCloseAt <= closeAt) return false;
  game.roundCloseAt = closeAt;
  return true;
}

/** Host: close `round` now. A stale round number is ignored, also once voting is over. */
export function skipRound(room: Room, playerId: string, round: number, now: number): Result {
  const auth = host(room, playerId);
  if (!auth.ok) return auth;
  // A skip that raced the close of the last round: that round is already over.
  if (room.phase === 'reveal' || room.phase === 'results') return DONE;
  if (room.phase !== 'voting') return fail('WRONG_PHASE');
  if (round === requireGame(room).round) closeRound(room, now);
  return DONE;
}

/** Closes the current round at `at`: schedules the next one, or starts the reveal. */
function closeRound(room: Room, at: number): void {
  const game = requireGame(room);
  if (game.round + 1 < game.order.length) {
    game.round += 1;
    game.roundStartsAt = at + room.timing.roundGapMs;
    game.roundCloseAt = timedClose(room, game.roundStartsAt);
    return;
  }
  game.roundCloseAt = null;
  game.reveal = { index: 0, startedAt: at + room.timing.revealIntroMs };
  room.phase = 'reveal';
}

/**
 * Host: move past reveal `index`. Stale indexes are ignored (idempotent); moving on before
 * the owner of the current photo has been revealed is refused.
 */
export function nextReveal(room: Room, playerId: string, index: number, now: number): Result {
  const auth = host(room, playerId);
  if (!auth.ok) return auth;
  if (room.phase === 'results') return DONE;
  if (room.phase !== 'reveal') return fail('WRONG_PHASE');
  const game = requireGame(room);
  const reveal = game.reveal;
  if (!reveal || index !== reveal.index) return DONE;
  if (now < reveal.startedAt + room.timing.revealOwnerAtMs) return fail('WRONG_PHASE');
  if (index + 1 < game.order.length) {
    game.reveal = { index: index + 1, startedAt: now };
  } else {
    room.phase = 'results';
  }
  return DONE;
}

/**
 * Host, results: back to the lobby with the same players and settings (theme and photos per
 * player included); every photo is deleted. Players who are disconnected get a fresh lobby
 * grace period (`lobbyDropMs` from now) instead of being dropped at once for having been
 * away during the game.
 */
export function playAgain(room: Room, playerId: string, now: number): Result {
  const auth = host(room, playerId, 'results');
  if (!auth.ok) return auth;
  room.phase = 'lobby';
  room.photos = [];
  room.game = null;
  for (const p of room.players) if (!p.connected) p.disconnectedAt = now;
  return DONE;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

/** Applies every time-based transition due at `now`. Returns whether anything changed. */
export function tick(room: Room, now: number): boolean {
  const closed = closeDueRounds(room, now);
  const migrated = migrateHost(room, now);
  const dropped = dropStaleLobbyPlayers(room, now);
  return closed || migrated || dropped;
}

function closeDueRounds(room: Room, now: number): boolean {
  let changed = false;
  while (room.phase === 'voting' && room.game?.roundCloseAt != null && now >= room.game.roundCloseAt) {
    // Close at the planned time so a late timer does not stretch the schedule.
    closeRound(room, room.game.roundCloseAt);
    changed = true;
  }
  return changed;
}

function hostMigrationDueAt(room: Room): number | null {
  const current = findPlayer(room, room.hostId);
  if (current?.connected) return null;
  if (!room.players.some((p) => p.connected)) return null;
  // Missing host or unknown disconnect time should not happen: hand the crown over right away.
  if (!current || room.hostDisconnectedSince === null) return 0;
  return room.hostDisconnectedSince + room.timing.hostGraceMs;
}

function migrateHost(room: Room, now: number): boolean {
  const dueAt = hostMigrationDueAt(room);
  if (dueAt === null || now < dueAt) return false;
  return transferHost(room, room.hostId, now);
}

function staleLobbyPlayers(room: Room, now: number): Player[] {
  if (room.phase !== 'lobby') return [];
  return room.players.filter(
    (p) => !p.connected && p.disconnectedAt !== null && now - p.disconnectedAt >= room.timing.lobbyDropMs,
  );
}

function dropStaleLobbyPlayers(room: Room, now: number): boolean {
  const stale = staleLobbyPlayers(room, now);
  for (const p of stale) removePlayer(room, p.id, now);
  return stale.length > 0;
}

/** Earliest time at which `tick()` has something to do, or null. */
export function nextWakeAt(room: Room): number | null {
  const times: number[] = [];
  if (room.phase === 'voting' && room.game?.roundCloseAt != null) times.push(room.game.roundCloseAt);
  const hostDue = hostMigrationDueAt(room);
  if (hostDue !== null) times.push(hostDue);
  if (room.phase === 'lobby') {
    for (const p of room.players) {
      if (!p.connected && p.disconnectedAt !== null) times.push(p.disconnectedAt + room.timing.lobbyDropMs);
    }
  }
  return times.length > 0 ? Math.min(...times) : null;
}

// ---------------------------------------------------------------------------
// Results: tallies, scores, ranking, awards
// ---------------------------------------------------------------------------

export interface RoundResult {
  index: number;
  photo: Photo;
  ownerId: string;
  /** Voter id -> vote, decoys included. */
  votes: Map<string, Vote>;
  /** Candidate id -> real voter ids (join order). Only candidates with >= 1 vote, in candidate order. */
  votersByCandidate: Map<string, string[]>;
  totalVotes: number;
  correctVotes: number;
}

export function roundResult(room: Room, index: number): RoundResult {
  const game = requireGame(room);
  const photo = gamePhoto(room, index);
  const votes = game.votes[index];
  const byCandidate = new Map<string, string[]>(game.ownerIds.map((id) => [id, []]));
  for (const player of room.players) {
    const vote = votes.get(player.id);
    if (vote && !vote.decoy) byCandidate.get(vote.candidateId)?.push(player.id);
  }
  const votersByCandidate = new Map([...byCandidate].filter(([, voters]) => voters.length > 0));
  const totalVotes = [...votersByCandidate.values()].reduce((sum, v) => sum + v.length, 0);
  const correctVotes = votersByCandidate.get(photo.ownerId)?.length ?? 0;
  return { index, photo, ownerId: photo.ownerId, votes, votersByCandidate, totalVotes, correctVotes };
}

export interface PlayerStats {
  playerId: string;
  /** Correct real votes. */
  correct: number;
  /** Real (non-decoy) votes cast. */
  guesses: number;
  score: number;
}

/** Stats of every player (join order) over rounds [0, rounds). */
export function playerStats(room: Room, rounds: number): PlayerStats[] {
  const stats = new Map(room.players.map((p) => [p.id, { playerId: p.id, correct: 0, guesses: 0, score: 0 }]));
  const played = room.game ? Math.min(rounds, room.game.order.length) : 0;
  for (let i = 0; i < played; i++) {
    const ownerId = gamePhoto(room, i).ownerId;
    for (const [voterId, vote] of requireGame(room).votes[i]) {
      const s = stats.get(voterId);
      if (!s || vote.decoy) continue;
      s.guesses += 1;
      if (vote.candidateId === ownerId) s.correct += 1;
    }
  }
  for (const s of stats.values()) s.score = s.correct * POINTS_PER_CORRECT;
  return [...stats.values()];
}

/** Number of rounds whose owner is public: before the current reveal, or all of them in results. */
export function revealedRounds(room: Room): number {
  if (room.phase === 'reveal') return room.game?.reveal?.index ?? 0;
  if (room.phase === 'results') return room.game?.order.length ?? 0;
  return 0;
}

/**
 * Scores everybody may see. With anonymous votes, they stay frozen (at 0) during the reveal:
 * otherwise who gained points on the previous photo would tell everybody who guessed it right.
 */
export function publicScores(room: Room): Map<string, number> {
  const rounds = room.phase === 'reveal' && room.settings.anonymousVotes ? 0 : revealedRounds(room);
  return new Map(playerStats(room, rounds).map((s) => [s.playerId, s.score]));
}

/** Final ranking; ties share a rank (1, 1, 3). */
export function computeRanking(room: Room): RankingEntry[] {
  const stats = playerStats(room, room.game?.order.length ?? 0);
  const sorted = [...stats].sort((a, b) => b.score - a.score);
  const ranking: RankingEntry[] = [];
  sorted.forEach((s, i) => {
    const prev = ranking[i - 1];
    const rank = prev && prev.score === s.score ? prev.rank : i + 1;
    ranking.push({ playerId: s.playerId, score: s.score, correct: s.correct, guesses: s.guesses, rank });
  });
  return ranking;
}

interface OwnerStats {
  playerId: string;
  /** Real votes on their photos. */
  received: number;
  /** Correct votes on their photos. */
  correct: number;
  /** Real votes naming them on other people's photos. */
  wrongReceived: number;
}

export function computeAwards(room: Room): Award[] {
  const game = requireGame(room);
  const rounds = game.order.map((_, i) => roundResult(room, i));
  const owners = ownerStats(game.ownerIds, rounds);
  return [
    ...guesserAwards(playerStats(room, rounds.length)),
    ...lookalikeAwards(owners),
    ...doppelgangerAward(owners),
    ...mostConfusingAward(rounds),
    ...biggestMixupAward(rounds),
  ];
}

/** Every item tied for best; `cmp(a, b) > 0` means a is better. */
function allBest<T>(items: readonly T[], cmp: (a: T, b: T) => number): T[] {
  let best: T[] = [];
  for (const item of items) {
    const c = best.length === 0 ? 1 : cmp(item, best[0]);
    if (c > 0) best = [item];
    else if (c === 0) best.push(item);
  }
  return best;
}

const idsOf = (items: readonly { playerId: string }[]) => items.map((it) => it.playerId);
const sameIds = (a: readonly { playerId: string }[], b: readonly { playerId: string }[]) =>
  a.length === b.length && a.every((it) => b.some((o) => o.playerId === it.playerId));
const maxOf = <T>(items: readonly T[], fn: (item: T) => number) => Math.max(...items.map(fn));

/** `total` is the winners' number of guesses (the highest one on a tie). */
function guesserAwards(stats: PlayerStats[]): Award[] {
  const awards: Award[] = [];
  const sherlock = allBest(
    stats.filter((s) => s.correct >= 1),
    (a, b) => a.correct - b.correct,
  );
  if (sherlock.length > 0) {
    awards.push({ id: 'sherlock', playerIds: idsOf(sherlock), value: sherlock[0].correct, total: maxOf(sherlock, (s) => s.guesses) });
  }
  const glasses = allBest(
    stats.filter((s) => s.guesses >= 1),
    (a, b) => b.correct - a.correct,
  );
  if (glasses.length > 0 && !sameIds(glasses, sherlock)) {
    awards.push({ id: 'needsGlasses', playerIds: idsOf(glasses), value: glasses[0].correct, total: maxOf(glasses, (s) => s.guesses) });
  }
  return awards;
}

function ownerStats(ownerIds: string[], rounds: RoundResult[]): OwnerStats[] {
  return ownerIds.map((playerId) => {
    const stats: OwnerStats = { playerId, received: 0, correct: 0, wrongReceived: 0 };
    for (const r of rounds) {
      if (r.ownerId === playerId) {
        stats.received += r.totalVotes;
        stats.correct += r.correctVotes;
      } else {
        stats.wrongReceived += r.votersByCandidate.get(playerId)?.length ?? 0;
      }
    }
    return stats;
  });
}

const pct = (s: OwnerStats) => Math.round((s.correct / s.received) * 100);
/** Compares correct / received shares exactly (cross-multiplication). */
const shareCmp = (a: OwnerStats, b: OwnerStats) => a.correct * b.received - b.correct * a.received;

/** carbonCopy / masterOfDisguise. `total` is the winners' number of received votes. */
function lookalikeAwards(owners: OwnerStats[]): Award[] {
  const awards: Award[] = [];
  const eligible = owners.filter((o) => o.received >= 1);
  const carbon = allBest(eligible, shareCmp);
  const carbonAwarded = carbon.length > 0 && carbon[0].correct > 0;
  if (carbonAwarded) {
    awards.push({ id: 'carbonCopy', playerIds: idsOf(carbon), value: pct(carbon[0]), total: maxOf(carbon, (o) => o.received) });
  }
  const disguise = allBest(eligible, (a, b) => shareCmp(b, a));
  if (disguise.length > 0 && !sameIds(disguise, carbonAwarded ? carbon : [])) {
    awards.push({ id: 'masterOfDisguise', playerIds: idsOf(disguise), value: pct(disguise[0]), total: maxOf(disguise, (o) => o.received) });
  }
  return awards;
}

function doppelgangerAward(owners: OwnerStats[]): Award[] {
  const best = allBest(
    owners.filter((o) => o.wrongReceived >= 2),
    (a, b) => a.wrongReceived - b.wrongReceived,
  );
  return best.length > 0 ? [{ id: 'doppelganger', playerIds: idsOf(best), value: best[0].wrongReceived }] : [];
}

/** Most distinct candidates, then fewest correct votes; the earliest photo wins a full tie. */
function mostConfusingAward(rounds: RoundResult[]): Award[] {
  const eligible = rounds.filter((r) => r.votersByCandidate.size >= 3);
  const best = allBest(eligible, (a, b) => a.votersByCandidate.size - b.votersByCandidate.size || b.correctVotes - a.correctVotes);
  if (best.length === 0) return [];
  const r = best[0];
  return [{ id: 'mostConfusing', playerIds: [r.ownerId], photoId: r.photo.id, value: r.votersByCandidate.size, total: r.totalVotes }];
}

/** Most votes for one wrong candidate (>= 2 and more than the owner got), then biggest margin. */
function biggestMixupAward(rounds: RoundResult[]): Award[] {
  const mixups = rounds.flatMap((r) =>
    [...r.votersByCandidate]
      .filter(([candidateId, voters]) => candidateId !== r.ownerId && voters.length >= 2 && voters.length > r.correctVotes)
      .map(([candidateId, voters]) => ({ r, candidateId, votes: voters.length })),
  );
  const margin = (m: { r: RoundResult; votes: number }) => m.votes - m.r.correctVotes;
  const best = allBest(mixups, (a, b) => a.votes - b.votes || margin(a) - margin(b));
  if (best.length === 0) return [];
  const { r, candidateId, votes } = best[0];
  return [
    { id: 'biggestMixup', playerIds: [r.ownerId], photoId: r.photo.id, otherPlayerId: candidateId, value: votes, total: r.totalVotes },
  ];
}
