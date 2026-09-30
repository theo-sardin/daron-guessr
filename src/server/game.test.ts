import { describe, expect, it } from 'vitest';
import {
  ALL_VOTED_GRACE_MS,
  DEFAULT_SETTINGS,
  GAME_INTRO_MS,
  HOST_GRACE_MS,
  MAX_PHOTO_BYTES,
  MAX_PLAYERS,
  PLAYER_COLORS,
  POINTS_PER_CORRECT,
  REVEAL_INTRO_MS,
  REVEAL_OWNER_AT_MS,
  ROUND_GAP_MS,
  THEMES,
  THEME_DEFAULT_BLUR,
  THEME_DEFAULT_PHOTOS,
  type Award,
  type AwardId,
  type PhotoSlot,
  type RoomSetup,
} from '../shared/protocol';
import * as g from './game';
import {
  PNG_BYTES,
  addPhoto,
  addPhotos,
  addSelfie,
  allCorrect,
  idOf,
  makeRoom,
  newPhoto,
  newPlayer,
  newSelfie,
  playAllRounds,
  revealAll,
  seededRng,
  unwrap,
  type Chooser,
} from './testUtils';

const FOUR = ['Alice', 'Bob', 'Carol', 'Dave'];
const [A, B, C, D] = FOUR.map(idOf);

function errorOf(result: g.Result<unknown>): string | null {
  return result.ok ? null : result.error;
}

/** Four players, photos per player as given, game started at `now` with a fixed seed. */
function startedRoom(counts = [2, 2, 1, 1], now = 1000, settings: Partial<g.Room['settings']> = {}): g.Room {
  const room = makeRoom(FOUR);
  addPhotos(room, counts);
  unwrap(g.updateSettings(room, A, settings));
  unwrap(g.startGame(room, A, now, seededRng(42)));
  return room;
}

const game = (room: g.Room) => g.requireGame(room);
const currentOwner = (room: g.Room) => g.gamePhoto(room, game(room).round).ownerId;
const nonOwnerCandidate = (room: g.Room, voterId: string) =>
  game(room).ownerIds.find((id) => id !== voterId && id !== currentOwner(room))!;

/** Every connected player votes in the current round (owner: decoy). */
function everybodyVotes(room: g.Room, now: number, onlyConnected = true): void {
  const owner = currentOwner(room);
  for (const p of room.players) {
    if (onlyConnected && !p.connected) continue;
    const candidate = p.id === owner ? game(room).ownerIds.find((id) => id !== p.id)! : owner;
    unwrap(g.castVote(room, p.id, game(room).round, candidate, now));
  }
}

function expectWakeAfterTick(room: g.Room, now: number): void {
  g.tick(room, now);
  const wake = g.nextWakeAt(room);
  if (wake !== null) expect(wake).toBeGreaterThan(now);
}

const awardOf = (awards: Award[], id: AwardId) => awards.find((a) => a.id === id);

/** One photo per player; `guesses[voter][owner]` is the voter's pick for owner's photo. */
function playMatrix(names: string[], guesses: Record<string, Record<string, string>>): g.Room {
  const room = makeRoom(names);
  addPhotos(room, names.map(() => 1));
  unwrap(g.startGame(room, room.hostId, 0, seededRng(7)));
  const byName = (id: string) => names.find((n) => idOf(n) === id)!;
  const choose: Chooser = (voterId, photo, candidates) => {
    const pick = guesses[byName(voterId)]?.[byName(photo.ownerId)];
    if (pick) return idOf(pick);
    return voterId === photo.ownerId ? candidates[0] : null;
  };
  revealAll(room, playAllRounds(room, choose, 0));
  expect(room.phase).toBe('results');
  return room;
}

describe('full game flow', () => {
  it('plays a 4 player game from lobby to results and back', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [2, 2, 1, 1]);
    expect(errorOf(g.startGame(room, B, 0, seededRng(1)))).toBe('NOT_HOST');
    unwrap(g.startGame(room, A, 1000, seededRng(1)));

    expect(room.phase).toBe('voting');
    expect(game(room).order).toHaveLength(6);
    expect(game(room).ownerIds).toEqual([A, B, C, D]);
    expect(game(room).roundStartsAt).toBe(1000 + GAME_INTRO_MS);
    expect(game(room).roundCloseAt).toBe(1000 + GAME_INTRO_MS + 30_000);

    // Round by round: everybody votes right away, the round closes after the grace delay.
    let t = game(room).roundStartsAt;
    for (let round = 0; round < 6; round++) {
      expect(game(room).round).toBe(round);
      t = game(room).roundStartsAt;
      everybodyVotes(room, t);
      expect(game(room).roundCloseAt).toBe(t + ALL_VOTED_GRACE_MS);
      expect(g.tick(room, t + ALL_VOTED_GRACE_MS - 1)).toBe(false);
      expect(g.tick(room, t + ALL_VOTED_GRACE_MS)).toBe(true);
      if (round < 5) {
        expect(game(room).roundStartsAt).toBe(t + ALL_VOTED_GRACE_MS + ROUND_GAP_MS);
        expect(game(room).roundCloseAt).toBe(t + ALL_VOTED_GRACE_MS + ROUND_GAP_MS + 30_000);
      }
    }
    const closedAt = t + ALL_VOTED_GRACE_MS;
    expect(room.phase).toBe('reveal');
    expect(game(room).reveal).toEqual({ index: 0, startedAt: closedAt + REVEAL_INTRO_MS });

    const end = revealAll(room, closedAt);
    expect(room.phase).toBe('results');

    // Everybody guessed right: score = photos that are not theirs.
    const ranking = g.computeRanking(room);
    const scoreOf = (id: string) => ranking.find((r) => r.playerId === id)!.score;
    expect(scoreOf(A)).toBe(4 * POINTS_PER_CORRECT);
    expect(scoreOf(B)).toBe(4 * POINTS_PER_CORRECT);
    expect(scoreOf(C)).toBe(5 * POINTS_PER_CORRECT);
    expect(scoreOf(D)).toBe(5 * POINTS_PER_CORRECT);
    expect(ranking.map((r) => r.rank)).toEqual([1, 1, 3, 3]);

    unwrap(g.playAgain(room, A, end));
    expect(room.phase).toBe('lobby');
    expect(room.photos).toEqual([]);
    expect(room.game).toBeNull();
    expect(room.players.map((p) => p.id)).toEqual([A, B, C, D]);
    expect([...g.publicScores(room).values()]).toEqual([0, 0, 0, 0]);
    expect(end).toBeGreaterThan(closedAt);
  });
});

describe('voting', () => {
  it('counts decoy votes nowhere, while the owner can still vote', () => {
    const room = startedRoom([1, 1, 1, 0]);
    const t = game(room).roundStartsAt;
    const owner = currentOwner(room);
    const decoyTarget = game(room).ownerIds.find((id) => id !== owner)!;
    expect(errorOf(g.castVote(room, owner, 0, decoyTarget, t))).toBeNull();
    expect(game(room).votes[0].get(owner)).toEqual({ candidateId: decoyTarget, decoy: true, step: 0 });
    const result = g.roundResult(room, 0);
    expect(result.totalVotes).toBe(0);
    expect(result.votersByCandidate.size).toBe(0);
    expect(g.playerStats(room, 1).find((s) => s.playerId === owner)).toMatchObject({ guesses: 0, correct: 0 });
  });

  it('lets a vote change until the round closes', () => {
    const room = startedRoom();
    const t = game(room).roundStartsAt;
    const voter = room.players.find((p) => p.id !== currentOwner(room))!.id;
    unwrap(g.castVote(room, voter, 0, nonOwnerCandidate(room, voter), t));
    unwrap(g.castVote(room, voter, 0, currentOwner(room), t + 10));
    expect(game(room).votes[0].size).toBe(1);
    expect(game(room).votes[0].get(voter)?.candidateId).toBe(currentOwner(room));
    expect(g.roundResult(room, 0).correctVotes).toBe(1);
  });

  it('rejects early, late, stale and invalid votes', () => {
    const room = startedRoom([1, 1, 1, 0]);
    const { roundStartsAt: start, roundCloseAt: close } = game(room);
    const owner = currentOwner(room);
    const voter = room.players.find((p) => p.id !== owner && game(room).ownerIds.includes(p.id))!.id;
    // Early: tolerance is 300 ms.
    expect(errorOf(g.castVote(room, voter, 0, owner, start - 301))).toBe('WRONG_PHASE');
    expect(errorOf(g.castVote(room, voter, 0, owner, start - 300))).toBeNull();
    // Late: at the close time, even before tick() ran.
    expect(errorOf(g.castVote(room, voter, 0, owner, close!))).toBe('WRONG_PHASE');
    // Invalid candidates: self, a player without photos, a stranger.
    expect(errorOf(g.castVote(room, voter, 0, voter, start))).toBe('INVALID_VOTE');
    expect(errorOf(g.castVote(room, voter, 0, D, start))).toBe('INVALID_VOTE');
    expect(errorOf(g.castVote(room, voter, 0, 'nobody', start))).toBe('INVALID_VOTE');
    // Wrong round, unknown voter.
    expect(errorOf(g.castVote(room, voter, 1, owner, start))).toBe('WRONG_PHASE');
    expect(errorOf(g.castVote(room, 'ghost', 0, owner, start))).toBe('NOT_IN_ROOM');
    // Stale round after it closed.
    g.tick(room, close!);
    expect(game(room).round).toBe(1);
    expect(errorOf(g.castVote(room, voter, 0, owner, close! + 1))).toBe('WRONG_PHASE');
    // Not in voting at all.
    const lobby = makeRoom(FOUR);
    expect(errorOf(g.castVote(lobby, A, 0, B, 0))).toBe('WRONG_PHASE');
  });

  it('closes the round ALL_VOTED_GRACE_MS after everybody voted, never later than the timer', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 15 });
    const start = game(room).roundStartsAt;
    everybodyVotes(room, start + 100);
    expect(game(room).roundCloseAt).toBe(start + 100 + ALL_VOTED_GRACE_MS);
    // Changing a vote afterwards does not push the close time back.
    const voter = room.players.find((p) => p.id !== currentOwner(room))!.id;
    unwrap(g.castVote(room, voter, 0, nonOwnerCandidate(room, voter), start + 500));
    expect(game(room).roundCloseAt).toBe(start + 100 + ALL_VOTED_GRACE_MS);

    // Next round: everybody votes 200 ms before the timer ends -> the timer wins.
    g.tick(room, start + 100 + ALL_VOTED_GRACE_MS);
    const next = game(room);
    expect(next.round).toBe(1);
    const nextClose = next.roundCloseAt!;
    everybodyVotes(room, nextClose - 200);
    expect(next.roundCloseAt).toBe(nextClose);
  });

  it('waits for everybody (or the host) when there is no timer', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 0 });
    const start = game(room).roundStartsAt;
    expect(game(room).roundCloseAt).toBeNull();
    expect(g.nextWakeAt(room)).toBeNull();
    expect(g.tick(room, start + 3_600_000)).toBe(false);
    expect(game(room).round).toBe(0);

    everybodyVotes(room, start + 5000);
    expect(game(room).roundCloseAt).toBe(start + 5000 + ALL_VOTED_GRACE_MS);
    expect(g.nextWakeAt(room)).toBe(start + 5000 + ALL_VOTED_GRACE_MS);
    g.tick(room, start + 5000 + ALL_VOTED_GRACE_MS);
    expect(game(room).round).toBe(1);
    expect(game(room).roundCloseAt).toBeNull();
  });

  it('lets the host skip the current round only', () => {
    const room = startedRoom();
    const start = game(room).roundStartsAt;
    expect(errorOf(g.skipRound(room, B, 0, start))).toBe('NOT_HOST');
    unwrap(g.skipRound(room, A, 3, start)); // stale / unknown round: ignored
    expect(game(room).round).toBe(0);
    unwrap(g.skipRound(room, A, 0, start + 50));
    expect(game(room).round).toBe(1);
    expect(game(room).roundStartsAt).toBe(start + 50 + ROUND_GAP_MS);
    unwrap(g.skipRound(room, A, 0, start + 60)); // double click
    expect(game(room).round).toBe(1);
    const lobby = makeRoom(FOUR);
    expect(errorOf(g.skipRound(lobby, A, 0, 0))).toBe('WRONG_PHASE');
  });

  it('does not wait for disconnected players, and lets them vote again once back', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 0 });
    const start = game(room).roundStartsAt;
    const absent = room.players.find((p) => p.id !== currentOwner(room) && p.id !== A)!;
    g.disconnectPlayer(room, absent.id, start);
    everybodyVotes(room, start + 10);
    expect(game(room).roundCloseAt).toBe(start + 10 + ALL_VOTED_GRACE_MS);

    g.tick(room, start + 10 + ALL_VOTED_GRACE_MS);
    const round1Start = game(room).roundStartsAt;
    unwrap(g.reconnectPlayer(room, absent.id, round1Start - 1));
    // Round 1: the absent player is back, so the others voting is not enough.
    const owner = currentOwner(room);
    for (const p of room.players.filter((pl) => pl.id !== absent.id)) {
      unwrap(g.castVote(room, p.id, 1, p.id === owner ? nonOwnerCandidate(room, p.id) ?? game(room).ownerIds.find((id) => id !== p.id)! : owner, round1Start));
    }
    expect(game(room).roundCloseAt).toBeNull();
    // Disconnecting the last non-voter closes the round.
    g.disconnectPlayer(room, absent.id, round1Start + 30);
    expect(game(room).roundCloseAt).toBe(round1Start + 30 + ALL_VOTED_GRACE_MS);
    g.tick(room, round1Start + 30 + ALL_VOTED_GRACE_MS);
    unwrap(g.reconnectPlayer(room, absent.id, round1Start + 31 + ALL_VOTED_GRACE_MS));
    const owner2 = currentOwner(room);
    const target = absent.id === owner2 ? game(room).ownerIds.find((id) => id !== absent.id)! : owner2;
    expect(errorOf(g.castVote(room, absent.id, 2, target, game(room).roundStartsAt))).toBeNull();
  });

  it('never auto-closes a timer-less round while nobody is connected', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 0 });
    const start = game(room).roundStartsAt;
    for (const p of room.players) g.disconnectPlayer(room, p.id, start + 1);
    expect(game(room).roundCloseAt).toBeNull();
    expect(g.nextWakeAt(room)).toBeNull();
    expect(g.tick(room, start + 10 * 60_000)).toBe(false);
    expect(game(room).round).toBe(0);
    expect(room.phase).toBe('voting');
  });

  it('re-checks "everybody voted" when players come back or leave (timer-less round)', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 0 });
    const start = game(room).roundStartsAt;
    const owner = currentOwner(room);
    const pick = (id: string) => (id === owner ? game(room).ownerIds.find((o) => o !== id)! : owner);
    unwrap(g.castVote(room, A, 0, pick(A), start));
    unwrap(g.castVote(room, B, 0, pick(B), start));
    // Everybody drops, the last one being a non-voter: nobody connected, the round waits.
    for (const id of [A, B, C, D]) g.disconnectPlayer(room, id, start + 10);
    expect(game(room).roundCloseAt).toBeNull();
    // A non-voter coming back alone does not close it.
    unwrap(g.reconnectPlayer(room, C, start + 20));
    expect(game(room).roundCloseAt).toBeNull();
    g.disconnectPlayer(room, C, start + 30);
    // Voters coming back: everybody connected has voted.
    unwrap(g.reconnectPlayer(room, A, start + 100));
    expect(game(room).roundCloseAt).toBe(start + 100 + ALL_VOTED_GRACE_MS);
    expect(g.nextWakeAt(room)).toBe(start + 100 + ALL_VOTED_GRACE_MS);
    unwrap(g.reconnectPlayer(room, B, start + 200));
    expect(game(room).roundCloseAt).toBe(start + 100 + ALL_VOTED_GRACE_MS); // never later
    expect(g.tick(room, start + 100 + ALL_VOTED_GRACE_MS)).toBe(true);
    expect(game(room).round).toBe(1);

    // Round 1: C and D are back, everybody but D votes, then D leaves for good.
    unwrap(g.reconnectPlayer(room, C, start + 2000));
    unwrap(g.reconnectPlayer(room, D, start + 2000));
    const t1 = game(room).roundStartsAt;
    const owner1 = currentOwner(room);
    for (const id of [A, B, C]) unwrap(g.castVote(room, id, 1, id === owner1 ? game(room).ownerIds.find((o) => o !== id)! : owner1, t1));
    expect(game(room).roundCloseAt).toBeNull();
    unwrap(g.leaveRoom(room, D, t1 + 5));
    expect(game(room).roundCloseAt).toBe(t1 + 5 + ALL_VOTED_GRACE_MS);
  });

  it('answers ok to a stale skip of the last round once voting is over', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 15 });
    const last = game(room).order.length - 1;
    for (let round = 0; round < last; round++) unwrap(g.skipRound(room, A, round, game(room).roundStartsAt));
    const closeAt = game(room).roundCloseAt!;
    g.tick(room, closeAt); // the timer wins the race against the host's skip
    expect(room.phase).toBe('reveal');
    const reveal = { ...game(room).reveal! };
    expect(g.skipRound(room, A, last, closeAt + 5)).toEqual({ ok: true, value: undefined });
    expect(room.phase).toBe('reveal');
    expect(game(room).reveal).toEqual(reveal);
    expect(errorOf(g.skipRound(room, B, last, closeAt + 5))).toBe('NOT_HOST');
    revealAll(room, closeAt);
    expect(errorOf(g.skipRound(room, A, last, closeAt + 60_000))).toBeNull();
    expect(room.phase).toBe('results');
  });

  it('closes overdue rounds at their planned time when the timer fires late', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 15 });
    const close0 = game(room).roundCloseAt!;
    g.tick(room, close0 + 100);
    expect(game(room).round).toBe(1);
    expect(game(room).roundStartsAt).toBe(close0 + ROUND_GAP_MS);
  });
});

describe('host migration', () => {
  it('hands the crown to the earliest-joined connected player after HOST_GRACE_MS', () => {
    const room = makeRoom(FOUR);
    g.disconnectPlayer(room, B, 50); // earliest after the host, but gone too
    g.disconnectPlayer(room, A, 100);
    expect(room.hostDisconnectedSince).toBe(100);
    expect(g.nextWakeAt(room)).toBe(100 + HOST_GRACE_MS);
    expect(g.tick(room, 100 + HOST_GRACE_MS - 1)).toBe(false);
    expect(room.hostId).toBe(A);
    expect(g.tick(room, 100 + HOST_GRACE_MS)).toBe(true);
    expect(room.hostId).toBe(C);
    expect(room.hostDisconnectedSince).toBeNull();
  });

  it('keeps the crown when the host comes back in time', () => {
    const room = makeRoom(FOUR);
    g.disconnectPlayer(room, A, 100);
    unwrap(g.reconnectPlayer(room, A, 200));
    expect(room.hostDisconnectedSince).toBeNull();
    expect(g.tick(room, 100 + HOST_GRACE_MS)).toBe(false);
    expect(room.hostId).toBe(A);
  });

  it('waits for someone to be connected before migrating', () => {
    const room = makeRoom(FOUR);
    for (const p of room.players) g.disconnectPlayer(room, p.id, 100);
    expect(g.nextWakeAt(room)).toBe(100 + g.DEFAULT_TIMING.lobbyDropMs);
    expect(g.tick(room, 100 + HOST_GRACE_MS)).toBe(false);
    unwrap(g.reconnectPlayer(room, D, 100 + HOST_GRACE_MS));
    expect(g.nextWakeAt(room)).toBe(100 + HOST_GRACE_MS);
    expect(g.tick(room, 100 + HOST_GRACE_MS + 5)).toBe(true);
    expect(room.hostId).toBe(D);
  });

  it('hands the crown over immediately on an explicit leave (lobby and in game)', () => {
    const lobby = makeRoom(FOUR);
    unwrap(g.leaveRoom(lobby, A, 10));
    expect(lobby.hostId).toBe(B);
    expect(lobby.players.map((p) => p.id)).toEqual([B, C, D]);

    const room = startedRoom();
    unwrap(g.leaveRoom(room, A, 2000));
    expect(room.hostId).toBe(B);
    expect(room.hostDisconnectedSince).toBeNull();
    expect(g.findPlayer(room, A)).toMatchObject({ connected: false });
    expect(room.players).toHaveLength(4);
  });

  it('migrates during the game too', () => {
    const room = startedRoom();
    g.disconnectPlayer(room, A, 2000);
    g.tick(room, 2000 + HOST_GRACE_MS);
    expect(room.hostId).toBe(B);
  });
});

describe('lobby rules', () => {
  it('sanitizes names, rejects empty ones and case-insensitive duplicates', () => {
    const room = makeRoom(['Alice']);
    const join = (name: string, avatar = '🦊') => g.joinRoom(room, { ...newPlayer(name, avatar), id: `x-${name}`, token: `t-${name}` }, 1);
    expect(unwrap(join('  Bob   the  Builder ')).name).toBe('Bob the Builder');
    expect(unwrap(join('Zo\u200be\u0007')).name).toBe('Zoe');
    expect(errorOf(join('   '))).toBe('INVALID_NAME');
    expect(errorOf(join('​\u0007'))).toBe('INVALID_NAME');
    expect(errorOf(join('ALICE'))).toBe('NAME_TAKEN');
    expect(errorOf(join(' alice '))).toBe('NAME_TAKEN');
    expect(errorOf(join('Zed', 'not-an-avatar'))).toBe('BAD_REQUEST');
    expect(unwrap(join('A very very long name indeed')).name).toBe('A very very long');
    expect(errorOf(g.createRoom('WXYZ', newPlayer(''), 0))).toBe('INVALID_NAME');
  });

  it('ignores invisible characters: no blank names, no invisible copies of a taken name', () => {
    const room = makeRoom(['Bob']);
    const join = (name: string) => g.joinRoom(room, { ...newPlayer(name), id: `x-${name}`, token: `t-${name}` }, 1);
    for (const copy of ['Bob\u2060', 'B\u00adob', 'Bob\u034f', 'Bob\ufe0f', 'Bob\u{E0020}', '\u2800Bob', 'Bob\u180e']) {
      expect(errorOf(join(copy))).toBe('NAME_TAKEN');
    }
    for (const blank of ['\u3164', '\u2800', '\u2060\u200d', '\ufe0f', '\u0301\u0301', '\u115f\uffa0']) {
      expect(errorOf(join(blank))).toBe('INVALID_NAME');
    }
    expect(unwrap(join('Maman ❤️')).name).toBe('Maman ❤️');
    expect(unwrap(join('\u2800Zo\u2060é ')).name).toBe('Zoé');
  });

  it('assigns the first unused color', () => {
    const room = makeRoom(FOUR);
    expect(room.players.map((p) => p.color)).toEqual(PLAYER_COLORS.slice(0, 4));
    unwrap(g.leaveRoom(room, B, 5));
    const eve = unwrap(g.joinRoom(room, newPlayer('Eve'), 6));
    expect(eve.color).toBe(PLAYER_COLORS[1]);
  });

  it('rejects joins in a full room and during a game', () => {
    const room = makeRoom(['P0']);
    for (let i = 1; i < MAX_PLAYERS; i++) unwrap(g.joinRoom(room, newPlayer(`P${i}`), i));
    expect(errorOf(g.joinRoom(room, newPlayer('Late'), 99))).toBe('ROOM_FULL');
    const started = startedRoom();
    expect(errorOf(g.joinRoom(started, newPlayer('Eve'), 5000))).toBe('GAME_IN_PROGRESS');
  });

  it('lets only the host kick, in the lobby, and drops the photos of the kicked player', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [1, 2, 1, 1]);
    expect(errorOf(g.kickPlayer(room, B, C, 0))).toBe('NOT_HOST');
    expect(errorOf(g.kickPlayer(room, A, A, 0))).toBe('BAD_REQUEST');
    expect(errorOf(g.kickPlayer(room, A, 'ghost', 0))).toBe('BAD_REQUEST');
    unwrap(g.kickPlayer(room, A, B, 0));
    expect(room.players.map((p) => p.id)).toEqual([A, C, D]);
    expect(room.photos.some((ph) => ph.ownerId === B)).toBe(false);
    unwrap(g.startGame(room, A, 0, seededRng(3)));
    expect(errorOf(g.kickPlayer(room, A, C, 0))).toBe('WRONG_PHASE');
  });

  it('only allows profile, photo and settings changes in the lobby', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [1, 1, 1, 0]);
    unwrap(g.updatePlayer(room, B, { name: 'Bobby', avatar: '🦊' }));
    expect(g.findPlayer(room, B)).toMatchObject({ name: 'Bobby', avatar: '🦊' });
    expect(errorOf(g.updatePlayer(room, B, { name: 'alice' }))).toBe('NAME_TAKEN');
    unwrap(g.updatePlayer(room, B, { name: 'BOBBY' })); // own name, other case
    expect(errorOf(g.updateSettings(room, B, { voteSeconds: 15 }))).toBe('NOT_HOST');
    expect(errorOf(g.updateSettings(room, A, { voteSeconds: 25 }))).toBe('BAD_REQUEST');
    unwrap(g.updateSettings(room, A, { voteSeconds: 0, anonymousVotes: false }));
    expect(room.settings).toEqual({ voteSeconds: 0, anonymousVotes: false, theme: 'parents', photosPerPlayer: 2, blur: false });
    unwrap(g.setPhotoKind(room, A, 0, 'daronne'));
    expect(errorOf(g.setPhotoKind(room, A, 1, 'daron'))).toBe('BAD_REQUEST');

    unwrap(g.startGame(room, A, 0, seededRng(3)));
    const photo = { id: 'late', slot: 1 as const, kind: 'daron' as const, mime: 'image/png' as const, data: PNG_BYTES };
    expect(errorOf(g.uploadPhoto(room, D, photo, 0))).toBe('WRONG_PHASE');
    expect(errorOf(g.removePhoto(room, A, 0))).toBe('WRONG_PHASE');
    expect(errorOf(g.setPhotoKind(room, A, 0, 'daron'))).toBe('WRONG_PHASE');
    expect(errorOf(g.updatePlayer(room, B, { name: 'Robert' }))).toBe('WRONG_PHASE');
    expect(errorOf(g.updateSettings(room, A, { voteSeconds: 15 }))).toBe('WRONG_PHASE');
    expect(errorOf(g.startGame(room, A, 0, seededRng(3)))).toBe('WRONG_PHASE');
  });

  it('replaces a slot on re-upload and validates uploads', () => {
    const room = makeRoom(FOUR);
    const first = addPhoto(room, A, 0);
    const second = addPhoto(room, A, 0);
    expect(g.playerPhotos(room, A).map((p) => p.id)).toEqual([second.id]);
    expect(first.id).not.toBe(second.id);
    const base = { id: 'x', slot: 1 as const, kind: 'daron' as const, mime: 'image/png' as const };
    expect(errorOf(g.uploadPhoto(room, A, { ...base, data: Buffer.alloc(0) }, 0))).toBe('INVALID_PHOTO');
    expect(errorOf(g.uploadPhoto(room, A, { ...base, data: Buffer.alloc(3 * 1024 * 1024 + 1) }, 0))).toBe('PHOTO_TOO_LARGE');
    unwrap(g.removePhoto(room, A, 0));
    expect(g.hasPhotos(room, A)).toBe(false);
  });

  it('needs MIN_PHOTO_OWNERS players with photos to start', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [2, 2, 0, 0]);
    expect(errorOf(g.startGame(room, A, 0, seededRng(1)))).toBe('NOT_ENOUGH_PLAYERS');
    addPhoto(room, D, 1);
    unwrap(g.startGame(room, A, 0, seededRng(1)));
    expect(game(room).ownerIds).toEqual([A, B, D]);
  });

  it('removes players and their photos when they leave the lobby', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [1, 1, 1, 1]);
    unwrap(g.leaveRoom(room, C, 5));
    expect(room.players.map((p) => p.id)).toEqual([A, B, D]);
    expect(room.photos.some((ph) => ph.ownerId === C)).toBe(false);
    expect(errorOf(g.leaveRoom(room, C, 6))).toBe('NOT_IN_ROOM');
  });

  it('drops players disconnected for 5 minutes, in the lobby only', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [1, 1, 1, 1]);
    g.disconnectPlayer(room, D, 1000);
    const dropAt = 1000 + g.DEFAULT_TIMING.lobbyDropMs;
    expect(g.nextWakeAt(room)).toBe(dropAt);
    expect(g.tick(room, dropAt - 1)).toBe(false);
    expect(g.tick(room, dropAt)).toBe(true);
    expect(room.players.map((p) => p.id)).toEqual([A, B, C]);
    expect(room.photos.some((ph) => ph.ownerId === D)).toBe(false);

    const started = startedRoom();
    g.disconnectPlayer(started, D, 1000);
    g.tick(started, 1000 + 2 * g.DEFAULT_TIMING.lobbyDropMs);
    expect(started.players).toHaveLength(4);
  });

  it('lets the last player leave and marks the room empty', () => {
    const room = makeRoom(['Solo']);
    unwrap(g.leaveRoom(room, idOf('Solo'), 1));
    expect(g.isRoomEmpty(room)).toBe(true);
  });
});

describe('themes and photos per player', () => {
  const kinds = (room: g.Room, playerId: string) => g.playerPhotos(room, playerId).map((ph) => [ph.slot, ph.kind]);

  it('starts with the parents theme and 2 photos per player', () => {
    expect(makeRoom(FOUR).settings).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toMatchObject({ theme: 'parents', photosPerPlayer: 2 });
  });

  it('switching theme relabels the kinds it does not allow and resets photosPerPlayer', () => {
    const room = makeRoom(FOUR);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 3 }));
    addPhotos(room, [3, 1, 0, 0]);
    expect(kinds(room, A)).toEqual([[0, 'daron'], [1, 'daronne'], [2, 'daron']]);

    // Family allows parents: nothing to relabel, back to the family default count.
    unwrap(g.updateSettings(room, A, { theme: 'family' }));
    expect(room.settings).toMatchObject({ theme: 'family', photosPerPlayer: 2 });
    expect(kinds(room, A)).toEqual([[0, 'daron'], [1, 'daronne'], [2, 'daron']]);
    unwrap(g.setPhotoKind(room, B, 0, 'pet'));

    // Childhood: everything becomes 'kid', inactive slots included, and nothing is deleted.
    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    expect(room.settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 1 });
    expect(kinds(room, A)).toEqual([[0, 'kid'], [1, 'kid'], [2, 'kid']]);
    expect(kinds(room, B)).toEqual([[0, 'kid']]);

    unwrap(g.updateSettings(room, A, { theme: 'pick' }));
    expect(room.settings).toMatchObject({ theme: 'pick', photosPerPlayer: 1 });
    expect(kinds(room, A)).toEqual([[0, 'pick'], [1, 'pick'], [2, 'pick']]);

    // Mix allows every kind: labels stay.
    unwrap(g.updateSettings(room, A, { theme: 'mix' }));
    expect(room.settings).toMatchObject({ theme: 'mix', photosPerPlayer: 2 });
    expect(kinds(room, A)).toEqual([[0, 'pick'], [1, 'pick'], [2, 'pick']]);
    unwrap(g.setPhotoKind(room, B, 0, 'grandma'));

    // Back to parents: each slot gets that theme's default kind.
    unwrap(g.updateSettings(room, A, { theme: 'parents' }));
    expect(room.settings).toMatchObject({ theme: 'parents', photosPerPlayer: 2 });
    expect(kinds(room, A)).toEqual([[0, 'daron'], [1, 'daronne'], [2, 'daron']]);
    expect(kinds(room, B)).toEqual([[0, 'daron']]);
    expect(room.photos).toHaveLength(4);
  });

  it('keeps an explicit photosPerPlayer sent with the theme, and does not reset on the same theme', () => {
    const room = makeRoom(FOUR);
    unwrap(g.updateSettings(room, A, { theme: 'childhood', photosPerPlayer: 3 }));
    expect(room.settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 3 });
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 2 }));
    expect(room.settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 2 });
    // The whole settings object sent back (e.g. to change the timer) changes nothing else.
    unwrap(g.updateSettings(room, A, { ...room.settings, voteSeconds: 15 }));
    expect(room.settings).toEqual({ voteSeconds: 15, anonymousVotes: true, theme: 'childhood', photosPerPlayer: 2, blur: false });
    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    expect(room.settings.photosPerPlayer).toBe(2);
  });

  it('rejects invalid themes and photo counts, without applying any part of the update', () => {
    const room = makeRoom(FOUR);
    const before = { ...room.settings };
    const bad = [
      { theme: 'cousins' },
      { theme: 'mix', photosPerPlayer: 4 },
      { photosPerPlayer: 0 },
      { photosPerPlayer: 1.5 },
      { photosPerPlayer: '2' },
      { voteSeconds: 15, photosPerPlayer: 5 },
    ] as unknown as Partial<g.Room['settings']>[];
    for (const patch of bad) expect(errorOf(g.updateSettings(room, A, patch))).toBe('BAD_REQUEST');
    expect(room.settings).toEqual(before);
    expect(errorOf(g.updateSettings(room, B, { theme: 'mix' }))).toBe('NOT_HOST');
  });

  describe('game mode picked when creating the room', () => {
    const create = (setup?: RoomSetup, name = 'Alice') => g.createRoom('WXYZ', newPlayer(name), 0, g.DEFAULT_TIMING, setup);

    it("starts with the picked theme and that theme's default photo count", () => {
      for (const theme of THEMES) {
        expect(unwrap(create({ theme })).settings).toEqual({
          ...DEFAULT_SETTINGS,
          theme,
          photosPerPlayer: THEME_DEFAULT_PHOTOS[theme],
          blur: THEME_DEFAULT_BLUR[theme],
        });
      }
      expect(unwrap(create({ theme: 'childhood' })).settings).toEqual({
        voteSeconds: 30,
        anonymousVotes: true,
        theme: 'childhood',
        photosPerPlayer: 1,
        blur: false,
      });
      expect(unwrap(create({ theme: 'whois' })).settings).toMatchObject({ theme: 'whois', photosPerPlayer: 1, blur: true });
    });

    it('keeps an explicit photo count', () => {
      expect(unwrap(create({ theme: 'childhood', photosPerPlayer: 3 })).settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 3 });
      expect(unwrap(create({ theme: 'family', photosPerPlayer: 1 })).settings).toMatchObject({ theme: 'family', photosPerPlayer: 1 });
      expect(unwrap(create({ theme: 'parents', photosPerPlayer: 2 })).settings).toEqual(DEFAULT_SETTINGS);
    });

    it('falls back to DEFAULT_SETTINGS without a setup, never sharing the object', () => {
      const room = unwrap(create());
      expect(room.settings).toEqual(DEFAULT_SETTINGS);
      expect(room.settings).not.toBe(DEFAULT_SETTINGS);
      unwrap(g.updateSettings(room, idOf('Alice'), { theme: 'mix' }));
      expect(DEFAULT_SETTINGS).toMatchObject({ theme: 'parents', photosPerPlayer: 2 });
    });

    it('rejects an invalid theme or photo count with BAD_REQUEST, after the name check', () => {
      const bad = [
        {},
        { theme: 'cousins' },
        { theme: 'Mix' },
        { photosPerPlayer: 2 },
        { theme: 'mix', photosPerPlayer: 4 },
        { theme: 'mix', photosPerPlayer: 0 },
        { theme: 'pick', photosPerPlayer: 1.5 },
        { theme: 'pick', photosPerPlayer: '2' },
        { theme: 'pick', photosPerPlayer: null },
      ] as unknown as RoomSetup[];
      for (const setup of bad) expect(errorOf(create(setup))).toBe('BAD_REQUEST');
      expect(errorOf(create({ theme: 'mix' }, '   '))).toBe('INVALID_NAME');
    });

    it('applies the picked mode in the lobby, where the host can still change it', () => {
      const room = unwrap(create({ theme: 'childhood' }));
      unwrap(g.joinRoom(room, newPlayer('Bob'), 1));
      const upload = (slot: PhotoSlot, kind: g.Photo['kind']) => errorOf(g.uploadPhoto(room, idOf('Bob'), newPhoto(room, slot, kind), 2));
      expect(upload(0, 'daron')).toBe('BAD_REQUEST'); // not a childhood kind
      expect(upload(1, 'kid')).toBe('BAD_REQUEST'); // 1 photo per player
      expect(upload(0, 'kid')).toBeNull();
      unwrap(g.updateSettings(room, idOf('Alice'), { theme: 'mix' }));
      expect(room.settings).toMatchObject({ theme: 'mix', photosPerPlayer: 2 });
      expect(g.playerPhotos(room, idOf('Bob')).map((ph) => ph.kind)).toEqual(['kid']);
    });
  });

  it('only accepts uploads and relabels in an active slot, with a kind the theme allows', () => {
    const room = makeRoom(FOUR);
    const upload = (slot: 0 | 1 | 2, kind: string) =>
      errorOf(g.uploadPhoto(room, A, newPhoto(room, slot, kind as g.Photo['kind']), 0));
    expect(upload(2, 'daron')).toBe('BAD_REQUEST'); // slot 2 is inactive with 2 photos per player
    expect(upload(0, 'kid')).toBe('BAD_REQUEST'); // not a parents kind
    expect(upload(0, 'cousin')).toBe('BAD_REQUEST'); // not a kind at all
    expect(upload(3 as 2, 'daron')).toBe('BAD_REQUEST');
    expect(upload(1, 'daron')).toBeNull(); // two darons is fine
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 3 }));
    expect(upload(2, 'daronne')).toBeNull();

    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    expect(upload(0, 'daron')).toBe('BAD_REQUEST');
    expect(upload(1, 'kid')).toBe('BAD_REQUEST'); // 1 photo per player now
    expect(upload(0, 'kid')).toBeNull();
    // Relabel: the slot 1 photo is still there, but inactive.
    expect(errorOf(g.setPhotoKind(room, A, 1, 'kid'))).toBe('BAD_REQUEST');
    expect(errorOf(g.setPhotoKind(room, A, 0, 'pick'))).toBe('BAD_REQUEST');
    unwrap(g.setPhotoKind(room, A, 0, 'kid'));
    // Removing works on any slot.
    unwrap(g.removePhoto(room, A, 2));
    expect(g.playerPhotos(room, A).map((ph) => ph.slot)).toEqual([0, 1]);

    unwrap(g.updateSettings(room, A, { theme: 'mix', photosPerPlayer: 3 }));
    for (const kind of ['pet', 'partner', 'grandpa', 'pick'] as const) unwrap(g.setPhotoKind(room, A, 1, kind));
    expect(upload(2, 'friend')).toBeNull();
    unwrap(g.updateSettings(room, A, { theme: 'family' }));
    expect(errorOf(g.setPhotoKind(room, A, 0, 'kid'))).toBe('BAD_REQUEST');
    unwrap(g.setPhotoKind(room, A, 0, 'sister'));
  });

  it('ignores photos in inactive slots for readiness and for the game, without deleting them', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [2, 2, 2, 0]);
    addPhoto(room, D, 1);
    expect(FOUR.map((n) => g.hasActivePhotos(room, idOf(n)))).toEqual([true, true, true, true]);

    unwrap(g.updateSettings(room, A, { photosPerPlayer: 1 }));
    expect(FOUR.map((n) => g.hasActivePhotos(room, idOf(n)))).toEqual([true, true, true, false]);
    expect(g.activePhotos(room, A).map((ph) => ph.slot)).toEqual([0]);
    expect(g.playerPhotos(room, A).map((ph) => ph.slot)).toEqual([0, 1]);

    unwrap(g.startGame(room, A, 0, seededRng(5)));
    expect(game(room).ownerIds).toEqual([A, B, C]);
    expect(game(room).order).toHaveLength(3);
    for (let i = 0; i < 3; i++) expect(g.gamePhoto(room, i).slot).toBe(0);
    expect(room.photos).toHaveLength(7);
    // Dave only guesses.
    expect(errorOf(g.castVote(room, A, 0, D, game(room).roundStartsAt))).toBe('INVALID_VOTE');
  });

  it('needs MIN_PHOTO_OWNERS players with an active photo', () => {
    const room = makeRoom(FOUR);
    addPhotos(room, [1, 1, 0, 0]);
    addPhoto(room, C, 1);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 1 }));
    expect(errorOf(g.startGame(room, A, 0, seededRng(1)))).toBe('NOT_ENOUGH_PLAYERS');
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 2 }));
    unwrap(g.startGame(room, A, 0, seededRng(1)));
    expect(game(room).ownerIds).toEqual([A, B, C]);
  });

  it('keeps the settings on playAgain, and clears the photos', () => {
    const room = makeRoom(FOUR);
    const settings = { voteSeconds: 15, anonymousVotes: false, theme: 'family', photosPerPlayer: 3, blur: true } as const;
    unwrap(g.updateSettings(room, A, settings));
    addPhotos(room, [3, 2, 1, 0]);
    unwrap(g.startGame(room, A, 0, seededRng(2)));
    expect(game(room).order).toHaveLength(6);
    const end = revealAll(room, playAllRounds(room, allCorrect, 0));
    unwrap(g.playAgain(room, A, end));
    expect(room.phase).toBe('lobby');
    expect(room.settings).toEqual(settings);
    expect(room.photos).toEqual([]);
  });

  it('plays a whole childhood game with one photo each', () => {
    const room = makeRoom(FOUR);
    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    expect(room.settings.photosPerPlayer).toBe(1);
    for (const name of FOUR) addPhoto(room, idOf(name), 0);
    expect(room.photos.map((ph) => ph.kind)).toEqual(['kid', 'kid', 'kid', 'kid']);

    unwrap(g.startGame(room, A, 0, seededRng(9)));
    expect(game(room).order).toHaveLength(4);
    expect(game(room).ownerIds).toEqual([A, B, C, D]);
    const owners = game(room).order.map((_, i) => g.gamePhoto(room, i).ownerId);
    expect(new Set(owners).size).toBe(4);

    revealAll(room, playAllRounds(room, allCorrect, 0));
    expect(room.phase).toBe('results');
    // Everybody guessed the 3 photos that are not theirs.
    expect(g.computeRanking(room).map((r) => [r.score, r.correct, r.guesses, r.rank])).toEqual(
      FOUR.map(() => [3 * POINTS_PER_CORRECT, 3, 3, 1]),
    );
    expect(awardOf(g.computeAwards(room), 'carbonCopy')).toMatchObject({ playerIds: [A, B, C, D], value: 100 });
  });
});

describe('shuffle', () => {
  const repeats = (owners: string[]) => owners.filter((o, i) => i > 0 && owners[i - 1] === o).length;
  const itemsFor = (counts: number[]) =>
    counts.flatMap((count, owner) => Array.from({ length: count }, (_, k) => ({ owner: `o${owner}`, k })));

  it('never puts the same owner twice in a row when it can be avoided', () => {
    const distributions = [
      [2, 1, 1],
      [2, 2, 1],
      [2, 2, 2],
      [2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2],
      [2, 1, 1, 1, 1, 2],
      [3, 1, 2], // max count equals ceil(n / 2): still avoidable
    ];
    for (const counts of distributions) {
      for (let seed = 1; seed <= 300; seed++) {
        const items = itemsFor(counts);
        const order = g.arrangeAvoidingRepeats(items, (it) => it.owner, seededRng(seed));
        expect(order).toHaveLength(items.length);
        expect(new Set(order)).toEqual(new Set(items));
        expect(repeats(order.map((it) => it.owner))).toBe(0);
      }
    }
  });

  it('keeps unavoidable repeats to a minimum', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const order = g.arrangeAvoidingRepeats(itemsFor([4, 1]), (it) => it.owner, seededRng(seed));
      expect(repeats(order.map((it) => it.owner))).toBe(2);
    }
  });

  it('actually shuffles, and startGame never repeats an owner back to back', () => {
    const orders = new Set<string>();
    for (let seed = 1; seed <= 40; seed++) {
      const room = makeRoom(FOUR);
      addPhotos(room, [2, 2, 1, 1]);
      unwrap(g.startGame(room, A, 0, seededRng(seed)));
      const owners = game(room).order.map((_, i) => g.gamePhoto(room, i).ownerId);
      expect(repeats(owners)).toBe(0);
      orders.add(owners.join());
    }
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe('reveal and scoring', () => {
  it('only counts fully revealed photos in public scores during the reveal', () => {
    const room = startedRoom([1, 1, 1, 1], 1000, { anonymousVotes: false });
    expect([...g.publicScores(room).values()]).toEqual([0, 0, 0, 0]);
    const t = playAllRounds(room, allCorrect, 0);
    expect(room.phase).toBe('reveal');
    expect([...g.publicScores(room).values()]).toEqual([0, 0, 0, 0]);

    const reveal = game(room).reveal!;
    unwrap(g.nextReveal(room, A, 0, Math.max(t, reveal.startedAt + REVEAL_OWNER_AT_MS)));
    const owner0 = g.gamePhoto(room, 0).ownerId;
    const scores = g.publicScores(room);
    for (const p of room.players) expect(scores.get(p.id)).toBe(p.id === owner0 ? 0 : POINTS_PER_CORRECT);

    revealAll(room, t);
    expect(room.phase).toBe('results');
    for (const score of g.publicScores(room).values()) expect(score).toBe(3 * POINTS_PER_CORRECT);
  });

  it('keeps public scores at 0 for the whole reveal when votes are anonymous', () => {
    const room = startedRoom([1, 1, 1, 1]);
    expect(room.settings.anonymousVotes).toBe(true);
    const t = playAllRounds(room, allCorrect, 0);
    let steps = 0;
    while (room.phase === 'reveal') {
      // Score changes between photos would tell everybody who guessed the previous one right.
      expect([...g.publicScores(room).values()]).toEqual([0, 0, 0, 0]);
      const reveal = game(room).reveal!;
      unwrap(g.nextReveal(room, A, reveal.index, Math.max(t, reveal.startedAt + REVEAL_OWNER_AT_MS)));
      steps += 1;
    }
    expect(steps).toBe(4);
    expect(room.phase).toBe('results');
    for (const score of g.publicScores(room).values()) expect(score).toBe(3 * POINTS_PER_CORRECT);
  });

  it('keeps public scores at 0 during voting, even after rounds with correct votes', () => {
    for (const anonymousVotes of [true, false]) {
      const room = startedRoom([1, 1, 1, 1], 0, { anonymousVotes });
      for (let round = 0; round < 3; round++) {
        everybodyVotes(room, game(room).roundStartsAt);
        unwrap(g.skipRound(room, A, round, game(room).roundStartsAt + 1));
        expect(room.phase).toBe('voting');
        expect([...g.publicScores(room).values()]).toEqual([0, 0, 0, 0]);
      }
    }
  });

  it('refuses nextReveal before the owner is revealed and ignores stale indexes', () => {
    const room = startedRoom([1, 1, 1, 1]);
    playAllRounds(room, allCorrect, 0);
    const { startedAt } = game(room).reveal!;
    const readyAt = startedAt + REVEAL_OWNER_AT_MS;
    expect(errorOf(g.nextReveal(room, B, 0, readyAt))).toBe('NOT_HOST');
    expect(errorOf(g.nextReveal(room, A, 0, readyAt - 1))).toBe('WRONG_PHASE');
    unwrap(g.nextReveal(room, A, 0, readyAt));
    expect(game(room).reveal).toEqual({ index: 1, startedAt: readyAt });
    unwrap(g.nextReveal(room, A, 0, readyAt + 10)); // double click: no-op
    expect(game(room).reveal).toEqual({ index: 1, startedAt: readyAt });
    expect(errorOf(g.nextReveal(room, A, 1, readyAt + 10))).toBe('WRONG_PHASE');

    revealAll(room, readyAt);
    expect(room.phase).toBe('results');
    unwrap(g.nextReveal(room, A, 3, readyAt + 60_000)); // last index again: still fine
    expect(room.phase).toBe('results');
    expect(errorOf(g.nextReveal(makeRoom(FOUR), A, 0, 0))).toBe('WRONG_PHASE');
  });

  it('playAgain is host-only and results-only', () => {
    const room = startedRoom([1, 1, 1, 1]);
    expect(errorOf(g.playAgain(room, A, 0))).toBe('WRONG_PHASE');
    const end = revealAll(room, playAllRounds(room, allCorrect, 0));
    expect(errorOf(g.playAgain(room, B, end))).toBe('NOT_HOST');
    const settings = { ...room.settings };
    unwrap(g.playAgain(room, A, end));
    expect(room.settings).toEqual(settings);
    expect(room.phase).toBe('lobby');
    expect(g.computeRanking(room).every((r) => r.score === 0)).toBe(true);
  });

  it('playAgain keeps disconnected players, with a fresh lobby grace period', () => {
    const room = startedRoom([1, 1, 1, 1], 0);
    g.disconnectPlayer(room, D, 10); // phone locked early in the game
    const end = revealAll(room, playAllRounds(room, allCorrect, 0));
    const later = end + 6 * 60_000; // more than lobbyDropMs after D left
    unwrap(g.playAgain(room, A, later));
    const dropAt = later + g.DEFAULT_TIMING.lobbyDropMs;
    expect(g.nextWakeAt(room)).toBe(dropAt);
    expect(g.tick(room, later)).toBe(false);
    expect(room.players.map((p) => p.id)).toEqual([A, B, C, D]);
    // D comes back within the grace period: still seated.
    unwrap(g.reconnectPlayer(room, D, dropAt - 1));
    expect(g.tick(room, dropAt)).toBe(false);
    expect(room.players.map((p) => p.id)).toEqual([A, B, C, D]);

    // Without coming back, the usual lobby rule applies from the moment of playAgain.
    const other = startedRoom([1, 1, 1, 1], 0);
    g.disconnectPlayer(other, D, 10);
    const otherEnd = revealAll(other, playAllRounds(other, allCorrect, 0)) + 6 * 60_000;
    unwrap(g.playAgain(other, A, otherEnd));
    expect(g.tick(other, otherEnd + g.DEFAULT_TIMING.lobbyDropMs - 1)).toBe(false);
    expect(g.tick(other, otherEnd + g.DEFAULT_TIMING.lobbyDropMs)).toBe(true);
    expect(other.players.map((p) => p.id)).toEqual([A, B, C]);
  });

  it('ranks with shared ranks on ties', () => {
    const room = playMatrix(['A1', 'B1', 'C1', 'D1'], {
      A1: { B1: 'B1', C1: 'C1', D1: 'D1' },
      B1: { A1: 'A1', C1: 'C1', D1: 'A1' },
      C1: { A1: 'A1', B1: 'B1', D1: 'A1' },
      D1: { A1: 'B1', B1: 'A1', C1: 'A1' },
    });
    const ranking = g.computeRanking(room);
    expect(ranking.map((r) => [r.playerId, r.score, r.rank])).toEqual([
      [idOf('A1'), 300, 1],
      [idOf('B1'), 200, 2],
      [idOf('C1'), 200, 2],
      [idOf('D1'), 0, 4],
    ]);
    expect(ranking[0]).toMatchObject({ correct: 3, guesses: 3 });
  });
});

describe('awards', () => {
  it('hands out every award in a mixed game', () => {
    const room = playMatrix(['A', 'B', 'C', 'D'], {
      A: { B: 'B', C: 'D', D: 'D' },
      B: { A: 'A', C: 'A', D: 'D' },
      C: { A: 'B', B: 'B', D: 'A' },
      D: { A: 'B', B: 'B', C: 'B' },
    });
    const awards = g.computeAwards(room);
    const photoOf = (owner: string) => room.photos.find((ph) => ph.ownerId === idOf(owner))!.id;
    expect(awards.map((a) => a.id)).toEqual([
      'sherlock',
      'needsGlasses',
      'carbonCopy',
      'masterOfDisguise',
      'doppelganger',
      'mostConfusing',
      'biggestMixup',
    ]);
    expect(awardOf(awards, 'sherlock')).toEqual({ id: 'sherlock', playerIds: [idOf('A'), idOf('B')], value: 2, total: 3 });
    expect(awardOf(awards, 'needsGlasses')).toEqual({ id: 'needsGlasses', playerIds: [idOf('C'), idOf('D')], value: 1, total: 3 });
    expect(awardOf(awards, 'carbonCopy')).toEqual({ id: 'carbonCopy', playerIds: [idOf('B')], value: 100, total: 3 });
    expect(awardOf(awards, 'masterOfDisguise')).toEqual({ id: 'masterOfDisguise', playerIds: [idOf('C')], value: 0, total: 3 });
    expect(awardOf(awards, 'doppelganger')).toEqual({ id: 'doppelganger', playerIds: [idOf('B')], value: 3 });
    expect(awardOf(awards, 'mostConfusing')).toEqual({
      id: 'mostConfusing',
      playerIds: [idOf('C')],
      photoId: photoOf('C'),
      value: 3,
      total: 3,
    });
    expect(awardOf(awards, 'biggestMixup')).toEqual({
      id: 'biggestMixup',
      playerIds: [idOf('A')],
      photoId: photoOf('A'),
      otherPlayerId: idOf('B'),
      value: 2,
      total: 3,
    });
  });

  it('skips "opposite" awards that would go to the same players', () => {
    const names = ['A', 'B', 'C', 'D'];
    const perfect = Object.fromEntries(names.map((v) => [v, Object.fromEntries(names.filter((o) => o !== v).map((o) => [o, o]))]));
    const awards = g.computeAwards(playMatrix(names, perfect));
    expect(awards.map((a) => a.id)).toEqual(['sherlock', 'carbonCopy']);
    expect(awardOf(awards, 'sherlock')!.playerIds).toEqual(names.map(idOf));
    expect(awardOf(awards, 'carbonCopy')).toMatchObject({ playerIds: names.map(idOf), value: 100 });
  });

  it('handles a game where nobody guessed anything right', () => {
    const awards = g.computeAwards(
      playMatrix(['A', 'B', 'C'], {
        A: { B: 'C', C: 'B' },
        B: { A: 'C', C: 'A' },
        C: { A: 'B', B: 'A' },
      }),
    );
    expect(awardOf(awards, 'sherlock')).toBeUndefined();
    expect(awardOf(awards, 'carbonCopy')).toBeUndefined();
    expect(awardOf(awards, 'needsGlasses')).toMatchObject({ playerIds: [idOf('A'), idOf('B'), idOf('C')], value: 0 });
    expect(awardOf(awards, 'masterOfDisguise')).toMatchObject({ playerIds: [idOf('A'), idOf('B'), idOf('C')], value: 0 });
    // Each player got exactly 2 wrong votes: a three-way doppelganger tie.
    expect(awardOf(awards, 'doppelganger')).toMatchObject({ playerIds: [idOf('A'), idOf('B'), idOf('C')], value: 2 });
    expect(awardOf(awards, 'mostConfusing')).toBeUndefined(); // only 2 distinct candidates per photo
    expect(awardOf(awards, 'biggestMixup')).toBeUndefined(); // 1 vote per wrong candidate
  });

  it('applies the thresholds and tie-breaks of photo awards', () => {
    const room = playMatrix(['A', 'B', 'C', 'D', 'Eve'], {
      A: { B: 'C', C: 'B', D: 'D', Eve: 'Eve' },
      B: { A: 'A', C: 'D', D: 'D', Eve: 'Eve' },
      C: { A: 'A', B: 'D', D: 'D', Eve: 'Eve' },
      D: { A: 'B', B: 'Eve', C: 'Eve' },
      Eve: { A: 'B', B: 'B', C: 'A', D: 'D' },
    });
    const awards = g.computeAwards(room);
    const photoOf = (owner: string) => room.photos.find((ph) => ph.ownerId === idOf(owner))!.id;
    // B: {C, D, Eve, B} with 1 correct; C: {B, D, Eve, A} with 0 correct -> C wins the tie.
    expect(awardOf(awards, 'mostConfusing')).toMatchObject({ photoId: photoOf('C'), playerIds: [idOf('C')], value: 4 });
    // Photo A: B got 2 votes but so did A: not a mix-up.
    expect(awardOf(awards, 'biggestMixup')).toBeUndefined();
    expect(awardOf(awards, 'sherlock')).toMatchObject({ playerIds: [idOf('B'), idOf('C')], value: 3, total: 4 });
    // D skipped Eve's photo: 3 guesses.
    expect(awardOf(awards, 'needsGlasses')).toEqual({ id: 'needsGlasses', playerIds: [idOf('D')], value: 0, total: 3 });
  });

  it('breaks biggestMixup ties on the margin over the correct votes, not on photo order', () => {
    // Photo order (seed 7) is A, B, E, D, C: the smaller margin (photo A) comes first.
    const room = playMatrix(['A', 'B', 'C', 'D', 'E'], {
      A: { B: 'B', C: 'D', D: 'D', E: 'E' },
      B: { A: 'E', C: 'D', D: 'D', E: 'E' },
      C: { A: 'B', B: 'B', D: 'D', E: 'E' },
      D: { A: 'B', B: 'B', C: 'E', E: 'E' },
      E: { A: 'A', B: 'B', C: 'A', D: 'D' },
    });
    const owners = game(room).order.map((_, i) => g.gamePhoto(room, i).ownerId);
    expect(owners.indexOf(idOf('A'))).toBeLessThan(owners.indexOf(idOf('C')));
    const photoOf = (owner: string) => room.photos.find((ph) => ph.ownerId === idOf(owner))!.id;
    // Photo A: 2 votes for B, 1 correct (margin 1). Photo C: 2 votes for D, 0 correct (margin 2).
    expect(awardOf(g.computeAwards(room), 'biggestMixup')).toEqual({
      id: 'biggestMixup',
      playerIds: [idOf('C')],
      photoId: photoOf('C'),
      otherPlayerId: idOf('D'),
      value: 2,
      total: 4,
    });
  });

  it('gives sherlock the highest guess count of the tied winners as total', () => {
    const awards = g.computeAwards(
      playMatrix(['A', 'B', 'C', 'D'], {
        A: { B: 'B', C: 'C' }, // 2 / 2 (abstains on D)
        B: { A: 'A', C: 'C', D: 'A' }, // 2 / 3
        C: { A: 'B', B: 'B', D: 'A' },
        D: { A: 'C', B: 'A', C: 'C' },
      }),
    );
    expect(awardOf(awards, 'sherlock')).toEqual({ id: 'sherlock', playerIds: [idOf('A'), idOf('B')], value: 2, total: 3 });
  });

  it('ignores players without votes and photos without votes', () => {
    // Nobody ever votes on anything: no award at all.
    const awards = g.computeAwards(playMatrix(['A', 'B', 'C', 'D'], {}));
    expect(awards).toEqual([]);
  });

  it('requires 2 wrong votes for doppelganger and only counts voters for needsGlasses', () => {
    const awards = g.computeAwards(
      playMatrix(['A', 'B', 'C', 'D'], {
        A: { B: 'B', C: 'C', D: 'D' },
        B: { A: 'A', C: 'C', D: 'D' },
        C: { A: 'A', B: 'B', D: 'A' },
        // D only casts decoys: 0 guesses, so not a needsGlasses candidate.
      }),
    );
    expect(awardOf(awards, 'doppelganger')).toBeUndefined(); // A got a single wrong vote
    expect(awardOf(awards, 'sherlock')).toMatchObject({ playerIds: [idOf('A'), idOf('B')], value: 3 });
    expect(awardOf(awards, 'needsGlasses')).toMatchObject({ playerIds: [idOf('C')], value: 2 });
    expect(awardOf(awards, 'carbonCopy')).toMatchObject({ playerIds: [idOf('A'), idOf('B'), idOf('C')], value: 100, total: 2 });
    expect(awardOf(awards, 'masterOfDisguise')).toMatchObject({ playerIds: [idOf('D')], value: 67, total: 3 });
  });
});

describe('time bookkeeping', () => {
  it('never asks to wake up in the past after a tick', () => {
    const room = startedRoom([1, 1, 1, 1], 0, { voteSeconds: 15 });
    expectWakeAfterTick(room, 0);
    g.disconnectPlayer(room, A, 10);
    g.disconnectPlayer(room, D, 20);
    for (let t = 0; t < 200_000; t += 777) expectWakeAfterTick(room, t);
    expect(room.phase).toBe('reveal');
    expect(room.hostId).toBe(B);

    const lobby = makeRoom(FOUR);
    for (const p of lobby.players) g.disconnectPlayer(lobby, p.id, 5);
    unwrap(g.reconnectPlayer(lobby, C, 5));
    for (let t = 0; t < 400_000; t += 3333) expectWakeAfterTick(lobby, t);
    expect(lobby.players.map((p) => p.id)).toEqual([C]);
    expect(lobby.hostId).toBe(C);
    expect(g.nextWakeAt(lobby)).toBeNull();
  });
});

describe('selfies', () => {
  const selfieIds = (room: g.Room) => room.players.map((p) => p.selfie?.id ?? null);

  it('sets, replaces and removes the caller own selfie', () => {
    const room = makeRoom(FOUR);
    const first = addSelfie(room, B, 's1', 5);
    expect(first).toEqual({ id: 's1', mime: 'image/png', data: PNG_BYTES, uploadedAt: 5 });
    expect(g.findPlayer(room, B)!.selfie).toBe(first);
    expect(selfieIds(room)).toEqual([null, 's1', null, null]);

    // Replacing drops the old image.
    addSelfie(room, B, 's2', 6);
    expect(g.findImage(room, 's1')).toBeUndefined();
    expect(g.findImage(room, 's2')).toMatchObject({ id: 's2', uploadedAt: 6 });
    expect(g.roomImageBytes(room)).toBe(PNG_BYTES.byteLength);

    unwrap(g.removeSelfie(room, B));
    expect(g.findImage(room, 's2')).toBeUndefined();
    unwrap(g.removeSelfie(room, B)); // nothing left: a no-op
    expect(selfieIds(room)).toEqual([null, null, null, null]);
    expect(g.roomImageBytes(room)).toBe(0);
  });

  it('works in every phase', () => {
    const room = startedRoom([1, 1, 1, 0]);
    addSelfie(room, D, 'voting', 1000);
    let t = playAllRounds(room, allCorrect, 1000);
    expect(room.phase).toBe('reveal');
    addSelfie(room, C, 'reveal', t);
    t = revealAll(room, t);
    expect(room.phase).toBe('results');
    addSelfie(room, A, 'results', t);
    unwrap(g.removeSelfie(room, D));
    expect(selfieIds(room)).toEqual(['results', null, 'reveal', null]);
  });

  it('validates the caller and the image', () => {
    const room = makeRoom(FOUR);
    expect(errorOf(g.setSelfie(room, 'id-Nobody', newSelfie(), 0))).toBe('NOT_IN_ROOM');
    expect(errorOf(g.removeSelfie(room, 'id-Nobody'))).toBe('NOT_IN_ROOM');
    const gif = { ...newSelfie(), mime: 'image/gif' as g.PhotoMime };
    expect(errorOf(g.setSelfie(room, A, gif, 0))).toBe('INVALID_PHOTO');
    expect(errorOf(g.setSelfie(room, A, newSelfie('empty', Buffer.alloc(0)), 0))).toBe('INVALID_PHOTO');
    expect(errorOf(g.setSelfie(room, A, newSelfie('huge', Buffer.alloc(MAX_PHOTO_BYTES + 1)), 0))).toBe('PHOTO_TOO_LARGE');
    // A refused replacement keeps the current selfie.
    addSelfie(room, A, 'kept');
    expect(errorOf(g.setSelfie(room, A, gif, 1))).toBe('INVALID_PHOTO');
    expect(selfieIds(room)).toEqual(['kept', null, null, null]);
  });

  it('is never a game photo: no readiness, no candidate, never played', () => {
    const room = makeRoom(FOUR);
    for (const p of room.players) addSelfie(room, p.id, `s-${p.name}`);
    expect(room.photos).toEqual([]);
    expect(room.players.some((p) => g.hasPhotos(room, p.id) || g.hasActivePhotos(room, p.id))).toBe(false);
    expect(errorOf(g.startGame(room, A, 0, seededRng(1)))).toBe('NOT_ENOUGH_PLAYERS');
    addPhotos(room, [1, 1]);
    expect(errorOf(g.startGame(room, A, 0, seededRng(1)))).toBe('NOT_ENOUGH_PLAYERS');
    addPhoto(room, C);
    unwrap(g.startGame(room, A, 0, seededRng(1)));
    expect(game(room).ownerIds).toEqual([A, B, C]);
    expect(game(room).order).toHaveLength(3);
    for (const id of game(room).order) expect(selfieIds(room)).not.toContain(id);
    // Dave only has a selfie: he guesses, nobody can vote for him.
    expect(errorOf(g.castVote(room, A, 0, D, game(room).roundStartsAt))).toBe('INVALID_VOTE');
  });

  it('survives playAgain, unlike game photos', () => {
    const room = startedRoom([1, 1, 1, 0]);
    addSelfie(room, D, 'keep', 1000);
    const t = revealAll(room, playAllRounds(room, allCorrect, 1000));
    unwrap(g.playAgain(room, A, t));
    expect(room.photos).toEqual([]);
    expect(selfieIds(room)).toEqual([null, null, null, 'keep']);
    expect(g.roomImageBytes(room)).toBe(PNG_BYTES.byteLength);
  });

  it('goes away with the player: lobby leave, kick, disconnect timeout, and an in-game leave', () => {
    const room = makeRoom(FOUR);
    for (const p of room.players) addSelfie(room, p.id, `s-${p.name}`);
    addPhoto(room, B);
    expect(g.roomImageBytes(room)).toBe(5 * PNG_BYTES.byteLength);
    unwrap(g.leaveRoom(room, D, 1));
    expect(g.findImage(room, 's-Dave')).toBeUndefined();
    unwrap(g.kickPlayer(room, A, C, 2));
    expect(g.findImage(room, 's-Carol')).toBeUndefined();
    g.disconnectPlayer(room, B, 3);
    g.tick(room, 3 + room.timing.lobbyDropMs);
    expect(room.players.map((p) => p.id)).toEqual([A]);
    expect(g.findImage(room, 's-Bob')).toBeUndefined();
    expect(g.roomImageBytes(room)).toBe(PNG_BYTES.byteLength);

    // In game, leaving only disconnects (the seat stays) but the selfie goes right away.
    const started = startedRoom([1, 1, 1, 0]);
    addSelfie(started, D, 'in-game', 1000);
    unwrap(g.leaveRoom(started, D, 1001));
    expect(started.players.some((p) => p.id === D)).toBe(true);
    expect(g.findImage(started, 'in-game')).toBeUndefined();
  });

  it('a disconnected (not left) player keeps the selfie until dropped from the next lobby', () => {
    const room = startedRoom([1, 1, 1, 0]);
    addSelfie(room, D, 'leaver', 1000);
    addSelfie(room, A, 'stays', 1000);
    g.disconnectPlayer(room, D, 1001);
    const t = revealAll(room, playAllRounds(room, allCorrect, 1001));
    unwrap(g.playAgain(room, A, t));
    // A fresh lobby grace period, then Dave goes, and his selfie with him.
    expect(g.findImage(room, 'leaver')).toBeDefined();
    expect(g.tick(room, t + room.timing.lobbyDropMs - 1)).toBe(false);
    expect(g.tick(room, t + room.timing.lobbyDropMs)).toBe(true);
    expect(room.players.map((p) => p.id)).toEqual([A, B, C]);
    expect(g.findImage(room, 'leaver')).toBeUndefined();
    expect(selfieIds(room)).toEqual(['stays', null, null]);
    expect(g.roomImageBytes(room)).toBe(PNG_BYTES.byteLength);
  });

  it('findImage finds game photos and selfies; roomImageBytes counts both, inactive slots included', () => {
    const room = makeRoom(FOUR);
    const photo = addPhoto(room, A, 0);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 3 }));
    addPhoto(room, A, 2);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 1 }));
    const selfie = unwrap(g.setSelfie(room, B, newSelfie('big', Buffer.alloc(100, 1)), 0));
    expect(g.findImage(room, photo.id)).toBe(photo);
    expect(g.findImage(room, 'big')).toBe(selfie);
    expect(g.findImage(room, 'nope')).toBeUndefined();
    expect(g.roomImageBytes(room)).toBe(2 * PNG_BYTES.byteLength + 100);
  });
});
