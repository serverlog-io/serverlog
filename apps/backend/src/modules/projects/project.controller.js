const express = require('express');
const projectService = require('./project.service');
const authMiddleware = require('@middlewares/auth.middleware');
const validateMiddleware = require('@middlewares/validate.middleware');
const { createProjectSchema, updateProjectSchema } = require('./project.schemas');

const router = express.Router();

router.use(authMiddleware);

router.post('/', validateMiddleware(createProjectSchema), async (req, res) => {
    const project = await projectService.create(req.user.userId, req.body);
    res.status(201).json(project);
});

router.get('/', async (req, res) => {
    const { page, limit } = req.query;
    const result = await projectService.list(req.user.userId, {
        page: page ? parseInt(page) : undefined,
        limit: limit ? parseInt(limit) : undefined
    });
    res.json(result);
});

router.get('/:projectId', async (req, res) => {
    const project = await projectService.findById(req.params.projectId, req.user.userId);
    res.json(project);
});

router.get('/:projectId/stats', async (req, res) => {
    const stats = await projectService.getStats(req.params.projectId, req.user.userId);
    res.json(stats);
});

router.put('/:projectId', validateMiddleware(updateProjectSchema), async (req, res) => {
    const project = await projectService.update(req.params.projectId, req.user.userId, req.body);
    res.json(project);
});

router.delete('/:projectId', async (req, res) => {
    await projectService.delete(req.params.projectId, req.user.userId);
    res.json({ message: 'Project deleted successfully' });
});

module.exports = router;
