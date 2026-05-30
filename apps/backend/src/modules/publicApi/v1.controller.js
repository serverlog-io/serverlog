const express = require('express');
const eventService = require('@modules/events/event.service');
const insightService = require('@modules/insights/insight.service');
const userProfileService = require('@modules/identify/userProfile.service');
const projectSettingsService = require('@modules/projectSettings/projectSettings.service');
const apiKeyMiddleware = require('./apiKey.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { ipRateLimiter, apiKeyRateLimiter } = require('./rateLimit.middleware');
const { logSchema, identifySchema, insightSchema } = require('./v1.schemas');
// Note: userProfileService is still needed for /identify endpoint

const router = express.Router();

// Two-layer rate limiting: IP first (protects auth from fake-key spam),
// then API key (per-tenant business quota after the key is validated).
router.use(ipRateLimiter);
router.use(apiKeyMiddleware);
router.use(apiKeyRateLimiter);

router.post('/log', validateMiddleware(logSchema), async (req, res) => {
    const { project, ...eventData } = req.body;

    // Enforce per-project body limits (configurable from project settings).
    const projectId = req.project.id;
    const [maxDescLen, maxTags] = await Promise.all([
        projectSettingsService.get(projectId, 'maxEventDescriptionLength'),
        projectSettingsService.get(projectId, 'maxTagsPerEvent'),
    ]);
    if (eventData.description && eventData.description.length > maxDescLen) {
        return res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: `description must be at most ${maxDescLen} characters for this project`,
        });
    }
    const tagsCount = eventData.tags ? Object.keys(eventData.tags).length : 0;
    if (tagsCount > maxTags) {
        return res.status(400).json({
            success: false,
            error: 'ValidationError',
            message: `tags must have at most ${maxTags} entries for this project`,
        });
    }

    const event = await eventService.create(req.project.id, eventData);

    res.json({
        success: true,
        event: {
            id: event.id,
            project: req.project.slug,
            channel: event.channel?.name || eventData.channel,
            event: event.event,
            description: event.description,
            icon: event.icon,
            timestamp: event.timestamp
        }
    });
});

router.post('/identify', validateMiddleware(identifySchema), async (req, res) => {
    const { project, ...identifyData } = req.body;

    const profile = await userProfileService.identify(req.project.id, identifyData);

    res.json({
        success: true,
        profile: {
            id: profile.id,
            userId: profile.externalId,
            properties: profile.properties
        }
    });
});

router.post('/insight', validateMiddleware(insightSchema), async (req, res) => {
    const { project, ...insightData } = req.body;

    const insight = await insightService.upsert(req.project.id, insightData);

    res.json({
        success: true,
        insight: {
            id: insight.id,
            title: insight.title,
            value: insight.value,
            icon: insight.icon
        }
    });
});

module.exports = router;
