const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestChannel, cleanupTestData } = require('./helpers');

describe('Channels API', () => {
  let testUser;
  let authToken;
  let testProject;
  let createdChannelId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'channeltest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'channeltest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Channel Test Project',
      slug: 'channel-test-project',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects/:projectId/channels', () => {
    it('should create a new channel', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Payments',
          description: 'Payment events channel',
          color: '#10b981',
          icon: '💳',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Payments');
      expect(res.body.description).toBe('Payment events channel');
      expect(res.body.color).toBe('#10b981');
      expect(res.body.icon).toBe('💳');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('slug');

      createdChannelId = res.body.id;
    });

    it('should auto-generate slug from name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'User Authentication' });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('user-authentication');
    });

    it('should use custom slug if provided', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Channel', slug: 'custom-slug' });

      expect(res.status).toBe(201);
      expect(res.body.slug).toBe('custom-slug');
    });

    it('should reject duplicate channel slugs', async () => {
      // First channel
      await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Test' });

      // Second channel with same slug
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Test' });

      expect(res.status).toBe(409);
    });

    it('should reject invalid color format', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Color', color: 'red' });

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .send({ name: 'Test Channel' });

      expect(res.status).toBe(401);
    });

    it('should validate channel name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:projectId/channels', () => {
    it('should list channels', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('channels');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.channels)).toBe(true);
      expect(res.body.channels.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/channels?page=1&limit=2`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.channels.length).toBeLessThanOrEqual(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
    });
  });

  describe('GET /api/projects/:projectId/channels/:channelId', () => {
    it('should get channel by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdChannelId);
      expect(res.body.name).toBe('Payments');
    });

    it('should return 404 for non-existent channel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/channels/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:projectId/channels/:channelId/stats', () => {
    it('should get channel stats', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/channels/${createdChannelId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('channel');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('events');
    });
  });

  describe('PUT /api/projects/:projectId/channels/:channelId', () => {
    it('should update channel', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Payments',
          description: 'Updated description',
          color: '#ef4444',
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Payments');
      expect(res.body.description).toBe('Updated description');
      expect(res.body.color).toBe('#ef4444');
    });

    it('should update channel active status', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/channels/${createdChannelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });
  });

  describe('DELETE /api/projects/:projectId/channels/:channelId', () => {
    it('should delete channel', async () => {
      // Create channel to delete
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/channels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete' });

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/channels/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Channel deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/channels/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
