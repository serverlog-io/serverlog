const express = require('express');
const rateLimit = require('express-rate-limit');
const userService = require('./user.service');
const authMiddleware = require('@middlewares/auth.middleware');
const adminMiddleware = require('./admin.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { loginSchema, changePasswordSchema, updateProfileSchema, setupSchema } = require('./user.schemas');

const router = express.Router();

// Rate limiter for authentication endpoints (brute force protection)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per window
    skipSuccessfulRequests: true, // Only count failed attempts
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => process.env.NODE_ENV === 'test',
    handler: (_req, res) => {
        res.status(429).json({
            error: 'TooManyRequests',
            message: 'Too many login attempts. Please try again in 15 minutes.'
        });
    }
});

router.get('/setup-status', async (req, res) => {
    const needsSetup = await userService.needsSetup();
    res.json({ needsSetup });
});

router.post('/setup', authLimiter, validateMiddleware(setupSchema), async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.setup(email, password);
    res.status(201).json(result);
});

router.post('/login', authLimiter, validateMiddleware(loginSchema), async (req, res) => {
    const { email, password } = req.body;
    const result = await userService.login(email, password);
    res.json(result);
});

router.get('/me', authMiddleware, async (req, res) => {
    const user = await userService.findById(req.user.userId);
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
});

router.put('/me', authMiddleware, validateMiddleware(updateProfileSchema), async (req, res) => {
    const user = await userService.updateProfile(req.user.userId, req.body);
    res.json(user);
});

router.post('/change-password', authMiddleware, validateMiddleware(changePasswordSchema), async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const user = await userService.changePassword(req.user.userId, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully', user });
});

router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
    const { page, limit, role } = req.query;
    const result = await userService.list({
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        role
    });
    res.json(result);
});

module.exports = router;
