/**
 * Shared contract between the Daron Guessr server and client.
 *
 * The server is authoritative: clients send intents (socket events with acks) and
 * receive a per-player `RoomView` snapshot on every change. Views are tailored per
 * player so that nothing secret (who owns which photo, who voted what) ever leaves
 * the server before it is meant to be revealed.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const ROOM_CODE_LENGTH = 4;
/** No I / O to avoid confusion with 1 / 0. */
export const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

/** Minimum number of players that uploaded at least one photo to start a game. */
export const MIN_PHOTO_OWNERS = 3;
export const MAX_PLAYERS = 12;
export const MAX_NAME_LENGTH = 16;
/** Each player has two photo slots: slot 0 and slot 1 (default kinds: daron, daronne). */
export const PHOTO_SLOTS = [0, 1] as const;
/** Max accepted upload size (the client compresses to well under this). */
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
export const ACCEPTED_PHOTO_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const POINTS_PER_CORRECT = 100;

/** Allowed values for `Settings.voteSeconds`. 0 means "no timer, wait for everyone". */
export const VOTE_SECONDS_OPTIONS = [0, 15, 20, 30, 45, 60] as const;

/** Delay between the moment a game starts and the first photo (3-2-1 intro), in ms. */
export const GAME_INTRO_MS = 3500;
/** Gap between two voting rounds (transition animation), in ms. */
export const ROUND_GAP_MS = 1500;
/** When every connected player has voted, the round closes this long after the last vote, in ms. */
export const ALL_VOTED_GRACE_MS = 1200;
/**
 * Client-side reveal timeline for one photo (ms from `RevealView.startedAt`):
 * photo in → vote bars grow → drum roll → owner revealed.
 * The host's "next" button is enabled once REVEAL_OWNER_AT_MS + 800 has passed.
 */
export const REVEAL_BARS_AT_MS = 900;
export const REVEAL_DRUMROLL_AT_MS = 3200;
export const REVEAL_OWNER_AT_MS = 5400;
/** Delay after the host starts the reveal phase before the first reveal animation begins. */
export const REVEAL_INTRO_MS = 2500;

/** How long a disconnected host keeps the crown before it is handed to someone else. */
export const HOST_GRACE_MS = 10_000;

export const REACTION_EMOJIS = ['😂', '🤣', '😱', '🤯', '😍', '👀', '💀', '🔥', '👏', '🫣'] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const AVATARS = [
  '🐸', '🦊', '🐼', '🐵', '🦁', '🐷', '🐙', '🦄', '🐔', '🐨', '🐯', '🐶',
  '🐱', '🐻', '🦖', '👽', '🤖', '👻', '🥑', '🌮', '🍕', '🦩', '🐧', '🦥',
] as const;

/** Player colors, assigned by the server in join order (first unused color wins). */
export const PLAYER_COLORS = [
  '#ff4fa3', // pink
  '#ffd23f', // yellow
  '#3ddc97', // mint
  '#4cc9f0', // sky
  '#ff8c42', // orange
  '#b388ff', // lavender
  '#ff5d5d', // red
  '#7bd389', // green
  '#f7a6d7', // light pink
  '#5e8bff', // blue
  '#ffb86b', // peach
  '#2ec4b6', // teal
] as const;

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ParentKind = 'daron' | 'daronne';
export type PhotoSlot = (typeof PHOTO_SLOTS)[number];
export type Phase = 'lobby' | 'voting' | 'reveal' | 'results';

export interface Settings {
  /** Seconds per photo during voting; 0 = no timer (round ends when everyone voted or host skips). */
  voteSeconds: number;
  /** When true (default), reveals only show vote counts. When false, they show who voted for whom. */
  anonymousVotes: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voteSeconds: 30,
  anonymousVotes: true,
};

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  connected: boolean;
  isHost: boolean;
  /** Has uploaded at least one photo (lobby readiness). Counts are not exposed on purpose. */
  ready: boolean;
  /**
   * Score visible to everyone. During `reveal` this only includes photos whose reveal
   * index is strictly lower than the current one (the client adds the current photo's
   * points itself once the owner is revealed). In `results` it is the final score.
   */
  score: number;
}

export interface PhotoRef {
  id: string;
  /** Relative URL served by the server, e.g. `/photos/ABCD/3f2a…`. */
  url: string;
  kind: ParentKind;
}

export interface MyPhoto extends PhotoRef {
  slot: PhotoSlot;
}

export interface VotingView {
  /** 0-based index of the current photo. */
  round: number;
  totalRounds: number;
  photo: PhotoRef;
  /** Server timestamp (ms) when voting opens for this round. Votes before this are rejected. */
  startsAt: number;
  /** Server timestamp (ms) when the round closes, or null when there is no timer. */
  endsAt: number | null;
  /**
   * True when the viewer owns this photo. The owner still casts a *decoy* vote so that
   * nobody can spot them by who has / hasn't voted. Decoy votes are never counted.
   */
  isMine: boolean;
  /** The viewer's current vote (candidate player id) for this round, or null. */
  myVote: string | null;
  /** Player ids the viewer can vote for: every player that has photos in the game, except the viewer. */
  candidates: string[];
  /** Ids of players that have voted this round (owner decoys included, so the owner is indistinguishable). */
  votedIds: string[];
}

export interface PhotoResult {
  /** 0-based index in the game's photo order. */
  index: number;
  photo: PhotoRef;
  ownerId: string;
  /** candidate player id -> number of (real, non-decoy) votes. Only ids with >= 1 vote are present. */
  tally: Record<string, number>;
  /** candidate player id -> voter ids. null when `settings.anonymousVotes` is true. */
  voters: Record<string, string[]> | null;
  totalVotes: number;
  correctVotes: number;
  /** What the viewer voted for this photo (a decoy if the viewer is the owner), or null if they did not vote. */
  myVote: string | null;
}

export interface RevealView {
  /** 0-based index of the photo currently being revealed. */
  index: number;
  total: number;
  /** Server timestamp (ms) at which the reveal animation of `current` starts (see REVEAL_*_AT_MS). */
  startedAt: number;
  current: PhotoResult;
}

export type AwardId =
  /** Most correct guesses. */
  | 'sherlock'
  /** Fewest correct guesses. */
  | 'needsGlasses'
  /** Highest share of correct votes on their own parents' photos. */
  | 'carbonCopy'
  /** Lowest share of correct votes on their own parents' photos. */
  | 'masterOfDisguise'
  /** Received the most wrong votes (people kept thinking other people's parents were theirs). */
  | 'doppelganger'
  /** The photo whose votes were spread across the most different players. */
  | 'mostConfusing'
  /** The single (owner, wrongly-guessed player) pair with the most votes. */
  | 'biggestMixup';

export interface Award {
  id: AwardId;
  /** Winners (several on a tie). For photo awards, the photo owner. */
  playerIds: string[];
  /** Related photo, for photo-based awards (mostConfusing, biggestMixup). */
  photoId?: string;
  /** For biggestMixup: the player everybody wrongly picked. */
  otherPlayerId?: string;
  /** Main statistic (count or percentage 0-100, depending on the award). */
  value: number;
  /** Denominator when relevant (e.g. total guesses). */
  total?: number;
}

export interface RankingEntry {
  playerId: string;
  score: number;
  correct: number;
  /** Number of real (non-decoy) votes cast by this player. */
  guesses: number;
  /** 1-based rank, ties share the same rank. */
  rank: number;
}

export interface ResultsView {
  photos: PhotoResult[];
  ranking: RankingEntry[];
  awards: Award[];
}

export interface RoomView {
  code: string;
  phase: Phase;
  /** Server clock (ms since epoch) when this view was built — used for clock-offset estimation. */
  serverNow: number;
  meId: string;
  hostId: string;
  settings: Settings;
  /** In join order. */
  players: PublicPlayer[];
  /** The viewer's own uploaded photos (only ever their own). Emptied when a new game starts from the lobby. */
  myPhotos: MyPhoto[];
  voting: VotingView | null;
  reveal: RevealView | null;
  results: ResultsView | null;
}

/** Response of `GET /api/rooms/:code` — lets the join screen check a code before asking for a name. */
export interface RoomPeek {
  code: string;
  exists: boolean;
  phase?: Phase;
  playerCount?: number;
  /** False when the game already started or the room is full. */
  joinable?: boolean;
  hostName?: string;
  hostAvatar?: string;
}

// ---------------------------------------------------------------------------
// Socket.IO events
// ---------------------------------------------------------------------------

export type ErrorCode =
  | 'BAD_REQUEST'
  | 'ROOM_NOT_FOUND'
  | 'ROOM_FULL'
  | 'GAME_IN_PROGRESS'
  | 'NAME_TAKEN'
  | 'INVALID_NAME'
  | 'NOT_IN_ROOM'
  | 'NOT_HOST'
  | 'WRONG_PHASE'
  | 'NOT_ENOUGH_PLAYERS'
  | 'INVALID_PHOTO'
  | 'PHOTO_TOO_LARGE'
  | 'INVALID_VOTE'
  | 'SESSION_ACTIVE'
  | 'RATE_LIMITED'
  | 'SERVER_BUSY'
  | 'SERVER_ERROR';

export type Ack<T = object> = (res: ({ ok: true } & T) | { ok: false; error: ErrorCode }) => void;
export type AckResult<T = object> = Parameters<Ack<T>>[0];

export interface Session {
  code: string;
  playerId: string;
  /** Secret used to resume the session after a disconnect. Store it, never display it. */
  token: string;
}

export interface ClientToServerEvents {
  /** Create a new room and join it as host. */
  'room:create': (p: { name: string; avatar: string }, ack: Ack<{ session: Session }>) => void;
  /** Join an existing room (lobby only). */
  'room:join': (p: { code: string; name: string; avatar: string }, ack: Ack<{ session: Session }>) => void;
  /**
   * Resume a session with a stored token. If the player is currently connected on another
   * socket, `takeover: true` moves the session to this socket (the old one receives
   * `session:replaced`); `takeover: false` fails with SESSION_ACTIVE instead.
   */
  'room:rejoin': (p: { code: string; token: string; takeover: boolean }, ack: Ack<{ session: Session }>) => void;
  /** Leave the room for good (lobby: removes the player and their photos; in game: just disconnects). */
  'room:leave': (ack: Ack) => void;

  /** Lobby only: change name and/or avatar. */
  'player:update': (p: { name?: string; avatar?: string }, ack: Ack) => void;
  /** Lobby only: upload (or replace) the photo in a slot. `data` is the raw image bytes. */
  'photo:upload': (p: { slot: PhotoSlot; kind: ParentKind; mime: string; data: ArrayBuffer | Uint8Array }, ack: Ack<{ photo: MyPhoto }>) => void;
  /** Lobby only. */
  'photo:remove': (p: { slot: PhotoSlot }, ack: Ack) => void;
  /** Lobby only: relabel an uploaded photo as daron / daronne. */
  'photo:setKind': (p: { slot: PhotoSlot; kind: ParentKind }, ack: Ack) => void;

  /** Host, lobby only. */
  'host:settings': (p: Partial<Settings>, ack: Ack) => void;
  /** Host, lobby only. */
  'host:kick': (p: { playerId: string }, ack: Ack) => void;
  /** Host, lobby only. Requires MIN_PHOTO_OWNERS players with photos. */
  'host:start': (ack: Ack) => void;
  /** Host, voting: close the given round now. Ignored (ok) if `round` is not the current one. */
  'host:skipRound': (p: { round: number }, ack: Ack) => void;
  /** Host, reveal: move past reveal `index` (to the next photo, or to results after the last). Idempotent. */
  'host:nextReveal': (p: { index: number }, ack: Ack) => void;
  /** Host, results: back to the lobby with the same players (photos, votes and scores are cleared). */
  'host:playAgain': (ack: Ack) => void;

  /** Voting: cast or change the vote for `round`. */
  'vote:cast': (p: { round: number; candidateId: string }, ack: Ack) => void;

  /** Any phase: send a floating emoji reaction to the room. Rate limited. */
  react: (p: { emoji: ReactionEmoji }) => void;
}

export interface Reaction {
  id: string;
  playerId: string;
  emoji: ReactionEmoji;
}

export interface ServerToClientEvents {
  /** Full per-player snapshot, sent after every change that affects the room. */
  'room:state': (view: RoomView) => void;
  'room:reaction': (r: Reaction) => void;
  /** The host removed you from the room. The client should forget its session. */
  'room:kicked': () => void;
  /** Another tab/device resumed your session; this socket is no longer attached to the room. */
  'session:replaced': () => void;
}

// ---------------------------------------------------------------------------
// Helpers shared by both sides
// ---------------------------------------------------------------------------

export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z]/g, '').slice(0, ROOM_CODE_LENGTH);
}

export function isValidRoomCode(code: string): boolean {
  if (code.length !== ROOM_CODE_LENGTH) return false;
  for (const ch of code) if (!ROOM_CODE_ALPHABET.includes(ch)) return false;
  return true;
}

/** Trims, collapses whitespace and strips control / invisible characters. Returns '' when unusable. */
export function sanitizeName(input: string): string {
  const cleaned = input
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Slice by code points so an emoji is never cut in half.
  return Array.from(cleaned).slice(0, MAX_NAME_LENGTH).join('').trim();
}

export function photoUrl(code: string, photoId: string): string {
  return `/photos/${code}/${photoId}`;
}
