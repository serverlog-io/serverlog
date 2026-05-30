const express = require('express');
const projectSettingsService = require('./projectSettings.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.get('/', async (req, res) => {
    const settings = await projectSettingsService.getAll(req.params.projectId);
    res.json({ settings });
});

router.patch('/', async (req, res) => {
    const body = req.body || {};
    if (typeof body !== 'object') {
        return res.status(400).json({ error: 'ValidationError', message: 'Body must be an object of key/value pairs' });
    }
    try {
        const updated = await projectSettingsService.setMany(req.params.projectId, body);
        res.json({ updated });
    } catch (err) {
        return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
});

router.post('/reset/:key', async (req, res) => {
    try {
        const value = await projectSettingsService.reset(req.params.projectId, req.params.key);
        res.json({ key: req.params.key, value });
    } catch (err) {
        return res.status(400).json({ error: 'ValidationError', message: err.message });
    }
});

module.exports = router;
