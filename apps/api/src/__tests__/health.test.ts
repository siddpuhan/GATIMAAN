import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import { GATIMAAN_VERSION } from '@gatimaan/shared';

describe('GET /health', () => {
  const app = createApp();

  it('should return 200 OK with health status and version', async () => {
    const response = await request(app).get('/health');

    assert.equal(response.status, 200);
    assert.equal(response.body.status, 'ok');
    assert.equal(response.body.version, GATIMAAN_VERSION);
    assert.ok(typeof response.body.timestamp === 'string');
    assert.ok(typeof response.body.uptime === 'number');
  });

  it('should return 404 for nonexistent routes', async () => {
    const response = await request(app).get('/nonexistent-route');

    assert.equal(response.status, 404);
    assert.equal(response.body.error, 'Not Found');
  });
});
