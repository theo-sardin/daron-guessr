import { AVATARS, type Session } from '../../shared/protocol';

/**
 * Sessions live in sessionStorage (one per tab, so several tabs can be several players)
 * and are mirrored in localStorage so a phone that killed the tab can still come back.
 * A localStorage-only session is resumed without takeover: it must not steal the seat
 * from another open tab.
 */
const key = (code: string) => `dg:session:${code}`;
const PROFILE_KEY = 'dg:profile';

export type StoredSession = { session: Session; source: 'tab' | 'device' };

function read(storage: Storage | undefined, k: string): unknown {
  try {
    const raw = storage?.getItem(k);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(storage: Storage | undefined, k: string, value: unknown) {
  try {
    if (value === null) storage?.removeItem(k);
    else storage?.setItem(k, JSON.stringify(value));
  } catch {
    // Private mode / quota: sessions just won't survive a reload.
  }
}

function isSession(v: unknown): v is Session {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Session).code === 'string' &&
    typeof (v as Session).playerId === 'string' &&
    typeof (v as Session).token === 'string'
  );
}

const tab = () => (typeof sessionStorage === 'undefined' ? undefined : sessionStorage);
const device = () => (typeof localStorage === 'undefined' ? undefined : localStorage);

export function loadSession(code: string): StoredSession | null {
  const fromTab = read(tab(), key(code));
  if (isSession(fromTab)) return { session: fromTab, source: 'tab' };
  const fromDevice = read(device(), key(code));
  if (isSession(fromDevice)) return { session: fromDevice, source: 'device' };
  return null;
}

export function saveSession(session: Session) {
  write(tab(), key(session.code), session);
  write(device(), key(session.code), session);
}

export function forgetSession(code: string) {
  write(tab(), key(code), null);
  write(device(), key(code), null);
}

export interface Profile {
  name: string;
  avatar: string;
}

export function loadProfile(): Profile {
  const p = read(device(), PROFILE_KEY) as Partial<Profile> | null;
  const avatar = p?.avatar && (AVATARS as readonly string[]).includes(p.avatar) ? p.avatar : randomAvatar();
  return { name: typeof p?.name === 'string' ? p.name : '', avatar };
}

export function saveProfile(profile: Profile) {
  write(device(), PROFILE_KEY, profile);
}

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
