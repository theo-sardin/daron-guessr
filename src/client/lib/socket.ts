import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol';

export type GameSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

/**
 * Single shared connection. Same origin in production; in dev Vite proxies /socket.io
 * to the game server.
 */
export const socket: GameSocket = io({
  autoConnect: true,
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionDelay: 500,
  reconnectionDelayMax: 3000,
});
