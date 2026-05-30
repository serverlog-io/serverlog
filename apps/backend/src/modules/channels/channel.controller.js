const express = require('express');
const channelService = require('./channel.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createChannelSchema, updateChannelSchema } = require('./channel.schemas');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.post('/', validateMiddleware(createChannelSchema), async (req, res) => {
    const channel = await channelService.create(req.params.projectId, req.body);
    res.status(201).json(channel);
});

router.get('/', async (req, res) => {
    const { page, limit } = req.query;
    const result = await channelService.list(req.params.projectId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.json(result);
});

router.get('/:channelId', async (req, res) => {
    const channel = await channelService.findById(req.params.channelId, req.params.projectId);
    res.json(channel);
});

router.get('/:channelId/stats', async (req, res) => {
    const stats = await channelService.getStats(req.params.channelId, req.params.projectId);
    res.json(stats);
});

router.put('/:channelId', validateMiddleware(updateChannelSchema), async (req, res) => {
    const channel = await channelService.update(req.params.channelId, req.params.projectId, req.body);
    res.json(channel);
});

router.delete('/:channelId', async (req, res) => {
    await channelService.delete(req.params.channelId, req.params.projectId);
    res.json({ message: 'Channel deleted successfully' });
});

module.exports = router;
