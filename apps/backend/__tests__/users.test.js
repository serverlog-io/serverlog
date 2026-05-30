const request = require('supertest');
const { app } = require('../app');
const { createTestUser, cleanupTestData } = require('./helpers');

describe('Users API', () => {
  let testUser;
  let authToken;

  beforeAll(async () => {
    testUser = await createTestUser(global.prisma, {
      email: 'usertest@test.com',
      password: 'testpass123',
      role: 'ADMIN',
    });
  });

  afterAll(async () => {
    await cleanupTestData(global.prisma, testUser.id);
  });

  describe('POST /api/users/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'usertest@test.com', password: 'testpass123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('usertest@test.com');
      expect(res.body.user).not.toHaveProperty('password');

      authToken = res.body.token;
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'wrong@test.com', password: 'testpass123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AuthenticationError');
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'usertest@test.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('AuthenticationError');
    });

    it('should validate email format', async () => {
      const res = await request(app)
        .post('/api/users/login')
        .send({ email: 'invalid-email', password: 'testpass123' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('ValidationError');
    });
  });

  describe('GET /api/users/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.email).toBe('usertest@test.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/users/me');

      expect(res.status).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/change-password', () => {
    it('should change password with valid credentials', async () => {
      const res = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'testpass123', newPassword: 'newpass456' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password changed successfully');

      // Verify can login with new password
      const loginRes = await request(app)
        .post('/api/users/login')
        .send({ email: 'usertest@test.com', password: 'newpass456' });

      expect(loginRes.status).toBe(200);

      // Restore original password for other tests
      await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${loginRes.body.token}`)
        .send({ currentPassword: 'newpass456', newPassword: 'testpass123' });
    });

    it('should reject wrong current password', async () => {
      const res = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'wrongpass', newPassword: 'newpass456' });

      expect(res.status).toBe(401);
    });

    it('should validate new password length', async () => {
      const res = await request(app)
        .post('/api/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ currentPassword: 'testpass123', newPassword: '123' });

      expect(res.status).toBe(400);
    });
  });
});
