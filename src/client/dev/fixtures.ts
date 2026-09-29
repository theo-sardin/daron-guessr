import {
  AVATARS,
  DEFAULT_SETTINGS,
  PLAYER_COLORS,
  photoUrl,
  type PhotoKind,
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
export function fakePortrait(seed: number, kind: PhotoKind): string {
  if (kind === 'pick') return fakePick(seed);
  const r = seeded(seed * 7919 + PHOTO_KIND_SEED[kind]);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const skin = pick(SKIN);
  const hair = pick(HAIR);
  const bg = pick(BG);
  const masculine = kind === 'daron' || kind === 'brother' || kind === 'grandpa';
  const feminine = kind === 'daronne' || kind === 'sister' || kind === 'grandma';
  const kid = kind === 'kid';
  const glasses = !kid && r() > 0.6;
  // No moustaches (very 2010): some dads get a 90s cap instead.
  const cap = masculine && r() > 0.55;
  const capColor = pick(['#e63946', '#1d3557', '#2a9d8f', '#f4a261', '#ffffff']);
  const longHair = (feminine || kid) && r() > 0.25;
  const smile = r() > 0.3;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">
<rect width="400" height="480" fill="${bg}"/>
<rect y="330" width="400" height="150" fill="${pick(['#3d5a80', '#98c1d9', '#ee6c4d', '#293241', '#6d597a', '#b56576'])}"/>
${longHair ? `<ellipse cx="200" cy="260" rx="150" ry="190" fill="${hair}"/>` : ''}
<rect x="165" y="290" width="70" height="70" fill="${skin}"/>
<ellipse cx="200" cy="220" rx="110" ry="130" fill="${skin}"/>
<path d="M90 190 Q110 70 200 80 Q300 75 312 190 Q290 120 200 125 Q120 120 90 190Z" fill="${hair}"/>
<circle cx="160" cy="215" r="${kid ? 16 : 10}" fill="#1b1036"/><circle cx="240" cy="215" r="${kid ? 16 : 10}" fill="#1b1036"/>
${kid ? '<circle cx="135" cy="265" r="18" fill="#ff8fa3" opacity="0.6"/><circle cx="265" cy="265" r="18" fill="#ff8fa3" opacity="0.6"/>' : ''}
${glasses ? '<circle cx="160" cy="215" r="28" fill="none" stroke="#1b1036" stroke-width="6"/><circle cx="240" cy="215" r="28" fill="none" stroke="#1b1036" stroke-width="6"/><line x1="188" y1="215" x2="212" y2="215" stroke="#1b1036" stroke-width="6"/>' : ''}
${cap ? `<path d="M86 172 Q96 64 200 62 Q304 64 314 172 Z" fill="${capColor}" stroke="#1b1036" stroke-width="6"/><path d="M78 170 Q200 150 322 170 Q330 196 312 192 Q200 176 88 192 Q70 196 78 170 Z" fill="${capColor}" stroke="#1b1036" stroke-width="6"/><circle cx="200" cy="66" r="9" fill="#1b1036"/>` : ''}
<path d="${smile ? 'M165 295 Q200 325 235 295' : 'M170 305 L230 305'}" stroke="#7a2b2b" stroke-width="7" fill="none" stroke-linecap="round"/>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const PHOTO_KIND_SEED: Record<PhotoKind, number> = {
  daron: 1, daronne: 2, brother: 3, sister: 4, grandpa: 5, grandma: 6, friend: 7, partner: 8, pet: 9, kid: 10, pick: 11,
};

/** A "random picture someone picked": a little landscape with a sun and a caption. */
function fakePick(seed: number): string {
  const r = seeded(seed * 104729);
  const sky = BG[Math.floor(r() * BG.length)];
  const hill = ['#3ddc97', '#7bd389', '#2ec4b6', '#b388ff'][Math.floor(r() * 4)];
  const caption = ['MOOD', 'VIBES', 'MONDAY', 'LOL', 'MY PLACE'][Math.floor(r() * 5)];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 480">
<rect width="400" height="480" fill="${sky}"/>
<circle cx="${90 + Math.round(r() * 220)}" cy="120" r="55" fill="#ffd23f"/>
<path d="M0 360 Q100 260 200 340 T400 320 V480 H0Z" fill="${hill}"/>
<path d="M0 420 Q120 360 240 410 T400 400 V480 H0Z" fill="#1b1036" opacity="0.25"/>
<text x="200" y="455" font-family="Impact, sans-serif" font-size="56" text-anchor="middle" fill="#fff" stroke="#1b1036" stroke-width="4" paint-order="stroke">${caption}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function fakePhoto(seed: number, kind: PhotoKind): PhotoRef {
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
