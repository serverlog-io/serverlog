const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestApiKey, cleanupTestData } = require('./helpers');

describe('Insights API', () => {
  let testUser;
  let authToken;
  let testProject;
  let testApiKey;
  let createdInsightId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'insighttest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'insighttest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Insight Test Project',
      slug: 'insight-test-project',
    });

    testApiKey = await createTestApiKey(global.prisma, testProject.id, testUser.id);

    // Create insights via public API
    await request(app)
      .post('/v1/insight')
      .set('Authorization', `Bearer ${testApiKey.key}`)
      .send({
        project: testProject.slug,
        title: 'Total Users',
        value: 1250,
        icon: '👥',
      });

    await request(app)
      .post('/v1/insight')
      .set('Authorization', `Bearer ${testApiKey.key}`)
      .send({
        project: testProject.slug,
        title: 'Revenue',
        value: '$12,500',
        icon: '💰',
      });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('GET /api/projects/:projectId/insights', () => {
    it('should list insights', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/insights`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('insights');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.insights)).toBe(true);
      expect(res.body.insights.length).toBeGreaterThanOrEqual(2);

      // Store an insight ID for later tests
      createdInsightId = res.body.insights[0].id;
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/insights?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.insights.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/insights`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/insights/:insightId', () => {
    it('should get insight by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/insights/${createdInsightId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdInsightId);
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('value');
    });

    it('should return 404 for non-existent insight', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/insights/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:projectId/insights/:insightId', () => {
    it('should delete insight', async () => {
      // Create insight to delete via public API
      await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'To Delete',
          value: 100,
        });

      // Get the insight
      const listRes = await request(app)
        .get(`/api/projects/${testProject.id}/insights`)
        .set('Authorization', `Bearer ${authToken}`);

      const insightToDelete = listRes.body.insights.find(i => i.title === 'To Delete');

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/insights/${insightToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Insight deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/insights/${insightToDelete.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });

  describe('Public API - Insight Creation/Update', () => {
    it('should create new insight via public API', async () => {
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'New Insight',
          value: 500,
          icon: '📊',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.insight.title).toBe('New Insight');
      expect(res.body.insight.value).toBe(500);
      expect(res.body.insight.icon).toBe('📊');
    });

    it('should update existing insight via public API', async () => {
      // First create
      await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Updatable Insight',
          value: 100,
        });

      // Then update with same title
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Updatable Insight',
          value: 200,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.insight.value).toBe(200);
    });

    it('should handle string values', async () => {
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'String Value',
          value: 'Active',
        });

      expect(res.status).toBe(200);
      expect(res.body.insight.value).toBe('Active');
    });

    it('should reject object values', async () => {
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Object Value',
          value: { count: 100, status: 'healthy' },
        });

      // Schema only allows string or number values
      expect(res.status).toBe(400);
    });
  });
});
