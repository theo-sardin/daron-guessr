import { BODY_PARTS, type Award, type AwardId, type PhotoKind, type PhotoResult, type PublicPlayer, type RankingEntry, type ResultsView, type Theme } from '../../../shared/protocol';
import { hashString } from '../../lib/util';

/** A podium step: every player sharing one rank (ties stand together). */
export interface PodiumGroup {
  rank: number;
  entries: RankingEntry[];
}

/** Ranking sorted by rank then score (the server already sends it sorted; be defensive). */
export function sortedRanking(ranking: RankingEntry[]): RankingEntry[] {
  return [...ranking].sort((a, b) => a.rank - b.rank || b.score - a.score);
}

/** Up to three groups of players with rank <= 3, best first. */
export function podiumGroups(ranking: RankingEntry[]): PodiumGroup[] {
  const groups: PodiumGroup[] = [];
  for (const entry of sortedRanking(ranking)) {
    if (entry.rank > 3) break;
    const last = groups[groups.length - 1];
    if (last && last.rank === entry.rank) last.entries.push(entry);
    else groups.push({ rank: entry.rank, entries: [entry] });
  }
  return groups.slice(0, 3);
}

/** "Paul", "Paul & Julie", "Paul, Julie & Karim". */
export function joinNames(names: string[], and: string): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} ${and} ${names[names.length - 1]}`;
}

/** Stable seed for picking copy variants (same text on every client). */
export function seedOf(...parts: Array<string | number>): number {
  return hashString(parts.join('|'));
}

/** Identifies one finished game (photo ids are random per game). */
export function gameKey(code: string, res: ResultsView): string {
  return `${code}:${hashString(res.photos.map((p) => p.photo.id).join(','))}`;
}

const celebrated = new Set<string>();
const storageKey = (key: string) => `dg:celebrated:${key}`;

/** True when the podium celebration for this game already played on this tab (e.g. after a reload). */
export function wasCelebrated(key: string): boolean {
  if (celebrated.has(key)) return true;
  try {
    return sessionStorage.getItem(storageKey(key)) === '1';
  } catch {
    return false;
  }
}

/** Marks the celebration as played, so remounts / reloads stay quiet. */
export function markCelebrated(key: string) {
  celebrated.add(key);
  try {
    sessionStorage.setItem(storageKey(key), '1');
  } catch {
    // ignore (private mode…)
  }
}

export const AWARD_EMOJI: Record<AwardId, string> = {
  sherlock: '🕵️',
  needsGlasses: '👓',
  carbonCopy: '🧬',
  masterOfDisguise: '🥸',
  doppelganger: '👯',
  mostConfusing: '🌀',
  biggestMixup: '🔀',
  eagleEye: '🦅',
};

/**
 * Which set of copy fits the photos being talked about (see i18n/strings/results.ts): one per
 * mode — `parents` (only dads & moms), `childhood` (players as kids), `pick` (picked pictures),
 * `roll` (camera-roll roulette), `crush` (teen crushes), `whois` (photos of the players
 * themselves), `body` (body parts) — and `family` for everything else (siblings, friends, pets,
 * a mix of kinds…).
 */
export type Flavor = 'parents' | 'family' | 'childhood' | 'pick' | 'roll' | 'crush' | 'whois' | 'body';

const PARENT_KINDS: readonly PhotoKind[] = ['daron', 'daronne'];
const ONLY: Partial<Record<PhotoKind, Flavor>> = { kid: 'childhood', pick: 'pick', roll: 'roll', crush: 'crush', me: 'whois' };

export function flavorOfTheme(theme: Theme): Flavor {
  return theme === 'mix' ? 'family' : theme;
}

/** Flavor of a set of photos, from what they actually show (`fallback` when there are none). */
export function flavorOfKinds(kinds: readonly PhotoKind[], fallback: Flavor): Flavor {
  if (kinds.length === 0) return fallback;
  if (kinds.every((k) => PARENT_KINDS.includes(k))) return 'parents';
  if (kinds.every((k) => (BODY_PARTS as readonly PhotoKind[]).includes(k))) return 'body';
  const only = ONLY[kinds[0]];
  if (only && kinds.every((k) => k === kinds[0])) return only;
  return 'family';
}

/** Flavor of the whole game: what the photos show, else the theme it was played with. */
export function gameFlavor(photos: readonly PhotoResult[], theme: Theme): Flavor {
  return flavorOfKinds(
    photos.map((p) => p.photo.kind),
    flavorOfTheme(theme),
  );
}

/**
 * Flavor of one award. Awards about the winners' own photos (carbon copy, master of disguise)
 * follow what those photos show; the others follow the game.
 */
export function awardFlavor(award: Award, photos: readonly PhotoResult[], game: Flavor): Flavor {
  if (award.id !== 'carbonCopy' && award.id !== 'masterOfDisguise') return game;
  return flavorOfKinds(
    photos.filter((p) => award.playerIds.includes(p.ownerId)).map((p) => p.photo.kind),
    game,
  );
}

/** Flavor-specific twists on the award emojis (the title changes with the flavor, so does the emoji). */
const FLAVOR_EMOJI: Partial<Record<Flavor, Partial<Record<AwardId, string>>>> = {
  childhood: { carbonCopy: '👶', masterOfDisguise: '🦋' },
  pick: { sherlock: '🔮', carbonCopy: '📖', masterOfDisguise: '🃏' },
  roll: { sherlock: '📱', carbonCopy: '📖', masterOfDisguise: '🃏' },
  crush: { sherlock: '💘', needsGlasses: '🙈', carbonCopy: '💌', masterOfDisguise: '🤫', doppelganger: '💞' },
  whois: { sherlock: '🧐', carbonCopy: '🎯', masterOfDisguise: '🦋' },
  body: { sherlock: '🔬', carbonCopy: '🦄', masterOfDisguise: '🕶️', doppelganger: '🧍' },
};

/** Emoji of an award, with a few flavor-specific twists. */
export function awardEmoji(id: AwardId, flavor: Flavor): string {
  return FLAVOR_EMOJI[flavor]?.[id] ?? AWARD_EMOJI[id];
}

export type AwardTone = 'sun' | 'sky' | 'mint' | 'lilac' | 'pink' | 'cream' | 'white' | 'tangerine';

export const AWARD_TONE: Record<AwardId, AwardTone> = {
  sherlock: 'sun',
  needsGlasses: 'sky',
  carbonCopy: 'mint',
  masterOfDisguise: 'lilac',
  doppelganger: 'pink',
  mostConfusing: 'white',
  biggestMixup: 'cream',
  eagleEye: 'tangerine',
};

/** Share of correct votes, 0..1 (0 when nobody voted). */
export function correctShare(p: Pick<PhotoResult, 'correctVotes' | 'totalVotes'>): number {
  return p.totalVotes > 0 ? p.correctVotes / p.totalVotes : 0;
}

/** Badge color for a photo depending on how many people found it. */
export function shareTone(p: Pick<PhotoResult, 'correctVotes' | 'totalVotes'>): string {
  if (p.totalVotes === 0) return 'bg-grape-200 text-ink';
  const s = correctShare(p);
  if (s >= 0.5) return 'bg-mint text-ink';
  if (s > 0) return 'bg-sun text-ink';
  return 'bg-danger text-white';
}

/** "paul's mom" → "Paul's mom" (sentence start). */
export function capitalize(text: string): string {
  return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** The last player when they stand alone at the bottom (3+ players, not tied with the first): "the shame". */
export function shameOf(ranking: RankingEntry[]): string | null {
  if (ranking.length < 3) return null;
  const last = ranking[ranking.length - 1];
  const before = ranking[ranking.length - 2];
  if (last.rank === 1 || before.rank === last.rank) return null;
  return last.playerId;
}

/** Blur game: the speed bonus shows next to the scores (it is part of them). */
export function showsBonus(ranking: readonly RankingEntry[], blur: boolean): boolean {
  return blur || ranking.some((r) => r.bonus > 0);
}

/** Player lookup that never crashes on a player that left: falls back to a neutral ghost. */
export function playerOr(players: Map<string, PublicPlayer>, id: string): PublicPlayer {
  return (
    players.get(id) ?? {
      id,
      name: '???',
      avatar: '👻',
      color: '#b9a6ff',
      connected: false,
      isHost: false,
      ready: false,
      score: 0,
    }
  );
}

/** Small deterministic tilt in degrees for polaroids, from an id. */
export function tiltOf(id: string, max = 5): number {
  return ((hashString(id) % 1000) / 1000) * max * 2 - max;
}
