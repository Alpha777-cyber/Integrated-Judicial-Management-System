import { MongoMemoryServer } from 'mongodb-memory-server';
import supertest from 'supertest';

let mongod;
let app;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongod.getUri();
  process.env.NODE_ENV = 'test';
  process.env.SKIP_DB = 'false';
  const module = await import('../src/application.js');
  app = module.app;
});

afterAll(async () => {
  try { await mongod.stop(); } catch (e) {}
});

test('health endpoint', async () => {
  const request = supertest(app);
  const res = await request.get('/api/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('OK');
});
