const express = require('express');
const apiKeyService = require('./apiKey.service');
const projectService = require('@modules/projects/project.service');
const authMiddleware = require('@middlewares/auth.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createApiKeySchema, updateApiKeySchema } = require('./apiKey.schemas');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.use(async (req, res, next) => {
    await projectService.findById(req.params.projectId, req.user.userId);
    next();
});

router.post('/', validateMiddleware(createApiKeySchema), async (req, res) => {
    const result = await apiKeyService.create(
        req.params.projectId,
        req.user.userId,
        req.body
    );
    res.status(201).json(result);
});

router.get('/', async (req, res) => {
    const { page, limit } = req.query;
    const result = await apiKeyService.list(req.params.projectId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.json(result);
});

router.get('/:keyId', async (req, res) => {
    const apiKey = await apiKeyService.findById(req.params.keyId, req.params.projectId);
    const { keyHash, ...result } = apiKey;
    res.json(result);
});

router.put('/:keyId', validateMiddleware(updateApiKeySchema), async (req, res) => {
    const apiKey = await apiKeyService.update(
        req.params.keyId,
        req.params.projectId,
        req.body
    );
    res.json(apiKey);
});

router.post('/:keyId/revoke', async (req, res) => {
    const apiKey = await apiKeyService.revoke(req.params.keyId, req.params.projectId);
    res.json({ message: 'API key revoked successfully', apiKey });
});

router.delete('/:keyId', async (req, res) => {
    await apiKeyService.delete(req.params.keyId, req.params.projectId);
    res.json({ message: 'API key deleted successfully' });
});

module.exports = router;
