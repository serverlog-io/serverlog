const express = require('express');
const funnelService = require('./funnel.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createFunnelSchema, updateFunnelSchema } = require('./funnel.schemas');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

// Create funnel
router.post('/', validateMiddleware(createFunnelSchema), async (req, res) => {
    const funnel = await funnelService.create(req.params.projectId, req.body);
    res.status(201).json(funnel);
});

// List funnels
router.get('/', async (req, res) => {
    const result = await funnelService.list(req.params.projectId);
    res.json(result);
});

// Get funnel by ID
router.get('/:funnelId', async (req, res) => {
    const funnel = await funnelService.findById(req.params.funnelId, req.params.projectId);
    res.json(funnel);
});

// Calculate funnel metrics
router.get('/:funnelId/calculate', async (req, res) => {
    const { startDate, endDate } = req.query;
    const result = await funnelService.calculate(
        req.params.funnelId,
        req.params.projectId,
        { startDate, endDate }
    );
    res.json(result);
});

// Update funnel
router.put('/:funnelId', validateMiddleware(updateFunnelSchema), async (req, res) => {
    const funnel = await funnelService.update(req.params.funnelId, req.params.projectId, req.body);
    res.json(funnel);
});

// Delete funnel
router.delete('/:funnelId', async (req, res) => {
    await funnelService.delete(req.params.funnelId, req.params.projectId);
    res.json({ message: 'Funnel deleted successfully' });
});

module.exports = router;
