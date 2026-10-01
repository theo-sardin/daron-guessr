import { io, type Socket } from 'socket.io-client';
import {
  AVATARS,
  BLUR_VARIANT_WIDTHS,
  defaultKindForSlot,
  type AckResult,
  type ClientToServerEvents,
  type RoomView,
  type ServerToClientEvents,
  type Session,
} from '../src/shared/protocol';
import { makeFacePng } from './png';

type BotSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export interface Bot {
  name: string;
  socket: BotSocket;
  session: Session;
  view: () => RoomView | null;
  stop: () => void;
}

const BOT_NAMES = ['Robodaron', 'Botine', 'Clanky', 'Mecha Mamie', 'R2-Papa', 'Beep Boop', 'Tata Tron', 'Tonton 3000'];

function emitAck<T extends object>(socket: BotSocket, event: string, ...args: unknown[]): Promise<AckResult<T>> {
  return new Promise((resolve) => {
    (socket.timeout(10_000) as unknown as { emit: (e: string, ...a: unknown[]) => void }).emit(
      event,
      ...args,
      (err: Error | null, res: AckResult<T>) => resolve(err ? { ok: false, error: 'SERVER_ERROR' } : res),
    );
  });
}

/**
 * A scripted player: joins a room over Socket.IO, fills every active photo slot of the room
 * (`settings.photosPerPlayer`, at most `opts.photos`) with a generated photo of the theme's
 * default kind for that slot (with its blur variants, like the web client), and votes randomly
 * whenever a round opens.
 */
export async function spawnBot(
  baseUrl: string,
  code: string,
  index: number,
  opts: { photos?: number; selfie?: boolean } = {},
): Promise<Bot> {
  const socket: BotSocket = io(baseUrl, { transports: ['websocket'], forceNew: true });
  await new Promise<void>((resolve, reject) => {
    socket.once('connect', () => resolve());
    socket.once('connect_error', reject);
  });

  let view: RoomView | null = null;
  const votedRounds = new Set<number>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  // The join ack comes before the first view: wait for it to know the room's settings.
  const firstView = new Promise<RoomView>((resolve) => socket.once('room:state', resolve));

  socket.on('room:state', (v) => {
    view = v;
    const voting = v.voting;
    if (v.phase === 'voting' && voting && !votedRounds.has(voting.round) && voting.candidates.length) {
      votedRounds.add(voting.round);
      const delay = Math.max(0, voting.startsAt - v.serverNow) + 300 + Math.random() * 900;
      const t = setTimeout(() => {
        timers.delete(t);
        const pick = voting.candidates[Math.floor(Math.random() * voting.candidates.length)];
        void emitAck(socket, 'vote:cast', { round: voting.round, candidateId: pick });
      }, delay);
      timers.add(t);
    }
  });

  const name = BOT_NAMES[index % BOT_NAMES.length];
  const joined = await emitAck<{ session: Session }>(socket, 'room:join', { code, name, avatar: AVATARS[(index * 7 + 3) % AVATARS.length] });
  if (!joined.ok) throw new Error(`bot ${name} could not join: ${joined.error}`);

  const { settings } = await firstView;
  const photos = Math.min(opts.photos ?? settings.photosPerPlayer, settings.photosPerPlayer);
  for (let slot = 0; slot < photos; slot++) {
    const seed = index * 10 + slot + 1;
    const res = await emitAck(socket, 'photo:upload', {
      slot,
      kind: defaultKindForSlot(settings.theme, slot),
      mime: 'image/png',
      data: makeFacePng(seed),
      // Same face at every blur step's width (the server checks each one's dimensions).
      variants: BLUR_VARIANT_WIDTHS.map((width) => makeFacePng(seed, width)),
    });
    if (!res.ok) throw new Error(`bot ${name} upload failed: ${res.error}`);
  }

  if (opts.selfie) {
    const res = await emitAck(socket, 'player:selfie', { mime: 'image/png', data: makeFacePng(index * 10 + 9, 160) });
    if (!res.ok) throw new Error(`bot ${name} selfie failed: ${res.error}`);
  }

  return {
    name,
    socket,
    session: joined.session,
    view: () => view,
    stop: () => {
      timers.forEach(clearTimeout);
      socket.disconnect();
    },
  };
}
