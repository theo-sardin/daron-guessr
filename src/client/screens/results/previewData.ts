import {
  POINTS_PER_CORRECT,
  type Award,
  type ParentKind,
  type PhotoResult,
  type PublicPlayer,
  type RankingEntry,
  type ResultsView,
  type RoomView,
} from '../../../shared/protocol';
import { fakePhoto, fakePlayers, fakeView } from '../../dev/fixtures';
import { seeded } from '../../lib/util';

/**
 * Dev-only: simulates a whole game (photos, votes) and computes the results the same way
 * the server does, so previews show consistent rankings and awards.
 */
export interface SimOptions {
  players: number;
  seed: number;
  /** Photos per player index (default 2). */
  photos?: (i: number) => number;
  /** Probability that player i guesses right (default 0.2..0.8 spread). */
  skill?: (i: number) => number;
  /** Probability of not voting on a photo. */
  skip?: number;
  names?: Record<number, string>;
  offline?: number[];
}

interface Sim {
  players: PublicPlayer[];
  results: ResultsView;
  /** photo id -> voter id -> candidate id (owner decoys included). */
  votes: Record<string, Record<string, string>>;
}

export function simulate(o: SimOptions): Sim {
  const rand = seeded(o.seed);
  const players = fakePlayers(o.players, { offline: o.offline }).map((p, i) => ({ ...p, name: o.names?.[i] ?? p.name }));
  const photosOf = o.photos ?? (() => 2);
  const skill = o.skill ?? ((i: number) => 0.25 + ((i * 37) % 10) / 16);
  const owners = players.filter((_, i) => photosOf(i) > 0).map((p) => p.id);

  // Photos, shuffled.
  const list: { ownerId: string; kind: ParentKind; seed: number }[] = [];
  players.forEach((p, i) => {
    for (let s = 0; s < photosOf(i); s++) list.push({ ownerId: p.id, kind: s === 0 ? 'daron' : 'daronne', seed: i * 10 + s + o.seed });
  });
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }

  const votes: Sim['votes'] = {};
  const photos: PhotoResult[] = list.map((item, index) => {
    const photo = fakePhoto(item.seed, item.kind);
    const lookalike = owners.filter((id) => id !== item.ownerId)[Math.floor(rand() * (owners.length - 1))];
    const voters: Record<string, string[]> = {};
    const byVoter: Record<string, string> = (votes[photo.id] = {});
    players.forEach((v, vi) => {
      const candidates = owners.filter((id) => id !== v.id);
      if (v.id === item.ownerId) {
        // Decoy vote, never counted.
        const decoy = candidates[Math.floor(rand() * candidates.length)];
        if (decoy) byVoter[v.id] = decoy;
        return;
      }
      if (rand() < (o.skip ?? 0.08)) return;
      let pick: string;
      if (rand() < skill(vi) || candidates.length <= 1) pick = item.ownerId;
      else {
        const wrong = candidates.filter((id) => id !== item.ownerId);
        pick = wrong.includes(lookalike) && rand() < 0.5 ? lookalike : wrong[Math.floor(rand() * wrong.length)];
      }
      (voters[pick] ??= []).push(v.id);
      byVoter[v.id] = pick;
    });
    const tally = Object.fromEntries(Object.entries(voters).map(([id, vs]) => [id, vs.length]));
    const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);
    return {
      index,
      photo,
      ownerId: item.ownerId,
      tally,
      voters: null,
      totalVotes,
      correctVotes: tally[item.ownerId] ?? 0,
      myVote: null,
      // Keep the full voter lists around for award computation.
      _voters: voters,
    } as PhotoResult & { _voters: Record<string, string[]> };
  });

  // Stats & ranking
  const stats = players.map((p) => {
    let correct = 0;
    let guesses = 0;
    for (const ph of photos as Array<PhotoResult & { _voters: Record<string, string[]> }>) {
      for (const [cand, vs] of Object.entries(ph._voters)) {
        if (!vs.includes(p.id)) continue;
        guesses += 1;
        if (cand === ph.ownerId) correct += 1;
      }
    }
    return { playerId: p.id, correct, guesses, score: correct * POINTS_PER_CORRECT };
  });
  const sorted = [...stats].sort((a, b) => b.score - a.score);
  const ranking: RankingEntry[] = [];
  sorted.forEach((s, i) => {
    const prev = ranking[i - 1];
    ranking.push({ ...s, rank: prev && prev.score === s.score ? prev.rank : i + 1 });
  });

  const awards = computeAwards(stats, owners, photos as Array<PhotoResult & { _voters: Record<string, string[]> }>);
  const cleanPhotos = photos.map((p) => {
    const { _voters, ...rest } = p as PhotoResult & { _voters: Record<string, string[]> };
    void _voters;
    return rest;
  });
  const scored = players.map((p) => ({ ...p, score: stats.find((s) => s.playerId === p.id)?.score ?? 0 }));
  return { players: scored, results: { photos: cleanPhotos, ranking, awards }, votes };
}

function allBest<T>(items: readonly T[], cmp: (a: T, b: T) => number): T[] {
  let best: T[] = [];
  for (const item of items) {
    const c = best.length === 0 ? 1 : cmp(item, best[0]);
    if (c > 0) best = [item];
    else if (c === 0) best.push(item);
  }
  return best;
}

const same = (a: { playerId: string }[], b: { playerId: string }[]) =>
  a.length === b.length && a.every((x) => b.some((y) => y.playerId === x.playerId));

function computeAwards(
  stats: { playerId: string; correct: number; guesses: number }[],
  ownerIds: string[],
  photos: Array<PhotoResult & { _voters: Record<string, string[]> }>,
): Award[] {
  const awards: Award[] = [];
  const ids = (xs: { playerId: string }[]) => xs.map((x) => x.playerId);
  const sherlock = allBest(
    stats.filter((s) => s.correct >= 1),
    (a, b) => a.correct - b.correct,
  );
  if (sherlock.length) awards.push({ id: 'sherlock', playerIds: ids(sherlock), value: sherlock[0].correct, total: Math.max(...sherlock.map((s) => s.guesses)) });
  const glasses = allBest(
    stats.filter((s) => s.guesses >= 1),
    (a, b) => b.correct - a.correct,
  );
  if (glasses.length && !same(glasses, sherlock))
    awards.push({ id: 'needsGlasses', playerIds: ids(glasses), value: glasses[0].correct, total: Math.max(...glasses.map((s) => s.guesses)) });

  const owners = ownerIds.map((playerId) => {
    const o = { playerId, received: 0, correct: 0, wrongReceived: 0 };
    for (const p of photos) {
      if (p.ownerId === playerId) {
        o.received += p.totalVotes;
        o.correct += p.correctVotes;
      } else o.wrongReceived += p._voters[playerId]?.length ?? 0;
    }
    return o;
  });
  const eligible = owners.filter((o) => o.received >= 1);
  const shareCmp = (a: (typeof owners)[number], b: (typeof owners)[number]) => a.correct * b.received - b.correct * a.received;
  const pct = (o: (typeof owners)[number]) => Math.round((o.correct / o.received) * 100);
  const carbon = allBest(eligible, shareCmp);
  const carbonOk = carbon.length > 0 && carbon[0].correct > 0;
  if (carbonOk) awards.push({ id: 'carbonCopy', playerIds: ids(carbon), value: pct(carbon[0]), total: Math.max(...carbon.map((o) => o.received)) });
  const disguise = allBest(eligible, (a, b) => shareCmp(b, a));
  if (disguise.length && !same(disguise, carbonOk ? carbon : []))
    awards.push({ id: 'masterOfDisguise', playerIds: ids(disguise), value: pct(disguise[0]), total: Math.max(...disguise.map((o) => o.received)) });
  const dopp = allBest(
    owners.filter((o) => o.wrongReceived >= 2),
    (a, b) => a.wrongReceived - b.wrongReceived,
  );
  if (dopp.length) awards.push({ id: 'doppelganger', playerIds: ids(dopp), value: dopp[0].wrongReceived });

  const distinct = (p: (typeof photos)[number]) => Object.keys(p._voters).length;
  const confusing = allBest(
    photos.filter((p) => distinct(p) >= 3),
    (a, b) => distinct(a) - distinct(b) || b.correctVotes - a.correctVotes,
  );
  if (confusing.length) {
    const p = confusing[0];
    awards.push({ id: 'mostConfusing', playerIds: [p.ownerId], photoId: p.photo.id, value: distinct(p), total: p.totalVotes });
  }
  const mixups = photos.flatMap((p) =>
    Object.entries(p._voters)
      .filter(([cand, vs]) => cand !== p.ownerId && vs.length >= 2 && vs.length > p.correctVotes)
      .map(([cand, vs]) => ({ p, cand, votes: vs.length })),
  );
  const mix = allBest(mixups, (a, b) => a.votes - b.votes || a.votes - a.p.correctVotes - (b.votes - b.p.correctVotes));
  if (mix.length) {
    const { p, cand, votes } = mix[0];
    awards.push({ id: 'biggestMixup', playerIds: [p.ownerId], photoId: p.photo.id, otherPlayerId: cand, value: votes, total: p.totalVotes });
  }
  return awards;
}

/** Tries seeds until `accept` is happy (deterministic), then builds a results view for `me`. */
export function resultsView(
  opts: Omit<SimOptions, 'seed'> & { seed?: number },
  accept: (sim: Sim) => boolean,
  me: (sim: Sim) => number = () => 0,
): RoomView {
  let sim: Sim | null = null;
  const start = opts.seed ?? 1;
  for (let seed = start; seed < start + 3000; seed++) {
    const s = simulate({ ...opts, seed });
    if (accept(s)) {
      sim = s;
      break;
    }
  }
  sim ??= simulate({ ...opts, seed: start });
  const meIndex = me(sim);
  const meId = sim.players[meIndex].id;
  const votes = sim.votes;
  const results: ResultsView = { ...sim.results, photos: sim.results.photos.map((p) => ({ ...p, myVote: votes[p.photo.id]?.[meId] ?? null })) };
  return fakeView(sim.players, meIndex, { phase: 'results', results });
}

export const rankOf = (sim: Sim, id: string) => sim.results.ranking.find((r) => r.playerId === id)?.rank ?? 0;
export const topCount = (sim: Sim) => sim.results.ranking.filter((r) => r.rank === 1).length;
