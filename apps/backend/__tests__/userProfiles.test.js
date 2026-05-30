const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestApiKey, cleanupTestData } = require('./helpers');

describe('User Profiles API', () => {
  let testUser;
  let authToken;
  let testProject;
  let testApiKey;
  let createdProfileId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'profiletest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'profiletest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Profile Test Project',
      slug: 'profile-test-project',
    });

    testApiKey = await createTestApiKey(global.prisma, testProject.id, testUser.id);

    // Create user profiles via public API (identify)
    await request(app)
      .post('/v1/identify')
      .set('Authorization', `Bearer ${testApiKey.key}`)
      .send({
        project: testProject.slug,
        user_id: 'user-123',
        properties: {
          name: 'John Doe',
          email: 'john@example.com',
          plan: 'pro',
        },
      });

    await request(app)
      .post('/v1/identify')
      .set('Authorization', `Bearer ${testApiKey.key}`)
      .send({
        project: testProject.slug,
        user_id: 'user-456',
        properties: {
          name: 'Jane Smith',
          email: 'jane@example.com',
          plan: 'enterprise',
        },
      });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('GET /api/projects/:projectId/users', () => {
    it('should list user profiles', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profiles');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.profiles)).toBe(true);
      expect(res.body.profiles.length).toBeGreaterThanOrEqual(2);

      // Store a profile ID for later tests
      createdProfileId = res.body.profiles[0].id;
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.profiles.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should search by external user ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users?search=user-123`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Search only works on externalId field, not properties
      expect(res.body.profiles.length).toBeGreaterThanOrEqual(1);
      expect(res.body.profiles[0].externalId).toBe('user-123');
    });

    // Note: property filtering is not implemented in the current service
    // This test just verifies the endpoint accepts these params without error
    it('should accept property filter params', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users?property=plan&propertyValue=enterprise`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('profiles');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/users/:profileId', () => {
    it('should get user profile by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users/${createdProfileId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdProfileId);
      expect(res.body).toHaveProperty('externalId');
      expect(res.body).toHaveProperty('properties');
    });

    it('should return 404 for non-existent profile', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:projectId/users/user/:userId', () => {
    it('should get user profile by external user ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users/user/user-123`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.externalId).toBe('user-123');
      expect(res.body.properties.name).toBe('John Doe');
    });

    it('should return 404 for non-existent user ID', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users/user/non-existent-user`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:projectId/users/:profileId', () => {
    it('should delete user profile', async () => {
      // Create profile to delete via public API
      await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'user-to-delete',
          properties: { name: 'Delete Me' },
        });

      // Get the profile
      const listRes = await request(app)
        .get(`/api/projects/${testProject.id}/users`)
        .set('Authorization', `Bearer ${authToken}`);

      const profileToDelete = listRes.body.profiles.find(p => p.externalId === 'user-to-delete');

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/users/${profileToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('User profile deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/users/${profileToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Public API - Identify', () => {
    it('should create new user profile via identify', async () => {
      const res = await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'new-user-789',
          properties: {
            name: 'new-user',
            email: 'new@example.com',
            company: 'acme-inc',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.userId).toBe('new-user-789');
      expect(res.body.profile.properties.name).toBe('new-user');
      expect(res.body.profile.properties.company).toBe('acme-inc');
    });

    it('should update existing user profile via identify', async () => {
      // First identify
      await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'update-user',
          properties: { name: 'original-name', plan: 'free' },
        });

      // Second identify with same user_id - should merge properties
      const res = await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'update-user',
          properties: { plan: 'pro', 'new-prop': 'value' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.properties.name).toBe('original-name');
      expect(res.body.profile.properties.plan).toBe('pro');
      expect(res.body.profile.properties['new-prop']).toBe('value');
    });

    it('should track events count for user', async () => {
      // Create a user
      await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'events-count-user',
          properties: { name: 'Events User' },
        });

      // Log events for this user
      await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          channel: 'activity',
          event: 'User Action',
          user_id: 'events-count-user',
        });

      // Get the profile and check events count
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/users/user/events-count-user`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.eventsCount).toBeGreaterThanOrEqual(1);
    });
  });
});
