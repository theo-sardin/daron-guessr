import { useEffect } from 'react';
import {
  ALL_VOTED_GRACE_MS,
  DEFAULT_SETTINGS,
  GAME_INTRO_MS,
  PHOTO_KINDS,
  ROUND_GAP_MS,
  THEME_KINDS,
  type PhotoKind,
  type PublicPlayer,
  type RoomView,
  type Theme,
  type VotingView,
} from '../../../shared/protocol';
import type { PreviewRegistry } from '../../dev/PreviewApp';
import { fakePhoto, fakePlayers, fakeView } from '../../dev/fixtures';
import { __devSetState, api, getState, useRoom } from '../../lib/store';
import { VotingScreen } from './VotingScreen';

/** Dev-only preview variants for this screen (see src/client/dev/PreviewApp.tsx). */

const LONG_NAMES = [
  'Théo',
  'Marie-Antoinette',
  'Jean-Christophe',
  'Paul',
  'Bartholomew',
  'Léa',
  'Hugo 🎸',
  'Inès la best',
  'Maximilien XIV',
  'Chloé',
  'Nico',
  'Sarah-Louise B.',
];

interface Opts {
  players?: number;
  me?: number;
  round?: number;
  total?: number;
  voteSeconds?: number;
  /** Ms until the round opens (positive = intro / transition still running). */
  startsIn?: number;
  /** Ms until the round closes; null = no timer. Defaults to a full timer from `startsIn`. */
  endsIn?: number | null;
  isMine?: boolean;
  myVote?: string | null;
  voted?: number[];
  kind?: PhotoKind;
  /** Game theme (drives the intro one-liner). Defaults to one that allows `kind`. */
  theme?: Theme;
  names?: string[];
  offline?: number[];
}

function makeView(o: Opts = {}): RoomView {
  const now = Date.now();
  const n = o.players ?? 5;
  const me = o.me ?? 1;
  const voteSeconds = o.voteSeconds ?? 20;
  let players: PublicPlayer[] = fakePlayers(n, { offline: o.offline });
  if (o.names) players = players.map((p, i) => ({ ...p, name: o.names![i] ?? p.name }));
  const endsIn = o.endsIn !== undefined ? o.endsIn : voteSeconds === 0 ? null : o.startsIn !== undefined ? o.startsIn + voteSeconds * 1000 : 20_000;
  const startsIn = o.startsIn ?? (endsIn === null ? -5000 : endsIn - voteSeconds * 1000);
  const startsAt = now + startsIn;
  const endsAt = endsIn === null ? null : now + endsIn;
  const round = o.round ?? 1;
  const kind = o.kind ?? 'daron';
  const theme = o.theme ?? themeFor(kind);
  const voting: VotingView = {
    round,
    totalRounds: o.total ?? 8,
    photo: fakePhoto(round + 3, kind),
    startsAt,
    endsAt,
    isMine: o.isMine ?? false,
    myVote: o.myVote ?? null,
    candidates: players.filter((p) => p.id !== players[me].id).map((p) => p.id),
    votedIds: (o.voted ?? []).map((i) => players[i].id),
  };
  return fakeView(players, me, { phase: 'voting', serverNow: now, settings: { ...DEFAULT_SETTINGS, voteSeconds, anonymousVotes: true, theme }, voting });
}

/** Narrowest theme that allows `kind`. */
function themeFor(kind: PhotoKind): Theme {
  const order: Theme[] = ['parents', 'childhood', 'pick', 'family', 'mix'];
  return order.find((th) => THEME_KINDS[th].includes(kind)) ?? 'mix';
}

const render = (view: RoomView | null) => (view ? <VotingScreen view={view} /> : null);

// ---------------------------------------------------------------------------
// "sim": a tiny fake server so the whole loop (votes, bots, locks, transitions) can be played.
// ---------------------------------------------------------------------------

const SIM_SECONDS = 12;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Kind of the photo shown in round `round` of the sim, cycling through `kinds`. */
const simKind = (kinds: readonly PhotoKind[], round: number): PhotoKind => kinds[round % kinds.length];

function Sim({ kinds }: { kinds: readonly PhotoKind[] }) {
  const view = useRoom();
  useEffect(() => {
    const orig = { vote: api.vote, skipRound: api.skipRound };
    const patchVoting = (patch: (v: VotingView, room: RoomView) => Partial<VotingView>) => {
      const room = getState().view;
      if (!room?.voting) return;
      __devSetState({ view: { ...room, serverNow: Date.now(), voting: { ...room.voting, ...patch(room.voting, room) } } });
    };
    const addVoter = (v: VotingView, room: RoomView, id: string) =>
      room.players.filter((p) => p.id === id || v.votedIds.includes(p.id)).map((p) => p.id);
    const close = (at: number) =>
      patchVoting((v) => {
        const round = (v.round + 1) % v.totalRounds;
        const startsAt = at + ROUND_GAP_MS;
        return {
          round,
          photo: fakePhoto(round + 3, simKind(kinds, round)),
          startsAt,
          endsAt: startsAt + SIM_SECONDS * 1000,
          isMine: round === 2,
          myVote: null,
          votedIds: [],
        };
      });

    api.vote = async (round, candidateId) => {
      await wait(200 + Math.random() * 300);
      const v = getState().view?.voting;
      if (!v || v.round !== round || (v.endsAt !== null && Date.now() >= v.endsAt)) return { ok: false as const, error: 'WRONG_PHASE' as const };
      patchVoting((cur, room) => ({ myVote: candidateId, votedIds: addVoter(cur, room, room.meId) }));
      return { ok: true as const };
    };
    api.skipRound = async (round) => {
      await wait(250);
      if (getState().view?.voting?.round === round) close(Date.now());
      return { ok: true as const };
    };

    const timer = window.setInterval(() => {
      const room = getState().view;
      const v = room?.voting;
      if (!room || !v) return;
      const now = Date.now();
      if (v.endsAt !== null && now >= v.endsAt + 300) return close(v.endsAt);
      if (now < v.startsAt) return;
      const waiting = room.players.filter((p) => p.connected && p.id !== room.meId && !v.votedIds.includes(p.id));
      if (waiting.length && Math.random() < 0.1) {
        const bot = waiting[Math.floor(Math.random() * waiting.length)];
        patchVoting((cur) => ({ votedIds: addVoter(cur, room, bot.id) }));
        return;
      }
      const everyone = room.players.filter((p) => p.connected).every((p) => v.votedIds.includes(p.id));
      if (everyone && (v.endsAt === null || v.endsAt > now + ALL_VOTED_GRACE_MS)) patchVoting(() => ({ endsAt: now + ALL_VOTED_GRACE_MS }));
    }, 250);

    return () => {
      window.clearInterval(timer);
      api.vote = orig.vote;
      api.skipRound = orig.skipRound;
    };
  }, [kinds]);
  return view ? <VotingScreen view={view} /> : null;
}

const previews: PreviewRegistry = {
  /** Round 0, 3-2-1 countdown. */
  intro: { view: () => makeView({ round: 0, startsIn: 3000 }), render },
  /** Full intro length, as the server sends it. */
  'intro-full': { view: () => makeView({ round: 0, startsIn: GAME_INTRO_MS, voteSeconds: 0, endsIn: null }), render },
  /** "Get ready!" held on screen (the self-timer hunting for focus), for screenshots. */
  'intro-ready': { view: () => makeView({ round: 0, startsIn: 60_000, voteSeconds: 30 }), render },
  /** Between two rounds, held on screen for screenshots. */
  'transition-hold': { view: () => makeView({ round: 3, startsIn: 60_000, kind: 'daronne' }), render },
  /** Last round's print, held on screen. */
  'transition-last': { view: () => makeView({ round: 7, startsIn: 60_000, kind: 'kid', theme: 'childhood' }), render },
  /** Between two rounds: "Photo 4/8" card. */
  transition: { view: () => makeView({ round: 3, startsIn: ROUND_GAP_MS, kind: 'daronne' }), render },
  /** Non-host, 20s left, 3 of 5 voted, not me yet. */
  vote: { view: () => makeView({ round: 1, endsIn: 20_000, voteSeconds: 30, voted: [0, 2, 4] }), render },
  /** Same with my vote cast. */
  voted: { view: () => makeView({ round: 1, endsIn: 14_000, voteSeconds: 30, voted: [0, 1, 2], myVote: 'p3' }), render },
  /** My own mom's photo: decoy vote. */
  mine: { view: () => makeView({ round: 4, endsIn: 17_000, voted: [3], isMine: true, kind: 'daronne' }), render },
  /** Own photo, decoy cast. */
  'mine-voted': { view: () => makeView({ round: 4, endsIn: 9_000, voted: [1, 3], isMine: true, myVote: 'p4' }), render },
  /** 4 seconds left, not voted: red pulse. */
  urgent: { view: () => makeView({ round: 6, endsIn: 4_000, voted: [0, 2, 3, 4] }), render },
  /** No timer, viewed by the host (skip button). */
  'no-timer': { view: () => makeView({ me: 0, round: 2, voteSeconds: 0, startsIn: -8000, endsIn: null, voted: [1, 3] }), render },
  /** 12 players, 11 candidates, long names, a couple offline. */
  many: {
    view: () =>
      makeView({ players: 12, me: 5, round: 17, total: 24, names: LONG_NAMES, voted: [0, 1, 3, 6, 7, 8, 10], offline: [9, 11], endsIn: 25_000, voteSeconds: 45 }),
    render,
  },
  /** 12 players on the host's screen with a vote. */
  'many-host': {
    view: () =>
      makeView({ players: 12, me: 0, round: 5, total: 24, names: LONG_NAMES, voted: [0, 2, 4, 5], myVote: 'p1', endsIn: 30_000, voteSeconds: 45 }),
    render,
  },
  /** Smallest game: 3 players, everybody voted (grace period). */
  three: { view: () => makeView({ players: 3, me: 2, round: 0, total: 5, voted: [0, 1, 2], myVote: 'p0', endsIn: ALL_VOTED_GRACE_MS }), render },
  /** Timer ran out, waiting for the server. */
  locked: { view: () => makeView({ round: 7, endsIn: -400, voted: [0, 1, 3], myVote: 'p2' }), render },
  /** Timer ran out without voting. */
  'locked-missed': { view: () => makeView({ round: 7, endsIn: -400, voted: [0, 3] }), render },
  /** Playable loop with a fake server and bots (host view). */
  sim: { view: () => makeView({ me: 0, round: 0, total: 5, startsIn: GAME_INTRO_MS, voteSeconds: SIM_SECONDS }), render: () => <Sim kinds={SIM_PARENTS} /> },
  /** Same loop, "Anything goes" theme: every round is a different kind. */
  'sim-mix': {
    view: () => makeView({ me: 0, round: 0, total: PHOTO_KINDS.length, startsIn: GAME_INTRO_MS, voteSeconds: SIM_SECONDS, theme: 'mix' }),
    render: () => <Sim kinds={PHOTO_KINDS} />,
  },

  // --- Other photo kinds / themes -------------------------------------------------------
  /** "Who is this as a kid?" (Mini me theme). */
  kid: { view: () => makeView({ round: 1, endsIn: 20_000, voteSeconds: 30, voted: [0, 2], kind: 'kid' }), render },
  /** "Who picked this picture?" (Who picked it? theme). */
  pick: { view: () => makeView({ round: 1, endsIn: 20_000, voteSeconds: 30, voted: [0, 2], myVote: 'p3', kind: 'pick' }), render },
  /** Friends & family theme: a sister. */
  sister: { view: () => makeView({ round: 2, endsIn: 18_000, voteSeconds: 30, voted: [4], kind: 'sister' }), render },
  /** Longest question in French ("C'est le ou la pote de qui ?"), 12 players. */
  friend: {
    view: () => makeView({ players: 12, me: 5, round: 3, total: 24, names: LONG_NAMES, voted: [0, 1], kind: 'friend', endsIn: 25_000, voteSeconds: 45 }),
    render,
  },
  /** Owner's banner on their kid photo. */
  'mine-kid': { view: () => makeView({ round: 4, endsIn: 17_000, voted: [3], isMine: true, kind: 'kid' }), render },
  /** Owner's banner on the picture they picked. */
  'mine-pick': { view: () => makeView({ round: 4, endsIn: 12_000, voted: [1, 3], isMine: true, myVote: 'p2', kind: 'pick' }), render },
  /** Owner's banner, longest French title ("C'est un·e pote à TOI !"). */
  'mine-friend': { view: () => makeView({ round: 4, endsIn: 17_000, voted: [3], isMine: true, kind: 'friend' }), render },
  /** Between two rounds, next photo is a kid photo. */
  'transition-kid': { view: () => makeView({ round: 2, startsIn: ROUND_GAP_MS, kind: 'kid' }), render },
  /** Between two rounds, next photo is someone's pick. */
  'transition-pick': { view: () => makeView({ round: 5, startsIn: ROUND_GAP_MS, kind: 'pick' }), render },
  /** Between two rounds, next photo is someone's partner (longest teaser). */
  'transition-partner': { view: () => makeView({ round: 1, startsIn: ROUND_GAP_MS, kind: 'partner', theme: 'family' }), render },
  /** Intro one-liner of each theme. */
  'intro-family': { view: () => makeView({ round: 0, startsIn: GAME_INTRO_MS, kind: 'sister', theme: 'family' }), render },
  'intro-childhood': { view: () => makeView({ round: 0, startsIn: GAME_INTRO_MS, kind: 'kid' }), render },
  'intro-pick': { view: () => makeView({ round: 0, startsIn: GAME_INTRO_MS, kind: 'pick' }), render },
  'intro-mix': { view: () => makeView({ round: 0, startsIn: GAME_INTRO_MS, kind: 'pet', theme: 'mix' }), render },
};

const SIM_PARENTS: readonly PhotoKind[] = ['daron', 'daronne', 'daron'];

export default previews;
