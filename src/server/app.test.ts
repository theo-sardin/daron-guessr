import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp, type App } from './app';

let app: App;
let url: string;
let clientDir: string;

beforeAll(async () => {
  clientDir = fs.mkdtempSync(path.join(os.tmpdir(), 'daron-client-'));
  fs.mkdirSync(path.join(clientDir, 'assets'));
  fs.writeFileSync(path.join(clientDir, 'index.html'), '<!doctype html><title>Daron Guessr</title>');
  fs.writeFileSync(path.join(clientDir, 'assets', 'app-abc123.js'), 'console.log(1)');
  fs.writeFileSync(path.join(clientDir, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
  app = createApp({ clientDir });
  await new Promise<void>((resolve) => app.httpServer.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${(app.httpServer.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await app.close();
  fs.rmSync(clientDir, { recursive: true, force: true });
});

describe('http app', () => {
  it('serves the client with the right caching', async () => {
    const index = await fetch(`${url}/`);
    expect(index.status).toBe(200);
    expect(index.headers.get('cache-control')).toBe('no-cache');
    expect(await index.text()).toContain('Daron Guessr');

    const asset = await fetch(`${url}/assets/app-abc123.js`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect((await fetch(`${url}/favicon.svg`)).status).toBe(200);
  });

  it('falls back to index.html for client routes only', async () => {
    const room = await fetch(`${url}/ABCD`);
    expect(room.status).toBe(200);
    expect(room.headers.get('cache-control')).toBe('no-cache');
    expect(await room.text()).toContain('Daron Guessr');

    expect((await fetch(`${url}/assets/missing.js`)).status).toBe(404);
    expect((await fetch(`${url}/photos/ABCD/nope`)).status).toBe(404);
    const api = await fetch(`${url}/api/nope`);
    expect(api.status).toBe(404);
    expect(await api.json()).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect((await fetch(`${url}/ABCD`, { method: 'POST' })).status).toBe(404);
  });

  it('reports health and peeks at unknown rooms', async () => {
    expect(await (await fetch(`${url}/api/health`)).json()).toEqual({ ok: true, rooms: 0 });
    expect(await (await fetch(`${url}/api/rooms/abcd`)).json()).toEqual({ code: 'ABCD', exists: false });
  });

  it('closes cleanly even when it never listened', async () => {
    const idle = createApp();
    await expect(idle.close()).resolves.toBeUndefined();
  });
});
