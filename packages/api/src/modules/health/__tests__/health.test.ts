import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../../../app.js';

describe('Health route', () => {
  it('GET /api/health returns 200', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);

    expect(res.body).toMatchObject({
      status: 'ok',
      version: '0.1.0',
    });
    expect(res.body.timestamp).toBeDefined();
  });
});
