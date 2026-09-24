import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DemandLevel } from '@gatimaan/shared';
import { etaService } from '../services/etaService.js';

describe('Phase 10 — ETA & Waiting-Time Engine Unit Tests', () => {
  describe('Demand Level Classification', () => {
    it('should classify wait time <= 10 mins (600s) as LOW', () => {
      assert.equal(etaService.determineDemandLevel(0), DemandLevel.LOW);
      assert.equal(etaService.determineDemandLevel(300), DemandLevel.LOW);
      assert.equal(etaService.determineDemandLevel(600), DemandLevel.LOW);
      assert.equal(etaService.determineDemandLevel(null), DemandLevel.LOW);
      assert.equal(etaService.determineDemandLevel(undefined), DemandLevel.LOW);
    });

    it('should classify wait time > 10 mins and <= 25 mins (1500s) as MEDIUM', () => {
      assert.equal(etaService.determineDemandLevel(601), DemandLevel.MEDIUM);
      assert.equal(etaService.determineDemandLevel(1200), DemandLevel.MEDIUM);
      assert.equal(etaService.determineDemandLevel(1500), DemandLevel.MEDIUM);
    });

    it('should classify wait time > 25 mins and <= 45 mins (2700s) as HIGH', () => {
      assert.equal(etaService.determineDemandLevel(1501), DemandLevel.HIGH);
      assert.equal(etaService.determineDemandLevel(2000), DemandLevel.HIGH);
      assert.equal(etaService.determineDemandLevel(2700), DemandLevel.HIGH);
    });

    it('should classify wait time > 45 mins (> 2700s) as SURGE', () => {
      assert.equal(etaService.determineDemandLevel(2701), DemandLevel.SURGE);
      assert.equal(etaService.determineDemandLevel(3600), DemandLevel.SURGE);
    });
  });

  describe('Effective Duration Calculation (Rolling Average vs Baseline)', () => {
    it('should use configured baseline duration when fewer than 3 completed samples exist', () => {
      // Baseline 15 mins = 900s
      assert.equal(etaService.calculateEffectiveDuration(15, null, 0), 900);
      assert.equal(etaService.calculateEffectiveDuration(15, 600, 1), 900);
      assert.equal(etaService.calculateEffectiveDuration(15, 600, 2), 900);
    });

    it('should blend 70% recent average and 30% baseline when >= 3 completed samples exist', () => {
      // Baseline 15 mins (900s), Recent avg 10 mins (600s), 5 samples
      // 0.7 * 600 + 0.3 * 900 = 420 + 270 = 690s
      const effective = etaService.calculateEffectiveDuration(15, 600, 5);
      assert.equal(effective, 690);
    });

    it('should blend correctly when recent average is slower than baseline', () => {
      // Baseline 10 mins (600s), Recent avg 20 mins (1200s), 3 samples
      // 0.7 * 1200 + 0.3 * 600 = 840 + 180 = 1020s
      const effective = etaService.calculateEffectiveDuration(10, 1200, 3);
      assert.equal(effective, 1020);
    });
  });

  describe('Serving Workload Calculation', () => {
    it('should calculate remaining seconds for tickets in SERVING state based on elapsed time', () => {
      const now = new Date('2026-09-24T12:00:00Z');
      const effectiveDurationSeconds = 900; // 15 mins

      // Ticket 1: served 5 mins ago (300s elapsed) -> remaining = 600s
      // Ticket 2: served 10 mins ago (600s elapsed) -> remaining = 300s
      // Ticket 3: served 20 mins ago (1200s elapsed) -> remaining = 0s
      const servingTickets = [
        { servedAt: new Date('2026-09-24T11:55:00Z') },
        { servedAt: new Date('2026-09-24T11:50:00Z') },
        { servedAt: new Date('2026-09-24T11:40:00Z') },
      ];

      const workload = etaService.calculateServingWorkload(
        servingTickets,
        effectiveDurationSeconds,
        now
      );
      assert.equal(workload, 900); // 600 + 300 + 0
    });

    it('should return 0 workload when no tickets are currently serving', () => {
      const workload = etaService.calculateServingWorkload([], 900);
      assert.equal(workload, 0);
    });
  });

  describe('Composite Estimated Wait Time Formula', () => {
    it('should return 0s (Immediate / Next) when aheadCount is 0 and an active counter is free', () => {
      const eta = etaService.computeEstimatedWaitSeconds({
        aheadCount: 0,
        activeCountersCount: 2,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 1, // 1 of 2 counters is busy, 1 is free
        servingWorkloadSeconds: 450,
      });

      assert.equal(eta, 0);
    });

    it('should calculate wait time on a single counter with 0 ahead but 1 active ticket in progress', () => {
      // 1 counter, currently serving with 300s remaining, 0 ahead
      const eta = etaService.computeEstimatedWaitSeconds({
        aheadCount: 0,
        activeCountersCount: 1,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 1, // 1 of 1 is busy
        servingWorkloadSeconds: 300,
      });

      assert.equal(eta, 300);
    });

    it('should calculate single counter queue wait time: aheadCount * D_eff + servingWorkload', () => {
      // 1 counter, 3 tickets ahead @ 10 mins (600s), 0 serving
      const eta = etaService.computeEstimatedWaitSeconds({
        aheadCount: 3,
        activeCountersCount: 1,
        effectiveDurationSeconds: 600,
        servingTicketsCount: 0,
        servingWorkloadSeconds: 0,
      });

      assert.equal(eta, 1800); // 3 * 600 = 1800s (30 mins)
    });

    it('should scale throughput across multiple active counters', () => {
      // 3 active counters, 6 tickets ahead @ 15 mins (900s), 3 tickets currently serving with 300s each (900s total workload)
      // Total workload = 6 * 900 + 900 = 5400 + 900 = 6300s
      // Per counter ETA = 6300 / 3 = 2100s (35 mins)
      const eta = etaService.computeEstimatedWaitSeconds({
        aheadCount: 6,
        activeCountersCount: 3,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 3,
        servingWorkloadSeconds: 900,
      });

      assert.equal(eta, 2100);
    });

    it('should gracefully handle 0 active counters by defaulting to 1 counter throughput', () => {
      // 0 active counters, 2 tickets ahead @ 15 mins (900s)
      const eta = etaService.computeEstimatedWaitSeconds({
        aheadCount: 2,
        activeCountersCount: 0,
        effectiveDurationSeconds: 900,
        servingTicketsCount: 0,
        servingWorkloadSeconds: 0,
      });

      assert.equal(eta, 1800); // 2 * 900 / 1 = 1800s
    });
  });
});
