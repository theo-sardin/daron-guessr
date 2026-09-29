/** HTTP server: API routes, photo serving, static client (production) and Socket.IO. */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import express, { type Express } from 'express';
import { Server } from 'socket.io';
import { MAX_PHOTO_BYTES, normalizeRoomCode, type RoomPeek } from '../shared/protocol';
import { DEFAULT_TIMING, type Rng, type Timing } from './game';
import { RoomRegistry } from './rooms';
import { attachGameServer, type IoServer, type Logger, type RateLimits } from './socket';
import { peekRoom } from './views';

export interface AppOptions {
  /** Built client to serve (with SPA fallback). Ignored when the directory does not exist. */
  clientDir?: string;
  /** Engine timing overrides (tests). Defaults to the protocol constants. */
  timing?: Partial<Timing>;
  now?: () => number;
  rng?: Rng;
  rateLimits?: Partial<RateLimits>;
  maxRooms?: number;
  /** Allow cross-origin Socket.IO connections (dev only; Vite proxies anyway). */
  corsAnyOrigin?: boolean;
  /** Trust X-Forwarded-For (behind a reverse proxy). */
  trustProxy?: boolean;
  sweepIntervalMs?: number;
  logger?: Logger;
}

export interface App {
  httpServer: http.Server;
  io: IoServer;
  registry: RoomRegistry;
  close(): Promise<void>;
}

const DEFAULT_SWEEP_INTERVAL_MS = 60_000;
/** Room for the Socket.IO envelope around the largest accepted photo. */
const SOCKET_BUFFER_BYTES = MAX_PHOTO_BYTES + 256 * 1024;

export function createApp(options: AppOptions = {}): App {
  const logger = options.logger ?? console;
  const registry = new RoomRegistry({ maxRooms: options.maxRooms, timing: { ...DEFAULT_TIMING, ...options.timing } });
  const app = express();
  app.disable('x-powered-by');
  if (options.trustProxy) app.set('trust proxy', true);
  mountApi(app, registry);
  if (options.clientDir) mountClient(app, options.clientDir, logger);

  const httpServer = http.createServer(app);
  const io: IoServer = new Server(httpServer, {
    maxHttpBufferSize: SOCKET_BUFFER_BYTES,
    serveClient: false,
    pingInterval: 15_000,
    pingTimeout: 10_000,
    cors: options.corsAnyOrigin ? { origin: true } : undefined,
  });
  const game = attachGameServer(io, {
    registry,
    now: options.now,
    rng: options.rng,
    rateLimits: options.rateLimits,
    trustProxy: options.trustProxy,
    logger,
  });
  const sweeper = setInterval(() => game.sweep(), options.sweepIntervalMs ?? DEFAULT_SWEEP_INTERVAL_MS);
  sweeper.unref();

  return {
    httpServer,
    io,
    registry,
    close: async () => {
      clearInterval(sweeper);
      game.dispose();
      // Also closes the HTTP server; an error only means it was not listening.
      await new Promise<void>((resolve) => void io.close(() => resolve()));
    },
  };
}

function mountApi(app: Express, registry: RoomRegistry): void {
  app.get('/api/health', (_req, res) => {
    res.set('Cache-Control', 'no-store').json({ ok: true, rooms: registry.size });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = normalizeRoomCode(req.params.code);
    const room = registry.get(code);
    const peek: RoomPeek = room ? peekRoom(room) : { code, exists: false };
    res.set('Cache-Control', 'no-store').json(peek);
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ ok: false, error: 'NOT_FOUND' });
  });

  app.get('/photos/:code/:photoId', (req, res) => {
    const room = registry.get(req.params.code);
    const photo = room?.photos.find((ph) => ph.id === req.params.photoId);
    if (!photo) {
      res.status(404).type('text/plain').send('Not found');
      return;
    }
    res.set({
      'Content-Type': photo.mime,
      'Cache-Control': 'private, max-age=86400',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(photo.data);
  });
}

const NO_SPA_FALLBACK = /^\/(api|photos|socket\.io|assets)(\/|$)/;

function mountClient(app: Express, clientDir: string, logger: Logger): void {
  const indexHtml = path.join(clientDir, 'index.html');
  if (!fs.existsSync(clientDir)) {
    logger.warn(`[server] client directory not found, not serving it: ${clientDir}`);
    return;
  }
  app.use(
    express.static(clientDir, {
      setHeaders(res, filePath) {
        const rel = path.relative(clientDir, filePath).split(path.sep);
        // Vite fingerprints everything under /assets, the HTML must always be revalidated.
        if (rel[0] === 'assets') res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        else if (rel[rel.length - 1] === 'index.html') res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );
  app.use((req, res, next) => {
    if ((req.method !== 'GET' && req.method !== 'HEAD') || NO_SPA_FALLBACK.test(req.path) || !fs.existsSync(indexHtml)) {
      next();
      return;
    }
    res.set('Cache-Control', 'no-cache').sendFile(indexHtml);
  });
}
