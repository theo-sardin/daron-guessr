import { useEffect } from 'react';
import type { RoomPeek } from '../../../shared/protocol';
import type { PreviewRegistry } from '../../dev/PreviewApp';
import { fakePlayers, fakeView } from '../../dev/fixtures';
import { useT } from '../../i18n';
import { errorText } from '../../lib/errors';
import { __devSetState } from '../../lib/store';
import { HomeScreen } from './HomeScreen';
import { JoinByLink } from './JoinByLink';

/** Dev-only preview variants for this screen (see src/client/dev/PreviewApp.tsx). */

const CODE = 'BZKR';
const PROFILE_KEY = 'dg:profile';

function setProfile(profile: { name: string; avatar: string } | null) {
  try {
    if (profile) localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    // ignore
  }
}

const realFetch = typeof window === 'undefined' ? fetch : window.fetch.bind(window);

/** Answers GET /api/rooms/:code with a fake peek (or a network failure / a request that never ends). */
function mockPeek(result: RoomPeek | 'offline' | 'hang', delayMs = 500) {
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/rooms/')) return realFetch(input, init);
    if (result === 'hang') return new Promise<Response>(() => undefined);
    return new Promise<Response>((resolve, reject) => {
      window.setTimeout(() => {
        if (result === 'offline') reject(new TypeError('Failed to fetch'));
        else resolve(new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } }));
      }, delayMs);
    });
  };
}

const lobbyPeek = (patch: Partial<RoomPeek> = {}): RoomPeek => ({
  code: CODE,
  exists: true,
  phase: 'lobby',
  playerCount: 3,
  joinable: true,
  hostName: 'Marie',
  hostAvatar: '🦊',
  ...patch,
});

/** The seated banner needs a session with no server: inject one before the first render. */
function Seated({ code }: { code: string }) {
  useEffect(() => {
    __devSetState({ session: { code, playerId: 'p1', token: 'preview' } });
  }, [code]);
  return <HomeScreen />;
}

function NoticeJoin() {
  const t = useT();
  return <JoinByLink code={CODE} notice={errorText(t, 'SESSION_ACTIVE')} />;
}

const previews: PreviewRegistry = {
  home: {
    render: () => {
      setProfile(null);
      return <HomeScreen />;
    },
  },
  'home-filled': {
    render: () => {
      setProfile({ name: 'Théo', avatar: '🦊' });
      return <HomeScreen />;
    },
  },
  'home-long-name': {
    render: () => {
      setProfile({ name: 'Jean-Christophe!', avatar: '🦖' });
      return <HomeScreen />;
    },
  },
  'home-seated': {
    // A real seated player also has a room view (the TopBar then shows the room code).
    view: () => fakeView(fakePlayers(4), 1),
    chrome: false,
    render: () => {
      setProfile({ name: 'Marie', avatar: '🐼' });
      return <HomeScreen />;
    },
  },
  'home-seated-noview': {
    render: () => {
      setProfile({ name: 'Marie', avatar: '🐼' });
      return <Seated code="QWXY" />;
    },
  },
  join: {
    render: () => {
      setProfile(null);
      mockPeek(lobbyPeek());
      return <JoinByLink code={CODE} />;
    },
  },
  'join-filled': {
    render: () => {
      setProfile({ name: 'Théo', avatar: '🐸' });
      mockPeek(lobbyPeek({ playerCount: 11, hostName: 'Jean-Christophe!', hostAvatar: '🦖' }));
      return <JoinByLink code={CODE} />;
    },
  },
  'join-loading': {
    render: () => {
      setProfile(null);
      mockPeek('hang');
      return <JoinByLink code={CODE} />;
    },
  },
  'join-offline': {
    render: () => {
      setProfile({ name: 'Théo', avatar: '🐸' });
      mockPeek('offline', 300);
      return <JoinByLink code={CODE} />;
    },
  },
  'join-not-found': {
    render: () => {
      mockPeek({ code: CODE, exists: false });
      return <JoinByLink code={CODE} />;
    },
  },
  'join-in-progress': {
    render: () => {
      mockPeek(lobbyPeek({ phase: 'voting', playerCount: 6, joinable: false }));
      return <JoinByLink code={CODE} />;
    },
  },
  'join-full': {
    render: () => {
      mockPeek(lobbyPeek({ playerCount: 12, joinable: false }));
      return <JoinByLink code={CODE} />;
    },
  },
  'join-notice': {
    render: () => {
      setProfile({ name: 'Théo', avatar: '🐸' });
      mockPeek(lobbyPeek());
      return <NoticeJoin />;
    },
  },
};

export default previews;
