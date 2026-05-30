const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, cleanupTestData } = require('./helpers');

describe('Projects API', () => {
  let testUser;
  let authToken;
  let createdProjectId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'projecttest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'projecttest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects', () => {
    it('should create a new project', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Test Project', description: 'Test description' });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Test Project');
      expect(res.body.description).toBe('Test description');
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('slug');

      createdProjectId = res.body.id;
    });

    it('should reject duplicate project slugs', async () => {
      // First project
      const res1 = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Slug Test' });

      expect(res1.status).toBe(201);
      expect(res1.body.slug).toBe('duplicate-slug-test');

      // Second project with same name should be rejected
      const res2 = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Duplicate Slug Test' });

      expect(res2.status).toBe(409);
      expect(res2.body.error).toBe('ConflictError');
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post('/api/projects')
        .send({ name: 'Test Project' });

      expect(res.status).toBe(401);
    });

    it('should validate project name', async () => {
      const res = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/projects', () => {
    it('should list user projects', async () => {
      const res = await request(app)
        .get('/api/projects')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('projects');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.projects)).toBe(true);
      expect(res.body.projects.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get('/api/projects?page=1&limit=1')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.projects.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should get project by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdProjectId);
      expect(res.body.name).toBe('Test Project');
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app)
        .get('/api/projects/non-existent-id')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:id/stats', () => {
    it('should get project stats', async () => {
      const res = await request(app)
        .get(`/api/projects/${createdProjectId}/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('project');
      expect(res.body).toHaveProperty('stats');
      expect(res.body.stats).toHaveProperty('events');
      expect(res.body.stats).toHaveProperty('channels');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should update project', async () => {
      const res = await request(app)
        .put(`/api/projects/${createdProjectId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Project', description: 'Updated desc' });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Project');
      expect(res.body.description).toBe('Updated desc');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should delete project', async () => {
      // Create a project to delete
      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'To Delete' });

      const deleteRes = await request(app)
        .delete(`/api/projects/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Project deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
