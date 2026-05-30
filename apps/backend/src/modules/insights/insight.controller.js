const express = require('express');
const insightService = require('./insight.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.get('/', async (req, res) => {
    const { page, limit } = req.query;
    const result = await insightService.list(req.params.projectId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.json(result);
});

router.get('/:insightId', async (req, res) => {
    const insight = await insightService.findById(req.params.insightId, req.params.projectId);
    res.json(insight);
});

router.delete('/:insightId', async (req, res) => {
    await insightService.delete(req.params.insightId, req.params.projectId);
    res.json({ message: 'Insight deleted successfully' });
});

module.exports = router;
