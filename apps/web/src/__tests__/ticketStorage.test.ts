import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { TicketStatus } from '@gatimaan/shared';
import {
  getActiveTicketId,
  setActiveTicketId,
  clearActiveTicketId,
  isActiveStatus,
  isTerminalStatus,
} from '../lib/ticketStorage.js';
import { formatWaitTime } from '../components/customer/WaitTimeDisplay.js';

// Mock localStorage for Node test runner
const mockStore = new Map<string, string>();
global.localStorage = {
  getItem: (key: string) => mockStore.get(key) || null,
  setItem: (key: string, value: string) => {
    mockStore.set(key, value);
  },
  removeItem: (key: string) => {
    mockStore.delete(key);
  },
  clear: () => {
    mockStore.clear();
  },
  key: (index: number) => Array.from(mockStore.keys())[index] || null,
  length: 0,
};

describe('Customer Ticket Storage & Helper Unit Tests', () => {
  beforeEach(() => {
    mockStore.clear();
  });

  it('should store and retrieve active ticket ID from localStorage', () => {
    assert.equal(getActiveTicketId(), null);

    setActiveTicketId('test-ticket-12345');
    assert.equal(getActiveTicketId(), 'test-ticket-12345');

    clearActiveTicketId();
    assert.equal(getActiveTicketId(), null);
  });

  it('should correctly classify active ticket states', () => {
    assert.equal(isActiveStatus(TicketStatus.WAITING), true);
    assert.equal(isActiveStatus(TicketStatus.CALLED), true);
    assert.equal(isActiveStatus(TicketStatus.SERVING), true);

    assert.equal(isActiveStatus(TicketStatus.COMPLETED), false);
    assert.equal(isActiveStatus(TicketStatus.CANCELLED), false);
    assert.equal(isActiveStatus(TicketStatus.NO_SHOW), false);
  });

  it('should correctly classify terminal ticket states', () => {
    assert.equal(isTerminalStatus(TicketStatus.COMPLETED), true);
    assert.equal(isTerminalStatus(TicketStatus.CANCELLED), true);
    assert.equal(isTerminalStatus(TicketStatus.NO_SHOW), true);

    assert.equal(isTerminalStatus(TicketStatus.WAITING), false);
    assert.equal(isTerminalStatus(TicketStatus.CALLED), false);
    assert.equal(isTerminalStatus(TicketStatus.SERVING), false);
  });

  it('should format estimated wait time correctly across various second durations', () => {
    assert.equal(formatWaitTime(null), 'Calculating...');
    assert.equal(formatWaitTime(undefined), 'Calculating...');
    assert.equal(formatWaitTime(0), 'Immediate / Next');
    assert.equal(formatWaitTime(45), '~1 min');
    assert.equal(formatWaitTime(120), '~2 mins');
    assert.equal(formatWaitTime(900), '~15 mins');
    assert.equal(formatWaitTime(3600), '~1 hr');
    assert.equal(formatWaitTime(5400), '~1h 30m');
  });
});
