const express = require('express');
const dashboardService = require('./dashboard.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createChartSchema, updateChartSchema, reorderSchema } = require('./dashboard.schemas');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.post('/', validateMiddleware(createChartSchema), async (req, res) => {
    const chart = await dashboardService.create(req.params.projectId, req.body);
    res.status(201).json(chart);
});

router.get('/', async (req, res) => {
    const result = await dashboardService.list(req.params.projectId);
    res.json(result);
});

router.get('/:chartId', async (req, res) => {
    const chart = await dashboardService.findById(req.params.chartId, req.params.projectId);
    res.json(chart);
});

router.put('/:chartId', validateMiddleware(updateChartSchema), async (req, res) => {
    const chart = await dashboardService.update(req.params.chartId, req.params.projectId, req.body);
    res.json(chart);
});

router.delete('/:chartId', async (req, res) => {
    await dashboardService.delete(req.params.chartId, req.params.projectId);
    res.json({ message: 'Chart deleted successfully' });
});

router.post('/reorder', validateMiddleware(reorderSchema), async (req, res) => {
    const result = await dashboardService.reorder(req.params.projectId, req.body.chartIds);
    res.json(result);
});

module.exports = router;
