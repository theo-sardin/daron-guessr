/**
 * Per-player snapshots: the anonymity boundary.
 *
 * Everything a client learns about a room goes through `buildView`, so this is where the
 * rules of docs/DESIGN.md ("Anonymity rules") are enforced:
 * - no owner of an unrevealed photo, anywhere;
 * - no other player's photos in the lobby;
 * - during voting, only the viewer's own vote (others are just "has voted", decoys included);
 * - `voters` is null when votes are anonymous;
 * - blurred rounds: the full photo (URL or id) only once its last blur step starts, the
 *   current step's low-resolution variant before that.
 * Selfies (profile pictures) are public: every viewer gets every player's `selfieUrl`.
 */
import {
  MAX_PLAYERS,
  photoUrl,
  type MyPhoto,
  type PhotoRef,
  type PhotoResult,
  type PublicPlayer,
  type RevealView,
  type ResultsView,
  type RoomPeek,
  type RoomView,
  type VotingView,
} from '../shared/protocol';
import {
  BLUR_STEPS,
  LAST_BLUR_STEP,
  blurStepAt,
  blurStepStartsAt,
  computeAwards,
  computeRanking,
  findPlayer,
  gamePhoto,
  hasActivePhotos,
  playerPhotos,
  publicScores,
  requireGame,
  roundResult,
  votePoints,
  type Photo,
  type Room,
  type RoundResult,
} from './game';

export function buildView(room: Room, viewerId: string, now: number): RoomView {
  return {
    code: room.code,
    phase: room.phase,
    serverNow: now,
    meId: viewerId,
    hostId: room.hostId,
    settings: { ...room.settings },
    players: publicPlayers(room),
    // Every slot, inactive ones included: the lobby UI decides what to show.
    myPhotos: playerPhotos(room, viewerId).map((ph) => toMyPhoto(room.code, ph)),
    voting: room.phase === 'voting' ? votingView(room, viewerId, now) : null,
    reveal: room.phase === 'reveal' ? revealView(room, viewerId) : null,
    results: room.phase === 'results' ? resultsView(room, viewerId) : null,
  };
}

export function peekRoom(room: Room): RoomPeek {
  const host = findPlayer(room, room.hostId);
  return {
    code: room.code,
    exists: true,
    phase: room.phase,
    playerCount: room.players.length,
    joinable: room.phase === 'lobby' && room.players.length < MAX_PLAYERS,
    hostName: host?.name,
    hostAvatar: host?.avatar,
  };
}

function publicPlayers(room: Room): PublicPlayer[] {
  const scores = publicScores(room);
  return room.players.map((p) => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    color: p.color,
    connected: p.connected,
    isHost: p.id === room.hostId,
    // Game photos only: a selfie never makes a player ready.
    ready: hasActivePhotos(room, p.id),
    score: scores.get(p.id) ?? 0,
    // Optional field: left out entirely (not undefined) when there is no selfie.
    ...(p.selfie ? { selfieUrl: photoUrl(room.code, p.selfie.id) } : {}),
  }));
}

function photoRef(code: string, photo: Photo): PhotoRef {
  return { id: photo.id, url: photoUrl(code, photo.id), kind: photo.kind };
}

export function toMyPhoto(code: string, photo: Photo): MyPhoto {
  return { ...photoRef(code, photo), slot: photo.slot };
}

/**
 * The voted photo and its blur state at `now`. Anti-cheat: before the last step, a photo with
 * variants is only ever referred to by variant ids (`id` is its first variant's, stable for the
 * whole round, `url` the current step's), so no client can load it sharp ahead of time.
 * Photos uploaded without variants fall back to the full URL (the client blurs it).
 */
function votingPhoto(room: Room, photo: Photo, now: number): Pick<VotingView, 'photo' | 'blur'> {
  const step = blurStepAt(room, now);
  if (step === null) return { photo: photoRef(room.code, photo), blur: null };
  const nextStepAt = step < LAST_BLUR_STEP ? blurStepStartsAt(room, step + 1) : null;
  const [first] = photo.variants;
  if (!first) return { photo: photoRef(room.code, photo), blur: { step, steps: BLUR_STEPS, nextStepAt, fromVariant: false } };
  const variant = photo.variants[step];
  const url = variant ? photoUrl(room.code, variant.id) : photoUrl(room.code, photo.id);
  return {
    photo: { id: first.id, url, kind: photo.kind },
    blur: { step, steps: BLUR_STEPS, nextStepAt, fromVariant: variant !== undefined },
  };
}

function votingView(room: Room, viewerId: string, now: number): VotingView {
  const game = requireGame(room);
  const photo = gamePhoto(room, game.round);
  const votes = game.votes[game.round];
  const { photo: shown, blur } = votingPhoto(room, photo, now);
  return {
    round: game.round,
    totalRounds: game.order.length,
    photo: shown,
    startsAt: game.roundStartsAt,
    // Effective close time: shrinks once everybody has voted.
    endsAt: game.roundCloseAt,
    isMine: photo.ownerId === viewerId,
    myVote: votes.get(viewerId)?.candidateId ?? null,
    candidates: game.ownerIds.filter((id) => id !== viewerId),
    // Join order, not vote order, so the snapshot says nothing about who voted first.
    votedIds: room.players.filter((p) => votes.has(p.id)).map((p) => p.id),
    blur,
  };
}

function revealView(room: Room, viewerId: string): RevealView {
  const game = requireGame(room);
  const reveal = game.reveal ?? { index: 0, startedAt: game.startedAt };
  return {
    index: reveal.index,
    total: game.order.length,
    startedAt: reveal.startedAt,
    current: photoResult(room, roundResult(room, reveal.index), viewerId),
  };
}

function resultsView(room: Room, viewerId: string): ResultsView {
  const game = requireGame(room);
  return {
    photos: game.order.map((_, i) => photoResult(room, roundResult(room, i), viewerId)),
    ranking: computeRanking(room),
    awards: computeAwards(room),
  };
}

function photoResult(room: Room, r: RoundResult, viewerId: string): PhotoResult {
  const entries = [...r.votersByCandidate];
  const myVote = r.votes.get(viewerId);
  return {
    index: r.index,
    photo: photoRef(room.code, r.photo),
    ownerId: r.ownerId,
    tally: Object.fromEntries(entries.map(([candidateId, voters]) => [candidateId, voters.length])),
    voters: room.settings.anonymousVotes
      ? null
      : Object.fromEntries(entries.map(([candidateId, voters]) => [candidateId, [...voters]])),
    totalVotes: r.totalVotes,
    correctVotes: r.correctVotes,
    myVote: myVote?.candidateId ?? null,
    // The owner's vote is a decoy: no points to show.
    ...(r.ownerId === viewerId ? {} : { myPoints: myVote ? votePoints(room, myVote, r.ownerId).points : 0 }),
  };
}
