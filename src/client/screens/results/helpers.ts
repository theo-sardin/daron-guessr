import type { AwardId, PhotoResult, PublicPlayer, RankingEntry, ResultsView } from '../../../shared/protocol';
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
};

export type AwardTone = 'sun' | 'sky' | 'mint' | 'lilac' | 'pink' | 'cream' | 'white';

export const AWARD_TONE: Record<AwardId, AwardTone> = {
  sherlock: 'sun',
  needsGlasses: 'sky',
  carbonCopy: 'mint',
  masterOfDisguise: 'lilac',
  doppelganger: 'pink',
  mostConfusing: 'white',
  biggestMixup: 'cream',
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
