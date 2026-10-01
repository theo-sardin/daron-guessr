import { DEFAULT_SETTINGS, type PhotoKind, type PhotoResult, type PublicPlayer, type RoomView, type Theme } from '../../../shared/protocol';
import type { PreviewRegistry } from '../../dev/PreviewApp';
import { fakePhoto, fakePlayers, fakePortrait, fakeView } from '../../dev/fixtures';
import { RevealScreen } from './RevealScreen';

/** Dev-only preview variants for this screen (see src/client/dev/PreviewApp.tsx). */

interface Opts {
  n?: number;
  players?: PublicPlayer[];
  /** Viewer index (player 0 is the host). */
  me: number;
  owner: number;
  /** Real votes: voter index -> candidate index (the owner's decoy goes in `decoy`). */
  votes: Record<number, number>;
  decoy?: number;
  /** ms since the reveal of this photo started (negative = intro still running). */
  ago: number;
  index?: number;
  total?: number;
  anonymous?: boolean;
  kind?: PhotoKind;
  theme?: Theme;
  scores?: number[];
  /** Blur game (settings.blur). */
  blur?: boolean;
  /** Points of the viewer when right (default 100). */
  points?: number;
  /** Give every player a selfie. */
  selfies?: boolean;
}

function reveal(o: Opts): RoomView {
  const base = o.players ?? fakePlayers(o.n ?? 5, { scores: o.scores });
  const players = o.selfies ? base.map((p, i) => ({ ...p, selfieUrl: fakePortrait(60 + i, i % 2 ? 'sister' : 'brother') })) : base;
  const id = (i: number) => players[i].id;
  const index = o.index ?? 2;
  const total = o.total ?? 10;
  const tally: Record<string, number> = {};
  const voters: Record<string, string[]> = {};
  let correct = 0;
  for (const [voterStr, cand] of Object.entries(o.votes)) {
    const voter = Number(voterStr);
    if (voter === o.owner) continue;
    tally[id(cand)] = (tally[id(cand)] ?? 0) + 1;
    (voters[id(cand)] ??= []).push(id(voter));
    if (cand === o.owner) correct++;
  }
  const totalVotes = Object.values(tally).reduce((a, b) => a + b, 0);
  const myVote = o.me === o.owner ? (o.decoy !== undefined ? id(o.decoy) : null) : o.votes[o.me] !== undefined ? id(o.votes[o.me]) : null;
  const current: PhotoResult = {
    index,
    photo: fakePhoto(index + 3, o.kind ?? (index % 2 ? 'daronne' : 'daron')),
    ownerId: id(o.owner),
    tally,
    voters: o.anonymous === false ? voters : null,
    totalVotes,
    correctVotes: correct,
    myVote,
    myPoints: o.me === o.owner ? undefined : myVote === id(o.owner) ? (o.points ?? 100) : 0,
  };
  return fakeView(players, o.me, {
    phase: 'reveal',
    settings: { ...DEFAULT_SETTINGS, anonymousVotes: o.anonymous !== false, theme: o.theme ?? DEFAULT_SETTINGS.theme, blur: o.blur ?? false },
    reveal: { index, total, startedAt: Date.now() - o.ago, current },
  });
}

const render = (v: RoomView | null) => (v ? <RevealScreen view={v} /> : null);
const SCORES = [200, 100, 300, 0, 100, 200, 0, 100, 400, 100, 0, 200];
const OWNER_AT = 6500;

const longPlayers = (): PublicPlayer[] =>
  fakePlayers(6, { scores: SCORES }).map((p, i) => ({
    ...p,
    name: ['Jean-Christophe', 'Marie-Antoinette', 'Bartholomew III', 'Kévin du 93 😎', 'Abdelkarim B.', 'Wolfgang Amadé'][i],
  }));

const previews: PreviewRegistry = {
  intro: {
    view: () => {
      const v = reveal({ me: 0, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 0, index: 0, total: 10 });
      return { ...v, reveal: v.reveal && { ...v.reveal, startedAt: Date.now() + 2500 } };
    },
    render,
  },
  photo: { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 300, scores: SCORES }), render },
  bars: { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 0 }, ago: 1500, scores: SCORES }), render },
  drumroll: { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 0 }, ago: 3800, scores: SCORES }), render },
  /** Starts just before the owner reveal: sounds + confetti fire live. */
  live: { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 0 }, ago: 4700, scores: SCORES }), render },
  'owner-right': { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 0 }, ago: OWNER_AT, scores: SCORES }), render },
  'owner-wrong': {
    // Majority on Paul (2) but it was Julie's (3). Viewer (host) said Paul.
    view: () => reveal({ me: 0, owner: 3, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, n: 6, ago: OWNER_AT, scores: SCORES }),
    render,
  },
  nobody: {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 1, 1: 0, 2: 0, 3: 1 }, ago: OWNER_AT, scores: SCORES, kind: 'daronne' }),
    render,
  },
  'nobody-live': {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 1, 1: 0, 2: 0, 3: 1 }, ago: 4900, scores: SCORES, kind: 'daronne' }),
    render,
  },
  everybody: {
    view: () => reveal({ me: 3, owner: 1, n: 6, votes: { 0: 1, 2: 1, 3: 1, 4: 1, 5: 1 }, ago: 4900, scores: SCORES }),
    render,
  },
  'zero-votes-owner': {
    view: () => reveal({ me: 2, owner: 3, votes: { 0: 1, 1: 0, 2: 0, 4: 1 }, ago: OWNER_AT, scores: SCORES }),
    render,
  },
  'no-votes': { view: () => reveal({ me: 1, owner: 3, votes: {}, ago: OWNER_AT, scores: SCORES }), render },
  'no-votes-bars': { view: () => reveal({ me: 1, owner: 3, votes: {}, ago: 1800, scores: SCORES }), render },
  'not-anonymous': {
    view: () =>
      reveal({
        me: 1,
        owner: 5,
        n: 8,
        anonymous: false,
        votes: { 0: 5, 1: 5, 2: 3, 3: 5, 4: 3, 6: 0, 7: 2 },
        ago: OWNER_AT,
        scores: SCORES,
        kind: 'daronne',
      }),
    render,
  },
  'not-anonymous-bars': {
    view: () =>
      reveal({ me: 1, owner: 5, n: 8, anonymous: false, votes: { 0: 5, 1: 5, 2: 3, 3: 5, 4: 3, 6: 0, 7: 2 }, ago: 2200, scores: SCORES }),
    render,
  },
  solo: {
    // Only one right answer, named because votes are public.
    view: () =>
      reveal({ me: 4, owner: 2, n: 6, anonymous: false, votes: { 0: 1, 1: 3, 3: 1, 4: 2, 5: 0 }, ago: OWNER_AT, scores: SCORES }),
    render,
  },
  mine: {
    view: () => reveal({ me: 2, owner: 2, decoy: 0, votes: { 0: 1, 1: 0, 3: 2, 4: 0 }, ago: OWNER_AT, scores: SCORES, kind: 'daronne' }),
    render,
  },
  'mine-proud': {
    view: () => reveal({ me: 2, owner: 2, decoy: 1, votes: { 0: 2, 1: 2, 3: 2, 4: 0 }, ago: OWNER_AT, scores: SCORES }),
    render,
  },
  'mine-bars': {
    // Owner's own screen before the reveal: must look like anyone else's.
    view: () => reveal({ me: 2, owner: 2, decoy: 0, votes: { 0: 1, 1: 0, 3: 2, 4: 0 }, ago: 2000, scores: SCORES }),
    render,
  },
  'no-vote': { view: () => reveal({ me: 4, owner: 1, votes: { 0: 1, 2: 1, 3: 0 }, ago: OWNER_AT, scores: SCORES }), render },
  last: {
    view: () => reveal({ me: 0, owner: 1, votes: { 0: 1, 2: 1, 3: 0, 4: 1 }, ago: OWNER_AT, index: 9, total: 10, scores: SCORES }),
    render,
  },
  'host-waiting': {
    view: () => reveal({ me: 0, owner: 1, votes: { 0: 1, 2: 1, 3: 0, 4: 1 }, ago: 3000, scores: SCORES }),
    render,
  },
  twelve: {
    view: () =>
      reveal({
        me: 5,
        owner: 7,
        n: 12,
        anonymous: false,
        votes: { 0: 7, 1: 2, 2: 3, 3: 4, 4: 5, 5: 6, 6: 7, 7: 8, 8: 9, 9: 10, 10: 11, 11: 1 },
        ago: OWNER_AT,
        index: 17,
        total: 24,
        scores: SCORES,
      }),
    render,
  },
  'twelve-anon': {
    view: () =>
      reveal({
        me: 3,
        owner: 7,
        n: 12,
        votes: { 0: 7, 1: 7, 2: 7, 3: 7, 4: 5, 5: 6, 6: 5, 8: 9, 9: 10, 10: 11, 11: 1 },
        ago: 2600,
        index: 5,
        total: 24,
        scores: SCORES,
      }),
    render,
  },
  'long-names': {
    view: () =>
      reveal({ players: longPlayers(), me: 3, owner: 1, votes: { 0: 2, 2: 1, 3: 2, 4: 5, 5: 1 }, ago: OWNER_AT, kind: 'daronne' }),
    render,
  },
  // Other kinds: every caption, stamp and card follows the photo's kind.
  /** Majority wrong on a childhood photo (longest captions). */
  kid: {
    view: () =>
      reveal({ me: 0, owner: 3, n: 6, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, ago: OWNER_AT, index: 0, kind: 'kid', theme: 'childhood', scores: SCORES }),
    render,
  },
  'kid-nobody': {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 1, 1: 0, 2: 0, 3: 1 }, ago: OWNER_AT, index: 1, kind: 'kid', theme: 'childhood', scores: SCORES }),
    render,
  },
  /** Everybody guessed who picked it. */
  pick: {
    view: () => reveal({ me: 3, owner: 1, n: 6, votes: { 0: 1, 2: 1, 3: 1, 4: 1, 5: 1 }, ago: OWNER_AT, index: 0, kind: 'pick', theme: 'pick', scores: SCORES }),
    render,
  },
  'pick-wrong': {
    view: () =>
      reveal({ me: 0, owner: 3, n: 6, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, ago: OWNER_AT, index: 1, kind: 'pick', theme: 'pick', scores: SCORES }),
    render,
  },
  sister: {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 1, 1: 0, 2: 0, 3: 1 }, ago: OWNER_AT, index: 0, kind: 'sister', theme: 'family', scores: SCORES }),
    render,
  },
  friend: {
    view: () =>
      reveal({ me: 0, owner: 3, n: 6, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, ago: OWNER_AT, index: 0, kind: 'friend', theme: 'family', scores: SCORES }),
    render,
  },
  /** Public votes, one right guesser named. */
  'grandpa-solo': {
    view: () =>
      reveal({ me: 4, owner: 2, n: 6, anonymous: false, votes: { 0: 1, 1: 3, 3: 1, 4: 2, 5: 0 }, ago: OWNER_AT, index: 0, kind: 'grandpa', theme: 'family', scores: SCORES }),
    render,
  },
  'pet-most': {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: OWNER_AT, index: 0, kind: 'pet', theme: 'family', scores: SCORES }),
    render,
  },
  /** The owner's own card for a childhood photo (most recognised them). */
  'mine-kid': {
    view: () => reveal({ me: 2, owner: 2, decoy: 1, votes: { 0: 2, 1: 2, 3: 2, 4: 0 }, ago: OWNER_AT, index: 0, kind: 'kid', theme: 'childhood', scores: SCORES }),
    render,
  },
  'mine-pick': {
    view: () => reveal({ me: 2, owner: 2, decoy: 0, votes: { 0: 1, 1: 0, 3: 2, 4: 0 }, ago: OWNER_AT, index: 0, kind: 'pick', theme: 'pick', scores: SCORES }),
    render,
  },
  'mine-partner': {
    view: () => reveal({ me: 2, owner: 2, decoy: 1, votes: { 0: 2, 1: 2, 3: 2, 4: 0 }, ago: OWNER_AT, index: 1, kind: 'partner', theme: 'family', scores: SCORES }),
    render,
  },
  /** Longest captions: long names in a childhood wrong-majority caption. */
  'long-names-kid': {
    view: () =>
      reveal({ players: longPlayers(), me: 3, owner: 0, votes: { 1: 2, 2: 1, 3: 1, 4: 1, 5: 3 }, ago: OWNER_AT, index: 0, kind: 'kid', theme: 'childhood' }),
    render,
  },
  // Mode-specific reveal scenes (see SCENE in kinds.ts). "-live" variants start just before the owner reveal.
  /** Parents: album page + the owner's selfie with the resemblance meter. */
  album: {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: OWNER_AT, kind: 'daronne', selfies: true, scores: SCORES }),
    render,
  },
  'album-live': {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 4900, kind: 'daron', selfies: true, scores: SCORES }),
    render,
  },
  /** The album page turning in. */
  'album-turn': { view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 250, kind: 'daronne', selfies: true }), render },
  /** Then vs now (kid). */
  'glowup-kid': {
    view: () => reveal({ me: 0, owner: 3, n: 6, votes: { 0: 3, 1: 2, 2: 3, 4: 3, 5: 1 }, ago: OWNER_AT, kind: 'kid', theme: 'childhood', selfies: true }),
    render,
  },
  /** "Who's that?" blur game: the viewer was right early (100 + 75 speed bonus), the blur gets wiped live. */
  'whois-blur-live': {
    view: () =>
      reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 4900, kind: 'me', theme: 'whois', blur: true, points: 175, selfies: true, anonymous: false, scores: SCORES }),
    render,
  },
  'whois-blur': {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: OWNER_AT, kind: 'me', theme: 'whois', blur: true, points: 175, selfies: true }),
    render,
  },
  /** Blur game before the reveal: the photo is still blurred. */
  'blur-bars': {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: 2000, kind: 'me', theme: 'whois', blur: true }),
    render,
  },
  /** Pick: detective board, suspects pinned with red string. */
  'board-bars': {
    view: () => reveal({ me: 0, owner: 3, n: 6, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, ago: 2000, kind: 'pick', theme: 'pick', selfies: true }),
    render,
  },
  'board-pick': {
    view: () => reveal({ me: 0, owner: 3, n: 6, votes: { 0: 2, 1: 2, 2: 1, 4: 2, 5: 3 }, ago: OWNER_AT, kind: 'pick', theme: 'pick', selfies: true }),
    render,
  },
  /** Camera roll: the owner had 0 votes and 4 suspects were pinned: the owner replaces the last one. */
  'board-roll': {
    view: () =>
      reveal({ me: 5, owner: 6, n: 8, votes: { 0: 1, 1: 2, 2: 3, 3: 4, 4: 1, 5: 2, 7: 5 }, ago: OWNER_AT, kind: 'roll', theme: 'roll', anonymous: false }),
    render,
  },
  /** Family tree doodle. */
  'tree-sister': {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 4, 1: 0, 2: 4, 3: 1 }, ago: OWNER_AT, kind: 'sister', theme: 'family', selfies: true }),
    render,
  },
  'tree-pet': {
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 2 }, ago: OWNER_AT, kind: 'pet', theme: 'family' }),
    render,
  },
  /** Teen crush poster with hearts. */
  'poster-crush': {
    view: () => reveal({ me: 3, owner: 1, n: 6, votes: { 0: 1, 2: 1, 3: 1, 4: 5, 5: 1 }, ago: OWNER_AT, kind: 'crush', theme: 'crush', selfies: true }),
    render,
  },
  'poster-live': {
    view: () => reveal({ me: 3, owner: 1, n: 6, votes: { 0: 1, 2: 1, 3: 1, 4: 5, 5: 1 }, ago: 4900, kind: 'crush', theme: 'crush', selfies: true }),
    render,
  },
  /** Body parts: the magnifier zooms in during the drum roll… */
  'lens-drumroll': {
    view: () => reveal({ me: 0, owner: 3, votes: { 0: 3, 1: 3, 2: 1, 4: 2 }, ago: 4300, kind: 'ear', theme: 'body', selfies: true }),
    render,
  },
  /** …and pulls back onto the owner's print. */
  'lens-ear': {
    view: () => reveal({ me: 0, owner: 3, votes: { 0: 3, 1: 3, 2: 1, 4: 2 }, ago: OWNER_AT, kind: 'ear', theme: 'body', selfies: true }),
    render,
  },
  'lens-hair': {
    view: () => reveal({ me: 2, owner: 4, votes: { 0: 1, 1: 0, 2: 0, 3: 1 }, ago: OWNER_AT, kind: 'hair', theme: 'body' }),
    render,
  },
  'first-photo': {
    // First photo after the intro: nobody has points yet.
    view: () => reveal({ me: 1, owner: 2, votes: { 0: 2, 1: 2, 3: 1, 4: 0 }, ago: OWNER_AT, index: 0 }),
    render,
  },
};

export default previews;
