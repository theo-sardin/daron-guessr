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
/**
 * Photo slots a player can fill. Only the first `Settings.photosPerPlayer` are active: photos in
 * higher slots are kept (so lowering the setting never deletes an upload) but ignored.
 */
export const PHOTO_SLOTS = [0, 1, 2] as const;
export const PHOTOS_PER_PLAYER_OPTIONS = [1, 2, 3] as const;
/** Max accepted upload size, for game photos and selfies alike (the client compresses to well under this). */
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

/**
 * What a photo shows, relative to the player who uploaded it. It drives the question asked
 * while voting ("Whose sister is this?", "Who is this as a kid?", "Who picked this picture?")
 * and every caption about the photo.
 * - `kid`: the player themself as a child.
 * - `pick`: any picture the player chose (a meme, a place, a dish…).
 * - `roll`: the LAST photo in the player's camera roll.
 * - `crush`: the celebrity the player had a crush on as a teen.
 * - `me`: a photo of the player themself (any age), used by the "Who's that?" mode.
 * - body parts (`hand` … `hair`, see BODY_PARTS): a close-up of one of the player's body parts.
 */
export const PHOTO_KINDS = [
  'daron',
  'daronne',
  'brother',
  'sister',
  'grandpa',
  'grandma',
  'friend',
  'partner',
  'pet',
  'kid',
  'pick',
  'roll',
  'crush',
  'me',
  'hand',
  'foot',
  'ear',
  'eye',
  'nose',
  'smile',
  'knee',
  'elbow',
  'navel',
  'hair',
] as const;
export type PhotoKind = (typeof PHOTO_KINDS)[number];

/** Body parts players can pick in the "Body parts" mode (a fixed, safe-for-work list). */
export const BODY_PARTS = ['hand', 'foot', 'ear', 'eye', 'nose', 'smile', 'knee', 'elbow', 'navel', 'hair'] as const satisfies readonly PhotoKind[];

/** Game themes, picked by the host: they decide which kinds players can upload. */
export const THEMES = ['parents', 'family', 'childhood', 'pick', 'roll', 'crush', 'whois', 'body', 'mix'] as const;
export type Theme = (typeof THEMES)[number];

/** Kinds a player may upload under each theme (the first is the default). */
export const THEME_KINDS: Record<Theme, readonly PhotoKind[]> = {
  parents: ['daron', 'daronne'],
  family: ['sister', 'brother', 'daron', 'daronne', 'grandpa', 'grandma', 'friend', 'partner', 'pet'],
  childhood: ['kid'],
  pick: ['pick'],
  roll: ['roll'],
  crush: ['crush'],
  whois: ['me'],
  body: BODY_PARTS,
  mix: PHOTO_KINDS,
};

/** `photosPerPlayer` applied when the host switches to a theme (they can change it afterwards). */
export const THEME_DEFAULT_PHOTOS: Record<Theme, number> = {
  parents: 2,
  family: 2,
  childhood: 1,
  pick: 1,
  roll: 1,
  crush: 1,
  whois: 1,
  body: 2,
  mix: 2,
};

/** `blur` applied when the host switches to (or creates a room with) a theme, unless set explicitly. */
export const THEME_DEFAULT_BLUR: Record<Theme, boolean> = {
  parents: false,
  family: false,
  childhood: false,
  pick: false,
  roll: false,
  crush: false,
  whois: true,
  body: false,
  mix: false,
};

/** Default kind proposed for an empty slot under a theme. */
export function defaultKindForSlot(theme: Theme, slot: number): PhotoKind {
  const presets: Record<Theme, readonly PhotoKind[]> = {
    parents: ['daron', 'daronne', 'daron'],
    family: ['sister', 'brother', 'friend'],
    childhood: ['kid', 'kid', 'kid'],
    pick: ['pick', 'pick', 'pick'],
    roll: ['roll', 'roll', 'roll'],
    crush: ['crush', 'crush', 'crush'],
    whois: ['me', 'me', 'me'],
    body: ['hand', 'ear', 'knee'],
    mix: ['daron', 'daronne', 'kid'],
  };
  return presets[theme][slot] ?? THEME_KINDS[theme][0];
}

export function isKindAllowed(theme: Theme, kind: PhotoKind): boolean {
  return THEME_KINDS[theme].includes(kind);
}

export type PhotoSlot = (typeof PHOTO_SLOTS)[number];
export type Phase = 'lobby' | 'voting' | 'reveal' | 'results';

export interface Settings {
  /** Seconds per photo during voting; 0 = no timer (round ends when everyone voted or host skips). */
  voteSeconds: number;
  /** When true (default), reveals only show vote counts. When false, they show who voted for whom. */
  anonymousVotes: boolean;
  /**
   * Which kinds of photos players upload. Switching theme relabels uploaded photos whose kind
   * the new theme does not allow (to `defaultKindForSlot`) and resets `photosPerPlayer` to
   * THEME_DEFAULT_PHOTOS unless the same update sets it. Sending the current theme again
   * changes nothing. Kept by `host:playAgain`, like every setting.
   */
  theme: Theme;
  /** Active photo slots per player (one of PHOTOS_PER_PLAYER_OPTIONS). */
  photosPerPlayer: number;
  /**
   * "Blurry" option: the voted photo starts heavily blurred and sharpens step by step (see
   * BLUR_*), and correct votes earn a speed bonus (BLUR_BONUS_BY_STEP). Switching theme sets it
   * to THEME_DEFAULT_BLUR unless the same update sets it.
   */
  blur: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  voteSeconds: 30,
  anonymousVotes: true,
  theme: 'parents',
  photosPerPlayer: 2,
  blur: false,
};

/**
 * Blur steps. The uploader's browser sends, with each photo, small JPEG variants of these widths
 * (px, longest edge) as `photo:upload` `variants`, in this order. During a blurred round the server
 * only hands out the URL of the current step's variant (the client scales it up and softens it);
 * the full photo comes once the round is over. Step i starts at startsAt + i * stepMs, with
 * stepMs = roundMs / (BLUR_VARIANT_WIDTHS.length + 1) and roundMs = voteSeconds * 1000, or
 * BLUR_NO_TIMER_ROUND_MS without a timer. The last step (index BLUR_VARIANT_WIDTHS.length) is the
 * full photo. Photos uploaded without variants fall back to the full URL (the client blurs it).
 */
export const BLUR_VARIANT_WIDTHS = [12, 24, 48, 96] as const;
export const BLUR_NO_TIMER_ROUND_MS = 20_000;
/** Speed bonus of a correct vote, by the blur step at which the voter last changed their vote. */
export const BLUR_BONUS_BY_STEP = [100, 75, 50, 25, 0] as const;

export interface PublicPlayer {
  id: string;
  name: string;
  avatar: string;
  color: string;
  connected: boolean;
  isHost: boolean;
  /** Has at least one photo in an active slot (lobby readiness). Counts are not exposed on purpose. */
  ready: boolean;
  /**
   * Score visible to everyone. During `reveal` this only includes photos whose reveal
   * index is strictly lower than the current one (the client adds the current photo's
   * points itself once the owner is revealed) — except when `settings.anonymousVotes` is
   * true: then it stays 0 for the whole reveal, since score changes would tell who guessed
   * which photo right. In `results` it is the final score.
   */
  score: number;
  /**
   * The player's optional selfie (profile picture): a relative URL like `/photos/ABCD/9c1e…`,
   * absent when they have none. Public on purpose — every viewer gets it, in every phase — so
   * the UI can show faces next to the photos (vote buttons, reveal) for comparison. Its id is
   * random and unrelated to game photo ids, and a selfie is never a game photo (not played,
   * not counted in `ready`). Kept by `host:playAgain`. See `player:selfie`.
   */
  selfieUrl?: string;
}

export interface PhotoRef {
  id: string;
  /** Relative URL served by the server, e.g. `/photos/ABCD/3f2a…`. */
  url: string;
  kind: PhotoKind;
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
  /**
   * Blur state when `settings.blur` is on (null otherwise). `photo.url` then points to the
   * current step's variant. `nextStepAt` is when the next (sharper) step starts, null at the last.
   */
  blur: { step: number; steps: number; nextStepAt: number | null; fromVariant: boolean } | null;
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
  /** Points the viewer earned on this photo (100 + blur speed bonus when right, else 0). Absent for the owner. */
  myPoints?: number;
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
  | 'biggestMixup'
  /** Blur games only: the most speed-bonus points (sharpest eyes). value = bonus points. */
  | 'eagleEye';

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
  /** Blur speed-bonus points included in `score` (0 when blur is off). */
  bonus: number;
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
  /**
   * The viewer's own uploaded photos (only ever their own), by slot. Includes photos in
   * inactive slots (slot >= settings.photosPerPlayer), which the game ignores: the lobby UI
   * decides what to show. Emptied by `host:playAgain`.
   */
  myPhotos: MyPhoto[];
  voting: VotingView | null;
  reveal: RevealView | null;
  results: ResultsView | null;
}

/**
 * Game mode chosen on the home screen when creating a room (a mandatory step in the UI).
 * `photosPerPlayer` defaults to THEME_DEFAULT_PHOTOS[theme]. Invalid values -> BAD_REQUEST.
 * Omitted entirely -> DEFAULT_SETTINGS (kept for older clients and bots).
 */
export interface RoomSetup {
  theme: Theme;
  photosPerPlayer?: number;
  /** Defaults to THEME_DEFAULT_BLUR[theme]. */
  blur?: boolean;
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
  'room:create': (p: { name: string; avatar: string; settings?: RoomSetup }, ack: Ack<{ session: Session }>) => void;
  /** Join an existing room (lobby only). */
  'room:join': (p: { code: string; name: string; avatar: string }, ack: Ack<{ session: Session }>) => void;
  /**
   * Resume a session with a stored token. If the player is currently connected on another
   * socket, `takeover: true` moves the session to this socket (the old one receives
   * `session:replaced`); `takeover: false` fails with SESSION_ACTIVE instead.
   */
  'room:rejoin': (p: { code: string; token: string; takeover: boolean }, ack: Ack<{ session: Session }>) => void;
  /** Leave the room for good (lobby: removes the player, their photos and selfie; in game: just disconnects). */
  'room:leave': (ack: Ack) => void;

  /** Lobby only: change name and/or avatar. */
  'player:update': (p: { name?: string; avatar?: string }, ack: Ack) => void;
  /**
   * Any phase: set (or replace) the calling player's selfie, an optional profile picture that
   * everyone in the room sees (`PublicPlayer.selfieUrl`). `data` is the raw image bytes, checked
   * like `photo:upload` (header sniffing, MAX_PHOTO_BYTES, same upload rate limits and photo
   * byte quotas): INVALID_PHOTO, PHOTO_TOO_LARGE, RATE_LIMITED or SERVER_BUSY otherwise.
   * Replacing gets a new URL and deletes the old image. Kept by `host:playAgain`; deleted when
   * the player is removed from the room (leave or kick in the lobby, lobby disconnect timeout)
   * and with the room. Never a game photo.
   */
  'player:selfie': (p: { mime: string; data: ArrayBuffer | Uint8Array }, ack: Ack<{ selfieUrl: string }>) => void;
  /** Any phase: delete the calling player's selfie. Ok (no-op) when there is none. */
  'player:removeSelfie': (ack: Ack) => void;
  /**
   * Lobby only: upload (or replace) the photo in a slot. `data` is the raw image bytes.
   * `slot` must be < settings.photosPerPlayer and `kind` allowed by settings.theme (else BAD_REQUEST).
   */
  'photo:upload': (
    p: { slot: PhotoSlot; kind: PhotoKind; mime: string; data: ArrayBuffer | Uint8Array; variants?: Array<ArrayBuffer | Uint8Array> },
    ack: Ack<{ photo: MyPhoto }>,
  ) => void;
  /** Lobby only. Works on any slot, inactive ones included. */
  'photo:remove': (p: { slot: PhotoSlot }, ack: Ack) => void;
  /** Lobby only: relabel an uploaded photo (same rules as `photo:upload`: active slot, kind allowed by settings.theme). */
  'photo:setKind': (p: { slot: PhotoSlot; kind: PhotoKind }, ack: Ack) => void;

  /** Host, lobby only. See `Settings.theme` for what switching theme does. */
  'host:settings': (p: Partial<Settings>, ack: Ack) => void;
  /** Host, lobby only. */
  'host:kick': (p: { playerId: string }, ack: Ack) => void;
  /**
   * Host, lobby only. Requires MIN_PHOTO_OWNERS players with a photo in an active slot; only
   * active-slot photos are played (photos in other slots are ignored, not deleted).
   */
  'host:start': (ack: Ack) => void;
  /** Host, voting: close the given round now. Ignored (ok) if `round` is not the current one. */
  'host:skipRound': (p: { round: number }, ack: Ack) => void;
  /** Host, reveal: move past reveal `index` (to the next photo, or to results after the last). Idempotent. */
  'host:nextReveal': (p: { index: number }, ack: Ack) => void;
  /**
   * Host, results: back to the lobby with the same players and settings (photos, votes and
   * scores are cleared; selfies are kept, they are profile pictures).
   */
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

/**
 * Control, format (zero-width, bidi, soft hyphen, tag…) and other default-ignorable characters
 * (Hangul fillers, combining grapheme joiner, variation selectors…). U+FE0F is kept on its own
 * below: it only asks for the emoji presentation of the previous character.
 */
const INVISIBLE = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}\p{Default_Ignorable_Code_Point}\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2066-\u2069\ufeff]/gu;
/** Characters that render as blank space without being whitespace (braille blank, fillers). */
const BLANK = /[\u2800\u3164\uffa0\u115f\u1160]/g;
/** A name must contain at least one of these to be visible. */
const VISIBLE = /[\p{L}\p{N}\p{P}\p{S}]/u;

/**
 * Trims, collapses whitespace and strips control / invisible characters. Returns '' when
 * unusable (empty, or nothing visible left).
 */
export function sanitizeName(input: string): string {
  const cleaned = input
    .replace(INVISIBLE, (ch) => (ch === '\ufe0f' ? ch : ''))
    .replace(BLANK, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  // Slice by code points so an emoji is never cut in half.
  const name = Array.from(cleaned).slice(0, MAX_NAME_LENGTH).join('').trim();
  return VISIBLE.test(name) ? name : '';
}

export function photoUrl(code: string, photoId: string): string {
  return `/photos/${code}/${photoId}`;
}
