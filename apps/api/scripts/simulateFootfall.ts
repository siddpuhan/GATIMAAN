import dotenv from 'dotenv';
import { FootfallEventType, IngestFootfallInput } from '@gatimaan/shared';

dotenv.config({ path: '.env' });

interface SimulatorConfig {
  mode: 'live' | 'burst' | 'offline-replay';
  gateId: string;
  deviceKey: string;
  apiUrl: string;
  ratePerMin: number;
  durationSec: number;
}

function parseArgs(): SimulatorConfig {
  const args = process.argv.slice(2);
  const config: SimulatorConfig = {
    mode: 'live',
    gateId: process.env.SIM_DEVICE_ID || 'GATE-01',
    deviceKey: process.env.SIM_DEVICE_KEY || 'dev-gate-secret-01',
    apiUrl: process.env.API_BASE_URL || process.env.VITE_API_BASE_URL || 'http://localhost:8000',
    ratePerMin: 10,
    durationSec: 60,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
GATIMAAN IoT Footfall Simulator
Usage:
  npm run simulate:footfall -- [options]

Options:
  --mode=<live|burst|offline-replay>   Simulation mode (default: live)
  --gate=<deviceId>                   Device ID (default: GATE-01)
  --key=<secretKey>                   Device secret key (default: dev-gate-secret-01)
  --url=<baseUrl>                     API base URL (default: http://localhost:8000)
  --rate=<eventsPerMin>               Rate of events per minute (default: 10)
  --duration=<seconds>                Duration in seconds for live mode (default: 60)
  --help, -h                          Show this help message
      `);
      process.exit(0);
    }
    if (arg.startsWith('--mode=')) {
      const mode = arg.split('=')[1] as SimulatorConfig['mode'];
      if (['live', 'burst', 'offline-replay'].includes(mode)) {
        config.mode = mode;
      }
    } else if (arg.startsWith('--gate=')) {
      config.gateId = arg.split('=')[1];
    } else if (arg.startsWith('--key=')) {
      config.deviceKey = arg.split('=')[1];
    } else if (arg.startsWith('--url=')) {
      config.apiUrl = arg.split('=')[1];
    } else if (arg.startsWith('--rate=')) {
      config.ratePerMin = parseInt(arg.split('=')[1], 10) || 10;
    } else if (arg.startsWith('--duration=')) {
      config.durationSec = parseInt(arg.split('=')[1], 10) || 60;
    }
  }

  return config;
}

async function sendSingleEvent(
  config: SimulatorConfig,
  event: IngestFootfallInput
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${config.apiUrl}/api/iot/footfall`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': config.gateId,
      'x-device-key': config.deviceKey,
    },
    body: JSON.stringify(event),
  });

  const body = await res.json();
  return { status: res.status, body };
}

async function sendBatchEvents(
  config: SimulatorConfig,
  events: IngestFootfallInput[]
): Promise<{ status: number; body: unknown }> {
  const res = await fetch(`${config.apiUrl}/api/iot/footfall/batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-device-id': config.gateId,
      'x-device-key': config.deviceKey,
    },
    body: JSON.stringify({ events }),
  });

  const body = await res.json();
  return { status: res.status, body };
}

function generateEventId(prefix = 'evt'): string {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 9000) + 1000;
  return `${prefix}_${ts}_${rand}`;
}

async function runLiveSimulation(config: SimulatorConfig) {
  console.log(`[Simulator] Starting LIVE footfall stream for Gate: ${config.gateId}`);
  console.log(`[Simulator] Rate: ${config.ratePerMin} events/min • Duration: ${config.durationSec}s`);
  console.log(`[Simulator] Target Endpoint: ${config.apiUrl}/api/iot/footfall\n`);

  const intervalMs = Math.floor(60000 / config.ratePerMin);
  const startTime = Date.now();
  const endTime = startTime + config.durationSec * 1000;
  let count = 0;
  let lastEventId: string | null = null;

  while (Date.now() < endTime) {
    count++;
    // In morning/peak profile, 70% IN, 30% OUT
    const isEntry = Math.random() < 0.7;
    const eventType = isEntry ? FootfallEventType.IN : FootfallEventType.OUT;

    // Every 5th event, test idempotency by resending the previous clientEventId
    const isDuplicateTest = count % 5 === 0 && lastEventId !== null;
    const clientEventId = isDuplicateTest ? lastEventId : generateEventId(config.gateId.toLowerCase());
    if (!isDuplicateTest) {
      lastEventId = clientEventId;
    }

    const payload: IngestFootfallInput = {
      clientEventId,
      eventType,
      occurredAt: new Date().toISOString(),
      metadata: {
        simulator: true,
        testIteration: count,
        isDuplicateTest,
      },
    };

    try {
      const { status, body } = await sendSingleEvent(config, payload);
      const b = body as { currentOccupancy?: number; isDuplicate?: boolean; error?: string };
      const dupFlag = b.isDuplicate ? ' [DUPLICATE - IDEMPOTENT OK]' : '';
      console.log(
        `[${new Date().toLocaleTimeString()}] #${count} [${status}] Gate ${config.gateId} -> ${eventType} | ClientEventId: ${clientEventId} | Live Occupancy: ${b.currentOccupancy ?? 'N/A'}${dupFlag}`
      );
    } catch (err: unknown) {
      console.error(`[Simulator] Request failed:`, err instanceof Error ? err.message : err);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  console.log(`\n[Simulator] Live stream completed. Total events simulated: ${count}`);
}

async function runBurstSimulation(config: SimulatorConfig) {
  console.log(`[Simulator] Starting BURST footfall simulation (Group arrival at ${config.gateId})...`);
  const burstSize = 15;
  const events: IngestFootfallInput[] = Array.from({ length: burstSize }, (_, i) => ({
    clientEventId: generateEventId(`burst_${i + 1}`),
    eventType: FootfallEventType.IN,
    occurredAt: new Date().toISOString(),
    metadata: { burstBatch: true, index: i + 1 },
  }));

  const promises = events.map((ev) => sendSingleEvent(config, ev));
  const results = await Promise.all(promises);

  console.log(`[Simulator] Fired ${burstSize} concurrent entry events simultaneously.`);
  results.forEach((res, i) => {
    const b = res.body as { currentOccupancy?: number };
    console.log(`  -> Event #${i + 1} Status: ${res.status} | Net Occupancy: ${b.currentOccupancy}`);
  });
}

async function runOfflineReplaySimulation(config: SimulatorConfig) {
  console.log(`[Simulator] Starting OFFLINE BATCH REPLAY simulation (Device recovered from Wi-Fi drop)...`);
  const batchSize = 10;
  const now = Date.now();

  const events: IngestFootfallInput[] = Array.from({ length: batchSize }, (_, i) => {
    // Stagger timestamps over the past 10 minutes
    const occurredAt = new Date(now - (batchSize - i) * 60000).toISOString();
    return {
      clientEventId: generateEventId(`offline_${i + 1}`),
      eventType: i % 3 === 0 ? FootfallEventType.OUT : FootfallEventType.IN,
      occurredAt,
      metadata: { offlineBuffered: true, sequence: i + 1 },
    };
  });

  // Inject a duplicate in the batch to test batch deduplication
  events.push({ ...events[0] });

  console.log(`[Simulator] Submitting batch of ${events.length} events to /api/iot/footfall/batch...`);
  const { status, body } = await sendBatchEvents(config, events);
  console.log(`[Simulator] Batch Replay Response [HTTP ${status}]:`, JSON.stringify(body, null, 2));
}

async function main() {
  const config = parseArgs();
  console.log('====================================================');
  console.log('  GATIMAAN IoT Footfall Simulator (Phase 11)');
  console.log('====================================================');

  if (config.mode === 'burst') {
    await runBurstSimulation(config);
  } else if (config.mode === 'offline-replay') {
    await runOfflineReplaySimulation(config);
  } else {
    await runLiveSimulation(config);
  }
}

main().catch((err) => {
  console.error('[Simulator Fatal Error]:', err);
  process.exit(1);
});
