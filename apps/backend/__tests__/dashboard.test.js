const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, cleanupTestData } = require('./helpers');

describe('Dashboard API', () => {
  let testUser;
  let authToken;
  let testProject;
  let createdChartId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'dashboardtest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'dashboardtest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Dashboard Test Project',
      slug: 'dashboard-test-project',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects/:projectId/dashboard', () => {
    it('should create a new chart', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Error Events',
          search: '#errors status:failed',
          color: '#ef4444',
          chartType: 'LINE',
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Error Events');
      expect(res.body.search).toBe('#errors status:failed');
      expect(res.body.color).toBe('#ef4444');
      expect(res.body.chartType).toBe('LINE');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('position');

      createdChartId = res.body.id;
    });

    it('should create chart with default values', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'All Events' });

      expect(res.status).toBe(201);
      expect(res.body.chartType).toBe('BAR');
      expect(res.body.color).toBe('#6366f1');
      expect(res.body.search).toBe('');
    });

    it('should reject invalid chart type', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Chart', chartType: 'PIE' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid color format', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Invalid Color', color: 'red' });

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .send({ name: 'Test Chart' });

      expect(res.status).toBe(401);
    });

    it('should validate chart name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects/:projectId/dashboard', () => {
    it('should list charts', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('charts');
      expect(Array.isArray(res.body.charts)).toBe(true);
      expect(res.body.charts.length).toBeGreaterThan(0);
    });

    it('should return charts in position order', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const positions = res.body.charts.map(c => c.position);
      const sortedPositions = [...positions].sort((a, b) => a - b);
      expect(positions).toEqual(sortedPositions);
    });
  });

  describe('GET /api/projects/:projectId/dashboard/:chartId', () => {
    it('should get chart by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdChartId);
      expect(res.body.name).toBe('Error Events');
    });

    it('should return 404 for non-existent chart', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:projectId/dashboard/:chartId', () => {
    it('should update chart name', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Error Events' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Error Events');
    });

    it('should update chart type', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ chartType: 'AREA' });

      expect(res.status).toBe(200);
      expect(res.body.chartType).toBe('AREA');
    });

    it('should update chart color', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ color: '#10b981' });

      expect(res.status).toBe(200);
      expect(res.body.color).toBe('#10b981');
    });

    it('should update chart search', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ search: '#payments plan:pro' });

      expect(res.status).toBe(200);
      expect(res.body.search).toBe('#payments plan:pro');
    });

    it('should update chart position', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/dashboard/${createdChartId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ position: 0 });

      expect(res.status).toBe(200);
      expect(res.body.position).toBe(0);
    });
  });

  describe('POST /api/projects/:projectId/dashboard/reorder', () => {
    it('should reorder charts', async () => {
      // Create additional charts
      const chart1 = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Chart 1' });

      const chart2 = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Chart 2' });

      // Reorder: chart2 first, then chart1
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ chartIds: [chart2.body.id, chart1.body.id, createdChartId] });

      expect(res.status).toBe(200);
      expect(res.body.charts[0].id).toBe(chart2.body.id);
      expect(res.body.charts[0].position).toBe(0);
      expect(res.body.charts[1].id).toBe(chart1.body.id);
      expect(res.body.charts[1].position).toBe(1);
    });

    it('should reject invalid chart IDs array', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard/reorder`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ chartIds: 'not-an-array' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:projectId/dashboard/:chartId', () => {
    it('should delete chart', async () => {
      // Create chart to delete
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/dashboard`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Chart To Delete' });

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/dashboard/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Chart deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/dashboard/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
