import {
  REVEAL_BARS_AT_MS,
  REVEAL_DRUMROLL_AT_MS,
  REVEAL_OWNER_AT_MS,
  type PhotoResult,
  type PublicPlayer,
} from '../../../shared/protocol';

/** Where we are in one photo's reveal timeline (driven by ms elapsed since `RevealView.startedAt`). */
export type Stage = 'intro' | 'photo' | 'bars' | 'drumroll' | 'owner';

const ORDER: Record<Stage, number> = { intro: 0, photo: 1, bars: 2, drumroll: 3, owner: 4 };

export function stageAt(elapsed: number): Stage {
  if (elapsed < 0) return 'intro';
  if (elapsed < REVEAL_BARS_AT_MS) return 'photo';
  if (elapsed < REVEAL_DRUMROLL_AT_MS) return 'bars';
  if (elapsed < REVEAL_OWNER_AT_MS) return 'drumroll';
  return 'owner';
}

export function reached(stage: Stage, min: Stage): boolean {
  return ORDER[stage] >= ORDER[min];
}

/** The host's "next" button unlocks here (see protocol). */
export const NEXT_ENABLED_AT_MS = REVEAL_OWNER_AT_MS + 800;
/** Personal "you got it / you missed" sound, a beat after the big reveal sound. */
export const PERSONAL_AT_MS = REVEAL_OWNER_AT_MS + 650;
/** After this, nothing on the timeline changes anymore: the frame loop can stop. */
export const SETTLED_AT_MS = NEXT_ENABLED_AT_MS + 200;

export interface Row {
  id: string;
  votes: number;
  /** Voter ids, or null when votes are anonymous. */
  voters: string[] | null;
}

/**
 * Rows of the vote chart: ONLY candidates present in the tally (so the owner never shows up
 * with a 0-vote row before the reveal), sorted by votes desc then join order.
 * `withOwner` appends the owner with 0 votes once they have been revealed.
 */
export function tallyRows(result: PhotoResult, joinOrder: Map<string, number>, withOwner: boolean): Row[] {
  const rows: Row[] = Object.entries(result.tally)
    .filter(([, votes]) => votes > 0)
    .map(([id, votes]) => ({ id, votes, voters: result.voters ? (result.voters[id] ?? []) : null }));
  if (withOwner && !rows.some((r) => r.id === result.ownerId)) {
    rows.push({ id: result.ownerId, votes: 0, voters: result.voters ? [] : null });
  }
  const order = (id: string) => joinOrder.get(id) ?? Number.MAX_SAFE_INTEGER;
  return rows.sort((a, b) => b.votes - a.votes || order(a.id) - order(b.id));
}

export type Outcome = 'noVotes' | 'everybody' | 'wrongMajority' | 'nobody' | 'onlyOne' | 'onlyOneNamed' | 'most' | 'close' | 'split';
export type StampKind = 'spotted' | 'hidden' | 'revealed';

export interface OutcomeInfo {
  outcome: Outcome;
  stamp: StampKind;
  /** wrongMajority: the player everybody wrongly picked. */
  wrongId?: string;
  /** onlyOneNamed: the only player who got it right (known only when votes are not anonymous). */
  soloId?: string;
}

/** Classifies a fully revealed photo result to pick a fitting caption and stamp. */
export function computeOutcome(result: PhotoResult, joinOrder: Map<string, number>): OutcomeInfo {
  const total = result.totalVotes;
  const correct = result.correctVotes;
  const stamp: StampKind = total > 0 && correct * 2 > total ? 'spotted' : total > 0 && correct === 0 ? 'hidden' : 'revealed';
  if (total === 0) return { outcome: 'noVotes', stamp };
  if (correct >= total) return { outcome: 'everybody', stamp };

  const order = (id: string) => joinOrder.get(id) ?? Number.MAX_SAFE_INTEGER;
  const wrong = Object.entries(result.tally)
    .filter(([id, v]) => id !== result.ownerId && v > 0)
    .sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]));
  const topWrong = wrong[0];

  if (topWrong && total >= 2 && topWrong[1] * 2 > total) return { outcome: 'wrongMajority', stamp, wrongId: topWrong[0] };
  if (correct === 0) return { outcome: 'nobody', stamp };
  if (correct === 1 && total >= 3) {
    const solo = result.voters?.[result.ownerId]?.[0];
    return solo ? { outcome: 'onlyOneNamed', stamp, soloId: solo } : { outcome: 'onlyOne', stamp };
  }
  if (correct * 2 > total) return { outcome: 'most', stamp };
  if (!topWrong || correct >= topWrong[1]) return { outcome: 'close', stamp };
  return { outcome: 'split', stamp };
}

/**
 * Players whose score goes up with this photo, as far as this client can know: everyone who
 * voted for the owner when votes are public, otherwise only the viewer (if they got it).
 */
export function pendingGainers(result: PhotoResult, meId: string): Set<string> {
  if (result.voters) return new Set(result.voters[result.ownerId] ?? []);
  if (result.myVote && result.myVote === result.ownerId && meId !== result.ownerId) return new Set([meId]);
  return new Set();
}

/** Fallback for an id that is not (or no longer) in the player list. */
export function playerOrGhost(byId: Map<string, PublicPlayer>, id: string): PublicPlayer {
  return (
    byId.get(id) ?? {
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
