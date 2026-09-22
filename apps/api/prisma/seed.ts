import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { prisma, disconnectDb } from '../src/db/client.js';

dotenv.config({ path: '.env' });

function hashKey(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

async function main() {
  console.log('[Seed] Starting idempotent database seed...');

  // 1. Seed Services
  const servicesData = [
    {
      code: 'ADH',
      name: 'Aadhaar Card Services',
      description: 'Aadhaar enrollment, biometric update, address update',
      prefix: 'A',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'DOM',
      name: 'Domicile & Income Certificate',
      description: 'State domicile, caste and income certificate issuance',
      prefix: 'D',
      avgDurationMinutes: 20,
      priority: 1,
      isActive: true,
    },
    {
      code: 'REV',
      name: 'Revenue & Land Records',
      description: 'Khasra, B-1 copy, land mutation, property tax services',
      prefix: 'R',
      avgDurationMinutes: 25,
      priority: 2,
      isActive: true,
    },
  ];

  const seededServices = [];
  for (const s of servicesData) {
    const service = await prisma.service.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        description: s.description,
        prefix: s.prefix,
        avgDurationMinutes: s.avgDurationMinutes,
        priority: s.priority,
        isActive: s.isActive,
      },
      create: s,
    });
    seededServices.push(service);
  }
  console.log(`[Seed] Seeded ${seededServices.length} canonical services.`);

  // 2. Seed Counters
  const countersData = [
    { counterNumber: 1, name: 'Counter 1 (General)', isActive: true },
    { counterNumber: 2, name: 'Counter 2 (Certificates)', isActive: true },
    { counterNumber: 3, name: 'Counter 3 (Revenue & Land)', isActive: true },
  ];

  const seededCounters = [];
  for (const c of countersData) {
    const counter = await prisma.counter.upsert({
      where: { counterNumber: c.counterNumber },
      update: { name: c.name, isActive: c.isActive },
      create: c,
    });
    seededCounters.push(counter);
  }
  console.log(`[Seed] Seeded ${seededCounters.length} counters.`);

  // 3. Seed Hardware Devices (Development/demo hashed keys)
  const devicesData = [
    {
      deviceId: 'GATE-01',
      deviceType: 'GATE' as const,
      name: 'Main Entry Gate 1',
      location: 'Ground Floor Entry',
      keyHash: hashKey('dev-gate-secret-01'),
      isActive: true,
    },
    {
      deviceId: 'KIOSK-01',
      deviceType: 'KIOSK' as const,
      name: 'Self-Service Kiosk 1',
      location: 'Reception Lobby',
      keyHash: hashKey('dev-kiosk-secret-01'),
      isActive: true,
    },
  ];

  const seededDevices = [];
  for (const d of devicesData) {
    const device = await prisma.device.upsert({
      where: { deviceId: d.deviceId },
      update: {
        deviceType: d.deviceType,
        name: d.name,
        location: d.location,
        keyHash: d.keyHash,
        isActive: d.isActive,
      },
      create: d,
    });
    seededDevices.push(device);
  }
  console.log(`[Seed] Seeded ${seededDevices.length} hardware devices.`);

  // 4. Seed Synthetic Footfall Events & Snapshots for Prediction Bootstrap
  const baseTime = new Date();
  baseTime.setHours(baseTime.getHours() - 2);

  const footfallEventsData = [
    {
      deviceId: seededDevices[0].id,
      clientEventId: 'seed-event-001',
      eventType: 'IN' as const,
      occurredAt: new Date(baseTime.getTime() + 5 * 60 * 1000),
      metadata: { isSeed: true, simulated: true },
    },
    {
      deviceId: seededDevices[0].id,
      clientEventId: 'seed-event-002',
      eventType: 'IN' as const,
      occurredAt: new Date(baseTime.getTime() + 15 * 60 * 1000),
      metadata: { isSeed: true, simulated: true },
    },
    {
      deviceId: seededDevices[0].id,
      clientEventId: 'seed-event-003',
      eventType: 'OUT' as const,
      occurredAt: new Date(baseTime.getTime() + 45 * 60 * 1000),
      metadata: { isSeed: true, simulated: true },
    },
  ];

  for (const ev of footfallEventsData) {
    await prisma.footfallEvent.upsert({
      where: {
        deviceId_clientEventId: {
          deviceId: ev.deviceId,
          clientEventId: ev.clientEventId,
        },
      },
      update: {
        eventType: ev.eventType,
        occurredAt: ev.occurredAt,
        metadata: ev.metadata,
      },
      create: ev,
    });
  }
  console.log(`[Seed] Seeded ${footfallEventsData.length} bootstrap footfall events.`);

  // 5. Seed Synthetic Prediction Snapshot
  const adhService = seededServices.find((s) => s.code === 'ADH');
  if (adhService) {
    const existingSnapshot = await prisma.predictionSnapshot.findFirst({
      where: {
        serviceId: adhService.id,
        recommendation: 'Seed baseline bootstrap',
      },
    });

    if (!existingSnapshot) {
      await prisma.predictionSnapshot.create({
        data: {
          serviceId: adhService.id,
          timestamp: new Date(),
          predictedWaitSeconds: 900,
          predictedFootfall: 15,
          demandLevel: 'MEDIUM',
          recommendation: 'Seed baseline bootstrap',
        },
      });
      console.log('[Seed] Created bootstrap prediction snapshot.');
    }
  }

  console.log('[Seed] Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('[Seed] Error running seed script:', e);
    process.exit(1);
  })
  .finally(async () => {
    await disconnectDb();
  });
