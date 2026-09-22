import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import { prisma, disconnectDb } from '../db/client.js';

describe('Database & Prisma 7 Connectivity', () => {
  after(async () => {
    await disconnectDb();
  });

  it('should establish connection and query seeded services', async () => {
    const services = await prisma.service.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });

    assert.ok(services.length >= 3);
    const codes = services.map((s) => s.code);
    assert.ok(codes.includes('ADH'));
    assert.ok(codes.includes('DOM'));
    assert.ok(codes.includes('REV'));
  });

  it('should query seeded counters', async () => {
    const counters = await prisma.counter.findMany({
      orderBy: { counterNumber: 'asc' },
    });

    assert.ok(counters.length >= 3);
    assert.equal(counters[0].counterNumber, 1);
  });

  it('should verify device security: key_hash exists and is non-empty', async () => {
    const devices = await prisma.device.findMany();

    assert.ok(devices.length >= 2);
    for (const device of devices) {
      assert.ok(typeof device.keyHash === 'string');
      assert.equal(device.keyHash.length, 64); // SHA-256 hex string
    }
  });

  it('should query footfall events with idempotency key', async () => {
    const events = await prisma.footfallEvent.findMany({
      include: { device: true },
    });

    assert.ok(events.length >= 3);
    for (const ev of events) {
      assert.ok(ev.clientEventId.startsWith('seed-event-'));
      assert.ok(ev.device !== null);
    }
  });
});
