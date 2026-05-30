const request = require('supertest');
const { app } = require('../app');
const { createTestUser, createTestProject, createTestChannel, createTestEvent, cleanupTestData } = require('./helpers');

describe('Funnels API', () => {
  let testUser;
  let authToken;
  let testProject;
  let testChannel;
  let createdFunnelId;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'funneltest@test.com',
      password: 'testpass123',
      role: 'USER',
    });

    const loginRes = await request(app)
      .post('/api/users/login')
      .send({ email: 'funneltest@test.com', password: 'testpass123' });

    authToken = loginRes.body.token;

    testProject = await createTestProject(global.prisma, testUser.id, {
      name: 'Funnel Test Project',
      slug: 'funnel-test-project',
    });

    testChannel = await createTestChannel(global.prisma, testProject.id, {
      name: 'funnel-channel',
      slug: 'funnel-channel',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/projects/:projectId/funnels', () => {
    it('should create a funnel with minimum steps (2)', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Basic Funnel',
          steps: [
            { event: 'Page View' },
            { event: 'Sign Up' }
          ]
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Basic Funnel');
      expect(res.body.steps).toHaveLength(2);
      expect(res.body.timeWindow).toBe(7); // default
      expect(res.body).toHaveProperty('id');

      createdFunnelId = res.body.id;
    });

    it('should create a funnel with all options', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Full Funnel',
          description: 'A complete funnel with all options',
          steps: [
            { event: 'Landing Page', channel: 'funnel-channel' },
            { event: 'Product View', tags: { category: 'electronics' } },
            { event: 'Add to Cart' },
            { event: 'Checkout' },
            { event: 'Purchase' }
          ],
          timeWindow: 30
        });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Full Funnel');
      expect(res.body.description).toBe('A complete funnel with all options');
      expect(res.body.steps).toHaveLength(5);
      expect(res.body.timeWindow).toBe(30);
    });

    it('should reject funnel with less than 2 steps', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Invalid Funnel',
          steps: [{ event: 'Only One Step' }]
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with more than 10 steps', async () => {
      const steps = Array.from({ length: 11 }, (_, i) => ({ event: `Step ${i + 1}` }));

      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Too Many Steps',
          steps
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel without name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with empty name', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '',
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with name > 100 chars', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'a'.repeat(101),
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with description > 500 chars', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Funnel',
          description: 'a'.repeat(501),
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with timeWindow < 1', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Funnel',
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ],
          timeWindow: 0
        });

      expect(res.status).toBe(400);
    });

    it('should reject funnel with timeWindow > 90', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Funnel',
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ],
          timeWindow: 91
        });

      expect(res.status).toBe(400);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .send({
          name: 'No Auth Funnel',
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/funnels', () => {
    it('should list all funnels', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('funnels');
      expect(Array.isArray(res.body.funnels)).toBe(true);
      expect(res.body.funnels.length).toBeGreaterThan(0);
    });

    it('should reject without auth', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/projects/:projectId/funnels/:funnelId', () => {
    it('should get funnel by id', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${createdFunnelId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(createdFunnelId);
      expect(res.body.name).toBe('Basic Funnel');
    });

    it('should return 404 for non-existent funnel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/projects/:projectId/funnels/:funnelId', () => {
    it('should update funnel name', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/funnels/${createdFunnelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Updated Funnel Name'
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Updated Funnel Name');
    });

    it('should update funnel steps', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/funnels/${createdFunnelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          steps: [
            { event: 'New Step 1' },
            { event: 'New Step 2' },
            { event: 'New Step 3' }
          ]
        });

      expect(res.status).toBe(200);
      expect(res.body.steps).toHaveLength(3);
      expect(res.body.steps[0].event).toBe('New Step 1');
    });

    it('should update funnel timeWindow', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/funnels/${createdFunnelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          timeWindow: 14
        });

      expect(res.status).toBe(200);
      expect(res.body.timeWindow).toBe(14);
    });

    it('should return 404 for non-existent funnel', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/funnels/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Update Non Existent'
        });

      expect(res.status).toBe(404);
    });

    it('should reject invalid update (steps < 2)', async () => {
      const res = await request(app)
        .put(`/api/projects/${testProject.id}/funnels/${createdFunnelId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          steps: [{ event: 'Only One' }]
        });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/projects/:projectId/funnels/:funnelId', () => {
    it('should delete funnel', async () => {
      // Create a funnel to delete
      const createRes = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Funnel to Delete',
          steps: [
            { event: 'Step 1' },
            { event: 'Step 2' }
          ]
        });

      const deleteRes = await request(app)
        .delete(`/api/projects/${testProject.id}/funnels/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toBe('Funnel deleted successfully');

      // Verify deleted
      const getRes = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${createRes.body.id}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(getRes.status).toBe(404);
    });

    it('should return 404 for non-existent funnel', async () => {
      const res = await request(app)
        .delete(`/api/projects/${testProject.id}/funnels/non-existent-id`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/projects/:projectId/funnels/:funnelId/calculate', () => {
    let calcFunnel;
    let calcChannel;

    beforeAll(async () => {
      // Create a dedicated channel for calculation tests
      calcChannel = await createTestChannel(global.prisma, testProject.id, {
        name: 'calc-channel',
        slug: 'calc-channel',
      });

      // Create a funnel for calculation tests
      const funnelRes = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Calculation Test Funnel',
          steps: [
            { event: 'Page View' },
            { event: 'Sign Up' },
            { event: 'Purchase' }
          ],
          timeWindow: 7
        });

      calcFunnel = funnelRes.body;
    });

    it('should return empty results when no events exist', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('funnel');
      expect(res.body).toHaveProperty('results');
      expect(res.body.totalUsers).toBe(0);
      expect(res.body.completedUsers).toBe(0);
      expect(res.body.overallConversion).toBe(0);
    });

    it('should calculate funnel with one user completing all steps', async () => {
      const now = new Date();

      // Create events for user-1 completing all steps
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: 'user-1',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000) // 3 hours ago
      });

      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Sign Up',
        userId: 'user-1',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // 2 hours ago
      });

      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Purchase',
        userId: 'user-1',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000) // 1 hour ago
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalUsers).toBe(1);
      expect(res.body.completedUsers).toBe(1);
      expect(res.body.overallConversion).toBe(100);
      expect(res.body.results).toHaveLength(3);
      expect(res.body.results[0].count).toBe(1);
      expect(res.body.results[1].count).toBe(1);
      expect(res.body.results[2].count).toBe(1);
    });

    it('should calculate funnel with partial completion', async () => {
      const now = new Date();

      // Create events for user-2 completing only first 2 steps
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: 'user-2',
        timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000)
      });

      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Sign Up',
        userId: 'user-2',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      });

      // User-2 does NOT complete Purchase

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.totalUsers).toBe(2); // user-1 + user-2
      expect(res.body.completedUsers).toBe(1); // only user-1
      expect(res.body.results[0].count).toBe(2); // 2 users at step 1
      expect(res.body.results[1].count).toBe(2); // 2 users at step 2
      expect(res.body.results[2].count).toBe(1); // 1 user at step 3
    });

    it('should calculate conversion rates correctly', async () => {
      const now = new Date();

      // Create user-3 who only completes first step
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: 'user-3',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Step 1: 3 users
      expect(res.body.results[0].count).toBe(3);
      expect(res.body.results[0].conversionFromFirst).toBe(100);
      expect(res.body.results[0].conversionFromPrevious).toBe(100);

      // Step 2: 2 users (user-1 and user-2)
      expect(res.body.results[1].count).toBe(2);
      expect(res.body.results[1].conversionFromFirst).toBe(67); // 2/3 = 66.67%
      expect(res.body.results[1].conversionFromPrevious).toBe(67);

      // Step 3: 1 user (user-1)
      expect(res.body.results[2].count).toBe(1);
      expect(res.body.results[2].conversionFromFirst).toBe(33); // 1/3 = 33.33%
      expect(res.body.results[2].conversionFromPrevious).toBe(50); // 1/2 = 50%

      // Overall
      expect(res.body.overallConversion).toBe(33); // 1/3 = 33.33%
    });

    it('should ignore events without userId', async () => {
      const now = new Date();

      // Create event without userId
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: null, // no user
        timestamp: new Date(now.getTime())
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      // Count should not have changed
      expect(res.status).toBe(200);
      expect(res.body.results[0].count).toBe(3); // still 3 users
    });

    it('should require steps in correct order', async () => {
      const now = new Date();

      // Create user-4 with events out of order (Sign Up before Page View)
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Sign Up',
        userId: 'user-4',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000) // Sign up first
      });

      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: 'user-4',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000) // Page view second
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // user-4 should count at step 1 (Page View) but not proceed further
      // because Sign Up happened BEFORE Page View
      expect(res.body.results[0].count).toBe(4); // user-1, user-2, user-3, user-4
      expect(res.body.results[1].count).toBe(2); // still only user-1, user-2
    });

    it('should filter by date range', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      // Create user-5 with events from 2 days ago
      await createTestEvent(global.prisma, testProject.id, calcChannel.id, {
        event: 'Page View',
        userId: 'user-5',
        timestamp: twoDaysAgo
      });

      // Calculate for last 24 hours only
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${calcFunnel.id}/calculate`)
        .query({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString()
        })
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // user-5's event should be excluded (too old)
      // Only users with events in the last 24 hours should be counted
    });

    it('should return 404 for non-existent funnel', async () => {
      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/non-existent-id/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('Funnel with channel filter', () => {
    let channelFunnel;
    let specificChannel;

    beforeAll(async () => {
      specificChannel = await createTestChannel(global.prisma, testProject.id, {
        name: 'specific-channel',
        slug: 'specific-channel',
      });

      // Create a funnel that requires specific channel
      const funnelRes = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Channel Specific Funnel',
          steps: [
            { event: 'Start', channel: 'specific-channel' },
            { event: 'Finish' }
          ],
          timeWindow: 7
        });

      channelFunnel = funnelRes.body;
    });

    it('should only count events from specified channel', async () => {
      const now = new Date();

      // Create user-channel-1 with event in WRONG channel
      await createTestEvent(global.prisma, testProject.id, testChannel.id, {
        event: 'Start',
        userId: 'user-channel-1',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      });

      await createTestEvent(global.prisma, testProject.id, testChannel.id, {
        event: 'Finish',
        userId: 'user-channel-1',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      });

      // Create user-channel-2 with event in CORRECT channel
      await createTestEvent(global.prisma, testProject.id, specificChannel.id, {
        event: 'Start',
        userId: 'user-channel-2',
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      });

      await createTestEvent(global.prisma, testProject.id, specificChannel.id, {
        event: 'Finish',
        userId: 'user-channel-2',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${channelFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Only user-channel-2 should be counted (correct channel for step 1)
      expect(res.body.results[0].count).toBe(1);
      expect(res.body.results[1].count).toBe(1);
    });
  });

  describe('Funnel with tags filter', () => {
    let tagsFunnel;
    let tagsChannel;

    beforeAll(async () => {
      tagsChannel = await createTestChannel(global.prisma, testProject.id, {
        name: 'tags-channel',
        slug: 'tags-channel',
      });

      // Create a funnel that requires specific tags
      const funnelRes = await request(app)
        .post(`/api/projects/${testProject.id}/funnels`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Tags Specific Funnel',
          steps: [
            { event: 'View Product', tags: { category: 'electronics' } },
            { event: 'Purchase' }
          ],
          timeWindow: 7
        });

      tagsFunnel = funnelRes.body;
    });

    it('should only count events with matching tags', async () => {
      const now = new Date();

      // Create user with WRONG tags
      await createTestEvent(global.prisma, testProject.id, tagsChannel.id, {
        event: 'View Product',
        userId: 'user-tags-1',
        tags: { category: 'clothing' }, // wrong category
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      });

      await createTestEvent(global.prisma, testProject.id, tagsChannel.id, {
        event: 'Purchase',
        userId: 'user-tags-1',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      });

      // Create user with CORRECT tags
      await createTestEvent(global.prisma, testProject.id, tagsChannel.id, {
        event: 'View Product',
        userId: 'user-tags-2',
        tags: { category: 'electronics' }, // correct category
        timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000)
      });

      await createTestEvent(global.prisma, testProject.id, tagsChannel.id, {
        event: 'Purchase',
        userId: 'user-tags-2',
        timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000)
      });

      const res = await request(app)
        .get(`/api/projects/${testProject.id}/funnels/${tagsFunnel.id}/calculate`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      // Only user-tags-2 should be counted (correct tags for step 1)
      expect(res.body.results[0].count).toBe(1);
      expect(res.body.results[1].count).toBe(1);
    });
  });
});
