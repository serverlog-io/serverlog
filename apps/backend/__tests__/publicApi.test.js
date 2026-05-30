const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestApiKey, cleanupTestData } = require('./helpers');

describe('Public API v1', () => {
  let testUser;
  let testProject;
  let testApiKey;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'publicapitest@test.com',
      password: 'testpass123',
    });

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Public API Test',
    });

    testApiKey = await createTestApiKey(global.prisma, testProject.id, testUser.id);
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /v1/log', () => {
    it('should create event with valid API key', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          channel: 'test-channel',
          event: 'User Signed Up',
          description: 'A new user signed up',
          icon: '🎉',
          tags: { plan: 'pro', source: 'web' },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event.event).toBe('User Signed Up');
      expect(res.body.event.description).toBe('A new user signed up');
      expect(res.body.event.icon).toBe('🎉');
    });

    it('should create channel if not exists', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          channel: 'new-auto-channel',
          event: 'Test Event',
        });

      expect(res.status).toBe(200);

      // Verify channel was created
      const channel = await global.prisma.channel.findFirst({
        where: { slug: 'new-auto-channel', projectId: testProject.id },
      });
      expect(channel).not.toBeNull();
    });

    it('should reject without API key', async () => {
      const res = await request(app)
        .post('/v1/log')
        .send({
          project: testProject.slug,
          channel: 'test-channel',
          event: 'Test Event',
        });

      expect(res.status).toBe(401);
    });

    it('should reject invalid API key', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', 'Bearer invalid-key')
        .send({
          project: testProject.slug,
          channel: 'test-channel',
          event: 'Test Event',
        });

      expect(res.status).toBe(401);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          // missing channel and event
        });

      expect(res.status).toBe(400);
    });

    it('should validate tag key format', async () => {
      const res = await request(app)
        .post('/v1/log')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          channel: 'test-channel',
          event: 'Test Event',
          tags: { 'invalid key with spaces': 'value' },
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/identify', () => {
    it('should create/update user profile', async () => {
      const res = await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'user-123',
          properties: {
            name: 'John Doe',
            email: 'john@example.com',
            plan: 'premium',
          },
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.profile.userId).toBe('user-123');
      expect(res.body.profile.properties.name).toBe('John Doe');
    });

    it('should update existing profile', async () => {
      // First identify
      await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'user-456',
          properties: { name: 'Jane' },
        });

      // Update
      const res = await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          user_id: 'user-456',
          properties: { name: 'Jane Updated', plan: 'enterprise' },
        });

      expect(res.status).toBe(200);
      expect(res.body.profile.properties.name).toBe('Jane Updated');
      expect(res.body.profile.properties.plan).toBe('enterprise');
    });

    it('should validate required user_id', async () => {
      const res = await request(app)
        .post('/v1/identify')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          properties: { name: 'John' },
        });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /v1/insight', () => {
    it('should create insight', async () => {
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Total Users',
          value: '1,234',
          icon: '👥',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.insight.title).toBe('Total Users');
      expect(res.body.insight.value).toBe('1,234');
    });

    it('should update existing insight by title', async () => {
      // Create
      await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Revenue',
          value: '$100',
        });

      // Update
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          title: 'Revenue',
          value: '$500',
        });

      expect(res.status).toBe(200);
      expect(res.body.insight.value).toBe('$500');

      // Verify only one insight with that title
      const insights = await global.prisma.insight.findMany({
        where: { projectId: testProject.id, title: 'Revenue' },
      });
      expect(insights.length).toBe(1);
    });

    it('should validate required fields', async () => {
      const res = await request(app)
        .post('/v1/insight')
        .set('Authorization', `Bearer ${testApiKey.key}`)
        .send({
          project: testProject.slug,
          // missing title and value
        });

      expect(res.status).toBe(400);
    });
  });
});
