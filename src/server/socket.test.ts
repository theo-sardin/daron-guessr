import type { AddressInfo } from 'node:net';
import { io as connect, type Socket } from 'socket.io-client';
import { afterEach, describe, expect, it } from 'vitest';
import {
  MAX_PHOTO_BYTES,
  POINTS_PER_CORRECT,
  type AwardId,
  type ClientToServerEvents,
  type MyPhoto,
  type PhotoKind,
  type PhotoSlot,
  type Reaction,
  type RoomPeek,
  type RoomView,
  type ServerToClientEvents,
  type Session,
} from '../shared/protocol';
import { createApp, type App, type AppOptions } from './app';
import type { Timing } from './game';
import { ROOM_MAX_AGE_MS } from './rooms';

type ClientSocket = Socket<ServerToClientEvents, ClientToServerEvents>;
/** Untyped view of the same socket, to send malformed payloads. */
type RawSocket = Socket;

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64',
);
/** RIFF header + VP8L chunk of a 1x1 image (signature 0x2f, then zero-based width / height bits). */
const WEBP = Buffer.concat([Buffer.from('RIFF'), Buffer.from([22, 0, 0, 0]), Buffer.from('WEBPVP8L'), Buffer.from([10, 0, 0, 0, 0x2f]), Buffer.alloc(9)]);
/** Valid PNG signature and IHDR, declaring 50000 x 50000 pixels. */
const PNG_BOMB = Buffer.concat([PNG.subarray(0, 16), Buffer.from([0, 0, 0xc3, 0x50, 0, 0, 0xc3, 0x50]), PNG.subarray(24)]);

// Timings keep a comfortable margin (hundreds of ms) wherever a test checks something
// "too early": a loaded CI runner must not turn them into races.
const FAST: Partial<Timing> = {
  gameIntroMs: 1500,
  roundGapMs: 40,
  allVotedGraceMs: 40,
  revealIntroMs: 60,
  revealOwnerAtMs: 400,
  hostGraceMs: 150,
  earlyVoteToleranceMs: 300,
};

const AWARD_IDS: AwardId[] = ['sherlock', 'needsGlasses', 'carbonCopy', 'masterOfDisguise', 'doppelganger', 'mostConfusing', 'biggestMixup'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(label: string, fn: () => T | null | undefined | false, timeoutMs = 4000): Promise<T> {
  const start = Date.now();
  for (;;) {
    const value = fn();
    if (value) return value;
    if (Date.now() - start > timeoutMs) throw new Error(`timed out waiting for ${label}`);
    await sleep(5);
  }
}

class Client {
  readonly socket: ClientSocket;
  readonly views: RoomView[] = [];
  readonly reactions: Reaction[] = [];
  kicked = 0;
  replaced = 0;
  session: Session | null = null;
  /** Views before this index were already consumed by `until`. */
  private cursor = 0;

  constructor(url: string, headers?: Record<string, string>) {
    this.socket = connect(url, { transports: ['websocket'], forceNew: true, reconnection: false, extraHeaders: headers });
    this.socket.on('room:state', (view) => this.views.push(view));
    this.socket.on('room:reaction', (r) => this.reactions.push(r));
    this.socket.on('room:kicked', () => (this.kicked += 1));
    this.socket.on('session:replaced', () => (this.replaced += 1));
  }

  get raw(): RawSocket {
    return this.socket as unknown as RawSocket;
  }

  get view(): RoomView {
    const view = this.views.at(-1);
    if (!view) throw new Error('no view yet');
    return view;
  }

  get id(): string {
    if (!this.session) throw new Error('no session');
    return this.session.playerId;
  }

  async ready(): Promise<this> {
    if (!this.socket.connected) await new Promise<void>((resolve) => this.socket.once('connect', () => resolve()));
    return this;
  }

  async create(name: string, avatar = '🐸'): Promise<Session> {
    const res = await this.socket.emitWithAck('room:create', { name, avatar });
    if (!res.ok) throw new Error(res.error);
    this.session = res.session;
    return res.session;
  }

  async join(code: string, name: string, avatar = '🦊'): Promise<Session> {
    const res = await this.socket.emitWithAck('room:join', { code, name, avatar });
    if (!res.ok) throw new Error(res.error);
    this.session = res.session;
    return res.session;
  }

  async upload(slot: 0 | 1, data: Buffer, mime: string): Promise<MyPhoto> {
    const res = await this.socket.emitWithAck('photo:upload', { slot, kind: slot === 0 ? 'daron' : 'daronne', mime, data });
    if (!res.ok) throw new Error(res.error);
    return res.photo;
  }

  /** Waits for the first view (not older than the last match) matching `predicate`. */
  until(label: string, predicate: (view: RoomView) => boolean): Promise<RoomView> {
    return waitFor(label, () => {
      for (let i = this.cursor; i < this.views.length; i++) {
        if (predicate(this.views[i])) {
          this.cursor = i;
          return this.views[i];
        }
      }
      return undefined;
    });
  }

  close(): void {
    this.socket.close();
  }
}

let apps: App[] = [];
let clients: Client[] = [];

async function startServer(options: AppOptions = {}): Promise<{ app: App; url: string }> {
  const app = createApp({ timing: FAST, ...options });
  apps.push(app);
  await new Promise<void>((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
  const { port } = app.httpServer.address() as AddressInfo;
  return { app, url: `http://127.0.0.1:${port}` };
}

async function client(url: string, headers?: Record<string, string>): Promise<Client> {
  const c = new Client(url, headers);
  clients.push(c);
  return c.ready();
}

async function getJson<T>(url: string): Promise<{ status: number; body: T }> {
  const res = await fetch(url);
  return { status: res.status, body: (await res.json()) as T };
}

afterEach(async () => {
  for (const c of clients) c.close();
  await Promise.all(apps.map((app) => app.close()));
  apps = [];
  clients = [];
});

/** Room with 4 connected clients (the first one hosts). */
async function fourPlayers(url: string): Promise<{ code: string; players: Client[] }> {
  const [alice, bob, carol, dave] = await Promise.all([client(url), client(url), client(url), client(url)]);
  const { code } = await alice.create('Alice');
  await bob.join(code.toLowerCase(), 'Bob');
  await carol.join(code, 'Carol');
  await dave.join(` ${code} `, 'Dave');
  const players = [alice, bob, carol, dave];
  await Promise.all(players.map((p) => p.until('4 players', (v) => v.players.length === 4)));
  return { code, players };
}

describe('socket server: a whole game', () => {
  it('plays from lobby to results with per-player views', async () => {
    const { url } = await startServer();
    const { code, players } = await fourPlayers(url);
    const [alice, bob, carol, dave] = players;

    // --- Uploads ------------------------------------------------------------
    const owners = new Map<string, Client>();
    for (const [c, slot, data, mime] of [
      [alice, 0, PNG, 'image/png'],
      [alice, 1, JPEG, 'image/jpeg'],
      [bob, 0, JPEG, 'image/jpg'],
      [carol, 0, WEBP, 'image/webp'],
    ] as const) {
      const photo = await c.upload(slot, data, mime);
      expect(photo).toMatchObject({ slot, url: `/photos/${code}/${photo.id}` });
      owners.set(photo.id, c);
    }
    const bad = async (payload: object) => (await bob.raw.emitWithAck('photo:upload', payload)) as { ok: boolean; error?: string };
    expect(await bad({ slot: 1, kind: 'daron', mime: 'image/png', data: Buffer.from('not an image at all') })).toEqual({ ok: false, error: 'INVALID_PHOTO' });
    expect(await bad({ slot: 1, kind: 'daron', mime: 'image/jpeg', data: PNG })).toEqual({ ok: false, error: 'INVALID_PHOTO' });
    expect(await bad({ slot: 1, kind: 'daron', mime: 'text/html', data: PNG })).toEqual({ ok: false, error: 'INVALID_PHOTO' });
    const huge = Buffer.concat([PNG, Buffer.alloc(MAX_PHOTO_BYTES)]);
    expect(await bad({ slot: 1, kind: 'daron', mime: 'image/png', data: huge })).toEqual({ ok: false, error: 'PHOTO_TOO_LARGE' });
    expect(await bad({ slot: 7, kind: 'daron', mime: 'image/png', data: PNG })).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await bad({ slot: 1, kind: 'daron', mime: 'image/png', data: 'iVBOR' })).toEqual({ ok: false, error: 'BAD_REQUEST' });

    // Lobby: nobody sees anybody else's photos, everybody sees who is ready.
    const lobby = await dave.until('3 ready players', (v) => v.players.filter((p) => p.ready).length === 3);
    for (const id of owners.keys()) expect(JSON.stringify(lobby)).not.toContain(id);
    const bobView = await bob.until('bob photo', (v) => v.myPhotos.length === 1);
    expect(bobView.myPhotos[0].kind).toBe('daron');
    for (const [id, owner] of owners) if (owner !== bob) expect(JSON.stringify(bobView)).not.toContain(id);

    // --- HTTP ---------------------------------------------------------------
    const [pngId] = [...owners].find(([, c]) => c === alice)!;
    const photoRes = await fetch(`${url}/photos/${code}/${pngId}`);
    expect(photoRes.status).toBe(200);
    expect(photoRes.headers.get('content-type')).toBe('image/png');
    expect(photoRes.headers.get('cache-control')).toBe('private, max-age=86400');
    expect(photoRes.headers.get('x-content-type-options')).toBe('nosniff');
    expect(Buffer.from(await photoRes.arrayBuffer()).equals(PNG)).toBe(true);
    const webpId = [...owners].find(([, c]) => c === carol)![0];
    expect((await fetch(`${url}/photos/${code}/${webpId}`)).headers.get('content-type')).toBe('image/webp');
    expect((await fetch(`${url}/photos/${code}/nope`)).status).toBe(404);
    expect((await fetch(`${url}/photos/ZZZZ/${pngId}`)).status).toBe(404);

    const peek = await getJson<RoomPeek>(`${url}/api/rooms/${code.toLowerCase()}`);
    expect(peek.body).toEqual({ code, exists: true, phase: 'lobby', playerCount: 4, joinable: true, hostName: 'Alice', hostAvatar: '🐸' });
    expect((await getJson<RoomPeek>(`${url}/api/rooms/zz-zz9`)).body).toEqual({ code: 'ZZZZ', exists: false });
    expect((await getJson<{ ok: boolean; rooms: number }>(`${url}/api/health`)).body).toMatchObject({ ok: true, rooms: 1 });

    // --- Settings and start -----------------------------------------------
    expect(await bob.socket.emitWithAck('host:settings', { voteSeconds: 0 })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await alice.socket.emitWithAck('host:settings', { voteSeconds: 25 })).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await alice.socket.emitWithAck('host:settings', { voteSeconds: 0 })).toEqual({ ok: true });
    expect(await bob.socket.emitWithAck('host:start')).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await alice.socket.emitWithAck('host:start')).toEqual({ ok: true });
    // Too early: the 3-2-1 intro is still running (sent right away: gameIntroMs - tolerance of margin).
    expect(await dave.socket.emitWithAck('vote:cast', { round: 0, candidateId: alice.id })).toEqual({ ok: false, error: 'WRONG_PHASE' });
    await Promise.all(players.map((p) => p.until('voting', (v) => v.phase === 'voting')));
    expect(await dave.socket.emitWithAck('room:join', { code, name: 'Late', avatar: '🐸' })).toEqual({ ok: false, error: 'GAME_IN_PROGRESS' });
    const late = await client(url);
    expect(await late.socket.emitWithAck('room:join', { code, name: 'Late', avatar: '🐸' })).toEqual({ ok: false, error: 'GAME_IN_PROGRESS' });

    // --- Voting -------------------------------------------------------------
    const total = alice.view.voting!.totalRounds;
    expect(total).toBe(4);
    for (let round = 0; round < total; round++) {
      const voting = (await alice.until(`round ${round}`, (v) => v.voting?.round === round)).voting!;
      await waitFor('round start', () => Date.now() >= voting.startsAt);
      const owner = owners.get(voting.photo.id)!;
      expect(await bob.socket.emitWithAck('vote:cast', { round, candidateId: bob.id })).toEqual({ ok: false, error: 'INVALID_VOTE' });
      // Dave never owns a photo. Round 0: a change of mind, a wrong vote first and the right one
      // right after, before anybody else votes (so the all-voted grace cannot close the round).
      const order = round === 0 ? [dave, ...players.filter((p) => p !== dave)] : players;
      if (round === 0) {
        const wrong = voting.candidates.find((id) => id !== owner.id && id !== dave.id)!;
        expect(await dave.socket.emitWithAck('vote:cast', { round, candidateId: wrong })).toEqual({ ok: true });
      }
      const picks = new Map<Client, string>();
      for (const p of order) {
        const mine = (await p.until(`round ${round}`, (v) => v.voting?.round === round)).voting!;
        expect(mine.isMine).toBe(p === owner);
        picks.set(p, p === owner ? mine.candidates[0] : owner.id);
        expect(await p.socket.emitWithAck('vote:cast', { round, candidateId: picks.get(p)! })).toEqual({ ok: true });
      }
      for (const p of players) {
        const v = await p.until(
          'all voted',
          (view) => view.voting?.round === round && view.voting.votedIds.length === 4 && view.voting.myVote === picks.get(p),
        );
        // Everybody voted: the round now ends ALL_VOTED_GRACE_MS later, for everybody.
        expect(v.voting!.endsAt).not.toBeNull();
      }
    }

    // --- Reveal -------------------------------------------------------------
    await Promise.all(players.map((p) => p.until('reveal', (v) => v.phase === 'reveal')));
    for (let index = 0; index < total; index++) {
      const reveal = (await alice.until(`reveal ${index}`, (v) => v.reveal?.index === index)).reveal!;
      expect(reveal.current.ownerId).toBe(owners.get(reveal.current.photo.id)!.id);
      expect(reveal.current.voters).toBeNull();
      expect(reveal.current.correctVotes).toBe(3);
      if (Date.now() < reveal.startedAt + FAST.revealOwnerAtMs! - 250) {
        expect(await alice.socket.emitWithAck('host:nextReveal', { index })).toEqual({ ok: false, error: 'WRONG_PHASE' });
      }
      await waitFor('owner revealed', () => Date.now() >= reveal.startedAt + FAST.revealOwnerAtMs! + 5);
      expect(await bob.socket.emitWithAck('host:nextReveal', { index })).toEqual({ ok: false, error: 'NOT_HOST' });
      expect(await alice.socket.emitWithAck('host:nextReveal', { index })).toEqual({ ok: true });
      expect(await alice.socket.emitWithAck('host:nextReveal', { index })).toEqual({ ok: true }); // idempotent
    }

    // --- Results ------------------------------------------------------------
    const results = (await dave.until('results', (v) => v.phase === 'results')).results!;
    const expected = new Map([
      [alice.id, 2],
      [bob.id, 3],
      [carol.id, 3],
      [dave.id, 4],
    ]);
    expect(results.photos).toHaveLength(4);
    expect(results.ranking.map((r) => [r.playerId, r.score, r.rank])).toEqual([
      [dave.id, 400, 1],
      [bob.id, 300, 2],
      [carol.id, 300, 2],
      [alice.id, 200, 4],
    ]);
    for (const r of results.ranking) {
      expect(r.correct).toBe(expected.get(r.playerId));
      expect(r.guesses).toBe(r.correct);
      expect(r.score).toBe(r.correct * POINTS_PER_CORRECT);
    }
    expect(results.awards.length).toBeGreaterThan(0);
    for (const award of results.awards) {
      expect(AWARD_IDS).toContain(award.id);
      expect(award.playerIds.length).toBeGreaterThan(0);
      expect(typeof award.value).toBe('number');
    }
    expect(dave.view.players.find((p) => p.id === dave.id)!.score).toBe(400);

    // --- Reactions ----------------------------------------------------------
    carol.socket.emit('react', { emoji: '😂' });
    carol.raw.emit('react', { emoji: 'not-an-emoji' });
    for (const p of players) await waitFor('reaction', () => p.reactions.length === 1);
    await sleep(50);
    for (const p of players) expect(p.reactions).toEqual([{ id: expect.any(String), playerId: carol.id, emoji: '😂' }]);
    expect(late.reactions).toEqual([]);

    // --- Play again ---------------------------------------------------------
    expect(await bob.socket.emitWithAck('host:playAgain')).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await alice.socket.emitWithAck('host:playAgain')).toEqual({ ok: true });
    for (const p of players) {
      const v = await p.until('back to lobby', (view) => view.phase === 'lobby');
      expect(v.myPhotos).toEqual([]);
      expect(v.players.every((pl) => pl.score === 0 && !pl.ready)).toBe(true);
    }
    expect((await fetch(`${url}/photos/${code}/${pngId}`)).status).toBe(404);

    // Every view a client ever received was built for that client.
    for (const p of players) {
      expect(p.views.length).toBeGreaterThan(10);
      expect(p.views.every((v) => v.meId === p.id)).toBe(true);
    }
    expect(late.views).toEqual([]);
  }, 20_000);
});

describe('socket server: themes and photos per player', () => {
  const put = (c: Client, slot: PhotoSlot, kind: PhotoKind) =>
    c.socket.emitWithAck('photo:upload', { slot, kind, mime: 'image/png', data: PNG });
  const rawPut = (c: Client, payload: object) => c.raw.emitWithAck('photo:upload', { mime: 'image/png', data: PNG, ...payload });
  const settings = (c: Client, patch: object) => c.raw.emitWithAck('host:settings', patch);
  const BAD = { ok: false, error: 'BAD_REQUEST' };
  const slotsAndKinds = (v: RoomView) => v.myPhotos.map((ph) => [ph.slot, ph.kind]);

  it('validates settings, uploads and relabels against the theme and the active slots', async () => {
    const { url } = await startServer();
    const [alice, bob] = await Promise.all([client(url), client(url)]);
    const { code } = await alice.create('Alice');
    await bob.join(code, 'Bob');

    for (const patch of [{ theme: 'cousins' }, { photosPerPlayer: 4 }, { photosPerPlayer: '2' }, { theme: 'mix', photosPerPlayer: 0 }]) {
      expect(await settings(alice, patch)).toEqual(BAD);
    }
    expect(await settings(bob, { theme: 'mix' })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect((await alice.until('lobby', (v) => v.players.length === 2)).settings).toEqual({
      voteSeconds: 30,
      anonymousVotes: true,
      theme: 'parents',
      photosPerPlayer: 2,
    });

    expect(await put(bob, 0, 'daron')).toMatchObject({ ok: true });
    expect(await put(bob, 1, 'daron')).toMatchObject({ ok: true });
    expect(await put(bob, 2, 'daronne')).toEqual(BAD); // inactive slot
    expect(await put(bob, 1, 'kid')).toEqual(BAD); // not a parents kind
    expect(await rawPut(bob, { slot: 1, kind: 'cousin' })).toEqual(BAD);
    expect(await rawPut(bob, { slot: 3, kind: 'daron' })).toEqual(BAD);
    expect(await bob.socket.emitWithAck('photo:setKind', { slot: 1, kind: 'sister' })).toEqual(BAD);
    expect(await bob.socket.emitWithAck('photo:setKind', { slot: 1, kind: 'daronne' })).toEqual({ ok: true });
    await bob.until('bob photos', (v) => v.myPhotos.length === 2 && v.myPhotos[1].kind === 'daronne');

    // Childhood: both photos become 'kid', slot 1 is kept but inactive.
    expect(await settings(alice, { theme: 'childhood' })).toEqual({ ok: true });
    const relabeled = await bob.until('childhood', (v) => v.settings.theme === 'childhood');
    expect(relabeled.settings.photosPerPlayer).toBe(1);
    expect(slotsAndKinds(relabeled)).toEqual([[0, 'kid'], [1, 'kid']]);
    expect(relabeled.players.find((p) => p.id === bob.id)!.ready).toBe(true);
    expect(await put(bob, 1, 'kid')).toEqual(BAD);
    expect(await bob.socket.emitWithAck('photo:setKind', { slot: 1, kind: 'kid' })).toEqual(BAD);
    expect(await put(alice, 0, 'daron')).toEqual(BAD);

    // Removing the active photo leaves Bob not ready, even with a photo in slot 1.
    expect(await bob.socket.emitWithAck('photo:remove', { slot: 0 })).toEqual({ ok: true });
    const notReady = await alice.until('bob not ready', (v) => !v.players.find((p) => p.id === bob.id)!.ready);
    expect(notReady.myPhotos).toEqual([]);
    expect(slotsAndKinds(bob.view)).toEqual([[1, 'kid']]);

    // An explicit count sent with the theme wins over the theme's default.
    expect(await settings(alice, { theme: 'mix', photosPerPlayer: 3 })).toEqual({ ok: true });
    await bob.until('mix', (v) => v.settings.theme === 'mix' && v.settings.photosPerPlayer === 3);
    expect(await put(bob, 2, 'pet')).toMatchObject({ ok: true, photo: { slot: 2, kind: 'pet' } });
    expect(await bob.socket.emitWithAck('photo:setKind', { slot: 1, kind: 'grandma' })).toEqual({ ok: true });
    const mixed = await bob.until('mixed kinds', (v) => v.myPhotos.length === 2 && v.myPhotos[0].kind === 'grandma');
    expect(slotsAndKinds(mixed)).toEqual([[1, 'grandma'], [2, 'pet']]);
    await alice.until('bob ready again', (v) => v.players.find((p) => p.id === bob.id)!.ready);
  });

  it('plays a childhood game with one photo each, ignoring inactive photos, and keeps the settings', async () => {
    const { url } = await startServer();
    const [alice, bob, carol] = await Promise.all([client(url), client(url), client(url)]);
    const { code } = await alice.create('Alice');
    await bob.join(code, 'Bob');
    await carol.join(code, 'Carol');
    const players = [alice, bob, carol];

    // Uploaded under the parents theme, then left in an inactive slot.
    const extra = await put(alice, 1, 'daronne');
    if (!extra.ok) throw new Error(extra.error);
    expect(await settings(alice, { theme: 'childhood', voteSeconds: 0 })).toEqual({ ok: true });
    const owners = new Map<string, Client>();
    for (const c of players) {
      const res = await put(c, 0, 'kid');
      if (!res.ok) throw new Error(res.error);
      owners.set(res.photo.id, c);
    }
    await alice.until('everybody ready', (v) => v.players.every((p) => p.ready));
    expect(slotsAndKinds(alice.view)).toEqual([[0, 'kid'], [1, 'kid']]);

    expect(await alice.socket.emitWithAck('host:start')).toEqual({ ok: true });
    const first = (await carol.until('voting', (v) => v.phase === 'voting')).voting!;
    expect(first.totalRounds).toBe(3);
    for (let round = 0; round < 3; round++) {
      const voting = (await alice.until(`round ${round}`, (v) => v.voting?.round === round)).voting!;
      expect(voting.photo.kind).toBe('kid');
      expect(voting.photo.id).not.toBe(extra.photo.id);
      await waitFor('round start', () => Date.now() >= voting.startsAt);
      const owner = owners.get(voting.photo.id)!;
      for (const p of players) {
        const candidate = p === owner ? players.find((o) => o !== p)!.id : owner.id;
        expect(await p.socket.emitWithAck('vote:cast', { round, candidateId: candidate })).toEqual({ ok: true });
      }
    }

    for (let index = 0; index < 3; index++) {
      const reveal = (await alice.until(`reveal ${index}`, (v) => v.reveal?.index === index)).reveal!;
      expect(reveal.current.photo.kind).toBe('kid');
      expect(reveal.current.correctVotes).toBe(2);
      await waitFor('owner revealed', () => Date.now() >= reveal.startedAt + FAST.revealOwnerAtMs! + 5);
      expect(await alice.socket.emitWithAck('host:nextReveal', { index })).toEqual({ ok: true });
    }
    const results = (await bob.until('results', (v) => v.phase === 'results')).results!;
    expect(results.photos.map((ph) => ph.photo.kind)).toEqual(['kid', 'kid', 'kid']);
    expect(results.ranking.map((r) => [r.score, r.rank])).toEqual([
      [2 * POINTS_PER_CORRECT, 1],
      [2 * POINTS_PER_CORRECT, 1],
      [2 * POINTS_PER_CORRECT, 1],
    ]);

    expect(await alice.socket.emitWithAck('host:playAgain')).toEqual({ ok: true });
    for (const p of players) {
      const v = await p.until('back to lobby', (view) => view.phase === 'lobby');
      expect(v.settings).toEqual({ voteSeconds: 0, anonymousVotes: true, theme: 'childhood', photosPerPlayer: 1 });
      expect(v.myPhotos).toEqual([]);
    }
  }, 15_000);
});

describe('socket server: sessions', () => {
  it('handles takeover, SESSION_ACTIVE, stale sockets and rejoin errors', async () => {
    const { url } = await startServer();
    const { code, players } = await fourPlayers(url);
    const [alice, bob] = players;
    const bobSession = bob.session!;

    const tab2 = await client(url);
    expect(await tab2.socket.emitWithAck('room:rejoin', { ...bobSession, takeover: false })).toEqual({ ok: false, error: 'SESSION_ACTIVE' });
    expect(await tab2.socket.emitWithAck('room:rejoin', { ...bobSession, takeover: true })).toEqual({ ok: true, session: bobSession });
    await waitFor('replaced', () => bob.replaced === 1);
    await tab2.until('bob view', (v) => v.meId === bob.id);
    expect(await bob.socket.emitWithAck('player:update', { name: 'Old tab' })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });

    // The old socket going away must not mark Bob as disconnected.
    bob.close();
    await sleep(100);
    expect(alice.view.players.find((p) => p.id === bob.id)!.connected).toBe(true);

    // The new one does.
    tab2.close();
    await alice.until('bob offline', (v) => !v.players.find((p) => p.id === bob.id)!.connected);
    const tab3 = await client(url);
    expect(await tab3.socket.emitWithAck('room:rejoin', { code: code.toLowerCase(), token: bobSession.token, takeover: false })).toEqual({
      ok: true,
      session: bobSession,
    });
    await alice.until('bob back', (v) => v.players.find((p) => p.id === bob.id)!.connected);

    expect(await tab3.socket.emitWithAck('room:rejoin', { code, token: 'nope', takeover: true })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    expect(await tab3.socket.emitWithAck('room:rejoin', { code: 'QQQQ', token: bobSession.token, takeover: true })).toEqual({
      ok: false,
      error: 'ROOM_NOT_FOUND',
    });
    // Rejoining its own seat again is harmless.
    expect(await tab3.socket.emitWithAck('room:rejoin', { ...bobSession, takeover: false })).toEqual({ ok: true, session: bobSession });
  });

  it('kicks, leaves, migrates the host and deletes empty rooms', async () => {
    const { url, app } = await startServer();
    const { players } = await fourPlayers(url);
    const [alice, bob, carol, dave] = players;

    expect(await bob.socket.emitWithAck('host:kick', { playerId: carol.id })).toEqual({ ok: false, error: 'NOT_HOST' });
    expect(await alice.socket.emitWithAck('host:kick', { playerId: carol.id })).toEqual({ ok: true });
    await waitFor('kicked', () => carol.kicked === 1);
    await alice.until('3 players', (v) => v.players.length === 3);
    expect(await carol.socket.emitWithAck('player:update', { name: 'Carol2' })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });

    expect(await dave.socket.emitWithAck('room:leave')).toEqual({ ok: true });
    await alice.until('2 players', (v) => v.players.length === 2);
    expect(await dave.socket.emitWithAck('room:leave')).toEqual({ ok: false, error: 'NOT_IN_ROOM' });

    // Host disconnects: after the grace delay Bob gets the crown.
    alice.close();
    const migrated = await bob.until('bob hosts', (v) => v.hostId === bob.id);
    expect(migrated.players.find((p) => p.id === bob.id)!.isHost).toBe(true);

    // Alice is gone (disconnected), Bob leaves: nobody connected, but Alice still has a seat.
    expect(app.registry.size).toBe(1);
    expect(await bob.socket.emitWithAck('room:leave')).toEqual({ ok: true });
    const room = [...app.registry.values()][0];
    expect(room.players.map((p) => p.name)).toEqual(['Alice']);

    // A room whose last player leaves is deleted.
    const solo = await client(url);
    await solo.create('Solo');
    expect(app.registry.size).toBe(2);
    expect(await solo.socket.emitWithAck('room:leave')).toEqual({ ok: true });
    expect(app.registry.size).toBe(1);
  });

  it('moves a socket to its new room when it creates or joins another one', async () => {
    const { url, app } = await startServer();
    const { code, players } = await fourPlayers(url);
    const [alice, bob] = players;
    const other = await bob.create('Bob again');
    expect(other.code).not.toBe(code);
    await alice.until('bob offline', (v) => !v.players.find((p) => p.id === players[1].views[0].meId)!.connected);
    expect(app.registry.size).toBe(2);
    expect(bob.view.code).toBe(other.code);
  });
});

describe('socket server: robustness', () => {
  it('rejects malformed payloads and survives missing acks', async () => {
    const { url } = await startServer();
    const c = await client(url);
    const raw = c.raw;
    expect(await raw.emitWithAck('room:join', { code: 5, name: 'X', avatar: '🐸' })).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await raw.emitWithAck('room:create', 'hello')).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await raw.emitWithAck('room:create', null)).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await raw.emitWithAck('vote:cast')).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await raw.emitWithAck('room:create', { name: 'X', avatar: 'nope' })).toEqual({ ok: false, error: 'BAD_REQUEST' });
    expect(await raw.emitWithAck('room:create', { name: '   ', avatar: '🐸' })).toEqual({ ok: false, error: 'INVALID_NAME' });
    expect(await raw.emitWithAck('room:join', { code: 'QQQQ', name: 'X', avatar: '🐸' })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    expect(await raw.emitWithAck('host:start')).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
    // No ack function at all, or a non-function in its place.
    raw.emit('room:create', { name: 'NoAck', avatar: '🐸' });
    raw.emit('vote:cast', { round: 0, candidateId: 'x' }, 'not a function');
    raw.emit('host:start');
    raw.emit('unknown:event', 1, 2, 3);
    raw.emit('react');
    await sleep(50);
    expect(c.socket.connected).toBe(true);
    expect((await getJson<{ ok: boolean }>(`${url}/api/health`)).body.ok).toBe(true);
    // The ack-less create still created the room.
    await c.until('room', (v) => v.players[0].name === 'NoAck');
  });

  it('rate limits generic events, reactions and room creation', async () => {
    const { url } = await startServer();
    const c = await client(url);
    await c.create('Spammer');
    const results = await Promise.all(Array.from({ length: 45 }, () => c.socket.emitWithAck('player:update', { avatar: '🦊' })));
    expect(results.filter((r) => !r.ok && r.error === 'RATE_LIMITED').length).toBeGreaterThan(5);

    const watcher = await client(url);
    await watcher.join(c.session!.code, 'Watcher');
    for (let i = 0; i < 12; i++) c.socket.emit('react', { emoji: '🔥' });
    await sleep(150);
    expect(watcher.reactions.length).toBeGreaterThanOrEqual(1);
    expect(watcher.reactions.length).toBeLessThanOrEqual(5);

    const creator = await client(url);
    const creates = [];
    for (let i = 0; i < 12; i++) creates.push(await creator.socket.emitWithAck('room:create', { name: `R${i}`, avatar: '🐸' }));
    // Room creation is limited per IP (10 / minute); this IP already created 1 room.
    expect(creates.filter((r) => r.ok)).toHaveLength(9);
    expect(creates.at(-1)).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });

  it('answers SERVER_BUSY when the room limit is reached', async () => {
    const { url } = await startServer({ maxRooms: 1 });
    const [a, b] = await Promise.all([client(url), client(url)]);
    await a.create('A');
    expect(await b.socket.emitWithAck('room:create', { name: 'B', avatar: '🐸' })).toEqual({ ok: false, error: 'SERVER_BUSY' });
  });
});

describe('socket server: rooms swept for their age', () => {
  it('tells the sockets still attached to a room deleted by the max-age sweep', async () => {
    let offset = 0;
    const { url, app } = await startServer({ now: () => Date.now() + offset, sweepIntervalMs: 20 });
    const [a, b] = await Promise.all([client(url), client(url)]);
    const { code } = await a.create('Old');
    await b.join(code, 'Timer');
    await sleep(60);
    expect(app.registry.size).toBe(1);
    expect(a.kicked + b.kicked).toBe(0);

    offset = ROOM_MAX_AGE_MS; // a day later, both tabs still open
    await waitFor('kicked', () => a.kicked === 1 && b.kicked === 1);
    expect(app.registry.size).toBe(0);
    expect(a.socket.connected).toBe(true);
    expect(await a.socket.emitWithAck('host:settings', { voteSeconds: 0 })).toEqual({ ok: false, error: 'NOT_IN_ROOM' });
  });
});

describe('socket server: abuse limits', () => {
  const upload = (c: Client, slot: 0 | 1, data: Buffer, mime = 'image/png') =>
    c.socket.emitWithAck('photo:upload', { slot, kind: slot === 0 ? 'daron' : 'daronne', mime, data });

  it('rejects photos whose header does not parse or declares huge dimensions', async () => {
    const { url } = await startServer();
    const c = await client(url);
    await c.create('Bomber');
    expect(await upload(c, 0, PNG_BOMB)).toEqual({ ok: false, error: 'INVALID_PHOTO' });
    const garbage = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(64 * 1024)]);
    expect(await upload(c, 0, garbage, 'image/jpeg')).toEqual({ ok: false, error: 'INVALID_PHOTO' });
    expect(await upload(c, 0, JPEG, 'image/jpeg')).toMatchObject({ ok: true });
  });

  it('caps photo bytes per room (replacing a slot frees its bytes) and for the whole server', async () => {
    const { url } = await startServer({ maxRoomPhotoBytes: PNG.length * 2, maxTotalPhotoBytes: PNG.length * 3 });
    const [a, b, c] = await Promise.all([client(url), client(url), client(url)]);
    const { code } = await a.create('A');
    await b.join(code, 'B');
    expect(await upload(a, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(b, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(b, 1, PNG)).toEqual({ ok: false, error: 'PHOTO_TOO_LARGE' });
    expect(await upload(b, 0, PNG)).toMatchObject({ ok: true }); // replaces B's slot 0

    await c.create('C');
    expect(await upload(c, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(c, 1, PNG)).toEqual({ ok: false, error: 'SERVER_BUSY' });
  });

  it('limits uploads per socket and uploaded bytes per IP', async () => {
    const perSocket = await startServer({ rateLimits: { uploadBurst: 2, uploadsPerSecond: 0.001 } });
    const s = await client(perSocket.url);
    await s.create('Spam');
    expect(await upload(s, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(s, 1, PNG)).toMatchObject({ ok: true });
    expect(await upload(s, 0, PNG)).toEqual({ ok: false, error: 'RATE_LIMITED' });

    const perIp = await startServer({ rateLimits: { uploadBytesPerIp: PNG.length * 2 } });
    const [a, b] = await Promise.all([client(perIp.url), client(perIp.url)]);
    await a.create('A');
    await b.create('B');
    expect(await upload(a, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(b, 0, PNG)).toMatchObject({ ok: true });
    expect(await upload(b, 1, PNG)).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });

  it('refuses packets with more than one binary attachment', async () => {
    const { url } = await startServer();
    const c = await client(url);
    await c.create('Attach');
    const gone = new Promise<string>((resolve) => c.socket.once('disconnect', (reason) => resolve(reason)));
    c.raw.emit('photo:upload', { slot: 0, kind: 'daron', mime: 'image/png', data: PNG, more: PNG });
    expect(await gone).toBe('transport close');
  });

  it('caps concurrent connections per IP', async () => {
    const { url, app } = await startServer({ rateLimits: { connectionsPerIp: 2 } });
    const [a] = await Promise.all([client(url), client(url)]);
    const extra = new Client(url);
    clients.push(extra);
    let connected = false;
    extra.socket.on('connect', () => (connected = true));
    const reason = await new Promise<string>((resolve) => {
      extra.socket.once('disconnect', resolve);
      extra.socket.once('connect_error', (err) => resolve(err.message));
    });
    expect(reason).toBe('transport close');
    expect(connected).toBe(false);
    expect(app.io.engine.clientsCount).toBe(2);
    // A slot frees up when a connection closes.
    a.close();
    await waitFor('closed', () => app.io.engine.clientsCount === 1);
    await client(url);
  });

  it('does not trust X-Forwarded-For unless told to', async () => {
    const { url } = await startServer({ rateLimits: { roomCreatesPerMinute: 2 } });
    const results = [];
    for (let i = 0; i < 3; i++) {
      const c = await client(url, { 'x-forwarded-for': `10.0.${i}.1` });
      results.push(await c.socket.emitWithAck('room:create', { name: `R${i}`, avatar: '🐸' }));
    }
    expect(results.map((r) => r.ok)).toEqual([true, true, false]);
    expect(results[2]).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });

  it('behind a trusted proxy, keys limits on the last X-Forwarded-For entry (the one the proxy added)', async () => {
    const { url } = await startServer({ trustProxy: true, rateLimits: { roomCreatesPerMinute: 2 } });
    const create = async (xff: string, i: number) => {
      const c = await client(url, { 'x-forwarded-for': xff });
      return c.socket.emitWithAck('room:create', { name: `R${i}`, avatar: '🐸' });
    };
    // The client controls the first entries: spoofing them does not give a fresh bucket.
    const spoofed = [];
    for (let i = 0; i < 3; i++) spoofed.push(await create(`10.9.${i}.1, 203.0.113.5`, i));
    expect(spoofed.map((r) => r.ok)).toEqual([true, true, false]);
    // Another real client (another last hop) has its own bucket.
    expect(await create('203.0.113.6', 9)).toMatchObject({ ok: true });

    const peeks = await startServer({ trustProxy: true, rateLimits: { roomPeeksPerMinute: 1 } });
    const peek = (xff: string) => fetch(`${peeks.url}/api/rooms/ABCD`, { headers: { 'x-forwarded-for': xff } });
    expect((await peek('1.1.1.1, 203.0.113.5')).status).toBe(200);
    expect((await peek('2.2.2.2, 203.0.113.5')).status).toBe(429);
    expect((await peek('203.0.113.6')).status).toBe(200);
  });

  it('rate limits room peeks and joins of unknown rooms per IP (no code enumeration)', async () => {
    const { url } = await startServer({ rateLimits: { roomPeeksPerMinute: 3, roomMissesPerMinute: 2 } });
    for (let i = 0; i < 3; i++) expect((await fetch(`${url}/api/rooms/ABC${'DEF'[i]}`)).status).toBe(200);
    const limited = await fetch(`${url}/api/rooms/ABCG`);
    expect(limited.status).toBe(429);
    expect(await limited.json()).toEqual({ ok: false, error: 'RATE_LIMITED' });

    const host = await client(url);
    const { code, token } = await host.create('Host');
    const prober = await client(url);
    const join = (c: string) => prober.socket.emitWithAck('room:join', { code: c, name: 'Probe', avatar: '🐸' });
    expect(await join('QQQQ')).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    expect(await prober.socket.emitWithAck('room:rejoin', { code: 'QQQR', token, takeover: false })).toEqual({ ok: false, error: 'ROOM_NOT_FOUND' });
    // Out of misses: even a code that exists is refused for now.
    expect(await join('QQQS')).toEqual({ ok: false, error: 'RATE_LIMITED' });
    expect(await join(code)).toEqual({ ok: false, error: 'RATE_LIMITED' });
  });
});
