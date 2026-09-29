import { describe, expect, it } from 'vitest';
import * as g from './game';
import { ROOM_IDLE_MS, ROOM_MAX_AGE_MS, RoomRegistry } from './rooms';
import { unwrap } from './testUtils';

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
