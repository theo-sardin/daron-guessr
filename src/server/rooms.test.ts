import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, type RoomSetup } from '../shared/protocol';
import * as g from './game';
import { ROOM_IDLE_MS, ROOM_MAX_AGE_MS, RoomRegistry } from './rooms';
import { PNG_BYTES, addPhoto, addSelfie, newSelfie, unwrap } from './testUtils';

const host = (name: string) => ({ name, avatar: '🐸' });

describe('RoomRegistry.sweep', () => {
  it('deletes rooms idle for ROOM_IDLE_MS, counted from the last disconnect', () => {
    const registry = new RoomRegistry();
    const idle = unwrap(registry.create(host('Idle'), 0));
    const busy = unwrap(registry.create(host('Busy'), 0));
    g.disconnectPlayer(idle.room, idle.player.id, 1000);

    expect(registry.sweep(1000 + ROOM_IDLE_MS - 1)).toEqual([]);
    expect(registry.size).toBe(2);
    expect(registry.sweep(1000 + ROOM_IDLE_MS)).toEqual([idle.room]);
    expect(registry.get(idle.room.code)).toBeUndefined();
    // A room with a connected player is never idle.
    expect(registry.get(busy.room.code)).toBe(busy.room);
  });

  it('deletes rooms with a connected player only once they reach ROOM_MAX_AGE_MS', () => {
    const registry = new RoomRegistry();
    const { room } = unwrap(registry.create(host('Forever'), 500));
    expect(registry.sweep(500 + ROOM_MAX_AGE_MS - 1)).toEqual([]);
    expect(registry.sweep(500 + ROOM_MAX_AGE_MS)).toEqual([room]);
    expect(registry.size).toBe(0);
  });

  it('deletes empty rooms right away', () => {
    const registry = new RoomRegistry();
    const { room, player } = unwrap(registry.create(host('Solo'), 0));
    unwrap(g.leaveRoom(room, player.id, 10));
    expect(g.isRoomEmpty(room)).toBe(true);
    expect(registry.sweep(11)).toEqual([room]);
    expect(registry.size).toBe(0);
  });
});

describe('RoomRegistry.create', () => {
  it('starts the room with the game mode picked on the home screen', () => {
    const registry = new RoomRegistry();
    const { room, player } = unwrap(registry.create(host('Host'), 0, { theme: 'pick' }));
    expect(room.settings).toEqual({ ...DEFAULT_SETTINGS, theme: 'pick', photosPerPlayer: 1 });
    expect(room.hostId).toBe(player.id);
    expect(unwrap(registry.create(host('Other'), 0, { theme: 'family', photosPerPlayer: 3 })).room.settings).toMatchObject({
      theme: 'family',
      photosPerPlayer: 3,
    });
    expect(unwrap(registry.create(host('Plain'), 0)).room.settings).toEqual(DEFAULT_SETTINGS);
    expect(registry.size).toBe(3);
  });

  it('registers nothing when the setup is invalid', () => {
    const registry = new RoomRegistry();
    for (const setup of [{ theme: 'cousins' }, { theme: 'mix', photosPerPlayer: 5 }] as unknown as RoomSetup[]) {
      expect(registry.create(host('Host'), 0, setup)).toEqual({ ok: false, error: 'BAD_REQUEST' });
    }
    expect(registry.size).toBe(0);
  });
});

describe('RoomRegistry.photoBytes', () => {
  it('counts the game photos and selfies of every room, and forgets deleted rooms', () => {
    const registry = new RoomRegistry();
    const one = unwrap(registry.create(host('One'), 0));
    const two = unwrap(registry.create(host('Two'), 0));
    addPhoto(one.room, one.player.id);
    unwrap(g.setSelfie(one.room, one.player.id, newSelfie('big', Buffer.alloc(100, 1)), 0));
    addSelfie(two.room, two.player.id);
    expect(registry.photoBytes()).toBe(2 * PNG_BYTES.byteLength + 100);

    // A room deleted by the sweep (idle, its player still seated) or explicitly takes its images along.
    g.disconnectPlayer(two.room, two.player.id, 1);
    expect(registry.sweep(1 + ROOM_IDLE_MS)).toEqual([two.room]);
    expect(registry.photoBytes()).toBe(PNG_BYTES.byteLength + 100);
    expect(registry.delete(one.room.code)).toBe(true);
    expect(registry.photoBytes()).toBe(0);
  });
});
