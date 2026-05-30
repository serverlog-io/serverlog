const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestChannel, cleanupTestData } = require('./helpers');

describe('Events API', () => {
  let testUser;
  let authToken;
  let testProject;
  let createdEventId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'eventtest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'eventtest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Event Test Project',
      slug: 'event-test-project',
    });

    // Create a test channel that events will use
    await createTestChannel(global.prisma, testProject.id, {
      name: 'test-channel',
      slug: 'test-channel',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects/:projectId/events', () => {
    it('should create a new event', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'test-channel',
          event: 'User Signed Up',
          description: 'A new user registered',
          tags: { plan: 'pro', region: 'us-east' },
        });

      expect(res.status).toBe(201);
      expect(res.body.event).toBe('User Signed Up');
      expect(res.body.description).toBe('A new user registered');
      expect(res.body.tags).toEqual({ plan: 'pro', region: 'us-east' });
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('channel');

      createdEventId = res.body.id;
    });

    it('should create event with auto-created channel', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'new-auto-channel',
          event: 'Auto Channel Event',
        });

      expect(res.status).toBe(201);
      expect(res.body.channel.slug).toBe('new-auto-channel');
    });

    it('should reject invalid channel slug format', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'Invalid Channel!',
          event: 'Test Event',
        });

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .send({
          channel: 'test-channel',
          event: 'Test Event',
        });

      expect(res.status).toBe(401);
    });

    it('should validate event name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'test-channel',
          event: '',
        });

      expect(res.status).toBe(400);
    });

    it('should increment userProfile eventsCount when creating event with userId', async () => {
      const testUserId = 'transaction-test-user';

      // Create first event with userId
      const res1 = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'test-channel',
          event: 'Transaction Test Event 1',
          userId: testUserId,
        });

      expect(res1.status).toBe(201);

      // Verify userProfile was created with eventsCount = 1
      const profile1 = await global.prisma.userProfile.findUnique({
        where: {
          projectId_externalId: { projectId: testProject.id, externalId: testUserId }
        }
      });
      expect(profile1).not.toBeNull();
      expect(profile1.eventsCount).toBe(1);

      // Create second event with same userId
      const res2 = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'test-channel',
          event: 'Transaction Test Event 2',
          userId: testUserId,
        });

      expect(res2.status).toBe(201);

      // Verify eventsCount was incremented to 2
      const profile2 = await global.prisma.userProfile.findUnique({
        where: {
          projectId_externalId: { projectId: testProject.id, externalId: testUserId }
        }
      });
      expect(profile2.eventsCount).toBe(2);
    });
  });

  describe('GET /api/projects/:projectId/events', () => {
    it('should list events', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('events');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBeGreaterThan(0);
    });

    it('should filter by channel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events?channel=test-channel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events.every(e => e.channel.slug === 'test-channel')).toBe(true);
    });

    it('should filter by search term', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events?search=Signed`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events.some(e => e.event.includes('Signed'))).toBe(true);
    });

    it('should filter by tags', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events?tags=${encodeURIComponent(JSON.stringify({ plan: 'pro' }))}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events.every(e => e.tags.plan === 'pro')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events?page=1&limit=1`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events.length).toBeLessThanOrEqual(1);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(1);
    });

    it('should return empty for non-existent channel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events?channel=non-existent-channel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.events).toHaveLength(0);
    });

    describe('multi-user filtering', () => {
      beforeAll(async () => {
        // Create events with different userIds
        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'test-channel', event: 'User 1 Event A', userId: 'user_001' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'test-channel', event: 'User 1 Event B', userId: 'user_001' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'test-channel', event: 'User 2 Event A', userId: 'user_002' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'test-channel', event: 'User 3 Event A', userId: 'user_003' });
      });

      it('should filter by single userId', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?userId=user_001`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(2);
        expect(res.body.events.every(e => e.userId === 'user_001')).toBe(true);
      });

      it('should filter by multiple userIds (space-separated)', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?userId=user_001 user_002`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(3);
        expect(res.body.events.every(e => ['user_001', 'user_002'].includes(e.userId))).toBe(true);
      });

      it('should filter by multiple userIds (comma-separated)', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?userId=user_001,user_002,user_003`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(4);
        expect(res.body.events.every(e => ['user_001', 'user_002', 'user_003'].includes(e.userId))).toBe(true);
      });

      it('should return empty for non-existent userId', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?userId=non_existent_user`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.every(e => e.userId === 'non_existent_user' || e.userId === null)).toBe(true);
      });
    });

    describe('multi-channel filtering', () => {
      beforeAll(async () => {
        // Create events in different channels
        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'alerts', event: 'Alert Event 1' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'alerts', event: 'Alert Event 2' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'payments', event: 'Payment Event 1' });

        await request(app)
          .post(`/api/projects/${testProject.id}/events`)
          .set('Authorization', `Bearer ${authToken}`)
          .send({ channel: 'notifications', event: 'Notification Event 1' });
      });

      it('should filter by single channel', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?channel=alerts`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(2);
        expect(res.body.events.every(e => e.channel.slug === 'alerts')).toBe(true);
      });

      it('should filter by multiple channels (space-separated)', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?channel=alerts payments`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(3);
        expect(res.body.events.every(e => ['alerts', 'payments'].includes(e.channel.slug))).toBe(true);
      });

      it('should filter by multiple channels (comma-separated)', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?channel=alerts,payments,notifications`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(4);
        expect(res.body.events.every(e => ['alerts', 'payments', 'notifications'].includes(e.channel.slug))).toBe(true);
      });

      it('should return results for valid channels even if some are invalid', async () => {
        const res = await request(app)
          .get(`/api/projects/${testProject.id}/events?channel=alerts,non-existent-channel`)
          .set('Authorization', `Bearer ${authToken}`);

        expect(res.status).toBe(200);
        expect(res.body.events.length).toBeGreaterThanOrEqual(2);
        expect(res.body.events.every(e => e.channel.slug === 'alerts')).toBe(true);
      });
    });
  });

  describe('GET /api/projects/:projectId/events/stats', () => {
    it('should get event stats', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/stats`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('total');
      expect(res.body).toHaveProperty('byChannel');
      expect(res.body).toHaveProperty('topEvents');
    });
  });

  describe('GET /api/projects/:projectId/events/timeline', () => {
    it('should get event timeline', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('interval');
      expect(res.body).toHaveProperty('startDate');
      expect(res.body).toHaveProperty('endDate');
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('should filter timeline by channel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline?channel=test-channel`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('should filter timeline by single userId', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline?userId=user_001`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('interval');
    });

    it('should filter timeline by multiple userIds', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline?userId=user_001 user_002 user_003`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      // The total count in timeline should include events from all 3 users
      const totalCount = res.body.data.reduce((sum, bucket) => sum + bucket.count, 0);
      expect(totalCount).toBeGreaterThanOrEqual(4);
    });

    it('should filter timeline by multiple channels (space-separated)', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline?channel=alerts payments`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      const totalCount = res.body.data.reduce((sum, bucket) => sum + bucket.count, 0);
      expect(totalCount).toBeGreaterThanOrEqual(3);
    });

    it('should filter timeline by multiple channels (comma-separated)', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/timeline?channel=alerts,payments,notifications`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      const totalCount = res.body.data.reduce((sum, bucket) => sum + bucket.count, 0);
      expect(totalCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('GET /api/projects/:projectId/events/:eventId', () => {
    it('should get event by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/${createdEventId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdEventId);
      expect(res.body.event).toBe('User Signed Up');
    });

    it('should return 404 for non-existent event', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/events/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/projects/:projectId/events/:eventId', () => {
    it('should delete event', async () => {
      // Create event to delete
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/events`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          channel: 'test-channel',
          event: 'Event To Delete',
        });

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/events/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Event deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/events/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });
  });
});
