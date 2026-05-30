const express = require('express');
const eventService = require('./event.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createEventSchema } = require('./event.schemas');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.get('/', async (req, res) => {
    const result = await eventService.list(req.params.projectId, req.query);
    res.json(result);
});

router.post('/', validateMiddleware(createEventSchema), async (req, res) => {
    const event = await eventService.create(req.params.projectId, req.body);
    res.status(201).json(event);
});

router.get('/suggestions', async (req, res) => {
    const suggestions = await eventService.getSuggestions(req.params.projectId);
    res.json(suggestions);
});

router.get('/stats', async (req, res) => {
    const { startDate, endDate, groupBy } = req.query;
    const stats = await eventService.getStats(req.params.projectId, {
        startDate,
        endDate,
        groupBy
    });
    res.json(stats);
});

router.get('/timeline', async (req, res) => {
    const { startDate, endDate, channel, userId, search, tags, granularity } = req.query;
    const timeline = await eventService.getTimeline(req.params.projectId, {
        startDate,
        endDate,
        channel,
        userId,
        search,
        tags,
        granularity
    });
    res.json(timeline);
});

router.get('/online-users', async (req, res) => {
    const minutes = req.query.minutes ? parseInt(req.query.minutes, 10) : 30;
    const result = await eventService.getOnlineUsers(req.params.projectId, minutes);
    res.json(result);
});

router.get('/:eventId', async (req, res) => {
    const event = await eventService.findById(req.params.eventId, req.params.projectId);
    res.json(event);
});

router.delete('/:eventId', async (req, res) => {
    await eventService.delete(req.params.eventId, req.params.projectId);
    res.json({ message: 'Event deleted successfully' });
});

module.exports = router;
