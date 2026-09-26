import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { prisma, disconnectDb } from '../src/db/client.js';

dotenv.config({ path: '.env' });

function hashKey(secret: string): string {
  return crypto.createHash('sha256').update(secret).digest('hex');
}

async function main() {
  console.log('[Seed] Starting idempotent database seed...');

  // 1. Seed Services (10 Realistic Indian / MP Citizen Service Categories)
  const servicesData = [
    {
      code: 'DOM',
      name: 'Domicile / Local Resident Certificate',
      description: 'State domicile & resident certificate issuance (स्थानीय निवासी प्रमाण पत्र) • Revenue / Tehsil Services',
      prefix: 'DOM',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'INC',
      name: 'Income Certificate',
      description: 'State income certificate verification & issuance (आय प्रमाण पत्र) • Revenue / Tehsil Services',
      prefix: 'INC',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'CAST',
      name: 'Caste Certificate',
      description: 'SC / ST / OBC caste certificate issuance & verification (जाति प्रमाण पत्र) • Revenue / Tehsil Services',
      prefix: 'CAST',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'EWS',
      name: 'EWS Income & Asset Certificate',
      description: 'Economically Weaker Section certificate (EWS आय एवं संपत्ति प्रमाण पत्र) • Revenue / Tehsil Services',
      prefix: 'EWS',
      avgDurationMinutes: 20,
      priority: 1,
      isActive: true,
    },
    {
      code: 'LAND',
      name: 'Land Records — Khasra / B-1 / Naksha',
      description: 'Certified Khasra, B-1 copy and map search (भू-अभिलेख) • Revenue / Land Records',
      prefix: 'LAND',
      avgDurationMinutes: 20,
      priority: 2,
      isActive: true,
    },
    {
      code: 'BTH',
      name: 'Birth Certificate Services',
      description: 'Digital birth registration & certificate issuance (जन्म प्रमाण पत्र) • Municipal / Local Body Services',
      prefix: 'BTH',
      avgDurationMinutes: 15,
      priority: 2,
      isActive: true,
    },
    {
      code: 'DTH',
      name: 'Death Certificate Services',
      description: 'Digital death registration & certificate issuance (मृत्यु प्रमाण पत्र) • Municipal / Local Body Services',
      prefix: 'DTH',
      avgDurationMinutes: 15,
      priority: 2,
      isActive: true,
    },
    {
      code: 'SAM',
      name: 'Samagra ID / e-KYC Assistance',
      description: 'Samagra family ID update, member addition & e-KYC (समग्र ID / ई-KYC) • Citizen Services',
      prefix: 'SAM',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'AAD',
      name: 'Aadhaar Enrollment / Update Assistance',
      description: 'Biometric update, mobile linking & demographic correction (आधार नामांकन / अपडेट) • Aadhaar / Citizen Services',
      prefix: 'AAD',
      avgDurationMinutes: 15,
      priority: 1,
      isActive: true,
    },
    {
      code: 'ELEC',
      name: 'Electricity Bill / Utility Payment',
      description: 'MPPKVVCL / DISCOM electricity bill payment (बिजली बिल / उपयोगिता भुगतान) • Utility Services',
      prefix: 'ELEC',
      avgDurationMinutes: 10,
      priority: 3,
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

  // Clean up non-canonical test services, tickets, and predictions
  const canonicalCodes = servicesData.map((s) => s.code);
  const nonCanonicalServices = await prisma.service.findMany({
    where: { code: { notIn: canonicalCodes } },
    select: { id: true },
  });
  if (nonCanonicalServices.length > 0) {
    const nonCanonicalIds = nonCanonicalServices.map((s) => s.id);
    await prisma.ticket.deleteMany({ where: { serviceId: { in: nonCanonicalIds } } });
    await prisma.predictionSnapshot.deleteMany({ where: { serviceId: { in: nonCanonicalIds } } });
    await prisma.service.deleteMany({ where: { id: { in: nonCanonicalIds } } });
    console.log(`[Seed] Purged ${nonCanonicalServices.length} non-canonical test services.`);
  }

  console.log(`[Seed] Seeded ${seededServices.length} canonical services.`);

  // 2. Seed Counters (6 Realistic Service-Center Desks)
  const countersData = [
    { counterNumber: 1, name: 'Citizen Help Desk', isActive: true },
    { counterNumber: 2, name: 'Certificate Services', isActive: true },
    { counterNumber: 3, name: 'Revenue & Land Records', isActive: true },
    { counterNumber: 4, name: 'Citizen Registration', isActive: true },
    { counterNumber: 5, name: 'Aadhaar Services', isActive: true },
    { counterNumber: 6, name: 'Payments & Utility Services', isActive: true },
  ];

  // Purge test counters > 6
  const canonicalCounterNumbers = countersData.map((c) => c.counterNumber);
  const nonCanonicalCounters = await prisma.counter.findMany({
    where: { counterNumber: { notIn: canonicalCounterNumbers } },
    select: { id: true },
  });
  if (nonCanonicalCounters.length > 0) {
    const nonCanonicalCounterIds = nonCanonicalCounters.map((c) => c.id);
    await prisma.counterSession.deleteMany({ where: { counterId: { in: nonCanonicalCounterIds } } });
    await prisma.ticket.deleteMany({ where: { counterId: { in: nonCanonicalCounterIds } } });
    await prisma.counter.deleteMany({ where: { id: { in: nonCanonicalCounterIds } } });
    console.log(`[Seed] Purged ${nonCanonicalCounters.length} non-canonical test counters.`);
  }

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
  const aadService = seededServices.find((s) => s.code === 'AAD');
  if (aadService) {
    const existingSnapshot = await prisma.predictionSnapshot.findFirst({
      where: {
        serviceId: aadService.id,
        recommendation: 'Seed baseline bootstrap',
      },
    });

    if (!existingSnapshot) {
      await prisma.predictionSnapshot.create({
        data: {
          serviceId: aadService.id,
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
