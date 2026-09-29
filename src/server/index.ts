/** Entry point: `tsx src/server/index.ts` in dev, `node dist/server/index.js` once bundled. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from './app';

const PORT = Number(process.env.PORT ?? 3001);
const PRODUCTION = process.env.NODE_ENV === 'production';

/**
 * Built layout: dist/server/index.js -> dist/client. When running from source
 * (src/server/index.ts) `../client` would be the React sources, so use dist/client too.
 */
function resolveClientDir(): string | undefined {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const fromSource = import.meta.url.endsWith('.ts');
  const dir = path.resolve(here, fromSource ? '../../dist/client' : '../client');
  return PRODUCTION || fs.existsSync(dir) ? dir : undefined;
}

const clientDir = resolveClientDir();
const app = createApp({
  clientDir,
  corsAnyOrigin: !PRODUCTION,
  trustProxy: process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true',
});

app.httpServer.listen(PORT, () => {
  console.log(`Daron Guessr server listening on http://localhost:${PORT}`);
  if (clientDir) console.log(`Serving client from ${clientDir}`);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down`);
  setTimeout(() => process.exit(1), 5000).unref();
  await app.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
