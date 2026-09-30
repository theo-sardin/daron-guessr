import { describe, expect, it } from 'vitest';
import { ALL_VOTED_GRACE_MS, MAX_PLAYERS, POINTS_PER_CORRECT, type RoomView } from '../shared/protocol';
import * as g from './game';
import { addPhoto, addPhotos, addSelfie, allCorrect, idOf, makeRoom, newPlayer, playAllRounds, revealAll, seededRng, unwrap } from './testUtils';
import { buildView, peekRoom } from './views';

const NAMES = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve'];
const [A, B, , , E] = NAMES.map(idOf);

/** Five players; Eve has no photos (guesser only). */
function lobbyRoom(): g.Room {
  const room = makeRoom(NAMES);
  addPhotos(room, [2, 1, 1, 1, 0]);
  return room;
}

function startedRoom(settings: Partial<g.Room['settings']> = {}): g.Room {
  const room = lobbyRoom();
  unwrap(g.updateSettings(room, A, settings));
  unwrap(g.startGame(room, A, 0, seededRng(11)));
  return room;
}

const viewsOf = (room: g.Room, now: number) => room.players.map((p) => buildView(room, p.id, now));
const others = (room: g.Room, viewerId: string) => room.photos.filter((ph) => ph.ownerId !== viewerId);
const game = (room: g.Room) => g.requireGame(room);
const owner = (room: g.Room) => g.gamePhoto(room, game(room).round).ownerId;

/** Blanks out what is legitimately personal in a voting view. */
function normalizeVoting(view: RoomView, ownerIds: string[]): RoomView {
  expect(view.voting).not.toBeNull();
  // Candidates are "every owner but me": put the viewer back to compare them.
  const me = ownerIds.includes(view.meId) ? [view.meId] : [];
  const candidates = [...view.voting!.candidates, ...me].sort();
  return { ...view, meId: '', myPhotos: [], voting: { ...view.voting!, candidates, myVote: null, isMine: false } };
}

const keys = (o: object) => Object.keys(o).sort();
const ROOM_VIEW_KEYS = ['code', 'hostId', 'meId', 'myPhotos', 'phase', 'players', 'results', 'reveal', 'serverNow', 'settings', 'voting'];
const PLAYER_KEYS = ['avatar', 'color', 'connected', 'id', 'isHost', 'name', 'ready', 'score'];
/** `selfieUrl` is optional: only there when the player has a selfie. */
const PLAYER_WITH_SELFIE_KEYS = [...PLAYER_KEYS, 'selfieUrl'].sort();
const PHOTO_REF_KEYS = ['id', 'kind', 'url'];
const VOTING_KEYS = ['blur', 'candidates', 'endsAt', 'isMine', 'myVote', 'photo', 'round', 'startsAt', 'totalRounds', 'votedIds'];
const REVEAL_KEYS = ['current', 'index', 'startedAt', 'total'];
const PHOTO_RESULT_KEYS = ['correctVotes', 'index', 'myVote', 'ownerId', 'photo', 'tally', 'totalVotes', 'voters'];

/**
 * Exact shape of a view: a new field (e.g. an `owner` under another name, or every vote)
 * cannot slip in unnoticed. Update these lists together with protocol.ts.
 */
function expectExactShape(view: RoomView): void {
  expect(keys(view)).toEqual(ROOM_VIEW_KEYS);
  expect(keys(view.settings)).toEqual(['anonymousVotes', 'blur', 'photosPerPlayer', 'theme', 'voteSeconds']);
  for (const p of view.players) {
    expect(keys(p)).toEqual(p.selfieUrl === undefined ? PLAYER_KEYS : PLAYER_WITH_SELFIE_KEYS);
    if (p.selfieUrl !== undefined) expect(p.selfieUrl).toMatch(new RegExp(`^/photos/${view.code}/[^/]+$`));
  }
  for (const ph of view.myPhotos) expect(keys(ph)).toEqual([...PHOTO_REF_KEYS, 'slot'].sort());
  if (view.voting) {
    expect(keys(view.voting)).toEqual(VOTING_KEYS);
    expect(keys(view.voting.photo)).toEqual(PHOTO_REF_KEYS);
  }
  const results = [...(view.reveal ? [view.reveal.current] : []), ...(view.results?.photos ?? [])];
  if (view.reveal) expect(keys(view.reveal)).toEqual(REVEAL_KEYS);
  if (view.results) expect(keys(view.results)).toEqual(['awards', 'photos', 'ranking']);
  for (const r of results) {
    // `myPoints` is left out for the photo's owner (their vote is a decoy).
    expect(keys(r)).toEqual(r.ownerId === view.meId ? PHOTO_RESULT_KEYS : [...PHOTO_RESULT_KEYS, 'myPoints'].sort());
    expect(keys(r.photo)).toEqual(PHOTO_REF_KEYS);
    for (const n of Object.values(r.tally)) expect(typeof n).toBe('number');
    if (r.voters) for (const ids of Object.values(r.voters)) expect(ids.every((id) => typeof id === 'string')).toBe(true);
  }
  for (const entry of view.results?.ranking ?? []) expect(keys(entry)).toEqual(['bonus', 'correct', 'guesses', 'playerId', 'rank', 'score']);
}

function expectIndistinguishable(room: g.Room, now: number): void {
  const [first, ...rest] = viewsOf(room, now).map((v) => normalizeVoting(v, game(room).ownerIds));
  for (const view of rest) expect(view).toEqual(first);
}

describe('lobby views', () => {
  it('never contain other players photos', () => {
    const room = lobbyRoom();
    for (const view of viewsOf(room, 5)) {
      const json = JSON.stringify(view);
      for (const photo of others(room, view.meId)) {
        expect(json).not.toContain(photo.id);
      }
      expect(view.myPhotos.map((ph) => ph.id)).toEqual(g.playerPhotos(room, view.meId).map((ph) => ph.id));
      expect(view.voting).toBeNull();
      expect(view.reveal).toBeNull();
      expect(view.results).toBeNull();
      expectExactShape(view);
    }
  });

  it('exposes readiness, host, settings and server time', () => {
    const room = lobbyRoom();
    const view = buildView(room, B, 1234);
    expect(view).toMatchObject({ code: 'ABCD', phase: 'lobby', serverNow: 1234, meId: B, hostId: A });
    expect(view.players.map((p) => [p.name, p.ready, p.isHost, p.score])).toEqual([
      ['Alice', true, true, 0],
      ['Bob', true, false, 0],
      ['Carol', true, false, 0],
      ['Dave', true, false, 0],
      ['Eve', false, false, 0],
    ]);
    expect(view.myPhotos).toEqual([{ id: room.photos[2].id, url: `/photos/ABCD/${room.photos[2].id}`, kind: 'daron', slot: 0 }]);
    const json = JSON.stringify(view);
    for (const p of room.players) expect(json).not.toContain(p.token);
  });
});

describe('voting views', () => {
  it('are identical for every viewer except personal fields, at every step of every round', () => {
    const room = startedRoom({ voteSeconds: 0 });
    while (room.phase === 'voting') {
      const round = game(room).round;
      const t = game(room).roundStartsAt;
      expectIndistinguishable(room, t);
      const photoOwner = owner(room);
      // Vote one by one (the owner in the middle), checking after each vote.
      for (const [i, p] of room.players.entries()) {
        const candidates = game(room).ownerIds.filter((id) => id !== p.id);
        unwrap(g.castVote(room, p.id, round, candidates[i % candidates.length], t + i));
        expectIndistinguishable(room, t + i);
      }
      for (const view of viewsOf(room, t)) {
        expectExactShape(view);
        expect(view.voting!.isMine).toBe(view.meId === photoOwner);
        expect(view.voting!.votedIds).toEqual(room.players.map((p) => p.id));
        const json = JSON.stringify(view);
        expect(json).not.toContain('ownerId');
        // Only the current photo and the viewer's own photos: no URL of what is still to come.
        const current = g.gamePhoto(room, round);
        for (const photo of room.photos) {
          if (photo.id !== current.id && photo.ownerId !== view.meId) expect(json).not.toContain(photo.id);
        }
        // No score before the reveal, even after rounds with correct votes closed.
        expect(view.players.every((p) => p.score === 0)).toBe(true);
      }
      g.tick(room, game(room).roundCloseAt!);
    }
  });

  it('do not depend on who owns the current photo (for a viewer who does not own it)', () => {
    // Two rooms identical except for the owner of the photo on screen.
    const room1 = startedRoom();
    const room2 = structuredClone(room1);
    const t = game(room1).roundStartsAt;
    const owner1 = owner(room1);
    const others = game(room1).ownerIds.filter((id) => id !== owner1);
    const swap = others[0];
    g.gamePhoto(room2, 0).ownerId = swap;
    g.gamePhoto(room2, game(room2).order.indexOf(room1.photos.find((ph) => ph.ownerId === swap)!.id)).ownerId = owner1;
    const viewers = room1.players.map((p) => p.id).filter((id) => id !== owner1 && id !== swap);
    const expectSame = () => {
      for (const viewer of viewers) {
        const v1 = buildView(room1, viewer, t);
        const v2 = buildView(room2, viewer, t);
        // Own photos are personal (and legitimately differ if the viewer owns a swapped one).
        expect({ ...v2, myPhotos: [] }).toEqual({ ...v1, myPhotos: [] });
      }
    };
    expectSame();
    // Same votes in both rooms (the owners' decoys included).
    for (const [i, p] of room1.players.entries()) {
      const candidates = game(room1).ownerIds.filter((id) => id !== p.id);
      for (const room of [room1, room2]) unwrap(g.castVote(room, p.id, 0, candidates[i % candidates.length], t + i));
      expectSame();
    }
  });

  it('only contain the viewer own vote, and vote changes are invisible to others', () => {
    const room = startedRoom();
    const t = game(room).roundStartsAt;
    const photoOwner = owner(room);
    const [voter, watcher] = room.players.filter((p) => p.id !== photoOwner).map((p) => p.id);
    const targets = game(room).ownerIds.filter((id) => id !== voter);
    unwrap(g.castVote(room, voter, 0, targets[0], t));
    const before = buildView(room, watcher, t);
    unwrap(g.castVote(room, voter, 0, targets[1], t + 1));
    const after = buildView(room, watcher, t);
    expect(after).toEqual(before);
    expect(after.voting!.myVote).toBeNull();
    expect(after.voting!.votedIds).toEqual([voter]);
    expect(buildView(room, voter, t).voting!.myVote).toBe(targets[1]);
  });

  it('hand out the effective close time', () => {
    const room = startedRoom({ voteSeconds: 30 });
    const t = game(room).roundStartsAt;
    expect(buildView(room, B, t).voting).toMatchObject({ startsAt: t, endsAt: t + 30_000, round: 0, totalRounds: 5 });
    for (const p of room.players) {
      const candidate = p.id === owner(room) ? game(room).ownerIds.find((id) => id !== p.id)! : owner(room);
      unwrap(g.castVote(room, p.id, 0, candidate, t + 2000));
    }
    for (const view of viewsOf(room, t + 2000)) expect(view.voting!.endsAt).toBe(t + 2000 + ALL_VOTED_GRACE_MS);

    const noTimer = startedRoom({ voteSeconds: 0 });
    expect(buildView(noTimer, B, 0).voting!.endsAt).toBeNull();
  });

  it('list every photo owner but the viewer as candidates', () => {
    const room = startedRoom();
    const owners = [A, idOf('Bob'), idOf('Carol'), idOf('Dave')];
    expect(buildView(room, E, 0).voting!.candidates).toEqual(owners);
    expect(buildView(room, B, 0).voting!.candidates).toEqual(owners.filter((id) => id !== B));
  });
});

/** Everybody votes: non-owners for the real owner when `(index + voter) % 2 === 0`, else for someone else. */
function playMixed(room: g.Room): void {
  while (room.phase === 'voting') {
    const round = game(room).round;
    const t = game(room).roundStartsAt;
    const photoOwner = owner(room);
    room.players.forEach((p, i) => {
      const candidates = game(room).ownerIds.filter((id) => id !== p.id);
      const wrong = candidates.find((id) => id !== photoOwner)!;
      const pick = p.id !== photoOwner && (round + i) % 2 === 0 ? photoOwner : wrong;
      unwrap(g.castVote(room, p.id, round, pick, t));
    });
    unwrap(g.skipRound(room, A, round, t + 1));
  }
}

describe('reveal and results views', () => {
  for (const anonymousVotes of [true, false]) {
    it(`reveal only the current photo owner (anonymousVotes: ${anonymousVotes})`, () => {
      const room = startedRoom({ anonymousVotes });
      playMixed(room);
      expect(room.phase).toBe('reveal');
      while (room.phase === 'reveal') {
        const { index, startedAt } = game(room).reveal!;
        const current = g.gamePhoto(room, index);
        const stats = g.playerStats(room, index);
        for (const view of viewsOf(room, startedAt)) {
          const json = JSON.stringify(view);
          expect(view.reveal!.current.ownerId).toBe(current.ownerId);
          expect(view.reveal!.current.photo.id).toBe(current.id);
          expect(json.match(/"ownerId"/g)).toHaveLength(1);
          for (const photo of room.photos) {
            if (photo.id !== current.id && photo.ownerId !== view.meId) expect(json).not.toContain(photo.id);
          }
          const voters = view.reveal!.current.voters;
          if (anonymousVotes) expect(voters).toBeNull();
          else expect(Object.values(voters!).flat().length).toBe(view.reveal!.current.totalVotes);
          expect(view.reveal!.current.myVote).toBe(game(room).votes[index].get(view.meId)?.candidateId ?? null);
          expectExactShape(view);
          // Anonymous: scores stay frozen during the reveal, or their changes would show who voted right.
          expect(view.players.map((p) => p.score)).toEqual(anonymousVotes ? stats.map(() => 0) : stats.map((s) => s.score));
        }
        unwrap(g.nextReveal(room, A, index, startedAt + room.timing.revealOwnerAtMs));
      }

      for (const view of viewsOf(room, 0)) {
        const results = view.results!;
        expect(results.photos.map((ph) => ph.ownerId)).toEqual(game(room).order.map((_, i) => g.gamePhoto(room, i).ownerId));
        for (const photo of results.photos) {
          expect(photo.voters === null).toBe(anonymousVotes);
          expect(photo.totalVotes).toBe(Object.values(photo.tally).reduce((a, b) => a + b, 0));
          expect(Object.values(photo.tally).every((n) => n >= 1)).toBe(true);
          // Decoys are never counted: the owner never appears as a voter.
          if (photo.voters) expect(Object.values(photo.voters).flat()).not.toContain(photo.ownerId);
        }
        expect(results.ranking).toHaveLength(NAMES.length);
        expectExactShape(view);
        expect(view.players.map((p) => p.score)).toEqual(g.playerStats(room, 5).map((s) => s.score));
      }
    });
  }

  it('gives the final scores, ranking and awards in results', () => {
    const room = startedRoom();
    playMixed(room);
    while (room.phase === 'reveal') {
      const { index, startedAt } = game(room).reveal!;
      unwrap(g.nextReveal(room, A, index, startedAt + room.timing.revealOwnerAtMs));
    }
    const view = buildView(room, E, 0);
    expect(view.results!.ranking[0].rank).toBe(1);
    expect(view.results!.ranking.every((r) => r.score === r.correct * POINTS_PER_CORRECT)).toBe(true);
    expect(view.results!.awards).toEqual(g.computeAwards(room));
    expect(view.results!.photos).toHaveLength(5);
  });
});

describe('themes and photos per player in views', () => {
  it('count only active slots for readiness, while myPhotos keeps every slot', () => {
    const room = makeRoom(NAMES);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 3 }));
    addPhotos(room, [3, 0, 1, 1, 0]);
    addPhoto(room, B, 2);
    const ready = () => buildView(room, E, 0).players.map((p) => p.ready);
    expect(ready()).toEqual([true, true, true, true, false]);

    unwrap(g.updateSettings(room, A, { photosPerPlayer: 2 }));
    expect(ready()).toEqual([true, false, true, true, false]);
    const alice = buildView(room, A, 0);
    expect(alice.settings).toEqual({ voteSeconds: 30, anonymousVotes: true, theme: 'parents', photosPerPlayer: 2, blur: false });
    expect(alice.myPhotos.map((ph) => [ph.slot, ph.kind])).toEqual([[0, 'daron'], [1, 'daronne'], [2, 'daron']]);
    expect(buildView(room, B, 0).myPhotos.map((ph) => ph.slot)).toEqual([2]);

    // A theme switch shows up in the settings and in the relabeled photos.
    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    const after = buildView(room, A, 0);
    expect(after.settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 1 });
    expect(after.myPhotos.map((ph) => [ph.slot, ph.kind])).toEqual([[0, 'kid'], [1, 'kid'], [2, 'kid']]);
    expect(ready()).toEqual([true, false, true, true, false]);
    for (const view of viewsOf(room, 0)) expectExactShape(view);
  });

  it('never leak inactive photos to other players, and never play them', () => {
    const room = makeRoom(NAMES);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 3, voteSeconds: 0 }));
    addPhotos(room, [3, 3, 3, 1, 0]);
    unwrap(g.updateSettings(room, A, { photosPerPlayer: 1 }));
    const inactive = room.photos.filter((ph) => ph.slot > 0);
    unwrap(g.startGame(room, A, 0, seededRng(4)));
    expect(game(room).order).toHaveLength(4);
    const check = () => {
      for (const view of viewsOf(room, 0)) {
        const json = JSON.stringify(view);
        for (const ph of inactive) expect(json.includes(ph.id)).toBe(ph.ownerId === view.meId);
      }
    };
    while (room.phase === 'voting') {
      check();
      expect(g.gamePhoto(room, game(room).round).slot).toBe(0);
      unwrap(g.skipRound(room, A, game(room).round, game(room).roundStartsAt));
    }
    check();
    revealAll(room, 0);
    check();
    expect(buildView(room, E, 0).results!.photos).toHaveLength(4);
  });

  it('carry each photo kind through a childhood game', () => {
    const room = makeRoom(NAMES.slice(0, 4));
    unwrap(g.updateSettings(room, A, { theme: 'childhood' }));
    addPhotos(room, [1, 1, 1, 1]);
    unwrap(g.startGame(room, A, 0, seededRng(3)));
    expect(buildView(room, B, 0).voting).toMatchObject({ totalRounds: 4, photo: { kind: 'kid' } });
    const reveal = playAllRounds(room, allCorrect, 0);
    expect(buildView(room, B, reveal).reveal!.current.photo.kind).toBe('kid');
    revealAll(room, reveal);
    const results = buildView(room, B, 0).results!;
    expect(results.photos.map((ph) => ph.photo.kind)).toEqual(['kid', 'kid', 'kid', 'kid']);
    expect(results.photos.every((ph) => ph.correctVotes === 3)).toBe(true);
    unwrap(g.playAgain(room, A, 0));
    const lobby = buildView(room, B, 0);
    expect(lobby.settings).toMatchObject({ theme: 'childhood', photosPerPlayer: 1 });
    expect(lobby.myPhotos).toEqual([]);
    expect(lobby.players.every((p) => !p.ready)).toBe(true);
  });
});

describe('selfies in views', () => {
  const selfieUrls = (view: RoomView) => view.players.map((p) => p.selfieUrl ?? null);
  const EXPECTED = ['/photos/ABCD/selfieA', null, null, null, '/photos/ABCD/selfieE'];

  /** Every viewer gets the same public selfie URLs, and no game photo is ever a selfie. */
  function expectPublicSelfies(room: g.Room, now: number, expected: (string | null)[]): void {
    for (const view of viewsOf(room, now)) {
      expectExactShape(view);
      expect(selfieUrls(view)).toEqual(expected);
      // No key at all (not `undefined`) without a selfie.
      expect(view.players.filter((p) => 'selfieUrl' in p).length).toBe(expected.filter(Boolean).length);
      const gamePhotoIds = [
        ...view.myPhotos.map((ph) => ph.id),
        ...(view.voting ? [view.voting.photo.id] : []),
        ...(view.reveal ? [view.reveal.current.photo.id] : []),
        ...(view.results?.photos.map((r) => r.photo.id) ?? []),
      ];
      for (const id of gamePhotoIds) expect(['selfieA', 'selfieE']).not.toContain(id);
    }
  }

  it('are public: every viewer sees every selfie in every phase, and they survive playAgain', () => {
    const room = lobbyRoom();
    addSelfie(room, A, 'selfieA');
    addSelfie(room, E, 'selfieE');
    expectPublicSelfies(room, 0, EXPECTED);
    // Eve only has a selfie: still not ready.
    expect(buildView(room, B, 0).players.map((p) => p.ready)).toEqual([true, true, true, true, false]);

    unwrap(g.startGame(room, A, 0, seededRng(11)));
    const t0 = game(room).roundStartsAt;
    expectPublicSelfies(room, t0, EXPECTED);
    // Selfies are the same for everybody, so voting views stay indistinguishable.
    expectIndistinguishable(room, t0);
    expect(buildView(room, B, t0).voting!.candidates).not.toContain(E);

    let t = playAllRounds(room, allCorrect, t0);
    expect(room.phase).toBe('reveal');
    expectPublicSelfies(room, t, EXPECTED);
    t = revealAll(room, t);
    expect(room.phase).toBe('results');
    expectPublicSelfies(room, t, EXPECTED);

    unwrap(g.playAgain(room, A, t));
    expectPublicSelfies(room, t, EXPECTED);
    unwrap(g.removeSelfie(room, A));
    expectPublicSelfies(room, t, [null, null, null, null, '/photos/ABCD/selfieE']);
  });

  it('follow a replaced selfie and forget a removed player', () => {
    const room = lobbyRoom();
    addSelfie(room, A, 'oldSelfie');
    addSelfie(room, A, 'selfieA');
    addSelfie(room, E, 'selfieE');
    expectPublicSelfies(room, 0, EXPECTED);
    unwrap(g.leaveRoom(room, E, 1));
    expectPublicSelfies(room, 1, EXPECTED.slice(0, 4));
    for (const view of viewsOf(room, 1)) expect(JSON.stringify(view)).not.toMatch(/oldSelfie|selfieE/);
  });
});

describe('peekRoom', () => {
  it('summarizes a room for the join screen', () => {
    const room = lobbyRoom();
    expect(peekRoom(room)).toEqual({
      code: 'ABCD',
      exists: true,
      phase: 'lobby',
      playerCount: 5,
      joinable: true,
      hostName: 'Alice',
      hostAvatar: '🐸',
    });
    unwrap(g.startGame(room, A, 0, seededRng(1)));
    expect(peekRoom(room)).toMatchObject({ phase: 'voting', joinable: false });

    const full = makeRoom(['P0']);
    for (let i = 1; i < MAX_PLAYERS; i++) unwrap(g.joinRoom(full, newPlayer(`P${i}`), i));
    expect(peekRoom(full).joinable).toBe(false);
  });

  it('never gives a selfie away: the peek is public, selfies are for the room only', () => {
    const room = lobbyRoom();
    addSelfie(room, A, 'hostSelfie');
    addSelfie(room, B, 'bobSelfie');
    const peek = peekRoom(room);
    expect(Object.keys(peek).sort()).toEqual(['code', 'exists', 'hostAvatar', 'hostName', 'joinable', 'phase', 'playerCount']);
    expect(JSON.stringify(peek)).not.toMatch(/Selfie|photos/);
  });
});
