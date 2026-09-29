import {
  AVATARS,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  photoUrl,
  type ParentKind,
  type PhotoRef,
  type PublicPlayer,
  type RoomView,
} from '../../shared/protocol';
import { seeded } from '../lib/util';

/**
 * Fake data for the dev-only preview pages (/__preview/...). Never imported by the
 * production bundle.
 */

export const FAKE_NAMES = ['Théo', 'Marie', 'Paul', 'Julie', 'Karim', 'Léa', 'Hugo', 'Inès', 'Maxime', 'Chloé', 'Nico', 'Sarah'];

export function fakePlayers(n: number, opts: { offline?: number[]; notReady?: number[]; scores?: number[] } = {}): PublicPlayer[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: FAKE_NAMES[i % FAKE_NAMES.length],
    avatar: AVATARS[(i * 5) % AVATARS.length],
    color: PLAYER_COLORS[i % PLAYER_COLORS.length],
    connected: !opts.offline?.includes(i),
    isHost: i === 0,
    ready: !opts.notReady?.includes(i),
    score: opts.scores?.[i] ?? 0,
  }));
}

const SKIN = ['#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffdbac', '#f5d0b0'];
const HAIR = ['#2b1b0e', '#5a3825', '#a0a0a0', '#d9c27a', '#1a1a1a', '#e8e8e8', '#7a3b1d'];
const BG = ['#a8d8ea', '#f6c6ea', '#fce38a', '#b5ead7', '#c7ceea', '#ffd3b6', '#dcedc1', '#ffaaa5'];

/**
 * A cartoon "parent portrait" as an SVG data URI, so layouts can be judged with
 * something photo-like. Deterministic per seed.
 */
export function fakePortrait(seed: number, kind: ParentKind): string {
  const r = seeded(seed * 7919 + (kind === 'daron' ? 1 : 2));
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const skin = pick(SKIN);
  const hair = pick(HAIR);
  const bg = pick(BG);
  const glasses = r() > 0.6;
  const mustache = kind === 'daron' && r() > 0.35;
  const longHair = kind === 'daronne' && r() > 0.25;
  const smile = r() > 0.3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">
<rect width="400" height="480" fill="${bg}"/>
<rect y="330" width="400" height="150" fill="${pick(['#3d5a80', '#98c1d9', '#ee6c4d', '#293241', '#6d597a', '#b56576'])}"/>
${longHair ? `<ellipse cx="200" cy="260" rx="150" ry="190" fill="${hair}"/>` : ''}
<rect x="165" y="290" width="70" height="70" fill="${skin}"/>
<ellipse cx="200" cy="220" rx="110" ry="130" fill="${skin}"/>
<path d="M90 190 Q110 70 200 80 Q300 75 312 190 Q290 120 200 125 Q120 120 90 190Z" fill="${hair}"/>
<circle cx="160" cy="215" r="10" fill="#1b1036"/><circle cx="240" cy="215" r="10" fill="#1b1036"/>
${glasses ? '<circle cx="160" cy="215" r="28" fill="none" stroke="#1b1036" stroke-width="6"/><circle cx="240" cy="215" r="28" fill="none" stroke="#1b1036" stroke-width="6"/><line x1="188" y1="215" x2="212" y2="215" stroke="#1b1036" stroke-width="6"/>' : ''}
${mustache ? `<path d="M200 272c-8-14-30-18-46-8-10 6-18 14-30 10 8 16 36 20 52 12 10-5 16-10 24-10s14 5 24 10c16 8 44 4 52-12-12 4-20-4-30-10-16-10-38-6-46 8z" fill="${hair}"/>` : ''}
<path d="${smile ? 'M165 295 Q200 325 235 295' : 'M170 305 L230 305'}" stroke="#7a2b2b" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function fakePhoto(seed: number, kind: ParentKind): PhotoRef {
  return { id: `photo${seed}`, url: fakePortrait(seed, kind), kind };
}

/** A lobby view for player `meIndex` among `players`. Override any field as needed. */
export function fakeView(players: PublicPlayer[], meIndex = 0, patch: Partial<RoomView> = {}): RoomView {
  return {
    code: 'BKXZ',
    phase: 'lobby',
    serverNow: Date.now(),
    meId: players[meIndex].id,
    hostId: players.find((p) => p.isHost)?.id ?? players[0].id,
    settings: { ...DEFAULT_SETTINGS },
    players,
    myPhotos: [],
    voting: null,
    reveal: null,
    results: null,
    ...patch,
  };
}

/** Real server photo URL shape, for code that parses it. */
export const samplePhotoUrl = photoUrl('BKXZ', 'abc');
