import { useEffect, useState } from 'react';
import { AVATARS, PLAYER_COLORS, type MyPhoto, type PublicPlayer, type RoomView } from '../../../shared/protocol';
import type { PreviewRegistry } from '../../dev/PreviewApp';
import { fakePhoto, fakePlayers, fakeView } from '../../dev/fixtures';
import { __devSetState } from '../../lib/store';
import { LobbyScreen } from './LobbyScreen';

/** Dev-only preview variants for this screen (see src/client/dev/PreviewApp.tsx). */

function myPhoto(seed: number, slot: 0 | 1, kind: MyPhoto['kind']): MyPhoto {
  return { ...fakePhoto(seed, kind), slot };
}

const LONG_NAMES = ['Maximilienne-Ana', 'Jean-Christophe', 'WWWWWWWWWWWWWWWW', 'Bartholomew 🦖🦖'];

function fullRoom(): PublicPlayer[] {
  const players = fakePlayers(12, { offline: [4, 9], notReady: [2, 4, 7, 11] });
  players[1].name = LONG_NAMES[0];
  players[3].name = LONG_NAMES[1];
  players[6].name = LONG_NAMES[2];
  players[10].name = LONG_NAMES[3];
  return players;
}

const render = (view: RoomView | null) => (view ? <LobbyScreen view={view} /> : null);

type Step = (v: RoomView) => RoomView;

/** Plays a scripted sequence of room updates to check the live animations and sounds. */
function Live({ initial, steps, everyMs = 1600 }: { initial: RoomView; steps: Step[]; everyMs?: number }) {
  const [view, setView] = useState(initial);
  useEffect(() => {
    let i = 0;
    let current = initial;
    const id = window.setInterval(() => {
      if (i >= steps.length) {
        window.clearInterval(id);
        return;
      }
      current = { ...steps[i](current), serverNow: Date.now() };
      i++;
      __devSetState({ view: current });
      setView(current);
    }, everyMs);
    return () => window.clearInterval(id);
  }, [initial, steps, everyMs]);
  return <LobbyScreen view={view} />;
}

const newcomer = (i: number, name: string, ready = false): PublicPlayer => ({
  id: `n${i}`,
  name,
  avatar: AVATARS[(i * 7 + 3) % AVATARS.length],
  color: PLAYER_COLORS[(i + 3) % PLAYER_COLORS.length],
  connected: true,
  isHost: false,
  ready,
  score: 0,
});

const withPlayer =
  (p: PublicPlayer): Step =>
  (v) => ({ ...v, players: [...v.players, p] });
const patchPlayer =
  (id: string, patch: Partial<PublicPlayer>): Step =>
  (v) => ({ ...v, players: v.players.map((p) => (p.id === id ? { ...p, ...patch } : p)) });

const JOIN_STEPS: Step[] = [
  withPlayer(newcomer(1, 'Marie')),
  withPlayer(newcomer(2, 'Paul')),
  patchPlayer('n1', { ready: true }),
  withPlayer(newcomer(3, 'Julie', true)),
  patchPlayer('n2', { connected: false }),
  patchPlayer('n2', { ready: true, connected: true }),
  (v) => ({ ...v, players: v.players.filter((p) => p.id !== 'n3') }),
];

const GUEST_STEPS: Step[] = [
  (v) => ({ ...v, settings: { ...v.settings, voteSeconds: 15 } }),
  (v) => ({ ...v, settings: { ...v.settings, anonymousVotes: false } }),
  (v) => ({ ...v, settings: { ...v.settings, voteSeconds: 0 } }),
  // The host leaves: the crown comes to us.
  (v) => ({
    ...v,
    hostId: 'p1',
    players: v.players.filter((p) => p.id !== 'p0').map((p) => ({ ...p, isHost: p.id === 'p1' })),
  }),
];

const previews: PreviewRegistry = {
  'host-empty': {
    view: () => fakeView(fakePlayers(1, { notReady: [0] })),
    render,
  },
  'host-ready': {
    view: () =>
      fakeView(fakePlayers(5, { notReady: [3, 4] }), 0, {
        myPhotos: [myPhoto(1, 0, 'daron'), myPhoto(2, 1, 'daronne')],
      }),
    render,
  },
  'host-all-ready': {
    view: () =>
      fakeView(fakePlayers(3), 0, {
        myPhotos: [myPhoto(3, 0, 'daronne')],
      }),
    render,
  },
  guest: {
    view: () =>
      fakeView(fakePlayers(4, { notReady: [2] }), 1, {
        myPhotos: [myPhoto(4, 0, 'daron')],
      }),
    render,
  },
  'guest-no-photo': {
    view: () => fakeView(fakePlayers(4, { notReady: [2, 3] }), 3),
    render,
  },
  full: {
    view: () =>
      fakeView(fullRoom(), 1, {
        myPhotos: [myPhoto(5, 1, 'daron')],
      }),
    render,
  },
  'full-host': {
    view: () => fakeView(fullRoom(), 0, { myPhotos: [myPhoto(6, 0, 'daron'), myPhoto(7, 1, 'daron')] }),
    render,
  },
  'no-timer': {
    view: () =>
      fakeView(fakePlayers(4, { notReady: [1] }), 0, {
        settings: { voteSeconds: 0, anonymousVotes: false },
        myPhotos: [myPhoto(8, 1, 'daronne')],
      }),
    render,
  },
  'no-timer-guest': {
    view: () =>
      fakeView(fakePlayers(4, { notReady: [2] }), 2, {
        settings: { voteSeconds: 0, anonymousVotes: false },
      }),
    render,
  },
  'live-joins': {
    view: () => fakeView(fakePlayers(1), 0, { myPhotos: [myPhoto(9, 0, 'daron')] }),
    render: (view) => (view ? <Live initial={view} steps={JOIN_STEPS} /> : null),
  },
  'live-guest': {
    view: () => fakeView(fakePlayers(3), 1),
    render: (view) => (view ? <Live initial={view} steps={GUEST_STEPS} everyMs={1800} /> : null),
  },
};

export default previews;
