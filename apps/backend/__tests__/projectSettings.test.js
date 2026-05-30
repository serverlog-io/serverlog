const request = require('supertest');
const { app } = require('../app');
const {
    createTestUser,
    createTestProject,
    createTestApiKey,
    cleanupTestData,
} = require('./helpers');
const projectSettingsService = require('../src/modules/projectSettings/projectSettings.service');

describe('Project Settings', () => {
    let ownerUser;
    let ownerToken;
    let otherUser;
    let otherToken;
    let projectA;
    let projectB;
    let apiKeyA;

    beforeAll(async () => {
        ownerUser = await createTestUser(global.prisma, {
            email: 'settings-owner@test.com',
            password: 'testpass123',
        });
        const loginRes = await request(app)
            .post('/api/users/login')
            .send({ email: 'settings-owner@test.com', password: 'testpass123' });
        ownerToken = loginRes.body.token;

        otherUser = await createTestUser(global.prisma, {
            email: 'settings-other@test.com',
            password: 'testpass123',
        });
        const otherLogin = await request(app)
            .post('/api/users/login')
            .send({ email: 'settings-other@test.com', password: 'testpass123' });
        otherToken = otherLogin.body.token;

        projectA = await createTestProject(global.prisma, ownerUser.id, {
            name: 'Settings A',
            slug: 'settings-a',
        });
        projectB = await createTestProject(global.prisma, ownerUser.id, {
            name: 'Settings B',
            slug: 'settings-b',
        });

        apiKeyA = await createTestApiKey(global.prisma, projectA.id, ownerUser.id);
    });

    afterAll(async () => {
        await cleanupTestData(global.prisma, ownerUser.id);
        await cleanupTestData(global.prisma, otherUser.id);
    });

    describe('GET /api/projects/:projectId/settings', () => {
        it('returns the full registry with defaults when none have been set', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(res.status).toBe(200);
            expect(res.body.settings).toBeDefined();

            const keys = Object.keys(res.body.settings);
            expect(keys).toEqual(expect.arrayContaining([
                'publicApiRateLimitEnabled',
                'publicApiRateLimitWindowSec',
                'publicApiKeyRateLimit',
                'eventRetentionDays',
                'maxEventDescriptionLength',
                'maxTagsPerEvent',
            ]));

            // Each entry should expose the metadata the UI needs
            for (const spec of Object.values(res.body.settings)) {
                expect(spec).toHaveProperty('value');
                expect(spec).toHaveProperty('default');
                expect(spec).toHaveProperty('type');
                expect(spec).toHaveProperty('description');
            }

            // With no overrides, value === default
            expect(res.body.settings.publicApiKeyRateLimit.value)
                .toBe(res.body.settings.publicApiKeyRateLimit.default);
        });

        it('requires authentication', async () => {
            const res = await request(app).get(`/api/projects/${projectA.id}/settings`);
            expect(res.status).toBe(401);
        });

        it('rejects users who do not own the project', async () => {
            const res = await request(app)
                .get(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${otherToken}`);
            expect([403, 404]).toContain(res.status);
        });
    });

    describe('PATCH /api/projects/:projectId/settings', () => {
        it('updates a single integer setting and persists it', async () => {
            const res = await request(app)
                .patch(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ publicApiKeyRateLimit: 5000 });

            expect(res.status).toBe(200);
            expect(res.body.updated.publicApiKeyRateLimit).toBe(5000);

            const get = await request(app)
                .get(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(get.body.settings.publicApiKeyRateLimit.value).toBe(5000);
        });

        it('coerces boolean settings from strings', async () => {
            const res = await request(app)
                .patch(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ publicApiRateLimitEnabled: false });

            expect(res.status).toBe(200);
            expect(res.body.updated.publicApiRateLimitEnabled).toBe(false);
        });

        it('rejects values outside the registered range', async () => {
            const res = await request(app)
                .patch(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ publicApiKeyRateLimit: 9999999 });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/publicApiKeyRateLimit/);
        });

        it('rejects unknown setting keys', async () => {
            const res = await request(app)
                .patch(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ bogusKey: 123 });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/bogusKey/);
        });

        it('keeps overrides isolated to a single project', async () => {
            // Override on B should not bleed to A
            await request(app)
                .patch(`/api/projects/${projectB.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ eventRetentionDays: 7 });

            const a = await request(app)
                .get(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`);
            const b = await request(app)
                .get(`/api/projects/${projectB.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(b.body.settings.eventRetentionDays.value).toBe(7);
            expect(a.body.settings.eventRetentionDays.value)
                .toBe(a.body.settings.eventRetentionDays.default);
        });
    });

    describe('POST /api/projects/:projectId/settings/reset/:key', () => {
        it('removes the override and returns the default', async () => {
            await request(app)
                .patch(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`)
                .send({ maxTagsPerEvent: 3 });

            const reset = await request(app)
                .post(`/api/projects/${projectA.id}/settings/reset/maxTagsPerEvent`)
                .set('Authorization', `Bearer ${ownerToken}`);

            expect(reset.status).toBe(200);
            expect(reset.body.key).toBe('maxTagsPerEvent');

            const get = await request(app)
                .get(`/api/projects/${projectA.id}/settings`)
                .set('Authorization', `Bearer ${ownerToken}`);
            expect(get.body.settings.maxTagsPerEvent.value)
                .toBe(get.body.settings.maxTagsPerEvent.default);
        });
    });

    describe('/v1/log enforces per-project limits', () => {
        beforeEach(async () => {
            // Reset to known-low values for predictable tests
            await projectSettingsService.set(projectA.id, 'maxEventDescriptionLength', 100);
            await projectSettingsService.set(projectA.id, 'maxTagsPerEvent', 2);
        });

        it('rejects descriptions longer than the project limit', async () => {
            const res = await request(app)
                .post('/v1/log')
                .set('Authorization', `Bearer ${apiKeyA.key}`)
                .send({
                    channel: 'test',
                    event: 'Big Event',
                    description: 'x'.repeat(101),
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/description must be at most 100/);
        });

        it('accepts descriptions at or below the limit', async () => {
            const res = await request(app)
                .post('/v1/log')
                .set('Authorization', `Bearer ${apiKeyA.key}`)
                .send({
                    channel: 'test',
                    event: 'Small Event',
                    description: 'x'.repeat(100),
                });
            expect(res.status).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('rejects tag dictionaries larger than the project limit', async () => {
            const res = await request(app)
                .post('/v1/log')
                .set('Authorization', `Bearer ${apiKeyA.key}`)
                .send({
                    channel: 'test',
                    event: 'Tagged Event',
                    tags: { a: '1', b: '2', c: '3' },
                });

            expect(res.status).toBe(400);
            expect(res.body.message).toMatch(/tags must have at most 2/);
        });

        it('uses the new limit immediately after it is changed', async () => {
            await projectSettingsService.set(projectA.id, 'maxTagsPerEvent', 5);

            const res = await request(app)
                .post('/v1/log')
                .set('Authorization', `Bearer ${apiKeyA.key}`)
                .send({
                    channel: 'test',
                    event: 'More Tags',
                    tags: { a: '1', b: '2', c: '3', d: '4' },
                });

            expect(res.status).toBe(200);
        });
    });

    describe('service-level concerns', () => {
        it('falls back to defaults when no override exists', async () => {
            const fresh = await createTestProject(global.prisma, ownerUser.id, {
                name: 'Fresh Project',
                slug: `fresh-${Date.now()}`,
            });
            const value = await projectSettingsService.get(fresh.id, 'publicApiKeyRateLimit');
            expect(value).toBe(projectSettingsService.getDefault('publicApiKeyRateLimit'));
        });

        it('throws on unknown setting keys', async () => {
            await expect(projectSettingsService.get(projectA.id, 'doesNotExist'))
                .rejects.toThrow(/Unknown setting key/);
        });

        it('serializes booleans correctly through a round-trip', async () => {
            await projectSettingsService.set(projectA.id, 'publicApiRateLimitEnabled', false);
            const v = await projectSettingsService.get(projectA.id, 'publicApiRateLimitEnabled');
            expect(v).toBe(false);
        });
    });
});
