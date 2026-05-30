const express = require('express');
const userProfileService = require('./userProfile.service');
const authMiddleware = require('@middlewares/auth.middleware');
const projectOwnershipMiddleware = require('@middlewares/projectOwnership.middleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);
router.use(projectOwnershipMiddleware);

router.get('/', async (req, res) => {
    const { page, limit, search, sortBy, sortOrder, propertyFilters } = req.query;
    const result = await userProfileService.list(req.params.projectId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined,
        search,
        sortBy,
        sortOrder,
        propertyFilters
    });
    res.json(result);
});

// Must be before /:profileId to avoid conflict
router.get('/user/:userId', async (req, res) => {
    const profile = await userProfileService.findByUserId(req.params.userId, req.params.projectId);
    res.json(profile);
});

router.get('/:profileId', async (req, res) => {
    const profile = await userProfileService.findById(req.params.profileId, req.params.projectId);
    res.json(profile);
});

router.get('/:profileId/activity', async (req, res) => {
    const { days } = req.query;
    const result = await userProfileService.getActivity(
        req.params.profileId,
        req.params.projectId,
        { days: days ? parseInt(days) : undefined }
    );
    res.json(result);
});

router.get('/:profileId/events', async (req, res) => {
    const { limit } = req.query;
    const result = await userProfileService.getEvents(
        req.params.profileId,
        req.params.projectId,
        { limit: limit ? parseInt(limit) : undefined }
    );
    res.json(result);
});

router.get('/:profileId/breakdown', async (req, res) => {
    const { days, limit } = req.query;
    const result = await userProfileService.getBreakdown(
        req.params.profileId,
        req.params.projectId,
        {
            days: days ? parseInt(days) : undefined,
            limit: limit ? parseInt(limit) : undefined,
        }
    );
    res.json(result);
});

router.delete('/:profileId', async (req, res) => {
    await userProfileService.delete(req.params.profileId, req.params.projectId);
    res.json({ message: 'User profile deleted successfully' });
});

module.exports = router;
