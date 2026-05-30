const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, cleanupTestData } = require('./helpers');

describe('API Keys API', () => {
  let testUser;
  let authToken;
  let testProject;
  let createdKeyId;
  let createdKey;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'apikeytest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'apikeytest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'API Key Test Project',
      slug: 'apikey-test-project',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects/:projectId/api-keys', () => {
    it('should create a new API key', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Production Key' });

      expect(res.status).toBe(201);
      expect(res.body.apiKey.name).toBe('Production Key');
      expect(res.body.apiKey).toHaveProperty('id');
      expect(res.body).toHaveProperty('rawKey');
      expect(res.body.rawKey).toMatch(/^al_/);
      expect(res.body.apiKey).toHaveProperty('keyPreview');

      createdKeyId = res.body.apiKey.id;
      createdKey = res.body.rawKey;
    });

    it('should create API key with expiration', async () => {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Expiring Key', expiresAt });

      expect(res.status).toBe(201);
      expect(res.body.apiKey.expiresAt).toBe(expiresAt);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .send({ name: 'Test Key' });

      expect(res.status).toBe(401);
    });

    it('should validate key name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:projectId/api-keys', () => {
    it('should list API keys', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('apiKeys');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.apiKeys)).toBe(true);
      expect(res.body.apiKeys.length).toBeGreaterThan(0);
    });

    it('should not expose full key in list', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      res.body.apiKeys.forEach(key => {
        expect(key).not.toHaveProperty('key');
        expect(key).toHaveProperty('keyPreview');
      });
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.apiKeys.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.page).toBe(1);
    });
  });

  describe('GET /api/projects/:projectId/api-keys/:keyId', () => {
    it('should get API key by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys/${createdKeyId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdKeyId);
      expect(res.body.name).toBe('Production Key');
      expect(res.body).not.toHaveProperty('rawKey');
    });

    it('should return 404 for non-existent key', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:projectId/api-keys/:keyId', () => {
    it('should update API key name', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/api-keys/${createdKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Production Key' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Production Key');
    });

    it('should update API key active status', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/api-keys/${createdKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);

      // Re-activate for other tests
      await request(app)
        .put(`/api/projects/${testProject.id}/api-keys/${createdKeyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: true });
    });
  });

  describe('POST /api/projects/:projectId/api-keys/:keyId/revoke', () => {
    it('should revoke API key', async () => {
      // Create key to revoke
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Key To Revoke' });

      const revokeRes = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys/${createRes.body.apiKey.id}/revoke`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(revokeRes.status).toBe(200);
      expect(revokeRes.body.message).toBe('API key revoked successfully');
      expect(revokeRes.body.apiKey.isActive).toBe(false);
    });
  });

  describe('DELETE /api/projects/:projectId/api-keys/:keyId', () => {
    it('should delete API key', async () => {
      // Create key to delete
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/api-keys`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Key To Delete' });

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/api-keys/${createRes.body.apiKey.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('API key deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/api-keys/${createRes.body.apiKey.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('API Key Authentication (Public API)', () => {
    it('should authenticate with valid API key', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${createdKey}`)
        .send({
          channel: 'test-channel',
          event: 'API Key Test Event',
          project: testProject.slug,
        });

      expect(res.status).toBe(200);
    });

    it('should reject invalid API key', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', 'Bearer invalid_key')
        .send({
          channel: 'test-channel',
          event: 'Test Event',
          project: testProject.slug,
        });

      expect(res.status).toBe(401);
    });
  });
});
