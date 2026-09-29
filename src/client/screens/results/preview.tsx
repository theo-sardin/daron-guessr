import { PHOTO_KINDS, type PhotoKind } from '../../../shared/protocol';
import type { PreviewRegistry } from '../../dev/PreviewApp';
import { rankOf, resultsView, topCount } from './previewData';
import { ResultsScreen } from './ResultsScreen';

const LONG = { 1: 'Marie-Antoinette', 2: 'Jean-Christophe', 4: 'Maximilien-Henri' };

const has = (awards: { id: string }[], ...ids: string[]) => ids.every((id) => awards.some((a) => a.id === id));

/** Every kind, spread over players and slots (mix theme). */
const mixKind = (i: number, slot: number): PhotoKind => PHOTO_KINDS[(i * 3 + slot * 5) % PHOTO_KINDS.length];
const FAMILY: PhotoKind[] = ['sister', 'brother', 'friend', 'partner', 'pet', 'grandma', 'grandpa'];

const render = (view: Parameters<typeof ResultsScreen>[0]['view'] | null) => (view ? <ResultsScreen view={view} /> : null);

/** Dev-only preview variants for this screen (see src/client/dev/PreviewApp.tsx). */
const previews: PreviewRegistry = {
  /** 5 players, 10 photos, every award, viewer is the host. */
  default: {
    view: () => resultsView({ players: 5 }, (s) => s.results.awards.length === 7 && s.results.ranking.slice(0, 4).map((r) => r.rank).join() === '1,2,3,4' && rankOf(s, 'p0') === 2),
    render,
  },
  /** Two players tied first (long names). */
  tie: {
    view: () => resultsView({ players: 5, names: LONG }, (s) => topCount(s) === 2 && s.results.ranking[2].rank === 3),
    render,
  },
  /** One winner, two players tied second. */
  'tie-second': {
    view: () =>
      resultsView({ players: 6 }, (s) => topCount(s) === 1 && s.results.ranking[1].rank === 2 && s.results.ranking[2].rank === 2 && s.results.ranking[3].rank === 4),
    render,
  },
  /** 3 players, 4 photos, only a few awards. */
  small: {
    view: () =>
      resultsView(
        { players: 3, photos: (i) => (i === 1 ? 2 : 1) },
        (s) => topCount(s) === 1 && s.results.awards.length >= 2 && s.results.awards.length <= 4,
      ),
    render,
  },
  /** 12 players (two without photos), 20 photos, long names. */
  big: {
    view: () =>
      resultsView(
        { players: 12, photos: (i) => (i >= 10 ? 0 : 2), names: LONG, offline: [7] },
        (s) => topCount(s) === 1 && s.results.awards.length >= 6,
      ),
    render,
  },
  /** Viewer is not the host and finished last. */
  guest: {
    view: () =>
      resultsView(
        { players: 5 },
        (s) => {
          const r = s.results.ranking;
          const last = r[r.length - 1];
          return topCount(s) === 1 && last.playerId !== 'p0' && r[r.length - 2].rank !== last.rank;
        },
        (s) => Number(s.results.ranking[s.results.ranking.length - 1].playerId.slice(1)),
      ),
    render,
  },
  /** The viewer (host) won alone. */
  'me-wins': {
    view: () => resultsView({ players: 4, skill: (i) => (i === 0 ? 0.9 : 0.35) }, (s) => topCount(s) === 1 && rankOf(s, 'p0') === 1),
    render,
  },
  /** Viewer brought no photos and is a guest. */
  spectator: {
    view: () =>
      resultsView(
        { players: 6, photos: (i) => (i === 5 ? 0 : 2) },
        (s) => topCount(s) === 1,
        () => 5,
      ),
    render,
  },
  /** "Mini me" theme: one photo of each player as a kid, every award (flavored titles). */
  childhood: {
    view: () =>
      resultsView(
        { players: 6, theme: 'childhood' },
        (s) => topCount(s) === 1 && has(s.results.awards, 'carbonCopy', 'masterOfDisguise', 'doppelganger', 'biggestMixup') && rankOf(s, 'p0') > 1,
      ),
    render,
  },
  /** "Mini me" theme, the viewer won (winner line + "first" verdict flavored). */
  'childhood-me-wins': {
    view: () => resultsView({ players: 5, theme: 'childhood', skill: (i) => (i === 0 ? 0.95 : 0.3) }, (s) => topCount(s) === 1 && rankOf(s, 'p0') === 1),
    render,
  },
  /** "Who picked it?" theme: one picked picture each. */
  pick: {
    view: () =>
      resultsView(
        { players: 6, theme: 'pick', seed: 40 },
        (s) => topCount(s) === 1 && has(s.results.awards, 'sherlock', 'carbonCopy', 'masterOfDisguise', 'biggestMixup') && rankOf(s, 'p0') > 1,
      ),
    render,
  },
  /** "Friends & family" theme with 3 photos each (siblings, friends, partners, pets…). */
  family: {
    view: () =>
      resultsView(
        { players: 5, theme: 'family', photos: () => 3, kinds: (i, slot) => FAMILY[(i + slot * 2) % FAMILY.length] },
        (s) => topCount(s) === 1 && s.results.awards.length >= 6 && has(s.results.awards, 'biggestMixup'),
      ),
    render,
  },
  /** "Anything goes" theme: every kind of photo, 1 to 3 per player. */
  mix: {
    view: () =>
      resultsView(
        { players: 6, theme: 'mix', photos: (i) => 1 + (i % 3), kinds: mixKind },
        (s) => topCount(s) === 1 && s.results.awards.length === 7,
        () => 2,
      ),
    render,
  },
  /** Nobody scored: 12 players all tied first with 0 points. */
  zero: {
    view: () => resultsView({ players: 12, photos: (i) => (i < 4 ? 1 : 0), skill: () => 0 }, () => true),
    render,
  },
};

export default previews;
